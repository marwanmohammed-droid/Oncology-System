'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TreatmentPlan } from './useTreatmentPlans'

export type LabsInput = {
  wbc_pre: number | null; anc_pre: number | null
  hgb_pre: number | null; plt_pre: number | null
  alt_pre: number | null; creatinine_pre: number | null
}

export type LabsEvalResult = {
  cleared: boolean
  critical: boolean
  issues: { field: string; message: string; severity: 'critical' | 'warning' }[]
  clears: { field: string; message: string }[]
}

export function useChemoScheduler(filters?: {
  patientId?: string
  dateFrom?: string
  dateTo?: string
  status?: SessionStatus
}) {
  const [sessions, setSessions]   = useState<ChemoSession[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const supabase = createClient()

  // ── FETCH ──────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('chemo_sessions')
        .select(`
          *,
          plan:treatment_plans(
            protocol_name, planned_cycles, completed_cycles,
            cycle_interval_days, bsa_at_start, regimen_id,
            oncologist:profiles!treatment_plans_oncologist_id_fkey(full_name_ar)
          ),
          patient:patients(mrn, first_name_ar, last_name_ar, first_name_en, last_name_en, mobile_primary),
          session_drugs(*)
        `)
        .order('session_date', { ascending: true })
        .order('session_time',  { ascending: true })

      if (filters?.patientId) query = query.eq('patient_id', filters.patientId)
      if (filters?.status)    query = query.eq('status', filters.status)
      if (filters?.dateFrom)  query = query.gte('session_date', filters.dateFrom)
      if (filters?.dateTo)    query = query.lte('session_date', filters.dateTo)

      const { data, error: err } = await query
      if (err) throw err
      setSessions(data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters?.patientId, filters?.status, filters?.dateFrom, filters?.dateTo])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  // ── REAL-TIME SUBSCRIPTION ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('chemo_sessions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chemo_sessions',
        filter: filters?.patientId ? `patient_id=eq.${filters.patientId}` : undefined,
      }, (_payload) => {
        fetchSessions()  // refetch on any change
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [filters?.patientId, fetchSessions])

  // ── SCHEDULE NEW SESSION ───────────────────────────────────
  const scheduleSession = async (input: {
    plan_id: string
    patient_id: string
    cycle_number: number
    session_date: string
    session_time?: string
    room?: string
    bsa_at_session?: number
    weight_at_session?: number
    dose_modified?: boolean
    dose_mod_pct?: number
    dose_mod_reason?: string
    dose_mod_ctcae?: string
    session_notes?: string
  }) => {
    setSaving(true); setError(null)
    try {
      // 1. Check for room/time conflicts
      const conflict = await checkConflict(input.session_date, input.session_time || '', input.room || '', '')
      if (conflict) throw new Error(`تعارض في الجدول: ${conflict}`)

      // 2. Insert session
      const { data: session, error: err } = await supabase
        .from('chemo_sessions')
        .insert({
          ...input,
          status: 'scheduled',
          preauth_status: 'pending',
        })
        .select('*')
        .single()
      if (err) throw err

      // 3. Pre-populate session_drugs from regimen
      await populateSessionDrugs(session.id, input.plan_id, input.bsa_at_session, input.dose_mod_pct)

      // 4. Trigger pre-auth request (72h before)
      await createPreAuthRequest(session.id)

      // 5. Schedule patient reminders
      await scheduleReminders(session.id)

      setSessions(prev => [...prev, session].sort((a,b) => a.session_date.localeCompare(b.session_date)))
      return session
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }

  // ── POPULATE SESSION DRUGS ─────────────────────────────────
  const populateSessionDrugs = async (
    sessionId: string,
    planId: string,
    bsa?: number,
    modPct?: number
  ) => {
    // Get plan + regimen drugs
    const { data: plan } = await supabase
      .from('treatment_plans')
      .select('regimen_id, bsa_at_start')
      .eq('id', planId)
      .single()
    if (!plan?.regimen_id) return

    const { data: regimenDrugs } = await supabase
      .from('regimen_drugs')
      .select('*')
      .eq('regimen_id', plan.regimen_id)
      .order('sequence_order')

    if (!regimenDrugs?.length) return

    const effectiveBsa = bsa || plan.bsa_at_start || 1.73
    const mod = 1 + ((modPct || 0) / 100)

    const drugEntries = regimenDrugs.map(d => {
      let planned: number
      if (d.dose_mg_flat) planned = d.dose_mg_flat
      else planned = (d.dose_mg_m2 || 0) * effectiveBsa
      planned = Math.round(planned * mod * 10) / 10
      if (d.max_dose_mg && planned > d.max_dose_mg) planned = d.max_dose_mg
      return {
        session_id: sessionId,
        regimen_drug_id: d.id,
        drug_name: d.drug_name,
        planned_dose_mg: planned,
        route: d.route,
        administered: false,
      }
    })

    await supabase.from('session_drugs').insert(drugEntries)
  }

  // ── ENTER LABS ─────────────────────────────────────────────
  const enterLabs = async (sessionId: string, labs: LabsInput) => {
    setSaving(true); setError(null)
    try {
      const evaluation = evaluateLabs(labs)
      const { error: err } = await supabase
        .from('chemo_sessions')
        .update({
          ...labs,
          labs_cleared: evaluation.cleared && !evaluation.critical,
        })
        .eq('id', sessionId)
      if (err) throw err

      setSessions(prev => prev.map(s => s.id === sessionId
        ? { ...s, ...labs, labs_cleared: evaluation.cleared && !evaluation.critical }
        : s
      ))
      return evaluation
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }

  // ── LABS EVALUATION ENGINE ─────────────────────────────────
  const evaluateLabs = (labs: LabsInput): LabsEvalResult => {
    const issues: LabsEvalResult['issues'] = []
    const clears: LabsEvalResult['clears'] = []

    // WBC
    if (labs.wbc_pre !== null) {
      if      (labs.wbc_pre < 2.0) issues.push({ field:'WBC', severity:'critical', message:`WBC ${labs.wbc_pre} < 2.0 × 10³/µL — جلسة موقوفة` })
      else if (labs.wbc_pre < 3.5) issues.push({ field:'WBC', severity:'warning',  message:`WBC ${labs.wbc_pre} منخفض — راجع الطبيب` })
      else clears.push({ field:'WBC', message:`WBC ${labs.wbc_pre} طبيعي` })
    }

    // ANC — most critical for chemo clearance
    if (labs.anc_pre !== null) {
      if      (labs.anc_pre < 1.0) issues.push({ field:'ANC', severity:'critical', message:`ANC ${labs.anc_pre} < 1.0 — خطر توقف الجلسة` })
      else if (labs.anc_pre < 1.5) issues.push({ field:'ANC', severity:'warning',  message:`ANC ${labs.anc_pre} < 1.5 — ضعف مناعي` })
      else clears.push({ field:'ANC', message:`ANC ${labs.anc_pre} مناسب للجلسة` })
    }

    // Hgb
    if (labs.hgb_pre !== null) {
      if      (labs.hgb_pre < 7.0)  issues.push({ field:'Hgb', severity:'critical', message:`Hgb ${labs.hgb_pre} < 7.0 — نقل دم مطلوب` })
      else if (labs.hgb_pre < 9.0)  issues.push({ field:'Hgb', severity:'warning',  message:`Hgb ${labs.hgb_pre} منخفض` })
      else clears.push({ field:'Hgb', message:`Hgb ${labs.hgb_pre} مقبول` })
    }

    // Platelets
    if (labs.plt_pre !== null) {
      if      (labs.plt_pre < 50)   issues.push({ field:'PLT', severity:'critical', message:`Platelets ${labs.plt_pre} < 50 — موانع مطلقة` })
      else if (labs.plt_pre < 100)  issues.push({ field:'PLT', severity:'warning',  message:`Platelets ${labs.plt_pre} < 100` })
      else clears.push({ field:'PLT', message:`Platelets ${labs.plt_pre} طبيعي` })
    }

    // ALT — hepatic clearance
    if (labs.alt_pre !== null) {
      if      (labs.alt_pre > 300)  issues.push({ field:'ALT', severity:'critical', message:`ALT ${labs.alt_pre} مرتفع جداً (>5× ULN)` })
      else if (labs.alt_pre > 150)  issues.push({ field:'ALT', severity:'warning',  message:`ALT ${labs.alt_pre} مرتفع (>2× ULN)` })
      else clears.push({ field:'ALT', message:`ALT ${labs.alt_pre} طبيعي` })
    }

    // Creatinine — renal clearance
    if (labs.creatinine_pre !== null) {
      if      (labs.creatinine_pre > 2.5)  issues.push({ field:'Cr', severity:'critical', message:`Creatinine ${labs.creatinine_pre} مرتفع جداً` })
      else if (labs.creatinine_pre > 1.5)  issues.push({ field:'Cr', severity:'warning',  message:`Creatinine ${labs.creatinine_pre} مرتفع` })
      else clears.push({ field:'Cr', message:`Creatinine ${labs.creatinine_pre} طبيعي` })
    }

    const critical = issues.some(i => i.severity === 'critical')
    const cleared  = !critical && issues.filter(i => i.severity === 'critical').length === 0
    return { cleared, critical, issues, clears }
  }

  // ── POSTPONE SESSION ───────────────────────────────────────
  const postponeSession = async (sessionId: string, newDate: string, reason: string, notes?: string) => {
    setSaving(true); setError(null)
    try {
      const { error: err } = await supabase
        .from('chemo_sessions')
        .update({
          status: 'postponed',
          actual_date: newDate,
          session_notes: `Postponed: ${reason}${notes ? ` — ${notes}` : ''}`,
        })
        .eq('id', sessionId)
      if (err) throw err

      setSessions(prev => prev.map(s => s.id === sessionId
        ? { ...s, status: 'postponed', actual_date: newDate }
        : s
      ))

      // Send SMS reminder to patient
      const session = sessions.find(s => s.id === sessionId)
      if (session?.patient?.mobile_primary) {
        await sendSmsNotification(
          session.patient.mobile_primary,
          `تم تأجيل جلسة الكيماوي إلى ${newDate}. ${reason}`
        )
      }
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }

  // ── COMPLETE SESSION ───────────────────────────────────────
  const completeSession = async (sessionId: string, data: {
    adverse_events?: string
    session_notes?: string
    administered_by?: string
    actual_date?: string
  }) => {
    setSaving(true); setError(null)
    try {
      const session = sessions.find(s => s.id === sessionId)
      if (!session) throw new Error('Session not found')

      // 1. Mark session complete
      const { error: err } = await supabase
        .from('chemo_sessions')
        .update({
          status: 'completed',
          actual_date: data.actual_date || session.session_date,
          adverse_events: data.adverse_events || null,
          session_notes: data.session_notes || null,
          administered_by: data.administered_by || null,
        })
        .eq('id', sessionId)
      if (err) throw err

      // 2. Increment completed_cycles in treatment plan
      const { data: plan } = await supabase
        .from('treatment_plans')
        .select('completed_cycles, planned_cycles')
        .eq('id', session.plan_id)
        .single()

      if (plan) {
        const newCount = plan.completed_cycles + 1
        const isDone   = newCount >= plan.planned_cycles
        await supabase.from('treatment_plans').update({
          completed_cycles: newCount,
          status: isDone ? 'completed' : 'active',
        }).eq('id', session.plan_id)

        // 3. Schedule next session automatically if not done
        if (!isDone) {
          const nextDate = new Date(session.session_date)
          nextDate.setDate(nextDate.getDate() + (plan as any).cycle_interval_days || 14)
          await supabase.from('chemo_sessions').insert({
            plan_id: session.plan_id,
            patient_id: session.patient_id,
            cycle_number: session.cycle_number + 1,
            session_date: nextDate.toISOString().split('T')[0],
            status: 'scheduled',
            preauth_status: 'pending',
          })
        }
      }

      setSessions(prev => prev.map(s => s.id === sessionId
        ? { ...s, status: 'completed' } : s
      ))
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }

  // ── ADMINISTER DRUG ────────────────────────────────────────
  const administerDrug = async (sessionDrugId: string, actualDoseMg: number, startTime?: string) => {
    const { error: err } = await supabase
      .from('session_drugs')
      .update({
        administered: true,
        actual_dose_mg: actualDoseMg,
        infusion_start: startTime || new Date().toISOString(),
      })
      .eq('id', sessionDrugId)
    if (err) throw err
  }

  // ── UPDATE PREAUTH STATUS ──────────────────────────────────
  const updatePreauth = async (sessionId: string, status: 'approved' | 'rejected' | 'pending', ref?: string) => {
    const { error: err } = await supabase
      .from('chemo_sessions')
      .update({
        preauth_status: status,
        preauth_ref: ref || null,
        preauth_date: status !== 'pending' ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', sessionId)
    if (err) throw err
    setSessions(prev => prev.map(s => s.id === sessionId
      ? { ...s, preauth_status: status, preauth_ref: ref || null }
      : s
    ))
  }

  // ── CONFLICT CHECK ─────────────────────────────────────────
  const checkConflict = async (date: string, time: string, room: string, excludeId: string): Promise<string | null> => {
    if (!room) return null
    const { data } = await supabase
      .from('chemo_sessions')
      .select('id, patient_id, patient:patients(first_name_ar,last_name_ar)')
      .eq('session_date', date)
      .eq('room', room)
      .eq('session_time', time)
      .neq('id', excludeId)
      .eq('status', 'scheduled')
    if (data?.length) {
      const conflictPt = (data[0] as any).patient
      return `الغرفة ${room} محجوزة في نفس الوقت لـ ${conflictPt?.first_name_ar} ${conflictPt?.last_name_ar}`
    }
    return null
  }

  // ── UPCOMING SESSIONS (next 30 days) ──────────────────────
  const getUpcomingSessions = () => {
    const today    = new Date().toISOString().split('T')[0]
    const in30days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    return sessions
      .filter(s => s.session_date >= today && s.session_date <= in30days && s.status === 'scheduled')
      .sort((a, b) => a.session_date.localeCompare(b.session_date))
  }

  // ── SESSIONS NEEDING CBC ───────────────────────────────────
  const getSessionsNeedingLabs = () => {
    const in48h = new Date(Date.now() + 48 * 3600000).toISOString().split('T')[0]
    return sessions.filter(s =>
      s.status === 'scheduled' &&
      s.session_date <= in48h &&
      !s.labs_cleared
    )
  }

  // ── PRE-AUTH PENDING ───────────────────────────────────────
  const getPreAuthPending = () =>
    sessions.filter(s => s.status === 'scheduled' && s.preauth_status === 'pending')

  // ── HELPERS ───────────────────────────────────────────────
  const createPreAuthRequest = async (sessionId: string) => {
    // In production: call Supabase Edge Function to send pre-auth to insurer API
    console.log(`[Pre-auth] Request queued for session ${sessionId}`)
  }

  const scheduleReminders = async (sessionId: string) => {
    // In production: call Supabase Edge Function to schedule SMS/WhatsApp
    console.log(`[Reminders] Reminders scheduled for session ${sessionId}`)
  }

  const sendSmsNotification = async (phone: string, message: string) => {
    // In production: call Supabase Edge Function → Twilio / Vonage / WhatsApp Business API
    console.log(`[SMS] To ${phone}: ${message}`)
  }

  // ── STATISTICS ────────────────────────────────────────────
  const stats = {
    totalScheduled:   sessions.filter(s => s.status === 'scheduled').length,
    completedThisMonth: sessions.filter(s => {
      const now = new Date()
      const d   = new Date(s.session_date)
      return s.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
    needingLabs:      getSessionsNeedingLabs().length,
    preAuthPending:   getPreAuthPending().length,
    upcomingThisWeek: sessions.filter(s => {
      const today  = new Date(); today.setHours(0,0,0,0)
      const week   = new Date(today); week.setDate(week.getDate() + 7)
      const sDate  = new Date(s.session_date)
      return s.status === 'scheduled' && sDate >= today && sDate <= week
    }).length,
  }

  return {
    sessions, loading, saving, error,
    scheduleSession, postponeSession, completeSession,
    enterLabs, evaluateLabs, administerDrug,
    updatePreauth, checkConflict,
    getUpcomingSessions, getSessionsNeedingLabs, getPreAuthPending,
    stats, refresh: fetchSessions,
  }
}


// ================================================================
// PART 2 — useCalendarView, useNotifications, useReporting, Server Actions, Optimistic, Errors, Edge Functions
// ================================================================

// ============================================================
// CHEMO SCHEDULER — Remaining TypeScript Hooks & Utilities
// Part 2: Notifications, Reporting, RSC, Edge Functions,
//         Optimistic Updates, Error Boundaries
// ============================================================

'use client'
import { useState, useCallback, useEffect, useTransition, useOptimistic } from 'react'
import { createClient }       from '@/lib/supabase/client'
import { createServerSupabase } from '@/lib/supabase/server'
import type { ChemoSession, TreatmentPlan } from './useChemoScheduler'

// ────────────────────────────────────────────────────────────
// HOOK: useNotifications
// Manages patient reminders & staff alerts
// lib/hooks/useNotifications.ts
// ────────────────────────────────────────────────────────────

export type NotificationChannel = 'sms' | 'whatsapp' | 'email' | 'push' | 'in_app'
export type NotificationType    =
  | 'session_reminder_48h'
  | 'labs_reminder_72h'
  | 'session_day_morning'
  | 'preauth_approved'
  | 'preauth_rejected'
  | 'session_postponed'
  | 'session_cancelled'
  | 'labs_critical'
  | 'dose_modified'

export interface Notification {
  id: string
  patient_id: string
  session_id: string | null
  type: NotificationType
  channel: NotificationChannel
  message_ar: string
  message_en: string
  scheduled_at: string
  sent_at: string | null
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  recipient_phone: string | null
  created_at: string
}

export interface NotificationTemplate {
  type: NotificationType
  message_ar: (vars: Record<string, string>) => string
  message_en: (vars: Record<string, string>) => string
}

// Message templates
const TEMPLATES: NotificationTemplate[] = [
  {
    type: 'session_reminder_48h',
    message_ar: (v) => `مركز الأمل للأورام: تذكير — لديك جلسة كيماوي غداً ${v.date} الساعة ${v.time}. الرجاء إحضار تحاليل CBC + LFTs. استفسار: ${v.phone}`,
    message_en: (v) => `Oncology Center: Reminder — Chemo session tomorrow ${v.date} at ${v.time}. Please bring CBC+LFT results. Info: ${v.phone}`,
  },
  {
    type: 'labs_reminder_72h',
    message_ar: (v) => `مركز الأمل للأورام: تحاليلك مطلوبة قبل جلسة ${v.protocol} بتاريخ ${v.session_date}. الرجاء إجراء CBC + LFTs قبل ${v.labs_due_date}.`,
    message_en: (v) => `Oncology Center: Labs required before ${v.protocol} session on ${v.session_date}. Please complete CBC+LFTs by ${v.labs_due_date}.`,
  },
  {
    type: 'session_postponed',
    message_ar: (v) => `مركز الأمل للأورام: تم تأجيل جلسة الكيماوي إلى ${v.new_date}. السبب: ${v.reason}. للاستفسار: ${v.phone}`,
    message_en: (v) => `Oncology Center: Chemo session postponed to ${v.new_date}. Reason: ${v.reason}. Contact: ${v.phone}`,
  },
  {
    type: 'preauth_approved',
    message_ar: (v) => `مركز الأمل للأورام: تم الموافقة على التأمين لجلسة ${v.protocol} بتاريخ ${v.date}. رقم المرجع: ${v.ref}`,
    message_en: (v) => `Oncology Center: Insurance pre-auth approved for ${v.protocol} on ${v.date}. Ref: ${v.ref}`,
  },
  {
    type: 'labs_critical',
    message_ar: (v) => `تنبيه طبي — ${v.patient_name}: نتيجة ${v.lab} خارج النطاق الآمن (${v.value}). مراجعة الطبيب مطلوبة فوراً.`,
    message_en: (v) => `Medical Alert — ${v.patient_name}: ${v.lab} result out of safe range (${v.value}). Doctor review required immediately.`,
  },
]

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(false)
  const [sending, setSending]             = useState(false)
  const supabase = createClient()

  // Fetch pending notifications
  const fetchPending = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_at')
    setNotifications(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  // Build & schedule a notification
  const schedule = useCallback(async (
    patientId: string,
    sessionId: string | null,
    type: NotificationType,
    channels: NotificationChannel[],
    vars: Record<string, string>,
    scheduledAt: Date,
    recipientPhone: string | null,
  ) => {
    const tpl = TEMPLATES.find(t => t.type === type)
    if (!tpl) throw new Error(`No template for type: ${type}`)

    const entries = channels.map(ch => ({
      patient_id:     patientId,
      session_id:     sessionId,
      type,
      channel:        ch,
      message_ar:     tpl.message_ar(vars),
      message_en:     tpl.message_en(vars),
      scheduled_at:   scheduledAt.toISOString(),
      status:         'pending' as const,
      recipient_phone: ch === 'sms' || ch === 'whatsapp' ? recipientPhone : null,
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(entries)
      .select()
    if (error) throw error
    setNotifications(prev => [...(data || []), ...prev])
    return data
  }, [])

  // Schedule all standard reminders for a session
  const scheduleSessionReminders = useCallback(async (session: ChemoSession) => {
    if (!session.patient) return
    const pt       = session.patient
    const sessDate = new Date(session.session_date)
    const phone    = pt.mobile_primary

    const vars = {
      patient_name: `${pt.first_name_ar} ${pt.last_name_ar}`,
      date:         session.session_date,
      time:         session.session_time || '09:00',
      protocol:     session.plan?.protocol_name || '',
      session_date: session.session_date,
      phone:        '01XXXXXXXXX',
    }

    // 48h before — session reminder
    const rem48h = new Date(sessDate); rem48h.setHours(rem48h.getHours() - 48)
    await schedule(session.patient_id, session.id, 'session_reminder_48h', ['sms'], vars, rem48h, phone)

    // 72h before — labs reminder
    const labs72h = new Date(sessDate); labs72h.setHours(labs72h.getHours() - 72)
    const labsDue = new Date(sessDate); labsDue.setHours(labsDue.getHours() - 48)
    await schedule(session.patient_id, session.id, 'labs_reminder_72h', ['sms'],
      { ...vars, labs_due_date: labsDue.toISOString().split('T')[0] }, labs72h, phone)
  }, [schedule])

  // Send immediately via Edge Function
  const sendNow = useCallback(async (notificationId: string) => {
    setSending(true)
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: { notification_id: notificationId }
      })
      if (error) throw error
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, status: 'sent', sent_at: new Date().toISOString() } : n
      ))
    } catch (e) {
      console.error('[Notification] Send failed:', e)
      throw e
    } finally {
      setSending(false)
    }
  }, [])

  // Send all pending reminders for upcoming sessions (bulk)
  const sendAllPending = useCallback(async () => {
    setSending(true)
    try {
      const { error } = await supabase.functions.invoke('send-bulk-notifications', {
        body: { status: 'pending' }
      })
      if (error) throw error
      await fetchPending()
    } finally {
      setSending(false)
    }
  }, [fetchPending])

  // Cancel notification
  const cancel = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ status: 'cancelled' }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const pendingCount  = notifications.filter(n => n.status === 'pending').length
  const sentToday     = notifications.filter(n => n.sent_at?.startsWith(new Date().toISOString().split('T')[0])).length

  return {
    notifications, loading, sending, pendingCount, sentToday,
    schedule, scheduleSessionReminders, sendNow, sendAllPending, cancel,
    refresh: fetchPending,
  }
}

// ────────────────────────────────────────────────────────────
// HOOK: useReporting
// Analytics & reports for chemo sessions
// lib/hooks/useReporting.ts
// ────────────────────────────────────────────────────────────

export interface SessionReport {
  period:            string               // 'YYYY-MM'
  totalSessions:     number
  completedSessions: number
  postponedSessions: number
  cancelledSessions: number
  completionRate:    number               // %
  avgSessionsPerDay: number
  uniquePatients:    number
  protocolBreakdown: Record<string, number>
  sessionsByDay:     Record<string, number>
}

export interface PatientProgressReport {
  patientId:       string
  patientName:     string
  mrn:             string
  protocol:        string
  startDate:       string
  plannedCycles:   number
  completedCycles: number
  progressPct:     number
  lastSessionDate: string | null
  nextSessionDate: string | null
  status:          string
  doseModifications: number
}

export interface LabTrendReport {
  sessionId:    string
  cycleNumber:  number
  sessionDate:  string
  wbc:          number | null
  anc:          number | null
  hgb:          number | null
  plt:          number | null
  labsCleared:  boolean | null
}

export function useReporting() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Monthly session summary
  const getMonthlyReport = useCallback(async (year: number, month: number): Promise<SessionReport> => {
    setLoading(true)
    const from = `${year}-${String(month).padStart(2,'0')}-01`
    const to   = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: sessions } = await supabase
      .from('chemo_sessions')
      .select('*, plan:treatment_plans(protocol_name)')
      .gte('session_date', from)
      .lte('session_date', to)

    const all   = sessions || []
    const done  = all.filter(s => s.status === 'completed')
    const post  = all.filter(s => s.status === 'postponed')
    const canc  = all.filter(s => s.status === 'cancelled')
    const pts   = new Set(all.map(s => s.patient_id))
    const days  = new Set(all.map(s => s.session_date))

    const protocolBreakdown: Record<string, number> = {}
    all.forEach(s => {
      const p = (s.plan as any)?.protocol_name || 'Unknown'
      protocolBreakdown[p] = (protocolBreakdown[p] || 0) + 1
    })

    const sessionsByDay: Record<string, number> = {}
    all.forEach(s => {
      sessionsByDay[s.session_date] = (sessionsByDay[s.session_date] || 0) + 1
    })

    setLoading(false)
    return {
      period:            `${year}-${String(month).padStart(2,'0')}`,
      totalSessions:     all.length,
      completedSessions: done.length,
      postponedSessions: post.length,
      cancelledSessions: canc.length,
      completionRate:    all.length ? Math.round((done.length / all.length) * 100) : 0,
      avgSessionsPerDay: days.size ? Math.round((all.length / days.size) * 10) / 10 : 0,
      uniquePatients:    pts.size,
      protocolBreakdown,
      sessionsByDay,
    }
  }, [])

  // Per-patient progress report
  const getPatientProgressReport = useCallback(async (): Promise<PatientProgressReport[]> => {
    setLoading(true)
    const { data: plans } = await supabase
      .from('treatment_plans')
      .select(`
        id, patient_id, protocol_name, start_date,
        planned_cycles, completed_cycles, status,
        patient:patients(first_name_ar, last_name_ar, mrn),
        sessions:chemo_sessions(
          cycle_number, session_date, status, dose_modified
        )
      `)
      .in('status', ['active', 'on_hold'])
      .order('start_date')

    const reports = (plans || []).map(p => {
      const sessions = ((p as any).sessions || []) as any[]
      const completed = sessions.filter((s: any) => s.status === 'completed')
      const upcoming  = sessions.filter((s: any) => s.status === 'scheduled')
        .sort((a: any, b: any) => a.session_date.localeCompare(b.session_date))
      const lastDone  = completed.sort((a: any,b: any) => b.session_date.localeCompare(a.session_date))[0]
      const pt        = (p as any).patient

      return {
        patientId:       p.patient_id,
        patientName:     pt ? `${pt.first_name_ar} ${pt.last_name_ar}` : '—',
        mrn:             pt?.mrn || '—',
        protocol:        p.protocol_name,
        startDate:       p.start_date,
        plannedCycles:   p.planned_cycles,
        completedCycles: p.completed_cycles,
        progressPct:     Math.round((p.completed_cycles / p.planned_cycles) * 100),
        lastSessionDate: lastDone?.session_date || null,
        nextSessionDate: upcoming[0]?.session_date || null,
        status:          p.status,
        doseModifications: sessions.filter((s: any) => s.dose_modified).length,
      }
    })

    setLoading(false)
    return reports
  }, [])

  // Lab trends for a patient across cycles
  const getLabTrends = useCallback(async (patientId: string, planId?: string): Promise<LabTrendReport[]> => {
    setLoading(true)
    let query = supabase
      .from('chemo_sessions')
      .select('id, cycle_number, session_date, wbc_pre, anc_pre, hgb_pre, plt_pre, labs_cleared')
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .order('cycle_number')

    if (planId) query = query.eq('plan_id', planId)

    const { data } = await query
    setLoading(false)
    return (data || []).map(s => ({
      sessionId:   s.id,
      cycleNumber: s.cycle_number,
      sessionDate: s.session_date,
      wbc:         s.wbc_pre,
      anc:         s.anc_pre,
      hgb:         s.hgb_pre,
      plt:         s.plt_pre,
      labsCleared: s.labs_cleared,
    }))
  }, [])

  // Upcoming pre-auth requests report
  const getPreauthReport = useCallback(async () => {
    const in7d = new Date(Date.now() + 7*864e5).toISOString().split('T')[0]
    const { data } = await supabase
      .from('chemo_sessions')
      .select(`
        id, session_date, cycle_number, preauth_status, preauth_ref,
        plan:treatment_plans(protocol_name),
        patient:patients(first_name_ar, last_name_ar, mrn,
          insurance:insurance_policies(provider_name, policy_number, insurance_type))
      `)
      .lte('session_date', in7d)
      .eq('status', 'scheduled')
      .order('session_date')
    return data || []
  }, [])

  // Export CSV
  const exportCsv = useCallback(async (year: number, month: number): Promise<string> => {
    const from = `${year}-${String(month).padStart(2,'0')}-01`
    const to   = new Date(year, month, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('chemo_sessions')
      .select(`
        session_date, session_time, cycle_number, status,
        wbc_pre, anc_pre, hgb_pre, plt_pre, dose_modified, dose_mod_pct,
        plan:treatment_plans(protocol_name),
        patient:patients(first_name_ar, last_name_ar, mrn)
      `)
      .gte('session_date', from)
      .lte('session_date', to)
      .order('session_date')

    const headers = ['Date','Time','Patient','MRN','Protocol','Cycle','Status','WBC','ANC','Hgb','Platelets','Dose Modified','Dose Mod %']
    const rows = (data || []).map(s => {
      const pt   = (s as any).patient
      const plan = (s as any).plan
      return [
        s.session_date, s.session_time || '',
        pt ? `${pt.first_name_ar} ${pt.last_name_ar}` : '',
        pt?.mrn || '',
        plan?.protocol_name || '',
        s.cycle_number,
        s.status,
        s.wbc_pre ?? '', s.anc_pre ?? '', s.hgb_pre ?? '', s.plt_pre ?? '',
        s.dose_modified ? 'Yes' : 'No',
        s.dose_mod_pct ?? '',
      ].join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }, [])

  return { loading, getMonthlyReport, getPatientProgressReport, getLabTrends, getPreauthReport, exportCsv }
}

// ────────────────────────────────────────────────────────────
// SERVER-SIDE FETCH (RSC)
// app/(app)/chemo-sessions/actions.ts
// Server Actions — called from server components
// ────────────────────────────────────────────────────────────

'use server'

import { revalidatePath } from 'next/cache'

// Fetch upcoming sessions server-side (for SSR / initial load)
export async function fetchUpcomingSessionsServer() {
  const supabase = await createServerSupabase()
  const today    = new Date().toISOString().split('T')[0]
  const in30d    = new Date(Date.now() + 30*864e5).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('upcoming_sessions')   // uses the DB view we created
    .select('*')
    .gte('session_date', today)
    .lte('session_date', in30d)
    .order('session_date')

  if (error) throw error
  return data || []
}

// Fetch treatment plan summary server-side
export async function fetchTreatmentPlanSummaryServer(patientId?: string) {
  const supabase = await createServerSupabase()
  let query = supabase
    .from('treatment_plan_summary')  // uses the DB view
    .select('*')
    .order('start_date', { ascending: false })

  if (patientId) query = query.eq('patient_id', patientId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Server action: schedule session + revalidate
export async function scheduleSessionAction(input: {
  plan_id: string
  patient_id: string
  cycle_number: number
  session_date: string
  session_time?: string
  room?: string
  bsa_at_session?: number
  dose_mod_pct?: number
  dose_mod_reason?: string
  session_notes?: string
}) {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('chemo_sessions')
    .insert({
      ...input,
      status: 'scheduled',
      preauth_status: 'pending',
      dose_modified: !!input.dose_mod_pct && input.dose_mod_pct !== 0,
    })
    .select('id')
    .single()

  if (error) throw error
  revalidatePath('/chemo-sessions')
  return data.id
}

// Server action: update session status
export async function updateSessionStatusAction(
  sessionId: string,
  status: 'completed' | 'postponed' | 'cancelled',
  reason?: string,
) {
  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('chemo_sessions')
    .update({ status, session_notes: reason })
    .eq('id', sessionId)

  if (error) throw error
  revalidatePath('/chemo-sessions')
  revalidatePath(`/patients/[id]`)
}

// ────────────────────────────────────────────────────────────
// OPTIMISTIC UPDATES
// Wrapper with useOptimistic for instant UI feedback
// lib/hooks/useOptimisticSessions.ts
// ────────────────────────────────────────────────────────────

'use client'

type SessionAction =
  | { type: 'complete';   id: string }
  | { type: 'postpone';   id: string; newDate: string }
  | { type: 'labs_clear'; id: string }
  | { type: 'add';        session: ChemoSession }

export function useOptimisticSessions(sessions: ChemoSession[]) {
  const [isPending, startTransition] = useTransition()

  const [optimisticSessions, dispatchOptimistic] = useOptimistic<ChemoSession[], SessionAction>(
    sessions,
    (state, action) => {
      switch (action.type) {
        case 'complete':
          return state.map(s => s.id === action.id ? { ...s, status: 'completed' as const } : s)
        case 'postpone':
          return state.map(s => s.id === action.id
            ? { ...s, status: 'postponed' as const, actual_date: action.newDate }
            : s
          )
        case 'labs_clear':
          return state.map(s => s.id === action.id ? { ...s, labs_cleared: true } : s)
        case 'add':
          return [...state, action.session].sort((a,b) => a.session_date.localeCompare(b.session_date))
        default:
          return state
      }
    }
  )

  // Optimistic complete
  const optimisticComplete = (id: string, serverFn: () => Promise<void>) => {
    startTransition(async () => {
      dispatchOptimistic({ type: 'complete', id })
      try { await serverFn() }
      catch (e) { console.error('Complete failed, reverting', e) }
    })
  }

  // Optimistic postpone
  const optimisticPostpone = (id: string, newDate: string, serverFn: () => Promise<void>) => {
    startTransition(async () => {
      dispatchOptimistic({ type: 'postpone', id, newDate })
      try { await serverFn() }
      catch (e) { console.error('Postpone failed, reverting', e) }
    })
  }

  // Optimistic labs cleared
  const optimisticLabsClear = (id: string, serverFn: () => Promise<void>) => {
    startTransition(async () => {
      dispatchOptimistic({ type: 'labs_clear', id })
      try { await serverFn() }
      catch (e) { console.error('Labs update failed, reverting', e) }
    })
  }

  return {
    optimisticSessions, isPending,
    optimisticComplete, optimisticPostpone, optimisticLabsClear,
  }
}

// ────────────────────────────────────────────────────────────
// ERROR BOUNDARY & ERROR TYPES
// lib/types/errors.ts + components/ErrorBoundary.tsx
// ────────────────────────────────────────────────────────────

// Typed error classes
export class SupabaseError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'SupabaseError'
  }
}

export class LabsCriticalError extends Error {
  constructor(
    public field: string,
    public value: number,
    public threshold: number,
    public sessionId: string,
  ) {
    super(`Critical lab value: ${field} = ${value} (threshold: ${threshold})`)
    this.name = 'LabsCriticalError'
  }
}

export class ConflictError extends Error {
  constructor(message: string, public conflictDetails?: { room: string; date: string; time: string }) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class PreAuthError extends Error {
  constructor(public sessionId: string, message: string) {
    super(message)
    this.name = 'PreAuthError'
  }
}

// React Error Boundary for chemo scheduler
import React from 'react'

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

export class ChemoErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChemoScheduler] Error caught by boundary:', error, info)
    // In production: send to error tracking (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8" dir="rtl">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-navy-900 mb-2">حدث خطأ في جدولة الكيماوي</h2>
          <p className="text-sm text-slate-500 mb-1 font-mono">
            {this.state.error?.name}: {this.state.error?.message}
          </p>
          {this.state.error instanceof LabsCriticalError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 max-w-md text-center">
              🚫 قيمة حرجة في التحاليل: <strong>{this.state.error.field}</strong> = {this.state.error.value}
              <br/>يرجى مراجعة الطبيب فوراً قبل إعطاء الجلسة
            </div>
          )}
          {this.state.error instanceof ConflictError && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 max-w-md text-center">
              ⚠️ تعارض في الجدول: {this.state.error.message}
            </div>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-6 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-800 transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ────────────────────────────────────────────────────────────
// SUPABASE EDGE FUNCTION: send-notification
// supabase/functions/send-notification/index.ts
// ────────────────────────────────────────────────────────────

/*
// Deploy with: supabase functions deploy send-notification

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_SID   = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_FROM  = Deno.env.get('TWILIO_PHONE_FROM')!

serve(async (req) => {
  const { notification_id } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get notification
  const { data: notif } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notification_id)
    .single()

  if (!notif) return new Response('Not found', { status: 404 })

  // Send via Twilio (SMS/WhatsApp)
  if ((notif.channel === 'sms' || notif.channel === 'whatsapp') && notif.recipient_phone) {
    const to  = notif.channel === 'whatsapp' ? `whatsapp:${notif.recipient_phone}` : notif.recipient_phone
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To:   to,
          From: notif.channel === 'whatsapp' ? `whatsapp:${TWILIO_FROM}` : TWILIO_FROM,
          Body: notif.message_ar,
        }),
      }
    )
    const ok = res.ok

    // Update notification status
    await supabase.from('notifications').update({
      status:  ok ? 'sent' : 'failed',
      sent_at: ok ? new Date().toISOString() : null,
    }).eq('id', notification_id)

    return new Response(JSON.stringify({ success: ok }), { status: ok ? 200 : 500 })
  }

  return new Response(JSON.stringify({ success: false, reason: 'Unsupported channel' }), { status: 400 })
})
*/

// ────────────────────────────────────────────────────────────
// SUPABASE EDGE FUNCTION: auto-preauth
// supabase/functions/auto-preauth/index.ts
// Runs daily via pg_cron — sends pre-auth 72h before sessions
// ────────────────────────────────────────────────────────────

/*
import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Find sessions in 72h with pending pre-auth
  const in72h = new Date(Date.now() + 72*3600*1000).toISOString().split('T')[0]
  const today  = new Date().toISOString().split('T')[0]

  const { data: sessions } = await supabase
    .from('chemo_sessions')
    .select(`
      id, session_date, cycle_number,
      plan:treatment_plans(protocol_name, patient_id),
      patient:patients(
        mrn,
        insurance:insurance_policies(
          provider_name, policy_number, insurance_type, insurance_coordinator
        )
      )
    `)
    .eq('status', 'scheduled')
    .eq('preauth_status', 'pending')
    .gte('session_date', today)
    .lte('session_date', in72h)

  const results = []
  for (const s of sessions || []) {
    const ins = (s.patient as any)?.insurance?.[0]
    if (!ins || ins.insurance_type === 'self_pay') {
      // No pre-auth needed for self-pay
      await supabase.from('chemo_sessions')
        .update({ preauth_status: 'approved', preauth_ref: 'SELF_PAY' })
        .eq('id', s.id)
      results.push({ id: s.id, result: 'auto-approved (self-pay)' })
      continue
    }

    // In production: call insurer API with policy/patient details
    // For now: create pre-auth record and mark as pending review
    const { data: preauth } = await supabase.from('preauth_requests').insert({
      session_id:     s.id,
      patient_mrn:    (s.patient as any)?.mrn,
      protocol:       (s.plan as any)?.protocol_name,
      session_date:   s.session_date,
      insurer:        ins.provider_name,
      policy_number:  ins.policy_number,
      status:         'submitted',
      submitted_at:   new Date().toISOString(),
    }).select('id').single()

    results.push({ id: s.id, preauth_id: preauth?.id, result: 'submitted' })
  }

  return new Response(JSON.stringify({ processed: results.length, results }))
})
*/

// ────────────────────────────────────────────────────────────
// SQL: notifications table + cron job
// Add to treatment_plans_schema.sql
// ────────────────────────────────────────────────────────────

/*
-- Notifications table
create table public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  session_id      uuid references public.chemo_sessions(id) on delete set null,
  type            text not null,
  channel         text not null,
  message_ar      text not null,
  message_en      text,
  scheduled_at    timestamptz not null,
  sent_at         timestamptz,
  status          text default 'pending',
  recipient_phone text,
  created_at      timestamptz default now()
);
create index idx_notif_status   on public.notifications(status);
create index idx_notif_patient  on public.notifications(patient_id);
create index idx_notif_scheduled on public.notifications(scheduled_at);

alter table public.notifications enable row level security;
create policy "staff read notifications"
  on public.notifications for select
  using (current_user_role() in ('admin','doctor','nurse','receptionist'));
create policy "system manage notifications"
  on public.notifications for all
  using (current_user_role() in ('admin','doctor'));

-- Pre-auth requests table
create table public.preauth_requests (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references public.chemo_sessions(id),
  patient_mrn   text,
  protocol      text,
  session_date  date,
  insurer       text,
  policy_number text,
  status        text default 'pending',
  submitted_at  timestamptz,
  approved_at   timestamptz,
  rejected_at   timestamptz,
  rejection_reason text,
  ref_number    text,
  created_at    timestamptz default now()
);

-- pg_cron: run auto-preauth daily at 8am
-- Requires pg_cron extension enabled in Supabase
select cron.schedule(
  'auto-preauth-daily',
  '0 8 * * *',
  $$ select net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/auto-preauth',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{}'::jsonb
  ) $$
);
*/


// ================================================================
// PART 3 — React Components: ProtocolSelector, LabsEntryForm, SessionCard, ChemoSchedulerPage
// ================================================================

// ============================================================
// CHEMO SCHEDULER — React Components & Additional Hooks
// ============================================================

'use client'
import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ────────────────────────────────────────────────────────────
// HOOK: useCalendarView
// Calendar grid logic — week/month navigation
// ────────────────────────────────────────────────────────────
// lib/hooks/useCalendarView.ts

import type { ChemoSession } from './useChemoScheduler'

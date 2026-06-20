'use client'
import { useState, useCallback, useEffect } from 'react' // تأكد إنها مكتوبة مرة واحدة هنا
import { createClient } from '@/lib/supabase/client'
import type { TreatmentPlan } from './useChemoRegimens'

// ── TYPES & INTERFACES FOR EXPORT ───────────────────────────
export type SessionStatus = 'scheduled' | 'postponed' | 'completed' | 'cancelled' | 'on_hold'

export interface RegimenDrug {
  id: string
  regimen_id: string
  drug_name: string
  dose_mg_flat: number | null
  dose_mg_m2: number | null
  max_dose_mg: number | null
  route: string
  sequence_order: number
}

export interface ChemoRegimen {
  id: string
  name: string
  description?: string | null
  protocol_code?: string | null
  status?: string
  created_at?: string
  regimen_drugs?: RegimenDrug[]
}

export interface ChemoSession {
  id: string
  plan_id: string
  patient_id: string
  cycle_number: number
  session_date: string
  session_time?: string
  actual_date?: string | null
  status: SessionStatus
  room?: string
  bsa_at_session?: number
  weight_at_session?: number
  dose_modified?: boolean
  dose_mod_pct?: number
  dose_mod_reason?: string
  dose_mod_ctcae?: string
  session_notes?: string | null
  adverse_events?: string | null
  administered_by?: string | null
  preauth_status: 'approved' | 'rejected' | 'pending'
  preauth_ref?: string | null
  preauth_date?: string | null
  labs_cleared?: boolean | null
  wbc_pre: number | null
  anc_pre: number | null
  hgb_pre: number | null
  plt_pre: number | null
  alt_pre: number | null
  creatinine_pre: number | null
  plan?: {
    protocol_name: string
    planned_cycles: number
    completed_cycles: number
    cycle_interval_days: number
    bsa_at_start: number
    regimen_id: string
    oncologist?: { full_name_ar: string }
  }
  patient?: {
    mrn: string
    first_name_ar: string
    last_name_ar: string
    first_name_en: string
    last_name_en: string
    mobile_primary: string
  }
}

export type LabsInput = {
  wbc_pre: number | null
  anc_pre: number | null
  hgb_pre: number | null
  plt_pre: number | null
  alt_pre: number | null
  creatinine_pre: number | null
}

export type LabsEvalResult = {
  cleared: boolean
  critical: boolean
  issues: { field: string; message: string; severity: 'critical' | 'warning' }[]
  clears: { field: string; message: string }[]
}

// ────────────────────────────────────────────────────────────
// HOOK: useChemoScheduler
// ────────────────────────────────────────────────────────────
export function useChemoScheduler(filters?: {
  patientId?: string
  dateFrom?: string
  dateTo?: string
  status?: SessionStatus
}) {
  const [sessions, setSessions] = useState<ChemoSession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        .order('session_time', { ascending: true })

      if (filters?.patientId) query = query.eq('patient_id', filters.patientId)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.dateFrom) query = query.gte('session_date', filters.dateFrom)
      if (filters?.dateTo) query = query.lte('session_date', filters.dateTo)

      const { data, error: err } = await query
      if (err) throw err
      setSessions((data as unknown as ChemoSession[]) || [])
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
        fetchSessions()
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
      const conflict = await checkConflict(input.session_date, input.session_time || '', input.room || '', '')
      if (conflict) throw new Error(`تعارض في الجدول: ${conflict}`)

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

      await populateSessionDrugs(session.id, input.plan_id, input.bsa_at_session, input.dose_mod_pct)
      await createPreAuthRequest(session.id)
      await scheduleReminders(session.id)

      setSessions(prev => [...prev, session].sort((a, b) => a.session_date.localeCompare(b.session_date)))
      return session
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }

  // ── POPULATE SESSION DRUGS ─────────────────────────────────
  const populateSessionDrugs = async (sessionId: string, planId: string, bsa?: number, modPct?: number) => {
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

    if (labs.wbc_pre !== null) {
      if (labs.wbc_pre < 2.0) issues.push({ field: 'WBC', severity: 'critical', message: `WBC ${labs.wbc_pre} < 2.0 × 10³/µL — جلسة موقوفة` })
      else if (labs.wbc_pre < 3.5) issues.push({ field: 'WBC', severity: 'warning', message: `WBC ${labs.wbc_pre} منخفض — راجع الطبيب` })
      else clears.push({ field: 'WBC', message: `WBC ${labs.wbc_pre} طبيعي` })
    }
    if (labs.anc_pre !== null) {
      if (labs.anc_pre < 1.0) issues.push({ field: 'ANC', severity: 'critical', message: `ANC ${labs.anc_pre} < 1.0 — خطر توقف الجلسة` })
      else if (labs.anc_pre < 1.5) issues.push({ field: 'ANC', severity: 'warning', message: `ANC ${labs.anc_pre} < 1.5 — ضعف مناعي` })
      else clears.push({ field: 'ANC', message: `ANC ${labs.anc_pre} مناسب للجلسة` })
    }
    if (labs.hgb_pre !== null) {
      if (labs.hgb_pre < 7.0) issues.push({ field: 'Hgb', severity: 'critical', message: `Hgb ${labs.hgb_pre} < 7.0 — نقل دم مطلوب` })
      else if (labs.hgb_pre < 9.0) issues.push({ field: 'Hgb', severity: 'warning', message: `Hgb ${labs.hgb_pre} منخفض` })
      else clears.push({ field: 'Hgb', message: `Hgb ${labs.hgb_pre} مقبول` })
    }
    if (labs.plt_pre !== null) {
      if (labs.plt_pre < 50) issues.push({ field: 'PLT', severity: 'critical', message: `Platelets ${labs.plt_pre} < 50 — موانع مطلقة` })
      else if (labs.plt_pre < 100) issues.push({ field: 'PLT', severity: 'warning', message: `Platelets ${labs.plt_pre} < 100` })
      else clears.push({ field: 'PLT', message: `Platelets ${labs.plt_pre} طبيعي` })
    }
    if (labs.alt_pre !== null) {
      if (labs.alt_pre > 300) issues.push({ field: 'ALT', severity: 'critical', message: `ALT ${labs.alt_pre} مرتفع جداً (>5× ULN)` })
      else if (labs.alt_pre > 150) issues.push({ field: 'ALT', severity: 'warning', message: `ALT ${labs.alt_pre} مرتفع (>2× ULN)` })
      else clears.push({ field: 'ALT', message: `ALT ${labs.alt_pre} طبيعي` })
    }
    if (labs.creatinine_pre !== null) {
      if (labs.creatinine_pre > 2.5) issues.push({ field: 'Cr', severity: 'critical', message: `Creatinine ${labs.creatinine_pre} مرتفع جداً` })
      else if (labs.creatinine_pre > 1.5) issues.push({ field: 'Cr', severity: 'warning', message: `Creatinine ${labs.creatinine_pre} مرتفع` })
      else clears.push({ field: 'Cr', message: `Creatinine ${labs.creatinine_pre} طبيعي` })
    }

    const critical = issues.some(i => i.severity === 'critical')
    const cleared = !critical && issues.filter(i => i.severity === 'critical').length === 0
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

      const { data: plan } = await supabase
        .from('treatment_plans')
        .select('completed_cycles, planned_cycles')
        .eq('id', session.plan_id)
        .single()

      if (plan) {
        const newCount = plan.completed_cycles + 1
        const isDone = newCount >= plan.planned_cycles
        await supabase.from('treatment_plans').update({
          completed_cycles: newCount,
          status: isDone ? 'completed' : 'active',
        }).eq('id', session.plan_id)

        if (!isDone) {
          const nextDate = new Date(session.session_date)
          nextDate.setDate(nextDate.getDate() + ((plan as any).cycle_interval_days || 14))
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

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'completed' } : s))
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

  const getUpcomingSessions = () => {
    const today = new Date().toISOString().split('T')[0]
    const in30days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    return sessions
      .filter(s => s.session_date >= today && s.session_date <= in30days && s.status === 'scheduled')
      .sort((a, b) => a.session_date.localeCompare(b.session_date))
  }

  const getSessionsNeedingLabs = () => {
    const in48h = new Date(Date.now() + 48 * 3600000).toISOString().split('T')[0]
    return sessions.filter(s =>
      s.status === 'scheduled' &&
      s.session_date <= in48h &&
      !s.labs_cleared
    )
  }

  const getPreAuthPending = () => sessions.filter(s => s.status === 'scheduled' && s.preauth_status === 'pending')

  const createPreAuthRequest = async (sessionId: string) => { console.log(`[Pre-auth] Queued ${sessionId}`) }
  const scheduleReminders = async (sessionId: string) => { console.log(`[Reminders] Scheduled ${sessionId}`) }
  const sendSmsNotification = async (phone: string, message: string) => { console.log(`[SMS] To ${phone}: ${message}`) }

  const stats = {
    totalScheduled: sessions.filter(s => s.status === 'scheduled').length,
    completedThisMonth: sessions.filter(s => {
      const now = new Date()
      const d = new Date(s.session_date)
      return s.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
    needingLabs: getSessionsNeedingLabs().length,
    preAuthPending: getPreAuthPending().length,
    upcomingThisWeek: sessions.filter(s => {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const week = new Date(today); week.setDate(week.getDate() + 7)
      const sDate = new Date(s.session_date)
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

// ────────────────────────────────────────────────────────────
// HOOK: useNotifications
// ────────────────────────────────────────────────────────────
export type NotificationChannel = 'sms' | 'whatsapp' | 'email' | 'push' | 'in_app'
export type NotificationType =
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
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_at')
    setNotifications((data as any) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

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
      patient_id: patientId,
      session_id: sessionId,
      type,
      channel: ch,
      message_ar: tpl.message_ar(vars),
      message_en: tpl.message_en(vars),
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending' as const,
      recipient_phone: ch === 'sms' || ch === 'whatsapp' ? recipientPhone : null,
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(entries)
      .select()
    if (error) throw error
    setNotifications(prev => [...((data as any) || []), ...prev])
    return data
  }, [])

  const scheduleSessionReminders = useCallback(async (session: ChemoSession) => {
    if (!session.patient) return
    const pt = session.patient
    const sessDate = new Date(session.session_date)
    const phone = pt.mobile_primary

    const vars = {
      patient_name: `${pt.first_name_ar} ${pt.last_name_ar}`,
      date: session.session_date,
      time: session.session_time || '09:00',
      protocol: session.plan?.protocol_name || '',
      session_date: session.session_date,
      phone: '01XXXXXXXXX',
    }

    const rem48h = new Date(sessDate); rem48h.setHours(rem48h.getHours() - 48)
    await schedule(session.patient_id, session.id, 'session_reminder_48h', ['sms'], vars, rem48h, phone)

    const labs72h = new Date(sessDate); labs72h.setHours(labs72h.getHours() - 72)
    const labsDue = new Date(sessDate); labsDue.setHours(labsDue.getHours() - 48)
    await schedule(session.patient_id, session.id, 'labs_reminder_72h', ['sms'],
      { ...vars, labs_due_date: labsDue.toISOString().split('T')[0] }, labs72h, phone)
  }, [schedule])

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

  const cancel = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ status: 'cancelled' }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return {
    notifications, loading, sending,
    pendingCount: notifications.filter(n => n.status === 'pending').length,
    sentToday: notifications.filter(n => n.sent_at?.startsWith(new Date().toISOString().split('T')[0])).length,
    schedule, scheduleSessionReminders, sendNow, sendAllPending, cancel, refresh: fetchPending,
  }
}

// ────────────────────────────────────────────────────────────
// HOOK: useReporting
// ────────────────────────────────────────────────────────────
export interface SessionReport {
  period: string
  totalSessions: number
  completedSessions: number
  postponedSessions: number
  cancelledSessions: number
  completionRate: number
  avgSessionsPerDay: number
  uniquePatients: number
  protocolBreakdown: Record<string, number>
  sessionsByDay: Record<string, number>
}

export interface PatientProgressReport {
  patientId: string
  patientName: string
  mrn: string
  protocol: string
  startDate: string
  plannedCycles: number
  completedCycles: number
  progressPct: number
  lastSessionDate: string | null
  nextSessionDate: string | null
  status: string
  doseModifications: number
}

export interface LabTrendReport {
  sessionId: string
  cycleNumber: number
  sessionDate: string
  wbc: number | null
  anc: number | null
  hgb: number | null
  plt: number | null
  labsCleared: boolean | null
}

export function useReporting() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const getMonthlyReport = useCallback(async (year: number, month: number): Promise<SessionReport> => {
    setLoading(true)
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: sessions } = await supabase
      .from('chemo_sessions')
      .select('*, plan:treatment_plans(protocol_name)')
      .gte('session_date', from)
      .lte('session_date', to)

    const all = sessions || []
    const done = all.filter(s => s.status === 'completed')
    const post = all.filter(s => s.status === 'postponed')
    const canc = all.filter(s => s.status === 'cancelled')
    const pts = new Set(all.map(s => s.patient_id))
    const days = new Set(all.map(s => s.session_date))

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
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalSessions: all.length,
      completedSessions: done.length,
      postponedSessions: post.length,
      cancelledSessions: canc.length,
      completionRate: all.length ? Math.round((done.length / all.length) * 100) : 0,
      avgSessionsPerDay: days.size ? Math.round((all.length / days.size) * 10) / 10 : 0,
      uniquePatients: pts.size,
      protocolBreakdown,
      sessionsByDay,
    }
  }, [])

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
      const upcoming = sessions.filter((s: any) => s.status === 'scheduled')
        .sort((a: any, b: any) => a.session_date.localeCompare(b.session_date))
      const lastDone = completed.sort((a: any, b: any) => b.session_date.localeCompare(a.session_date))[0]
      const pt = (p as any).patient

      return {
        patientId: p.patient_id,
        patientName: pt ? `${pt.first_name_ar} ${pt.last_name_ar}` : '—',
        mrn: pt?.mrn || '—',
        protocol: p.protocol_name,
        startDate: p.start_date,
        plannedCycles: p.planned_cycles,
        completedCycles: p.completed_cycles,
        progressPct: Math.round((p.completed_cycles / p.planned_cycles) * 100),
        lastSessionDate: lastDone?.session_date || null,
        nextSessionDate: upcoming[0]?.session_date || null,
        status: p.status,
        doseModifications: sessions.filter((s: any) => s.dose_modified).length,
      }
    })

    setLoading(false)
    return reports
  }, [])

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
      sessionId: s.id,
      cycleNumber: s.cycle_number,
      sessionDate: s.session_date,
      wbc: s.wbc_pre,
      anc: s.anc_pre,
      hgb: s.hgb_pre,
      plt: s.plt_pre,
      labsCleared: s.labs_cleared,
    }))
  }, [])

  const getPreauthReport = useCallback(async () => {
    const in7d = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0]
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
    return (data || []) as any[]
  }, [])

  const exportCsv = useCallback(async (year: number, month: number): Promise<string> => {
    setLoading(true)
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: sessions } = await supabase
      .from('chemo_sessions')
      .select('session_date, session_time, status, room, cycle_number, patient:patients(mrn)')
      .gte('session_date', from)
      .lte('session_date', to)

    const rows = [['Date', 'Time', 'MRN', 'Cycle', 'Room', 'Status']]
    sessions?.forEach((s: any) => {
      rows.push([s.session_date, s.session_time || '', s.patient?.mrn || '', String(s.cycle_number), s.room || '', s.status])
    })

    setLoading(false)
    return rows.map(r => r.join(',')).join('\n')
  }, [])

  return {
    loading,
    getMonthlyReport,
    getPatientProgressReport,
    getLabTrends,
    getPreauthReport,
    exportCsv
  }
}
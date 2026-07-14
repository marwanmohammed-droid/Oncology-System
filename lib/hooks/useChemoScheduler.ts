'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  TreatmentPlan, ChemoRegimen, RegimenDrug, ChemoSession, SessionDrug, SessionStatus,
} from './useChemoRegimens'

// إعادة تصدير عشان الملفات اللي بتستورد الأنواع دي من هنا (useOptimisticSessions.ts وغيره)
// تفضل شغالة من غير أي تعديل فيها
export type { TreatmentPlan, ChemoRegimen, RegimenDrug, ChemoSession, SessionDrug, SessionStatus }

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
      .channel(`chemo_sessions_changes_${filters?.patientId ?? 'all'}_${Math.random().toString(36).slice(2)}`)
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
'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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

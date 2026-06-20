// ============================================================
// lib/hooks/usePatientList.ts
// Patient List — Supabase hook with filtering, sorting, pagination
// ============================================================

'use client'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────
export type PatientStatus = 'active' | 'completed' | 'follow_up' | 'palliative' | 'deceased'

export interface PatientListItem {
  id: string
  mrn: string
  first_name_ar: string
  last_name_ar: string
  first_name_en: string
  last_name_en: string
  date_of_birth: string
  sex: 'M' | 'F'
  age: number
  mobile_primary: string
  primary_site: string | null
  stage: string | null
  protocol_name: string | null
  current_cycle: number | null
  total_cycles: number | null
  progress_pct: number | null
  plan_status: string | null
  next_session_date: string | null
  labs_cleared: boolean | null
  wbc_pre: number | null
  required_consents_signed: number
  in_trial: boolean
  insurance_type: string | null
  status: PatientStatus
  oncologist_name: string | null
  registered_at: string
}

export type SortKey =
  | 'name_ar' | 'mrn' | 'age' | 'stage'
  | 'progress_pct' | 'next_session_date' | 'registered_at'

export type SortDir = 'asc' | 'desc'

export interface PatientListFilters {
  query?: string
  cancer?: string
  stage?: string
  protocol?: string
  status?: PatientStatus
  ageMin?: number
  ageMax?: number
  labsAlert?: boolean
  inTrial?: boolean
  oncologistId?: string
}

export interface PatientListState {
  items: PatientListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortKey: SortKey
  sortDir: SortDir
  filters: PatientListFilters
  loading: boolean
  error: string | null
  selectedIds: Set<string>
  stats: {
    total: number
    active: number
    completed: number
    needsLabs: number
    inTrial: number
  }
}

const PAGE_SIZE = 10

export function usePatientList() {
  const supabase = createClient()

  const [allItems, setAllItems] = useState<PatientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('registered_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filters, setFilters] = useState<PatientListFilters>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchPatients = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('patients')
        .select(`
          id, mrn, first_name_ar, last_name_ar,
          first_name_en, last_name_en,
          date_of_birth, sex, mobile_primary, created_at,
          diagnoses(primary_site, stage, icd10_code),
          treatment_plans(
            protocol_name, completed_cycles, planned_cycles,
            status, regimen_id,
            oncologist:profiles!treatment_plans_oncologist_id_fkey(id, full_name_ar),
            chemo_sessions(
              session_date, status, wbc_pre, anc_pre, hgb_pre, labs_cleared
            )
          ),
          consents(status, is_required),
          insurance_policies(insurance_type, is_active)
        `)
        .order('created_at', { ascending: false })

      if (err) throw err

      const today = new Date().toISOString().split('T')[0]

      const mapped: PatientListItem[] = (data || []).map(pt => {
        const dob = new Date(pt.date_of_birth)
        const age = new Date().getFullYear() - dob.getFullYear()

        const plans: any[] = (pt.treatment_plans as any) || []
        const activePlan = plans.find(p => p.status === 'active') || plans[0] || null

        const diags: any[] = (pt.diagnoses as any) || []
        const dx = diags[0] || null

        const sessions: any[] = activePlan?.chemo_sessions || []
        const upcoming = sessions
          .filter((s: any) => s.status === 'scheduled' && s.session_date >= today)
          .sort((a: any, b: any) => a.session_date.localeCompare(b.session_date))
        const nextSession = upcoming[0] || null

        const latestLabs = sessions
          .filter((s: any) => s.wbc_pre !== null)
          .sort((a: any, b: any) => b.session_date.localeCompare(a.session_date))[0]

        const consents: any[] = (pt.consents as any) || []
        const reqSigned = consents.filter((c: any) => c.is_required && c.status === 'signed').length

        const insurance: any[] = (pt.insurance_policies as any) || []
        const activeIns = insurance.find((i: any) => i.is_active) || null

        const completedCycles = activePlan?.completed_cycles ?? null
        const plannedCycles = activePlan?.planned_cycles ?? null
        const progress = completedCycles !== null && plannedCycles
          ? Math.round((completedCycles / plannedCycles) * 100) : null

        let status: PatientStatus = 'active'
        if (!activePlan) status = 'follow_up'
        else if (activePlan.status === 'completed') status = 'completed'
        else if (dx?.stage?.includes('IV')) status = 'palliative'

        const inTrial = consents.some((c: any) =>
          c.consent_type === 'research_trials' && c.status === 'signed')

        return {
          id: pt.id,
          mrn: pt.mrn,
          first_name_ar: pt.first_name_ar,
          last_name_ar: pt.last_name_ar,
          first_name_en: pt.first_name_en,
          last_name_en: pt.last_name_en,
          date_of_birth: pt.date_of_birth,
          sex: pt.sex as 'M' | 'F',
          age,
          mobile_primary: pt.mobile_primary,
          primary_site: dx?.primary_site ?? null,
          stage: dx?.stage ?? null,
          protocol_name: activePlan?.protocol_name ?? null,
          current_cycle: activePlan?.completed_cycles ?? null,
          total_cycles: activePlan?.planned_cycles ?? null,
          progress_pct: progress,
          plan_status: activePlan?.status ?? null,
          next_session_date: nextSession?.session_date ?? null,
          labs_cleared: nextSession?.labs_cleared ?? null,
          wbc_pre: latestLabs?.wbc_pre ?? null,
          required_consents_signed: reqSigned,
          in_trial: inTrial,
          insurance_type: activeIns?.insurance_type ?? null,
          status,
          oncologist_name: activePlan?.oncologist?.full_name_ar ?? null,
          registered_at: pt.created_at,
        }
      })

      setAllItems(mapped)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  useEffect(() => {
    const channel = supabase
      .channel('patients_list_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' },
        () => fetchPatients())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chemo_sessions' },
        () => fetchPatients())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPatients])

  const filtered = useMemo(() => {
    const q = filters.query?.toLowerCase() || ''
    return allItems.filter(p => {
      if (q) {
        const match = [
          p.first_name_ar, p.last_name_ar,
          p.first_name_en, p.last_name_en,
          p.mrn, p.mobile_primary,
        ].some(f => f?.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filters.cancer && p.primary_site !== filters.cancer) return false
      if (filters.protocol && p.protocol_name !== filters.protocol) return false
      if (filters.status && p.status !== filters.status) return false
      if (filters.stage && !p.stage?.startsWith(filters.stage)) return false
      if (filters.ageMin && p.age < filters.ageMin) return false
      if (filters.ageMax && p.age > filters.ageMax) return false
      if (filters.inTrial && !p.in_trial) return false
      if (filters.labsAlert) {
        const hasAlert = p.wbc_pre !== null && p.wbc_pre < 3.5
        if (!hasAlert) return false
      }
      return true
    })
  }, [allItems, filters])

  const sorted = useMemo<typeof filtered>(() => {
    return [...filtered].sort((a, b) => {
      let av: any = (a as any)[sortKey]
      let bv: any = (b as any)[sortKey]

      if (av === null || av === undefined) av = sortDir === 'asc' ? Infinity : -Infinity
      if (bv === null || bv === undefined) bv = sortDir === 'asc' ? Infinity : -Infinity

      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [filtered, sortKey, sortDir])

  const stats = useMemo(() => ({
    total: allItems.length,
    active: allItems.filter(p => p.status === 'active').length,
    completed: allItems.filter(p => p.status === 'completed').length,
    needsLabs: allItems.filter(p => p.wbc_pre !== null && p.wbc_pre < 3.5).length,
    inTrial: allItems.filter(p => p.in_trial).length,
  }), [allItems])

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }, [sortKey])

  const updateFilters = useCallback((updates: Partial<PatientListFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({})
    setPage(1)
  }, [])

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE)

  const goPage = useCallback((n: number) => {
    if (n < 1 || n > totalPages) return
    setPage(n)
  }, [totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return sorted.slice(start, start + ITEMS_PER_PAGE)
  }, [sorted, page, ITEMS_PER_PAGE])

  const selectedPatients = useMemo(
    () => sorted.filter(p => selectedIds.has(p.id)),
    [sorted, selectedIds]
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback((select: boolean) => {
    setSelectedIds(select ? new Set(pageItems.map(p => p.id)) : new Set())
  }, [pageItems])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const exportCsv = useCallback((data: PatientListItem[] = sorted) => {
    const headers = [
      'MRN', 'Name AR', 'Name EN', 'DOB', 'Sex', 'Age',
      'Cancer', 'Stage', 'Protocol', 'Plan Status',
      'Progress %', 'Next Session', 'Labs Cleared', 'Insurance', 'In Trial'
    ]
    const rows = data.map(p => [
      p.mrn,
      `${p.first_name_ar} ${p.last_name_ar}`,
      `${p.first_name_en} ${p.last_name_en}`,
      p.date_of_birth, p.sex, p.age,
      p.primary_site ?? '', p.stage ?? '',
      p.protocol_name ?? '', p.plan_status ?? '',
      p.progress_pct ?? '', p.next_session_date ?? '',
      p.labs_cleared ? 'Yes' : 'No',
      p.insurance_type ?? '',
      p.in_trial ? 'Yes' : 'No',
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [sorted])

  const sendBulkSms = useCallback(async (message: string) => {
    const phones = selectedPatients.map(p => p.mobile_primary).filter(Boolean)
    if (phones.length === 0) return

    const { error } = await supabase.functions.invoke('send-bulk-sms', {
      body: { phones, message }
    })
    if (error) throw error
  }, [selectedPatients, supabase])

  const highlight = useCallback((text: string): string => {
    const q = filters.query?.trim()
    if (!q || !text) return text
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
  }, [filters.query])

  return {
    items: pageItems, allItems, sorted, filtered,
    total: sorted.length, page, pageSize: PAGE_SIZE,
    totalPages, sortKey, sortDir, filters, loading, error, stats,
    selectedIds, selectedPatients,
    toggleSelect, toggleSelectAll, clearSelection,
    toggleSort, updateFilters, resetFilters, goPage,
    exportCsv, sendBulkSms, highlight,
    refresh: fetchPatients,
  }
}
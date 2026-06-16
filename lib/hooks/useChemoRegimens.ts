'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SessionStatus  = 'scheduled' | 'upcoming' | 'completed' | 'postponed' | 'cancelled' | 'ongoing'
export type PlanStatus     = 'planned' | 'active' | 'on_hold' | 'completed' | 'discontinued' | 'cancelled'
export type DrugRoute      = 'IV' | 'PO' | 'SC' | 'IM' | 'IT' | 'topical' | 'inhalation'

export interface ChemoRegimen {
  id: string
  name: string
  full_name: string | null
  cancer_type: string[]
  cycle_frequency: string
  standard_cycles: number | null
  cycle_length_days: number
  regimen_class: string
  is_platinum_based: boolean
  is_anthracycline_based: boolean
  requires_gcsf: boolean
  requires_premedication: boolean
  premedication_details: string | null
  nccn_category: string | null
  is_active: boolean
}

export interface RegimenDrug {
  id: string
  regimen_id: string
  drug_name: string
  drug_class: string | null
  dose_mg_m2: number | null
  dose_mg_flat: number | null
  dose_auc: number | null
  dose_unit: string
  max_dose_mg: number | null
  route: DrugRoute
  day_number: number[]
  infusion_duration_min: number | null
  sequence_order: number
  dose_modification_notes: string | null
  renal_adjustment_required: boolean
  hepatic_adjustment_required: boolean
}

export interface TreatmentPlan {
  id: string
  patient_id: string
  diagnosis_id: string | null
  intent: string
  line_of_therapy: string
  protocol_name: string
  regimen_id: string | null
  start_date: string
  planned_cycles: number
  completed_cycles: number
  cycle_interval_days: number
  bsa_at_start: number | null
  weight_at_start: number | null
  height_at_start: number | null
  status: PlanStatus
  end_date: string | null
  oncologist_id: string | null
  tumor_board_approved: boolean
  plan_notes: string | null
  created_at: string
  // joins
  regimen?: ChemoRegimen
  oncologist?: { full_name_ar: string; full_name_en: string }
  patient?: { mrn: string; first_name_ar: string; last_name_ar: string; first_name_en: string; last_name_en: string; mobile_primary: string }
}

export interface ChemoSession {
  id: string
  plan_id: string
  patient_id: string
  cycle_number: number
  session_date: string
  session_time: string | null
  room: string | null
  status: SessionStatus
  actual_date: string | null
  bsa_at_session: number | null
  weight_at_session: number | null
  // Pre-session labs
  wbc_pre: number | null
  anc_pre: number | null
  hgb_pre: number | null
  plt_pre: number | null
  alt_pre: number | null
  creatinine_pre: number | null
  labs_cleared: boolean | null
  // Dose modification
  dose_modified: boolean
  dose_mod_pct: number | null
  dose_mod_reason: string | null
  dose_mod_ctcae: string | null
  // Pre-auth
  preauth_status: string
  preauth_ref: string | null
  preauth_date: string | null
  // Post
  session_notes: string | null
  adverse_events: string | null
  next_session_date: string | null
  administered_by: string | null
  created_at: string
  // joins
  plan?: TreatmentPlan
  patient?: { mrn: string; first_name_ar: string; last_name_ar: string; first_name_en: string; last_name_en: string; mobile_primary: string }
  session_drugs?: SessionDrug[]
}

export interface SessionDrug {
  id: string
  session_id: string
  regimen_drug_id: string | null
  drug_name: string
  planned_dose_mg: number | null
  actual_dose_mg: number | null
  route: DrugRoute | null
  infusion_start: string | null
  infusion_end: string | null
  lot_number: string | null
  administered: boolean
  notes: string | null
}

// ────────────────────────────────────────────────────────────
// HOOK: useChemoRegimens
// Fetches master protocol library
// ────────────────────────────────────────────────────────────
// lib/hooks/useChemoRegimens.ts

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useChemoRegimens() {
  const [regimens, setRegimens]   = useState<ChemoRegimen[]>([])
  const [drugs, setDrugs]         = useState<Record<string, RegimenDrug[]>>({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const supabase = createClient()

  const fetchRegimens = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch active regimens
      const { data: regs, error: regsErr } = await supabase
        .from('chemo_regimens')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (regsErr) throw regsErr

      // Fetch all regimen drugs in one query
      const { data: allDrugs, error: drugsErr } = await supabase
        .from('regimen_drugs')
        .select('*')
        .order('sequence_order')
      if (drugsErr) throw drugsErr

      setRegimens(regs || [])
      // Group drugs by regimen_id
      const grouped: Record<string, RegimenDrug[]> = {}
      ;(allDrugs || []).forEach(d => {
        if (!grouped[d.regimen_id]) grouped[d.regimen_id] = []
        grouped[d.regimen_id].push(d)
      })
      setDrugs(grouped)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRegimens() }, [fetchRegimens])

  // Helper: get drugs for a specific regimen
  const getRegimenDrugs = (regimenId: string) => drugs[regimenId] || []

  // Helper: calculate actual dose from BSA
  const calcDose = (drug: RegimenDrug, bsa: number, modPct: number = 0): number => {
    let base: number
    if (drug.dose_mg_flat)  base = drug.dose_mg_flat
    else if (drug.dose_mg_m2) base = drug.dose_mg_m2 * bsa
    else return 0
    const modified = base * (1 + modPct / 100)
    // Apply max dose cap
    if (drug.max_dose_mg && modified > drug.max_dose_mg) return drug.max_dose_mg
    return Math.round(modified * 10) / 10
  }

  return { regimens, drugs, loading, error, getRegimenDrugs, calcDose, refresh: fetchRegimens }
}

// ────────────────────────────────────────────────────────────
// HOOK: useTreatmentPlans
// Manage patient treatment plans
// ────────────────────────────────────────────────────────────
// lib/hooks/useTreatmentPlans.ts

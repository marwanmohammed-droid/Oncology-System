'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TreatmentPlan, ChemoRegimen, PlanStatus } from './useChemoRegimens'

export function useTreatmentPlans(patientId?: string) {
  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('treatment_plans')
        .select(`
          *,
          regimen:chemo_regimens(name, full_name, cycle_length_days, requires_gcsf, requires_premedication, premedication_details),
          oncologist:profiles!treatment_plans_oncologist_id_fkey(full_name_ar, full_name_en),
          patient:patients(mrn, first_name_ar, last_name_ar, first_name_en, last_name_en, mobile_primary)
        `)
        .order('created_at', { ascending: false })

      if (patientId) query = query.eq('patient_id', patientId)

      const { data, error: err } = await query
      if (err) throw err
      setPlans(data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  // Create a new treatment plan
  const createPlan = async (plan: Omit<TreatmentPlan, 'id' | 'created_at' | 'completed_cycles'>) => {
    const { data, error: err } = await supabase
      .from('treatment_plans')
      .insert({ ...plan, completed_cycles: 0 })
      .select(`*, regimen:chemo_regimens(name, full_name, cycle_length_days)`)
      .single()
    if (err) throw err
    setPlans(prev => [data, ...prev])
    return data
  }

  // Update plan status
  const updatePlanStatus = async (planId: string, status: PlanStatus, notes?: string) => {
    const { error: err } = await supabase
      .from('treatment_plans')
      .update({ status, plan_notes: notes, end_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null })
      .eq('id', planId)
    if (err) throw err
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, status } : p))
  }

  // Increment completed cycles
  const incrementCycles = async (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    const newCount = plan.completed_cycles + 1
    const newStatus: PlanStatus = newCount >= plan.planned_cycles ? 'completed' : 'active'
    const { error: err } = await supabase
      .from('treatment_plans')
      .update({ completed_cycles: newCount, status: newStatus })
      .eq('id', planId)
    if (err) throw err
    setPlans(prev => prev.map(p => p.id === planId
      ? { ...p, completed_cycles: newCount, status: newStatus }
      : p
    ))
  }

  const progressPct = (plan: TreatmentPlan) =>
    Math.round((plan.completed_cycles / plan.planned_cycles) * 100)

  return { plans, loading, error, createPlan, updatePlanStatus, incrementCycles, progressPct, refresh: fetchPlans }
}

// ────────────────────────────────────────────────────────────
// HOOK: useChemoScheduler (main hook)
// Full session management with real-time updates
// ────────────────────────────────────────────────────────────
// lib/hooks/useChemoScheduler.ts

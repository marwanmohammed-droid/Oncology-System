'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ClinicalTrial {
    id: string
    trial_name: string
    trial_code: string | null
    sponsor: string | null
    phase: string | null
    cancer_type: string | null
    status: string
    principal_investigator_id: string | null
    irb_approval_number: string | null
    start_date: string | null
    end_date: string | null
    description: string | null
    eligibility_criteria: string | null
    created_at: string
    investigator?: { full_name_ar: string }
    enrollments?: { id: string }[]
}

export interface TrialEnrollment {
    id: string
    trial_id: string
    patient_id: string
    enrollment_date: string
    status: string
    withdrawal_reason: string | null
    consent_signed: boolean
    notes: string | null
    trial?: { trial_name: string; trial_code: string | null }
    patient?: { mrn: string; first_name_ar: string; last_name_ar: string }
}

export function useClinicalTrials() {
    const [trials, setTrials] = useState<ClinicalTrial[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchTrials = useCallback(async () => {
        setLoading(true)
        const { data, error: err } = await supabase
            .from('clinical_trials')
            .select(`*, investigator:profiles!clinical_trials_principal_investigator_id_fkey(full_name_ar), enrollments:trial_enrollments(id)`)
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        setTrials(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchTrials() }, [fetchTrials])

    const createTrial = async (input: Partial<ClinicalTrial>) => {
        setSaving(true); setError(null)
        try {
            const { data, error: err } = await supabase
                .from('clinical_trials')
                .insert(input)
                .select('*')
                .single()
            if (err) throw err
            await fetchTrials()
            return data
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const updateTrialStatus = async (trialId: string, status: string) => {
        const { error: err } = await supabase
            .from('clinical_trials')
            .update({ status })
            .eq('id', trialId)
        if (err) { setError(err.message); return }
        setTrials(prev => prev.map(t => t.id === trialId ? { ...t, status } : t))
    }

    const enrollPatient = async (trialId: string, patientId: string, notes?: string) => {
        setSaving(true); setError(null)
        try {
            const { error: err } = await supabase
                .from('trial_enrollments')
                .insert({ trial_id: trialId, patient_id: patientId, notes: notes || null })
            if (err) throw err
            await fetchTrials()
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const getEnrollments = useCallback(async (trialId?: string, patientId?: string): Promise<TrialEnrollment[]> => {
        let query = supabase
            .from('trial_enrollments')
            .select(`*, trial:clinical_trials(trial_name, trial_code), patient:patients(mrn, first_name_ar, last_name_ar)`)
            .order('enrollment_date', { ascending: false })
        if (trialId) query = query.eq('trial_id', trialId)
        if (patientId) query = query.eq('patient_id', patientId)
        const { data } = await query
        return (data as any) || []
    }, [])

    const updateEnrollmentStatus = async (enrollmentId: string, status: string, withdrawalReason?: string) => {
        const { error: err } = await supabase
            .from('trial_enrollments')
            .update({ status, withdrawal_reason: withdrawalReason || null })
            .eq('id', enrollmentId)
        if (err) { setError(err.message); throw err }
    }

    return {
        trials, loading, saving, error,
        createTrial, updateTrialStatus, enrollPatient, getEnrollments, updateEnrollmentStatus,
        refresh: fetchTrials,
    }
}
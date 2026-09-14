'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProtocolHistoryEntry {
    id: string
    patient_id: string
    diagnosis_id: string | null
    protocol_name: string
    num_cycles: number | null
    duration_months: number | null
    start_date: string | null
    end_date: string | null
    is_ongoing: boolean
    regimen_class: string | null
    notes: string | null
    created_at: string
    patient?: { mrn: string; first_name_ar: string; last_name_ar: string }
}

export function useProtocolHistory(patientId?: string) {
    const [entries, setEntries] = useState<ProtocolHistoryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchEntries = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('prior_treatment_protocols')
            .select(`*, patient:patients(mrn, first_name_ar, last_name_ar)`)
            .order('start_date', { ascending: false })
        if (patientId) query = query.eq('patient_id', patientId)
        const { data, error: err } = await query
        if (err) setError(err.message)
        setEntries((data as any) || [])
        setLoading(false)
    }, [patientId])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    const addEntry = async (input: {
        patient_id: string
        protocol_name: string
        regimen_class?: string
        num_cycles?: number | null
        start_date: string
        end_date?: string | null
        is_ongoing: boolean
        notes?: string
    }) => {
        setSaving(true); setError(null)
        try {
            let durationMonths: number | null = null
            if (input.start_date && input.end_date) {
                const days = (new Date(input.end_date).getTime() - new Date(input.start_date).getTime()) / (1000 * 60 * 60 * 24)
                durationMonths = Math.round((days / 30) * 10) / 10
            }

            // نجيب آخر تشخيص للمريض عشان نربطه
            const { data: diag } = await supabase
                .from('diagnoses').select('id').eq('patient_id', input.patient_id)
                .order('created_at', { ascending: false }).limit(1).maybeSingle()

            const { data, error: err } = await supabase
                .from('prior_treatment_protocols')
                .insert({
                    patient_id: input.patient_id,
                    diagnosis_id: diag?.id ?? null,
                    protocol_name: input.protocol_name,
                    regimen_class: input.regimen_class || null,
                    num_cycles: input.num_cycles ?? null,
                    duration_months: durationMonths,
                    start_date: input.start_date,
                    end_date: input.is_ongoing ? null : (input.end_date || null),
                    is_ongoing: input.is_ongoing,
                    notes: input.notes || null,
                })
                .select('*')
                .single()
            if (err) throw err
            await fetchEntries()
            return data
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const markCompleted = async (id: string, endDate: string) => {
        setSaving(true); setError(null)
        try {
            const { error: err } = await supabase
                .from('prior_treatment_protocols')
                .update({ is_ongoing: false, end_date: endDate })
                .eq('id', id)
            if (err) throw err
            await fetchEntries()
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const deleteEntry = async (id: string) => {
        setSaving(true); setError(null)
        try {
            const { error: err } = await supabase.from('prior_treatment_protocols').delete().eq('id', id)
            if (err) throw err
            setEntries(prev => prev.filter(e => e.id !== id))
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    return { entries, loading, saving, error, addEntry, markCompleted, deleteEntry, refresh: fetchEntries }
}
'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LabResult {
    id: string
    patient_id: string
    ordered_by: string | null
    test_category: string
    test_name: string
    result_value: number | null
    result_text: string | null
    unit: string | null
    reference_range: string | null
    is_abnormal: boolean
    is_critical: boolean
    test_date: string
    reviewed_by: string | null
    reviewed_at: string | null
    notes: string | null
    created_at: string
    patient?: { mrn: string; first_name_ar: string; last_name_ar: string }
}

const CATEGORY_LABELS: Record<string, string> = {
    cbc: 'تعداد دم كامل (CBC)',
    chemistry: 'كيمياء الدم',
    tumor_markers: 'علامات الأورام',
    coagulation: 'تخثر الدم',
    liver_function: 'وظائف الكبد',
    kidney_function: 'وظائف الكلى',
    other: 'أخرى',
}

export function useLabResults(patientId?: string) {
    const [results, setResults] = useState<LabResult[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchResults = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('lab_results')
            .select(`*, patient:patients(mrn, first_name_ar, last_name_ar)`)
            .order('test_date', { ascending: false })
        if (patientId) query = query.eq('patient_id', patientId)
        const { data, error: err } = await query
        if (err) setError(err.message)
        setResults(data || [])
        setLoading(false)
    }, [patientId])

    useEffect(() => { fetchResults() }, [fetchResults])

    const addResult = async (input: Partial<LabResult>) => {
        setSaving(true); setError(null)
        try {
            const { data, error: err } = await supabase
                .from('lab_results')
                .insert(input)
                .select('*')
                .single()
            if (err) throw err
            await fetchResults()
            return data
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const markReviewed = async (resultId: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        const { error: err } = await supabase
            .from('lab_results')
            .update({ reviewed_by: user?.id || null, reviewed_at: new Date().toISOString() })
            .eq('id', resultId)
        if (err) { setError(err.message); return }
        setResults(prev => prev.map(r => r.id === resultId ? { ...r, reviewed_at: new Date().toISOString() } : r))
    }

    const criticalResults = results.filter(r => r.is_critical && !r.reviewed_at)

    return {
        results, loading, saving, error,
        addResult, markReviewed, criticalResults,
        categoryLabels: CATEGORY_LABELS,
        refresh: fetchResults,
    }
}
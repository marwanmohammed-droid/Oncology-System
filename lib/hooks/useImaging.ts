'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ImagingStudy {
    id: string
    patient_id: string
    ordered_by: string | null
    imaging_type: string
    body_region: string | null
    study_date: string
    status: string
    findings: string | null
    impression: string | null
    is_baseline: boolean
    response_assessment: string | null
    radiologist_name: string | null
    reported_at: string | null
    file_url: string | null
    notes: string | null
    created_at: string
    patient?: { mrn: string; first_name_ar: string; last_name_ar: string }
}

export const IMAGING_TYPE_LABELS: Record<string, string> = {
    xray: 'أشعة سينية (X-Ray)',
    ct: 'أشعة مقطعية (CT)',
    pet: 'بيت سكان (PET)',
    pet_ct: 'بيت-مقطعية (PET/CT)',
    bone_scan: 'مسح عظمي (Bone Scan)',
    mri: 'رنين مغناطيسي (MRI)',
    ultrasound: 'موجات صوتية (Ultrasound)',
}

const RESPONSE_LABELS: Record<string, string> = {
    complete_response: 'استجابة كاملة',
    partial_response: 'استجابة جزئية',
    stable_disease: 'مرض مستقر',
    progressive_disease: 'تطور المرض',
}

export function useImaging(patientId?: string) {
    const [studies, setStudies] = useState<ImagingStudy[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchStudies = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('imaging_studies')
            .select(`*, patient:patients(mrn, first_name_ar, last_name_ar)`)
            .order('study_date', { ascending: false })
        if (patientId) query = query.eq('patient_id', patientId)
        const { data, error: err } = await query
        if (err) setError(err.message)
        setStudies(data || [])
        setLoading(false)
    }, [patientId])

    useEffect(() => { fetchStudies() }, [fetchStudies])

    const addStudy = async (input: Partial<ImagingStudy>) => {
        setSaving(true); setError(null)
        try {
            const { data, error: err } = await supabase
                .from('imaging_studies')
                .insert(input)
                .select('*')
                .single()
            if (err) throw err
            await fetchStudies()
            return data
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const updateStatus = async (studyId: string, status: string) => {
        const { error: err } = await supabase
            .from('imaging_studies')
            .update({ status })
            .eq('id', studyId)
        if (err) { setError(err.message); return }
        setStudies(prev => prev.map(s => s.id === studyId ? { ...s, status } : s))
    }

    const addReport = async (studyId: string, findings: string, impression: string, radiologistName: string, responseAssessment?: string) => {
        setSaving(true); setError(null)
        try {
            const { error: err } = await supabase
                .from('imaging_studies')
                .update({
                    findings, impression,
                    radiologist_name: radiologistName,
                    response_assessment: responseAssessment || null,
                    status: 'completed',
                    reported_at: new Date().toISOString(),
                })
                .eq('id', studyId)
            if (err) throw err
            await fetchStudies()
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    return {
        studies, loading, saving, error,
        addStudy, updateStatus, addReport,
        typeLabels: IMAGING_TYPE_LABELS,
        responseLabels: RESPONSE_LABELS,
        refresh: fetchStudies,
    }
}
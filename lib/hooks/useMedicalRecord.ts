'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MedicalRecordData {
    patient: any
    diagnoses: any[]
    biomarkers: any[]
    pathologyTests: any[]
    priorProtocols: any[]
    medicalHistory: any | null
    vitalSigns: any[]
    treatmentPlans: any[]
    chemoSessions: any[]
    labResults: any[]
    imagingStudies: any[]
    progressNotes: any[]
}

export function useMedicalRecord(patientId: string) {
    const [data, setData] = useState<MedicalRecordData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchRecord = useCallback(async () => {
        if (!patientId) return
        setLoading(true); setError(null)
        try {
            const [
                { data: patient, error: ptErr },
                { data: diagnoses },
                { data: medicalHistory },
                { data: vitalSigns },
                { data: treatmentPlans },
                { data: chemoSessions },
                { data: pathologyTests },
                { data: priorProtocols },
                { data: labResults },
                { data: imagingStudies },
                { data: progressNotes },
            ] = await Promise.all([
                supabase.from('patients').select('*').eq('id', patientId).single(),
                supabase.from('diagnoses').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
                supabase.from('medical_history').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
                supabase.from('vital_signs').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false }),
                supabase.from('treatment_plans')
                    .select(`*, regimen:chemo_regimens(name, full_name), oncologist:profiles!treatment_plans_oncologist_id_fkey(full_name_ar)`)
                    .eq('patient_id', patientId)
                    .order('start_date', { ascending: false }),
                supabase.from('chemo_sessions')
                    .select(`
            *,
            plan:treatment_plans(protocol_name),
            session_drugs(drug_name, planned_dose_mg, actual_dose_mg, administered)
          `)
                    .eq('patient_id', patientId)
                    .order('session_date', { ascending: false }),
                supabase.from('pathology_tests').select('*').eq('patient_id', patientId).order('test_date', { ascending: false }),
                supabase.from('prior_treatment_protocols').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
                supabase.from('lab_results').select('*').eq('patient_id', patientId).order('test_date', { ascending: false }),
                supabase.from('imaging_studies').select('*').eq('patient_id', patientId).order('study_date', { ascending: false }),
                supabase.from('progress_notes')
                    .select(`*, author:profiles!progress_notes_author_id_fkey(full_name_ar)`)
                    .eq('patient_id', patientId)
                    .order('note_date', { ascending: false }),
            ])

            if (ptErr) throw ptErr

            // biomarkers مرتبطة بالتشخيص، فبنجيبها لكل diagnosis_id (نظام قديم — لسه موجود لو فيه بيانات تاريخية)
            let biomarkers: any[] = []
            if (diagnoses?.length) {
                const diagIds = diagnoses.map(d => d.id)
                const { data: bio } = await supabase
                    .from('biomarkers')
                    .select('*')
                    .in('diagnosis_id', diagIds)
                biomarkers = bio || []
            }

            setData({
                patient,
                diagnoses: diagnoses || [],
                biomarkers,
                pathologyTests: pathologyTests || [],
                priorProtocols: priorProtocols || [],
                medicalHistory: medicalHistory || null,
                vitalSigns: vitalSigns || [],
                treatmentPlans: treatmentPlans || [],
                chemoSessions: chemoSessions || [],
                labResults: labResults || [],
                imagingStudies: imagingStudies || [],
                progressNotes: progressNotes || [],
            })
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [patientId])

    useEffect(() => { fetchRecord() }, [fetchRecord])

    return { data, loading, error, refresh: fetchRecord }
}
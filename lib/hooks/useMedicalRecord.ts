'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MedicalRecordData {
    patient: any
    diagnoses: any[]
    biomarkers: any[]
    medicalHistory: any | null
    treatmentPlans: any[]
    chemoSessions: any[]
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
                { data: treatmentPlans },
                { data: chemoSessions },
            ] = await Promise.all([
                supabase.from('patients').select('*').eq('id', patientId).single(),
                supabase.from('diagnoses').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
                supabase.from('medical_history').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
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
            ])

            if (ptErr) throw ptErr

            // biomarkers مرتبطة بالتشخيص، فبنجيبها لكل diagnosis_id
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
                medicalHistory: medicalHistory || null,
                treatmentPlans: treatmentPlans || [],
                chemoSessions: chemoSessions || [],
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
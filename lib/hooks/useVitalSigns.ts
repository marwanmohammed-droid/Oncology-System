'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface VitalSign {
    id: string
    patient_id: string
    session_id: string | null
    recorded_by: string | null
    recorded_at: string
    temperature_c: number | null
    bp_systolic: number | null
    bp_diastolic: number | null
    pulse_bpm: number | null
    respiratory_rate: number | null
    spo2_pct: number | null
    pain_score: number | null
    pallor: boolean | null
    jaundice: boolean | null
    hbv_status: 'positive' | 'negative' | null
    hcv_status: 'positive' | 'negative' | null
    hiv_status: 'positive' | 'negative' | null
    notes: string | null
}

export interface VitalFlags {
    fever: boolean
    hypotension: boolean
    hypertension: boolean
    tachycardia: boolean
    bradycardia: boolean
    lowSpo2: boolean
    severePain: boolean
    pallorPresent: boolean
    jaundicePresent: boolean
    virologyPositive: boolean
    anyAbnormal: boolean
}

export function evaluateVitals(v: Partial<VitalSign>): VitalFlags {
    const fever = v.temperature_c != null && v.temperature_c >= 38.0
    const hypotension = v.bp_systolic != null && v.bp_systolic < 90
    const hypertension = v.bp_systolic != null && v.bp_systolic >= 140
    const tachycardia = v.pulse_bpm != null && v.pulse_bpm > 100
    const bradycardia = v.pulse_bpm != null && v.pulse_bpm < 60
    const lowSpo2 = v.spo2_pct != null && v.spo2_pct < 94
    const severePain = v.pain_score != null && v.pain_score >= 7
    const pallorPresent = v.pallor === true
    const jaundicePresent = v.jaundice === true
    const virologyPositive = v.hbv_status === 'positive' || v.hcv_status === 'positive' || v.hiv_status === 'positive'

    return {
        fever, hypotension, hypertension, tachycardia, bradycardia, lowSpo2, severePain,
        pallorPresent, jaundicePresent, virologyPositive,
        anyAbnormal: fever || hypotension || hypertension || tachycardia || bradycardia || lowSpo2 || severePain || pallorPresent || jaundicePresent || virologyPositive,
    }
}

export function useVitalSigns(patientId?: string) {
    const [vitals, setVitals] = useState<VitalSign[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchVitals = useCallback(async () => {
        if (!patientId) { setLoading(false); return }
        setLoading(true)
        const { data, error: err } = await supabase
            .from('vital_signs')
            .select('*')
            .eq('patient_id', patientId)
            .order('recorded_at', { ascending: false })
        if (err) setError(err.message)
        setVitals(data || [])
        setLoading(false)
    }, [patientId])

    useEffect(() => { fetchVitals() }, [fetchVitals])

    const addVitals = async (input: Omit<VitalSign, 'id' | 'created_at' | 'recorded_by'>) => {
        setSaving(true); setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error: err } = await supabase
                .from('vital_signs')
                .insert({ ...input, recorded_by: user?.id || null })
                .select('*')
                .single()
            if (err) throw err
            setVitals(prev => [data, ...prev])
            return data
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const latestVitals = vitals[0] || null

    return { vitals, latestVitals, loading, saving, error, addVitals, refresh: fetchVitals }
}
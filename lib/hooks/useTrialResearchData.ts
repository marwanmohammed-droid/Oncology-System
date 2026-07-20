'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TrialResearchRow {
    enrollmentId: string
    patientId: string
    mrn: string
    patientName: string
    enrollmentDate: string
    enrollmentStatus: string
    age: number
    sex: string
    primarySite: string | null
    stage: string | null
    ecogPs: string | null
    activeProtocol: string | null
    completedCycles: number | null
    plannedCycles: number | null
    totalSessions: number
    completedSessions: number
    doseModifications: number
    adverseEventsCount: number
    lastResponseAssessment: string | null
    lastResponseDate: string | null
    latestCriticalLab: string | null
}

const RESPONSE_LABELS: Record<string, string> = {
    complete_response: 'استجابة كاملة',
    partial_response: 'استجابة جزئية',
    stable_disease: 'مرض مستقر',
    progressive_disease: 'تطور المرض',
}

export function useTrialResearchData() {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const getTrialResearchData = useCallback(async (trialId: string): Promise<TrialResearchRow[]> => {
        setLoading(true)
        try {
            const { data: enrollments } = await supabase
                .from('trial_enrollments')
                .select(`
          id, patient_id, enrollment_date, status,
          patient:patients(mrn, first_name_ar, last_name_ar, date_of_birth, sex)
        `)
                .eq('trial_id', trialId)

            if (!enrollments?.length) return []

            const patientIds = enrollments.map((e: any) => e.patient_id)

            const [
                { data: diagnoses },
                { data: history },
                { data: plans },
                { data: sessions },
                { data: imagingStudies },
                { data: criticalLabs },
            ] = await Promise.all([
                supabase.from('diagnoses').select('patient_id, primary_site, stage').in('patient_id', patientIds).order('created_at', { ascending: false }),
                supabase.from('medical_history').select('patient_id, ecog_ps').in('patient_id', patientIds).order('created_at', { ascending: false }),
                supabase.from('treatment_plans').select('patient_id, protocol_name, completed_cycles, planned_cycles, status').in('patient_id', patientIds).eq('status', 'active'),
                supabase.from('chemo_sessions').select('patient_id, status, dose_modified, adverse_events').in('patient_id', patientIds),
                supabase.from('imaging_studies').select('patient_id, response_assessment, study_date').in('patient_id', patientIds).not('response_assessment', 'is', null).order('study_date', { ascending: false }),
                supabase.from('lab_results').select('patient_id, test_name, result_value, unit, test_date').in('patient_id', patientIds).eq('is_critical', true).order('test_date', { ascending: false }),
            ])

            const byPatient = <T,>(rows: T[] | null, key: string) => {
                const map: Record<string, T[]> = {}
                    ; (rows || []).forEach((r: any) => {
                        if (!map[r[key]]) map[r[key]] = []
                        map[r[key]].push(r)
                    })
                return map
            }

            const diagByPatient = byPatient(diagnoses, 'patient_id')
            const historyByPatient = byPatient(history, 'patient_id')
            const plansByPatient = byPatient(plans, 'patient_id')
            const sessionsByPatient = byPatient(sessions, 'patient_id')
            const imagingByPatient = byPatient(imagingStudies, 'patient_id')
            const labsByPatient = byPatient(criticalLabs, 'patient_id')

            const rows: TrialResearchRow[] = enrollments.map((e: any) => {
                const pt = e.patient
                const age = pt ? Math.floor((Date.now() - new Date(pt.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0
                const diag = diagByPatient[e.patient_id]?.[0]
                const hist = historyByPatient[e.patient_id]?.[0]
                const plan = plansByPatient[e.patient_id]?.[0]
                const patientSessions = sessionsByPatient[e.patient_id] || []
                const imaging = imagingByPatient[e.patient_id]?.[0]
                const criticalLab = labsByPatient[e.patient_id]?.[0]

                return {
                    enrollmentId: e.id,
                    patientId: e.patient_id,
                    mrn: pt?.mrn || '—',
                    patientName: pt ? `${pt.first_name_ar} ${pt.last_name_ar}` : '—',
                    enrollmentDate: e.enrollment_date,
                    enrollmentStatus: e.status,
                    age,
                    sex: pt?.sex === 'M' ? 'ذكر' : 'أنثى',
                    primarySite: diag?.primary_site || null,
                    stage: diag?.stage || null,
                    ecogPs: hist?.ecog_ps || null,
                    activeProtocol: plan?.protocol_name || null,
                    completedCycles: plan?.completed_cycles ?? null,
                    plannedCycles: plan?.planned_cycles ?? null,
                    totalSessions: patientSessions.length,
                    completedSessions: patientSessions.filter((s: any) => s.status === 'completed').length,
                    doseModifications: patientSessions.filter((s: any) => s.dose_modified).length,
                    adverseEventsCount: patientSessions.filter((s: any) => s.adverse_events).length,
                    lastResponseAssessment: imaging ? (RESPONSE_LABELS[imaging.response_assessment] || imaging.response_assessment) : null,
                    lastResponseDate: imaging?.study_date || null,
                    latestCriticalLab: criticalLab ? `${criticalLab.test_name}: ${criticalLab.result_value ?? ''} ${criticalLab.unit ?? ''} (${criticalLab.test_date})` : null,
                }
            })

            return rows
        } finally {
            setLoading(false)
        }
    }, [])

    const exportResearchCsv = useCallback((trialName: string, rows: TrialResearchRow[]) => {
        const headers = [
            'MRN', 'Patient Name', 'Age', 'Sex', 'Enrollment Date', 'Enrollment Status',
            'Primary Site', 'Stage', 'ECOG PS', 'Active Protocol',
            'Completed Cycles', 'Planned Cycles', 'Total Sessions', 'Completed Sessions',
            'Dose Modifications', 'Adverse Events Count', 'Last Response Assessment', 'Last Response Date',
            'Latest Critical Lab',
        ]
        const csvRows = rows.map(r => [
            r.mrn, r.patientName, r.age, r.sex, r.enrollmentDate, r.enrollmentStatus,
            r.primarySite ?? '', r.stage ?? '', r.ecogPs ?? '', r.activeProtocol ?? '',
            r.completedCycles ?? '', r.plannedCycles ?? '', r.totalSessions, r.completedSessions,
            r.doseModifications, r.adverseEventsCount, r.lastResponseAssessment ?? '', r.lastResponseDate ?? '',
            `"${(r.latestCriticalLab ?? '').replace(/"/g, '""')}"`,
        ].join(','))

        const csv = [headers.join(','), ...csvRows].join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `trial_research_${trialName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    return { loading, getTrialResearchData, exportResearchCsv }
}
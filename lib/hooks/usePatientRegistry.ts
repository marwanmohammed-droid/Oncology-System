'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RegistryEntry {
    patientId: string
    mrn: string
    patientName: string
    age: number
    sex: string
    primarySite: string | null
    stage: string | null
    histology: string | null
    isMetastatic: boolean
    activeProtocol: string | null
    protocolClass: string | null
    planStatus: string | null
    completedCycles: number | null
    plannedCycles: number | null
    registeredAt: string
}

export interface RegistryFilters {
    primarySite?: string
    protocolName?: string
    stage?: string
    planStatus?: string
}

export function usePatientRegistry() {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const getRegistry = useCallback(async (filters: RegistryFilters = {}): Promise<RegistryEntry[]> => {
        setLoading(true)
        try {
            let diagQuery = supabase
                .from('diagnoses')
                .select('patient_id, primary_site, stage, histology, is_metastatic, created_at')
                .order('created_at', { ascending: false })

            if (filters.primarySite) diagQuery = diagQuery.eq('primary_site', filters.primarySite)
            if (filters.stage) diagQuery = diagQuery.eq('stage', filters.stage)

            const { data: diagnoses } = await diagQuery
            if (!diagnoses?.length) { setLoading(false); return [] }

            // آخر تشخيص لكل مريض بس
            const latestDiagByPatient: Record<string, any> = {}
            diagnoses.forEach(d => {
                if (!latestDiagByPatient[d.patient_id]) latestDiagByPatient[d.patient_id] = d
            })
            const patientIds = Object.keys(latestDiagByPatient)

            const [{ data: patients }, { data: plans }] = await Promise.all([
                supabase.from('patients')
                    .select('id, mrn, first_name_ar, last_name_ar, date_of_birth, sex, created_at, archived_at')
                    .in('id', patientIds),
                supabase.from('treatment_plans')
                    .select('patient_id, protocol_name, status, completed_cycles, planned_cycles, regimen:chemo_regimens(regimen_class)')
                    .in('patient_id', patientIds)
                    .order('created_at', { ascending: false }),
            ])

            const planByPatient: Record<string, any> = {}
                ; (plans || []).forEach(p => {
                    if (!planByPatient[p.patient_id]) planByPatient[p.patient_id] = p
                    else if (p.status === 'active') planByPatient[p.patient_id] = p
                })

            let entries: RegistryEntry[] = (patients || [])
                .filter(pt => !pt.archived_at)
                .map(pt => {
                    const diag = latestDiagByPatient[pt.id]
                    const plan = planByPatient[pt.id]
                    const age = Math.floor((Date.now() - new Date(pt.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))

                    return {
                        patientId: pt.id,
                        mrn: pt.mrn,
                        patientName: `${pt.first_name_ar} ${pt.last_name_ar}`,
                        age,
                        sex: pt.sex === 'M' ? 'ذكر' : 'أنثى',
                        primarySite: diag?.primary_site ?? null,
                        stage: diag?.stage ?? null,
                        histology: diag?.histology ?? null,
                        isMetastatic: !!diag?.is_metastatic,
                        activeProtocol: plan?.protocol_name ?? null,
                        protocolClass: (plan?.regimen as any)?.regimen_class ?? null,
                        planStatus: plan?.status ?? null,
                        completedCycles: plan?.completed_cycles ?? null,
                        plannedCycles: plan?.planned_cycles ?? null,
                        registeredAt: pt.created_at,
                    }
                })

            if (filters.protocolName) {
                entries = entries.filter(e => e.activeProtocol === filters.protocolName)
            }
            if (filters.planStatus) {
                entries = entries.filter(e => e.planStatus === filters.planStatus)
            }

            setLoading(false)
            return entries.sort((a, b) => a.patientName.localeCompare(b.patientName))
        } catch (e) {
            setLoading(false)
            return []
        }
    }, [])

    const getFilterOptions = useCallback(async () => {
        const [{ data: sites }, { data: protocols }, { data: stages }] = await Promise.all([
            supabase.from('diagnoses').select('primary_site').not('primary_site', 'is', null),
            supabase.from('treatment_plans').select('protocol_name').not('protocol_name', 'is', null),
            supabase.from('diagnoses').select('stage').not('stage', 'is', null),
        ])

        const uniqueSites = Array.from(new Set((sites || []).map(s => s.primary_site))).sort()
        const uniqueProtocols = Array.from(new Set((protocols || []).map(p => p.protocol_name))).sort()
        const uniqueStages = Array.from(new Set((stages || []).map(s => s.stage))).sort()

        return { sites: uniqueSites, protocols: uniqueProtocols, stages: uniqueStages }
    }, [])

    const exportCsv = useCallback((entries: RegistryEntry[]) => {
        const headers = ['MRN', 'Patient Name', 'Age', 'Sex', 'Primary Site', 'Stage', 'Histology', 'Metastatic', 'Active Protocol', 'Protocol Class', 'Plan Status', 'Completed Cycles', 'Planned Cycles', 'Registered At']
        const rows = entries.map(e => [
            e.mrn, e.patientName, e.age, e.sex,
            e.primarySite ?? '', e.stage ?? '', e.histology ?? '',
            e.isMetastatic ? 'Yes' : 'No',
            e.activeProtocol ?? '', e.protocolClass ?? '', e.planStatus ?? '',
            e.completedCycles ?? '', e.plannedCycles ?? '',
            e.registeredAt,
        ].join(','))
        const csv = [headers.join(','), ...rows].join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `patient_registry_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    return { loading, getRegistry, getFilterOptions, exportCsv }
}
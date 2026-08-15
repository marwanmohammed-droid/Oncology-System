'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RegistryEntry {
    patientId: string
    mrn: string
    patientName: string
    age: number
    ageGroup: 'Pediatric' | 'Adult' | 'Geriatric'
    sex: string
    nationality: string | null
    primarySite: string | null
    stage: string | null
    histology: string | null
    isMetastatic: boolean
    metastaticSites: string | null
    activeProtocol: string | null
    protocolClass: string | null
    planStatus: string | null
    completedCycles: number | null
    plannedCycles: number | null
    ecogPs: string | null
    smokingStatus: string | null
    registeredAt: string
}

export interface RegistryFilters {
    primarySite?: string
    protocolName?: string
    stage?: string
    planStatus?: string
    sex?: string
    ageGroup?: string
    metastatic?: string
    nationality?: string
}

export interface RegistryStats {
    total: number
    bySex: Record<string, number>
    byAgeGroup: Record<string, number>
    byNationality: Record<string, number>
    byPrimarySite: Record<string, number>
    byStage: Record<string, number>
    byProtocol: Record<string, number>
    byProtocolClass: Record<string, number>
    byPlanStatus: Record<string, number>
    metastaticCount: number
    nonMetastaticCount: number
    avgAge: number
}

function getAgeGroup(age: number): 'Pediatric' | 'Adult' | 'Geriatric' {
    if (age < 18) return 'Pediatric'
    if (age < 65) return 'Adult'
    return 'Geriatric'
}

export function usePatientRegistry() {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const getRegistry = useCallback(async (filters: RegistryFilters = {}): Promise<RegistryEntry[]> => {
        setLoading(true)
        try {
            let diagQuery = supabase
                .from('diagnoses')
                .select('patient_id, primary_site, stage, histology, is_metastatic, metastatic_sites, created_at')
                .order('created_at', { ascending: false })

            if (filters.primarySite) diagQuery = diagQuery.eq('primary_site', filters.primarySite)
            if (filters.stage) diagQuery = diagQuery.eq('stage', filters.stage)

            const { data: diagnoses } = await diagQuery
            if (!diagnoses?.length) { setLoading(false); return [] }

            const latestDiagByPatient: Record<string, any> = {}
            diagnoses.forEach(d => {
                if (!latestDiagByPatient[d.patient_id]) latestDiagByPatient[d.patient_id] = d
            })
            const patientIds = Object.keys(latestDiagByPatient)

            const [{ data: patients }, { data: plans }, { data: histories }] = await Promise.all([
                supabase.from('patients')
                    .select('id, mrn, first_name_ar, last_name_ar, date_of_birth, sex, nationality, created_at, archived_at')
                    .in('id', patientIds),
                supabase.from('treatment_plans')
                    .select('patient_id, protocol_name, status, completed_cycles, planned_cycles, regimen:chemo_regimens(regimen_class)')
                    .in('patient_id', patientIds)
                    .order('created_at', { ascending: false }),
                supabase.from('medical_history')
                    .select('patient_id, ecog_ps, smoking_status')
                    .in('patient_id', patientIds),
            ])

            const planByPatient: Record<string, any> = {}
                ; (plans || []).forEach(p => {
                    if (!planByPatient[p.patient_id]) planByPatient[p.patient_id] = p
                    else if (p.status === 'active') planByPatient[p.patient_id] = p
                })

            const historyByPatient: Record<string, any> = {}
                ; (histories || []).forEach(h => { historyByPatient[h.patient_id] = h })

            let entries: RegistryEntry[] = (patients || [])
                .filter(pt => !pt.archived_at)
                .map(pt => {
                    const diag = latestDiagByPatient[pt.id]
                    const plan = planByPatient[pt.id]
                    const hist = historyByPatient[pt.id]
                    const age = Math.floor((Date.now() - new Date(pt.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))

                    return {
                        patientId: pt.id,
                        mrn: pt.mrn,
                        patientName: `${pt.first_name_ar} ${pt.last_name_ar}`,
                        age,
                        ageGroup: getAgeGroup(age),
                        sex: pt.sex === 'M' ? 'ذكر' : 'أنثى',
                        nationality: pt.nationality ?? null,
                        primarySite: diag?.primary_site ?? null,
                        stage: diag?.stage ?? null,
                        histology: diag?.histology ?? null,
                        isMetastatic: !!diag?.is_metastatic,
                        metastaticSites: diag?.metastatic_sites ?? null,
                        activeProtocol: plan?.protocol_name ?? null,
                        protocolClass: (plan?.regimen as any)?.regimen_class ?? null,
                        planStatus: plan?.status ?? null,
                        completedCycles: plan?.completed_cycles ?? null,
                        plannedCycles: plan?.planned_cycles ?? null,
                        ecogPs: hist?.ecog_ps ?? null,
                        smokingStatus: hist?.smoking_status ?? null,
                        registeredAt: pt.created_at,
                    }
                })

            if (filters.protocolName) entries = entries.filter(e => e.activeProtocol === filters.protocolName)
            if (filters.planStatus) entries = entries.filter(e => e.planStatus === filters.planStatus)
            if (filters.sex) entries = entries.filter(e => e.sex === filters.sex)
            if (filters.ageGroup) entries = entries.filter(e => e.ageGroup === filters.ageGroup)
            if (filters.nationality) entries = entries.filter(e => e.nationality === filters.nationality)
            if (filters.metastatic === 'yes') entries = entries.filter(e => e.isMetastatic)
            if (filters.metastatic === 'no') entries = entries.filter(e => !e.isMetastatic)

            setLoading(false)
            return entries.sort((a, b) => a.patientName.localeCompare(b.patientName))
        } catch (e) {
            setLoading(false)
            return []
        }
    }, [])

    const computeStats = useCallback((entries: RegistryEntry[]): RegistryStats => {
        const stats: RegistryStats = {
            total: entries.length,
            bySex: {}, byAgeGroup: {}, byNationality: {}, byPrimarySite: {},
            byStage: {}, byProtocol: {}, byProtocolClass: {}, byPlanStatus: {},
            metastaticCount: 0, nonMetastaticCount: 0, avgAge: 0,
        }
        let ageSum = 0
        entries.forEach(e => {
            stats.bySex[e.sex] = (stats.bySex[e.sex] || 0) + 1
            stats.byAgeGroup[e.ageGroup] = (stats.byAgeGroup[e.ageGroup] || 0) + 1
            if (e.nationality) stats.byNationality[e.nationality] = (stats.byNationality[e.nationality] || 0) + 1
            if (e.primarySite) stats.byPrimarySite[e.primarySite] = (stats.byPrimarySite[e.primarySite] || 0) + 1
            if (e.stage) stats.byStage[e.stage] = (stats.byStage[e.stage] || 0) + 1
            if (e.activeProtocol) stats.byProtocol[e.activeProtocol] = (stats.byProtocol[e.activeProtocol] || 0) + 1
            if (e.protocolClass) stats.byProtocolClass[e.protocolClass] = (stats.byProtocolClass[e.protocolClass] || 0) + 1
            if (e.planStatus) stats.byPlanStatus[e.planStatus] = (stats.byPlanStatus[e.planStatus] || 0) + 1
            if (e.isMetastatic) stats.metastaticCount++
            else stats.nonMetastaticCount++
            ageSum += e.age
        })
        stats.avgAge = entries.length ? Math.round((ageSum / entries.length) * 10) / 10 : 0
        return stats
    }, [])

    const getFilterOptions = useCallback(async () => {
        const [{ data: sites }, { data: protocols }, { data: stages }, { data: nationalities }] = await Promise.all([
            supabase.from('diagnoses').select('primary_site').not('primary_site', 'is', null),
            supabase.from('treatment_plans').select('protocol_name').not('protocol_name', 'is', null),
            supabase.from('diagnoses').select('stage').not('stage', 'is', null),
            supabase.from('patients').select('nationality').not('nationality', 'is', null),
        ])

        return {
            sites: Array.from(new Set((sites || []).map(s => s.primary_site))).sort(),
            protocols: Array.from(new Set((protocols || []).map(p => p.protocol_name))).sort(),
            stages: Array.from(new Set((stages || []).map(s => s.stage))).sort(),
            nationalities: Array.from(new Set((nationalities || []).map(n => n.nationality))).sort(),
        }
    }, [])

    const exportCsv = useCallback((entries: RegistryEntry[]) => {
        const headers = [
            'MRN', 'Patient Name', 'Age', 'Age Group', 'Sex', 'Nationality',
            'Primary Site', 'Stage', 'Histology', 'Metastatic', 'Metastatic Sites',
            'Active Protocol', 'Protocol Class', 'Plan Status', 'Completed Cycles', 'Planned Cycles',
            'ECOG PS', 'Smoking Status', 'Registered At',
        ]
        const rows = entries.map(e => [
            e.mrn, e.patientName, e.age, e.ageGroup, e.sex, e.nationality ?? '',
            e.primarySite ?? '', e.stage ?? '', e.histology ?? '',
            e.isMetastatic ? 'Yes' : 'No', e.metastaticSites ?? '',
            e.activeProtocol ?? '', e.protocolClass ?? '', e.planStatus ?? '',
            e.completedCycles ?? '', e.plannedCycles ?? '',
            e.ecogPs ?? '', e.smokingStatus ?? '',
            e.registeredAt,
        ].join(','))
        const csv = [headers.join(','), ...rows].join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `research_dataset_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    return { loading, getRegistry, computeStats, getFilterOptions, exportCsv }
}
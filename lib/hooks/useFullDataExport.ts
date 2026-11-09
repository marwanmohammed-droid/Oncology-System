'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const PAGE = 1000

export function useFullDataExport() {
    const [exporting, setExporting] = useState(false)
    const [progress, setProgress] = useState('')
    const supabase = createClient()

    const exportAllData = useCallback(async () => {
        setExporting(true)
        try {
            const XLSX = await import('xlsx')
            const wb = XLSX.utils.book_new()

            // 27 جدول = كل جداول قاعدة البيانات
            const tables: { name: string; sheet: string; columns?: string }[] = [
                { name: 'patients', sheet: 'Patients' },
                { name: 'patient_identities', sheet: 'Identities' },
                { name: 'diagnoses', sheet: 'Diagnoses' },
                { name: 'biomarkers', sheet: 'Biomarkers (legacy)' },
                { name: 'pathology_tests', sheet: 'Pathology Tests' },
                { name: 'prior_treatment_protocols', sheet: 'Prior Protocols' },
                { name: 'medical_history', sheet: 'Medical History' },
                { name: 'vital_signs', sheet: 'Vital Signs' },
                { name: 'progress_notes', sheet: 'Progress Notes' },
                { name: 'chemo_regimens', sheet: 'Regimens' },
                { name: 'regimen_drugs', sheet: 'Regimen Drugs' },
                { name: 'treatment_plans', sheet: 'Treatment Plans' },
                { name: 'chemo_sessions', sheet: 'Chemo Sessions' },
                { name: 'session_drugs', sheet: 'Session Drugs' },
                { name: 'lab_results', sheet: 'Lab Results' },
                { name: 'imaging_studies', sheet: 'Imaging Studies' },
                { name: 'appointments', sheet: 'Appointments' },
                { name: 'insurance_policies', sheet: 'Insurance' },
                { name: 'payment_plans', sheet: 'Payment Plans' },
                { name: 'consents', sheet: 'Consents' },
                { name: 'clinical_trials', sheet: 'Clinical Trials' },
                { name: 'trial_enrollments', sheet: 'Trial Enrollments' },
                { name: 'drug_inventory', sheet: 'Drug Inventory' },
                { name: 'inventory_transactions', sheet: 'Inventory Transactions' },
                { name: 'custom_test_types', sheet: 'Custom Types' },
                { name: 'profiles', sheet: 'Staff', columns: 'id, full_name_ar, full_name_en, role' },
                { name: 'audit_log', sheet: 'Audit Log' },
            ]

            // يجيب كل الصفوف على دفعات (Supabase بيقطع عند 1000)
            async function fetchAll(table: string, columns = '*') {
                const rows: any[] = []
                let useOrder = true
                for (let from = 0; ; from += PAGE) {
                    let q: any = supabase.from(table).select(columns)
                    if (useOrder) q = q.order('id')
                    const { data, error } = await q.range(from, from + PAGE - 1)

                    // لو الجدول مفيهوش عمود id، نعيد المحاولة من الأول بدون ترتيب
                    if (error && useOrder && /\bid\b/i.test(error.message)) {
                        useOrder = false
                        rows.length = 0
                        from = -PAGE
                        continue
                    }
                    if (error) return { rows, error: error.message }

                    rows.push(...(data || []))
                    if (!data || data.length < PAGE) break
                }
                return { rows, error: null as string | null }
            }

            // خريطة patient_id → MRN عشان كل الشيتات تتربط بالمريض
            setProgress('جارٍ تحميل المرضى...')
            const pts = await fetchAll('patients')
            const mrnById: Record<string, string> = {}
            pts.rows.forEach(p => { mrnById[p.id] = p.mrn })

            const log: Record<string, any>[] = []

            for (const t of tables) {
                setProgress(`جارٍ تصدير ${t.sheet}...`)
                const { rows, error } = t.name === 'patients'
                    ? { rows: pts.rows, error: pts.error }
                    : await fetchAll(t.name, t.columns)

                const { count } = await supabase
                    .from(t.name).select('*', { count: 'exact', head: true })

                log.push({
                    Table: t.name,
                    'Expected rows': count ?? 'unknown',
                    'Exported rows': rows.length,
                    Status: error ? `ERROR: ${error}`
                        : (count != null && count !== rows.length) ? 'MISMATCH' : 'OK',
                })

                const flattened = rows.map(row => {
                    const flat: Record<string, any> = {}
                    if (row.patient_id && t.name !== 'patients') {
                        flat['patient_mrn'] = mrnById[row.patient_id] ?? ''
                    }
                    Object.entries(row).forEach(([k, v]) => {
                        let val: any = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v
                        // إكسل بيقطع الخلية عند 32,767 حرف
                        if (typeof val === 'string' && val.length > 32000) {
                            val = val.slice(0, 32000) + '…[truncated]'
                        }
                        flat[k] = val
                    })
                    return flat
                })

                const ws = XLSX.utils.json_to_sheet(
                    flattened.length ? flattened : [{ 'لا توجد بيانات': '' }]
                )
                XLSX.utils.book_append_sheet(wb, ws, t.sheet.slice(0, 31))
            }

            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(log), 'Export Log')

            setProgress('جارٍ إنشاء الملف...')
            XLSX.writeFile(wb, `full_patient_data_export_${new Date().toISOString().split('T')[0]}.xlsx`)
        } finally {
            setExporting(false)
            setProgress('')
        }
    }, [])

    return { exportAllData, exporting, progress }
}
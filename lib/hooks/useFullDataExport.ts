'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useFullDataExport() {
    const [exporting, setExporting] = useState(false)
    const [progress, setProgress] = useState('')
    const supabase = createClient()

    const exportAllData = useCallback(async () => {
        setExporting(true)
        try {
            const XLSX = await import('xlsx')
            const wb = XLSX.utils.book_new()

            const tables: { name: string; sheet: string }[] = [
                { name: 'patients', sheet: 'Patients' },
                { name: 'diagnoses', sheet: 'Diagnoses' },
                { name: 'pathology_tests', sheet: 'Pathology Tests' },
                { name: 'prior_treatment_protocols', sheet: 'Prior Protocols' },
                { name: 'medical_history', sheet: 'Medical History' },
                { name: 'vital_signs', sheet: 'Vital Signs' },
                { name: 'treatment_plans', sheet: 'Treatment Plans' },
                { name: 'chemo_sessions', sheet: 'Chemo Sessions' },
                { name: 'session_drugs', sheet: 'Session Drugs' },
                { name: 'lab_results', sheet: 'Lab Results' },
                { name: 'imaging_studies', sheet: 'Imaging Studies' },
                { name: 'progress_notes', sheet: 'Progress Notes' },
                { name: 'insurance_policies', sheet: 'Insurance' },
                { name: 'payment_plans', sheet: 'Payment Plans' },
                { name: 'consents', sheet: 'Consents' },
                { name: 'patient_identities', sheet: 'Identities' },
                { name: 'trial_enrollments', sheet: 'Trial Enrollments' },
                { name: 'drug_inventory', sheet: 'Drug Inventory' },
                { name: 'inventory_transactions', sheet: 'Inventory Transactions' },
            ]

            for (const t of tables) {
                setProgress(`جارٍ تصدير ${t.sheet}...`)
                const { data, error } = await supabase.from(t.name).select('*')
                if (error) {
                    console.warn(`تخطي ${t.name}: ${error.message}`)
                    continue
                }
                if (!data || data.length === 0) {
                    // نضيف الشيت فاضي عشان تعرف إن الجدول ده موجود بس مفيهوش بيانات
                    const ws = XLSX.utils.json_to_sheet([{ 'لا توجد بيانات': '' }])
                    XLSX.utils.book_append_sheet(wb, ws, t.sheet.slice(0, 31))
                    continue
                }
                // تسطيح أي حقول nested (زي arrays أو objects) عشان تتحول لنص عادي في الإكسل
                const flattened = data.map(row => {
                    const flatRow: Record<string, any> = {}
                    Object.entries(row).forEach(([key, value]) => {
                        if (value === null || value === undefined) {
                            flatRow[key] = ''
                        } else if (typeof value === 'object') {
                            flatRow[key] = JSON.stringify(value)
                        } else {
                            flatRow[key] = value
                        }
                    })
                    return flatRow
                })
                const ws = XLSX.utils.json_to_sheet(flattened)
                XLSX.utils.book_append_sheet(wb, ws, t.sheet.slice(0, 31)) // Excel بيحدد اسم الشيت بـ 31 حرف
            }

            setProgress('جارٍ إنشاء الملف...')
            const fileName = `full_patient_data_export_${new Date().toISOString().split('T')[0]}.xlsx`
            XLSX.writeFile(wb, fileName)
        } finally {
            setExporting(false)
            setProgress('')
        }
    }, [])

    return { exportAllData, exporting, progress }
}
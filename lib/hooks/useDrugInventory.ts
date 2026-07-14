'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DrugInventoryItem {
    id: string
    drug_name: string
    vial_size_mg: number | null
    vial_unit: string
    quantity_in_stock: number
    reorder_threshold: number
    unit_cost: number | null
    notes: string | null
    last_restocked_at: string | null
    created_at: string
    updated_at: string
}

export interface InventoryTransaction {
    id: string
    drug_inventory_id: string
    session_id: string | null
    patient_id: string | null
    transaction_type: 'deduction' | 'restock' | 'adjustment' | 'waste'
    vials_changed: number
    notes: string | null
    performed_by: string | null
    created_at: string
    drug?: { drug_name: string }
    patient?: { mrn: string; first_name_ar: string; last_name_ar: string }
}

export function useDrugInventory() {
    const [items, setItems] = useState<DrugInventoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchInventory = useCallback(async () => {
        setLoading(true)
        const { data, error: err } = await supabase
            .from('drug_inventory')
            .select('*')
            .order('drug_name')
        if (err) setError(err.message)
        setItems(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchInventory() }, [fetchInventory])

    // إضافة دواء جديد للمخزون
    const addDrug = async (input: {
        drug_name: string
        vial_size_mg?: number | null
        vial_unit?: string
        quantity_in_stock: number
        reorder_threshold?: number
        unit_cost?: number | null
        notes?: string
    }) => {
        setSaving(true); setError(null)
        try {
            const { data, error: err } = await supabase
                .from('drug_inventory')
                .insert({
                    drug_name: input.drug_name,
                    vial_size_mg: input.vial_size_mg ?? null,
                    vial_unit: input.vial_unit || 'mg',
                    quantity_in_stock: input.quantity_in_stock,
                    reorder_threshold: input.reorder_threshold ?? 10,
                    unit_cost: input.unit_cost ?? null,
                    notes: input.notes || null,
                    last_restocked_at: input.quantity_in_stock > 0 ? new Date().toISOString() : null,
                })
                .select('*')
                .single()
            if (err) throw err
            setItems(prev => [...prev, data].sort((a, b) => a.drug_name.localeCompare(b.drug_name)))
            return data
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    // توريد كمية جديدة (restock)
    const restock = async (drugInventoryId: string, vials: number, notes?: string) => {
        setSaving(true); setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error: err } = await supabase.rpc('restock_drug', {
                p_drug_inventory_id: drugInventoryId,
                p_vials: vials,
                p_notes: notes || null,
                p_performed_by: user?.id || null,
            })
            if (err) throw err
            await fetchInventory()
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    // خصم أدوية جلسة كيماوي — العملية الأساسية اللي طلبتها
    // بتاخد قايمة من { drugName, vialsUsed } وبتخصم كل واحد بالدالة الآمنة في الداتابيز
    const deductForSession = async (
        sessionId: string,
        patientId: string,
        deductions: { drugName: string; vialsUsed: number }[]
    ) => {
        setSaving(true); setError(null)
        const results: { drugName: string; success: boolean; message?: string }[] = []
        try {
            for (const d of deductions) {
                if (d.vialsUsed <= 0) continue

                const match = items.find(
                    i => i.drug_name.trim().toLowerCase() === d.drugName.trim().toLowerCase()
                )
                if (!match) {
                    results.push({ drugName: d.drugName, success: false, message: 'الدواء غير موجود في المخزون — سجّله أولاً' })
                    continue
                }

                const { error: err } = await supabase.rpc('deduct_drug_stock', {
                    p_drug_inventory_id: match.id,
                    p_vials: d.vialsUsed,
                    p_session_id: sessionId,
                    p_patient_id: patientId,
                    p_notes: null,
                })

                if (err) {
                    results.push({ drugName: d.drugName, success: false, message: err.message })
                } else {
                    results.push({ drugName: d.drugName, success: true })
                }
            }
            await fetchInventory()
            return results
        } finally {
            setSaving(false)
        }
    }

    // سجل الحركات (لدواء معين أو عام)
    const getTransactions = useCallback(async (drugInventoryId?: string): Promise<InventoryTransaction[]> => {
        let query = supabase
            .from('inventory_transactions')
            .select(`
        *,
        drug:drug_inventory(drug_name),
        patient:patients(mrn, first_name_ar, last_name_ar)
      `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (drugInventoryId) query = query.eq('drug_inventory_id', drugInventoryId)

        const { data } = await query
        return (data as any) || []
    }, [])

    const lowStockItems = items.filter(i => i.quantity_in_stock <= i.reorder_threshold)

    return {
        items, loading, saving, error,
        addDrug, restock, deductForSession, getTransactions,
        lowStockItems,
        refresh: fetchInventory,
    }
}
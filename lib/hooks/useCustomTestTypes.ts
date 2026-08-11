'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CustomTestType {
    id: string
    test_kind: 'lab' | 'imaging'
    category: string | null
    name: string
    unit: string | null
    reference_range: string | null
}

export function useCustomTestTypes(kind: 'lab' | 'imaging') {
    const [customTypes, setCustomTypes] = useState<CustomTestType[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchTypes = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('custom_test_types')
            .select('*')
            .eq('test_kind', kind)
            .order('name')
        setCustomTypes(data || [])
        setLoading(false)
    }, [kind])

    useEffect(() => { fetchTypes() }, [fetchTypes])

    const addCustomType = async (input: { name: string; category?: string; unit?: string; reference_range?: string }) => {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('custom_test_types')
            .insert({
                test_kind: kind,
                category: input.category || null,
                name: input.name,
                unit: input.unit || null,
                reference_range: input.reference_range || null,
                created_by: user?.id || null,
            })
            .select('*')
            .single()

        // لو الاسم موجود بالفعل (unique violation)، متعتبروش خطأ — رجّع الموجود
        if (error?.code === '23505') {
            const existing = customTypes.find(t => t.name.toLowerCase() === input.name.toLowerCase())
            if (existing) return existing
            await fetchTypes()
            return null
        }
        if (error) throw error
        setCustomTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        return data
    }

    return { customTypes, loading, addCustomType, refresh: fetchTypes }
}
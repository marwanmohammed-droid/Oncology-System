'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProgressNote {
    id: string
    patient_id: string
    author_id: string | null
    note_date: string
    note_type: string
    subjective: string | null
    objective: string | null
    assessment: string | null
    plan: string | null
    free_text: string | null
    created_at: string
    updated_at: string
    author?: { full_name_ar: string }
}

export const NOTE_TYPE_LABELS: Record<string, string> = {
    follow_up: 'متابعة دورية',
    admission: 'دخول',
    consultation: 'استشارة',
    phone_call: 'مكالمة هاتفية',
    emergency: 'طارئ',
    other: 'أخرى',
}

export function useProgressNotes(patientId?: string) {
    const [notes, setNotes] = useState<ProgressNote[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchNotes = useCallback(async () => {
        if (!patientId) { setLoading(false); return }
        setLoading(true)
        const { data, error: err } = await supabase
            .from('progress_notes')
            .select(`*, author:profiles!progress_notes_author_id_fkey(full_name_ar)`)
            .eq('patient_id', patientId)
            .order('note_date', { ascending: false })
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        setNotes((data as any) || [])
        setLoading(false)
    }, [patientId])

    useEffect(() => { fetchNotes() }, [fetchNotes])

    const addNote = async (input: {
        note_date: string
        note_type: string
        subjective?: string
        objective?: string
        assessment?: string
        plan?: string
        free_text?: string
    }) => {
        if (!patientId) return
        setSaving(true); setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error: err } = await supabase
                .from('progress_notes')
                .insert({ ...input, patient_id: patientId, author_id: user?.id || null })
                .select(`*, author:profiles!progress_notes_author_id_fkey(full_name_ar)`)
                .single()
            if (err) throw err
            setNotes(prev => [data, ...prev])
            return data
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const updateNote = async (noteId: string, input: Partial<ProgressNote>) => {
        setSaving(true); setError(null)
        try {
            const { error: err } = await supabase
                .from('progress_notes')
                .update({ ...input, updated_at: new Date().toISOString() })
                .eq('id', noteId)
            if (err) throw err
            await fetchNotes()
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    const deleteNote = async (noteId: string) => {
        setSaving(true); setError(null)
        try {
            const { error: err } = await supabase.from('progress_notes').delete().eq('id', noteId)
            if (err) throw err
            setNotes(prev => prev.filter(n => n.id !== noteId))
        } catch (e: any) {
            setError(e.message)
            throw e
        } finally {
            setSaving(false)
        }
    }

    return { notes, loading, saving, error, addNote, updateNote, deleteNote, refresh: fetchNotes }
}
'use server'

import { createServerSupabase } from '@/lib/supabase/server'

// ────────────────────────────────────────────────────────────
// Server Actions — Chemo Sessions
// تُستخدم لجلب البيانات من جهة السيرفر (SSR / initial load)
// بدل الاعتماد الكامل على useEffect من جهة العميل
// ────────────────────────────────────────────────────────────

export async function getUpcomingSessionsServer(daysAhead: number = 30) {
    const supabase = await createServerSupabase()
    const today = new Date().toISOString().split('T')[0]
    const future = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('chemo_sessions')
        .select(`
      *,
      plan:treatment_plans(protocol_name, planned_cycles),
      patient:patients(mrn, first_name_ar, last_name_ar)
    `)
        .eq('status', 'scheduled')
        .gte('session_date', today)
        .lte('session_date', future)
        .order('session_date', { ascending: true })

    if (error) {
        console.error('[getUpcomingSessionsServer] Error:', error.message)
        return []
    }
    return data || []
}

export async function getSessionStatsServer() {
    const supabase = await createServerSupabase()

    const [
        { count: total },
        { count: scheduled },
        { count: completed },
        { count: postponed },
    ] = await Promise.all([
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true }).eq('status', 'postponed'),
    ])

    return {
        total: total || 0,
        scheduled: scheduled || 0,
        completed: completed || 0,
        postponed: postponed || 0,
    }
}

export async function getSessionsNeedingLabsServer() {
    const supabase = await createServerSupabase()
    const in48h = new Date(Date.now() + 48 * 3600000).toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('chemo_sessions')
        .select(`
      id, session_date, cycle_number,
      plan:treatment_plans(protocol_name),
      patient:patients(mrn, first_name_ar, last_name_ar)
    `)
        .eq('status', 'scheduled')
        .lte('session_date', in48h)
        .or('labs_cleared.is.null,labs_cleared.eq.false')
        .order('session_date', { ascending: true })

    if (error) {
        console.error('[getSessionsNeedingLabsServer] Error:', error.message)
        return []
    }
    return data || []
}
import React from 'react'

export class SupabaseError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'SupabaseError'
  }
}

export class LabsCriticalError extends Error {
  constructor(
    public field: string,
    public value: number,
    public threshold: number,
    public sessionId: string,
  ) {
    super(`Critical lab value: ${field} = ${value} (threshold: ${threshold})`)
    this.name = 'LabsCriticalError'
  }
}

export class ConflictError extends Error {
  constructor(message: string, public conflictDetails?: { room: string; date: string; time: string }) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class PreAuthError extends Error {
  constructor(public sessionId: string, message: string) {
    super(message)
    this.name = 'PreAuthError'
  }
}

// React Error Boundary for chemo scheduler
import React from 'react'

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

export class ChemoErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChemoScheduler] Error caught by boundary:', error, info)
    // In production: send to error tracking (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8" dir="rtl">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-navy-900 mb-2">حدث خطأ في جدولة الكيماوي</h2>
          <p className="text-sm text-slate-500 mb-1 font-mono">
            {this.state.error?.name}: {this.state.error?.message}
          </p>
          {this.state.error instanceof LabsCriticalError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 max-w-md text-center">
              🚫 قيمة حرجة في التحاليل: <strong>{this.state.error.field}</strong> = {this.state.error.value}
              <br/>يرجى مراجعة الطبيب فوراً قبل إعطاء الجلسة
            </div>
          )}
          {this.state.error instanceof ConflictError && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 max-w-md text-center">
              ⚠️ تعارض في الجدول: {this.state.error.message}
            </div>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-6 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-800 transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ────────────────────────────────────────────────────────────
// SUPABASE EDGE FUNCTION: send-notification
// supabase/functions/send-notification/index.ts
// ────────────────────────────────────────────────────────────

/*
// Deploy with: supabase functions deploy send-notification

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_SID   = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_FROM  = Deno.env.get('TWILIO_PHONE_FROM')!

serve(async (req) => {
  const { notification_id } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get notification
  const { data: notif } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notification_id)
    .single()

  if (!notif) return new Response('Not found', { status: 404 })

  // Send via Twilio (SMS/WhatsApp)
  if ((notif.channel === 'sms' || notif.channel === 'whatsapp') && notif.recipient_phone) {
    const to  = notif.channel === 'whatsapp' ? `whatsapp:${notif.recipient_phone}` : notif.recipient_phone
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To:   to,
          From: notif.channel === 'whatsapp' ? `whatsapp:${TWILIO_FROM}` : TWILIO_FROM,
          Body: notif.message_ar,
        }),
      }
    )
    const ok = res.ok

    // Update notification status
    await supabase.from('notifications').update({
      status:  ok ? 'sent' : 'failed',
      sent_at: ok ? new Date().toISOString() : null,
    }).eq('id', notification_id)

    return new Response(JSON.stringify({ success: ok }), { status: ok ? 200 : 500 })
  }

  return new Response(JSON.stringify({ success: false, reason: 'Unsupported channel' }), { status: 400 })
})
*/

// ────────────────────────────────────────────────────────────
// SUPABASE EDGE FUNCTION: auto-preauth
// supabase/functions/auto-preauth/index.ts
// Runs daily via pg_cron — sends pre-auth 72h before sessions
// ────────────────────────────────────────────────────────────

/*
import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Find sessions in 72h with pending pre-auth
  const in72h = new Date(Date.now() + 72*3600*1000).toISOString().split('T')[0]
  const today  = new Date().toISOString().split('T')[0]

  const { data: sessions } = await supabase
    .from('chemo_sessions')
    .select(`
      id, session_date, cycle_number,
      plan:treatment_plans(protocol_name, patient_id),
      patient:patients(
        mrn,
        insurance:insurance_policies(
          provider_name, policy_number, insurance_type, insurance_coordinator
        )
      )
    `)
    .eq('status', 'scheduled')
    .eq('preauth_status', 'pending')
    .gte('session_date', today)
    .lte('session_date', in72h)

  const results = []
  for (const s of sessions || []) {
    const ins = (s.patient as any)?.insurance?.[0]
    if (!ins || ins.insurance_type === 'self_pay') {
      // No pre-auth needed for self-pay
      await supabase.from('chemo_sessions')
        .update({ preauth_status: 'approved', preauth_ref: 'SELF_PAY' })
        .eq('id', s.id)
      results.push({ id: s.id, result: 'auto-approved (self-pay)' })
      continue
    }

    // In production: call insurer API with policy/patient details
    // For now: create pre-auth record and mark as pending review
    const { data: preauth } = await supabase.from('preauth_requests').insert({
      session_id:     s.id,
      patient_mrn:    (s.patient as any)?.mrn,
      protocol:       (s.plan as any)?.protocol_name,
      session_date:   s.session_date,
      insurer:        ins.provider_name,
      policy_number:  ins.policy_number,
      status:         'submitted',
      submitted_at:   new Date().toISOString(),
    }).select('id').single()

    results.push({ id: s.id, preauth_id: preauth?.id, result: 'submitted' })
  }

  return new Response(JSON.stringify({ processed: results.length, results }))
})
*/

// ────────────────────────────────────────────────────────────
// SQL: notifications table + cron job
// Add to treatment_plans_schema.sql
// ────────────────────────────────────────────────────────────

/*
-- Notifications table
create table public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  session_id      uuid references public.chemo_sessions(id) on delete set null,
  type            text not null,
  channel         text not null,
  message_ar      text not null,
  message_en      text,
  scheduled_at    timestamptz not null,
  sent_at         timestamptz,
  status          text default 'pending',
  recipient_phone text,
  created_at      timestamptz default now()
);
create index idx_notif_status   on public.notifications(status);
create index idx_notif_patient  on public.notifications(patient_id);
create index idx_notif_scheduled on public.notifications(scheduled_at);

alter table public.notifications enable row level security;
create policy "staff read notifications"
  on public.notifications for select
  using (current_user_role() in ('admin','doctor','nurse','receptionist'));
create policy "system manage notifications"
  on public.notifications for all
  using (current_user_role() in ('admin','doctor'));

-- Pre-auth requests table
create table public.preauth_requests (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references public.chemo_sessions(id),
  patient_mrn   text,
  protocol      text,
  session_date  date,
  insurer       text,
  policy_number text,
  status        text default 'pending',
  submitted_at  timestamptz,
  approved_at   timestamptz,
  rejected_at   timestamptz,
  rejection_reason text,
  ref_number    text,
  created_at    timestamptz default now()
);

-- pg_cron: run auto-preauth daily at 8am
-- Requires pg_cron extension enabled in Supabase
select cron.schedule(
  'auto-preauth-daily',
  '0 8 * * *',
  $$ select net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/auto-preauth',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{}'::jsonb
  ) $$
);
*/


// ================================================================
// PART 3 — React Components: ProtocolSelector, LabsEntryForm, SessionCard, ChemoSchedulerPage
// ================================================================

// ============================================================
// CHEMO SCHEDULER — React Components & Additional Hooks
// ============================================================

'use client'
import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ────────────────────────────────────────────────────────────
// HOOK: useCalendarView
// Calendar grid logic — week/month navigation
// ────────────────────────────────────────────────────────────
// lib/hooks/useCalendarView.ts

import type { ChemoSession } from './useChemoScheduler'

export type CalendarDay = {
  date: string           // 'YYYY-MM-DD'
  dayNumber: number
  isToday: boolean
  isCurrentMonth: boolean
  sessions: ChemoSession[]
}

export type CalendarView = 'month' | 'week' | 'day'

export function useCalendarView(sessions: ChemoSession[]) {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [view, setView] = useState<CalendarView>('month')

  const todayStr = today.toISOString().split('T')[0]

  // Build session lookup: date → sessions[]
  const sessionsByDate = useMemo(() => {
    const map: Record<string, ChemoSession[]> = {}
    sessions.forEach(s => {
      if (!map[s.session_date]) map[s.session_date] = []
      map[s.session_date].push(s)
    })
    return map
  }, [sessions])

  // Build month grid (always 6 rows × 7 cols = 42 cells)
  const monthGrid = useMemo((): CalendarDay[] => {
    const year  = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay    = new Date(year, month, 1).getDay()      // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev  = new Date(year, month, 0).getDate()
    const days: CalendarDay[] = []

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d   = daysInPrev - i
      const dt  = new Date(year, month - 1, d)
      const str = dt.toISOString().split('T')[0]
      days.push({ date: str, dayNumber: d, isToday: str === todayStr, isCurrentMonth: false, sessions: sessionsByDate[str] || [] })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dt  = new Date(year, month, d)
      const str = dt.toISOString().split('T')[0]
      days.push({ date: str, dayNumber: d, isToday: str === todayStr, isCurrentMonth: true, sessions: sessionsByDate[str] || [] })
    }

    // Next month padding to fill 42
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const dt  = new Date(year, month + 1, d)
      const str = dt.toISOString().split('T')[0]
      days.push({ date: str, dayNumber: d, isToday: str === todayStr, isCurrentMonth: false, sessions: sessionsByDate[str] || [] })
    }
    return days
  }, [currentDate, sessionsByDate, todayStr])

  // Build week grid (7 days from current week start)
  const weekGrid = useMemo((): CalendarDay[] => {
    const ref   = new Date(currentDate)
    const dow   = ref.getDay()
    const start = new Date(ref); start.setDate(ref.getDate() - dow)
    return Array.from({ length: 7 }, (_, i) => {
      const dt  = new Date(start); dt.setDate(start.getDate() + i)
      const str = dt.toISOString().split('T')[0]
      return { date: str, dayNumber: dt.getDate(), isToday: str === todayStr, isCurrentMonth: true, sessions: sessionsByDate[str] || [] }
    })
  }, [currentDate, sessionsByDate, todayStr])

  // Navigation
  const next = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'month') d.setMonth(d.getMonth() + 1)
      if (view === 'week')  d.setDate(d.getDate() + 7)
      if (view === 'day')   d.setDate(d.getDate() + 1)
      return d
    })
  }, [view])

  const prev = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'month') d.setMonth(d.getMonth() - 1)
      if (view === 'week')  d.setDate(d.getDate() - 7)
      if (view === 'day')   d.setDate(d.getDate() - 1)
      return d
    })
  }, [view])

  const goToday = useCallback(() => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }, [])

  const monthLabel = currentDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })
  const monthLabelEn = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const weekLabel = (() => {
    const wk = weekGrid
    if (!wk.length) return ''
    return `${wk[0].date} → ${wk[6].date}`
  })()

  return {
    view, setView,
    currentDate, monthGrid, weekGrid,
    next, prev, goToday,
    monthLabel, monthLabelEn, weekLabel,
    sessionsByDate,
  }
}

// ────────────────────────────────────────────────────────────
// COMPONENT: ProtocolSelector
// Regimen picker with live drug dose preview
// components/chemo/ProtocolSelector.tsx
// ────────────────────────────────────────────────────────────

import type { ChemoRegimen, RegimenDrug } from '@/lib/hooks/useChemoScheduler'

interface ProtocolSelectorProps {
  regimens: ChemoRegimen[]
  getRegimenDrugs: (id: string) => RegimenDrug[]
  calcDose: (drug: RegimenDrug, bsa: number, modPct?: number) => number
  bsa: number
  modPct?: number
  value: string
  onChange: (regimenId: string, regimen: ChemoRegimen) => void
}

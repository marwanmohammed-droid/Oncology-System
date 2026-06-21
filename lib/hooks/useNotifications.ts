'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChemoSession } from './useChemoScheduler'

export type NotificationChannel = 'sms' | 'whatsapp' | 'email' | 'push' | 'in_app'
export type NotificationType =
  | 'session_reminder_48h'
  | 'labs_reminder_72h'
  | 'session_day_morning'
  | 'preauth_approved'
  | 'preauth_rejected'
  | 'session_postponed'
  | 'session_cancelled'
  | 'labs_critical'
  | 'dose_modified'

export interface Notification {
  id: string
  patient_id: string
  session_id: string | null
  type: NotificationType
  channel: NotificationChannel
  message_ar: string
  message_en: string
  scheduled_at: string
  sent_at: string | null
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  recipient_phone: string | null
  created_at: string
}

export interface NotificationTemplate {
  type: NotificationType
  message_ar: (vars: Record<string, string>) => string
  message_en: (vars: Record<string, string>) => string
}

// Message templates
const TEMPLATES: NotificationTemplate[] = [
  {
    type: 'session_reminder_48h',
    message_ar: (v) => `مركز كابيتال مصر للأورام: تذكير — لديك جلسة كيماوي غداً ${v.date} الساعة ${v.time}. الرجاء إحضار تحاليل CBC + LFTs. استفسار: ${v.phone}`,
    message_en: (v) => `Egypt Capital Oncology Center: Reminder — Chemo session tomorrow ${v.date} at ${v.time}. Please bring CBC+LFT results. Info: ${v.phone}`,
  },
  {
    type: 'labs_reminder_72h',
    message_ar: (v) => `مركز كابيتال مصر للأورام: تحاليلك مطلوبة قبل جلسة ${v.protocol} بتاريخ ${v.session_date}. الرجاء إجراء CBC + LFTs قبل ${v.labs_due_date}.`,
    message_en: (v) => `Egypt Capital Oncology Center: Labs required before ${v.protocol} session on ${v.session_date}. Please complete CBC+LFTs by ${v.labs_due_date}.`,
  },
  {
    type: 'session_postponed',
    message_ar: (v) => `مركز كابيتال مصر للأورام: تم تأجيل جلسة الكيماوي إلى ${v.new_date}. السبب: ${v.reason}. للاستفسار: ${v.phone}`,
    message_en: (v) => `Egypt Capital Oncology Center: Chemo session postponed to ${v.new_date}. Reason: ${v.reason}. Contact: ${v.phone}`,
  },
  {
    type: 'preauth_approved',
    message_ar: (v) => `مركز كابيتال للأورام: تم الموافقة على التأمين لجلسة ${v.protocol} بتاريخ ${v.date}. رقم المرجع: ${v.ref}`,
    message_en: (v) => `Egypt Capital Oncology Center: Insurance pre-auth approved for ${v.protocol} on ${v.date}. Ref: ${v.ref}`,
  },
  {
    type: 'labs_critical',
    message_ar: (v) => `تنبيه طبي — ${v.patient_name}: نتيجة ${v.lab} خارج النطاق الآمن (${v.value}). مراجعة الطبيب مطلوبة فوراً.`,
    message_en: (v) => `Medical Alert — ${v.patient_name}: ${v.lab} result out of safe range (${v.value}). Doctor review required immediately.`,
  },
]

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  // Fetch pending notifications
  const fetchPending = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_at')
    setNotifications(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  // Build & schedule a notification
  const schedule = useCallback(async (
    patientId: string,
    sessionId: string | null,
    type: NotificationType,
    channels: NotificationChannel[],
    vars: Record<string, string>,
    scheduledAt: Date,
    recipientPhone: string | null,
  ) => {
    const tpl = TEMPLATES.find(t => t.type === type)
    if (!tpl) throw new Error(`No template for type: ${type}`)

    const entries = channels.map(ch => ({
      patient_id: patientId,
      session_id: sessionId,
      type,
      channel: ch,
      message_ar: tpl.message_ar(vars),
      message_en: tpl.message_en(vars),
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending' as const,
      recipient_phone: ch === 'sms' || ch === 'whatsapp' ? recipientPhone : null,
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(entries)
      .select()
    if (error) throw error
    setNotifications(prev => [...(data || []), ...prev])
    return data
  }, [])

  // Schedule all standard reminders for a session
  const scheduleSessionReminders = useCallback(async (session: ChemoSession) => {
    if (!session.patient) return
    const pt = session.patient
    const sessDate = new Date(session.session_date)
    const phone = pt.mobile_primary

    const vars = {
      patient_name: `${pt.first_name_ar} ${pt.last_name_ar}`,
      date: session.session_date,
      time: session.session_time || '09:00',
      protocol: session.plan?.protocol_name || '',
      session_date: session.session_date,
      phone: '01XXXXXXXXX',
    }

    // 48h before — session reminder
    const rem48h = new Date(sessDate); rem48h.setHours(rem48h.getHours() - 48)
    await schedule(session.patient_id, session.id, 'session_reminder_48h', ['sms'], vars, rem48h, phone)

    // 72h before — labs reminder
    const labs72h = new Date(sessDate); labs72h.setHours(labs72h.getHours() - 72)
    const labsDue = new Date(sessDate); labsDue.setHours(labsDue.getHours() - 48)
    await schedule(session.patient_id, session.id, 'labs_reminder_72h', ['sms'],
      { ...vars, labs_due_date: labsDue.toISOString().split('T')[0] }, labs72h, phone)
  }, [schedule])

  // Send immediately via Edge Function
  const sendNow = useCallback(async (notificationId: string) => {
    setSending(true)
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: { notification_id: notificationId }
      })
      if (error) throw error
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, status: 'sent', sent_at: new Date().toISOString() } : n
      ))
    } catch (e) {
      console.error('[Notification] Send failed:', e)
      throw e
    } finally {
      setSending(false)
    }
  }, [])

  // Send all pending reminders for upcoming sessions (bulk)
  const sendAllPending = useCallback(async () => {
    setSending(true)
    try {
      const { error } = await supabase.functions.invoke('send-bulk-notifications', {
        body: { status: 'pending' }
      })
      if (error) throw error
      await fetchPending()
    } finally {
      setSending(false)
    }
  }, [fetchPending])

  // Cancel notification
  const cancel = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ status: 'cancelled' }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const pendingCount = notifications.filter(n => n.status === 'pending').length
  const sentToday = notifications.filter(n => n.sent_at?.startsWith(new Date().toISOString().split('T')[0])).length

  return {
    notifications, loading, sending, pendingCount, sentToday,
    schedule, scheduleSessionReminders, sendNow, sendAllPending, cancel,
    refresh: fetchPending,
  }
}

// ────────────────────────────────────────────────────────────
// HOOK: useReporting
// Analytics & reports for chemo sessions
// lib/hooks/useReporting.ts
// ────────────────────────────────────────────────────────────

'use client'
import { useState, useCallback, useMemo } from 'react'
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

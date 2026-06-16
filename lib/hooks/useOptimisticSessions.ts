'use client'
import { useTransition, useOptimistic } from 'react'
import type { ChemoSession } from './useChemoScheduler'

export function useOptimisticSessions(sessions: ChemoSession[]) {
  const [isPending, startTransition] = useTransition()

  const [optimisticSessions, dispatchOptimistic] = useOptimistic<ChemoSession[], SessionAction>(
    sessions,
    (state, action) => {
      switch (action.type) {
        case 'complete':
          return state.map(s => s.id === action.id ? { ...s, status: 'completed' as const } : s)
        case 'postpone':
          return state.map(s => s.id === action.id
            ? { ...s, status: 'postponed' as const, actual_date: action.newDate }
            : s
          )
        case 'labs_clear':
          return state.map(s => s.id === action.id ? { ...s, labs_cleared: true } : s)
        case 'add':
          return [...state, action.session].sort((a,b) => a.session_date.localeCompare(b.session_date))
        default:
          return state
      }
    }
  )

  // Optimistic complete
  const optimisticComplete = (id: string, serverFn: () => Promise<void>) => {
    startTransition(async () => {
      dispatchOptimistic({ type: 'complete', id })
      try { await serverFn() }
      catch (e) { console.error('Complete failed, reverting', e) }
    })
  }

  // Optimistic postpone
  const optimisticPostpone = (id: string, newDate: string, serverFn: () => Promise<void>) => {
    startTransition(async () => {
      dispatchOptimistic({ type: 'postpone', id, newDate })
      try { await serverFn() }
      catch (e) { console.error('Postpone failed, reverting', e) }
    })
  }

  // Optimistic labs cleared
  const optimisticLabsClear = (id: string, serverFn: () => Promise<void>) => {
    startTransition(async () => {
      dispatchOptimistic({ type: 'labs_clear', id })
      try { await serverFn() }
      catch (e) { console.error('Labs update failed, reverting', e) }
    })
  }

  return {
    optimisticSessions, isPending,
    optimisticComplete, optimisticPostpone, optimisticLabsClear,
  }
}

// ────────────────────────────────────────────────────────────
// ERROR BOUNDARY & ERROR TYPES
// lib/types/errors.ts + components/ErrorBoundary.tsx
// ────────────────────────────────────────────────────────────

// Typed error classes

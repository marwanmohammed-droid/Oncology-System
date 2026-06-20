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

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

type ChemoErrorBoundaryProps = { children: React.ReactNode; fallback?: React.ReactNode }

export class ChemoErrorBoundary extends React.Component<ChemoErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChemoScheduler] Error caught by boundary:', error, info)
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
              <br />يرجى مراجعة الطبيب فوراً قبل إعطاء الجلسة
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

'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChemoScheduler } from '@/lib/hooks/useChemoScheduler'
import Link from 'next/link'
import { AdministerDrugsModal } from '@/components/chemo/AdministerDrugsModal'
import { EnterLabsModal } from '@/components/chemo/EnterLabsModal'

export default function ChemoSessionsPage() {
  const { sessions, loading, saving, error, scheduleSession, completeSession, postponeSession, refresh } = useChemoScheduler()
  const [patients, setPatients] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('')
  const [administerSession, setAdministerSession] = useState<any>(null)
  const [completeTarget, setCompleteTarget] = useState<any>(null)
  const [postponeTarget, setPostponeTarget] = useState<any>(null)
  const [labsTarget, setLabsTarget] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadPatients() {
      const { data } = await supabase
        .from('patients')
        .select('id, mrn, first_name_ar, last_name_ar')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
      setPatients(data || [])
    }
    loadPatients()
  }, [])

  const filtered = sessions.filter(s => {
    if (!filter) return true
    const name = `${s.patient?.first_name_ar} ${s.patient?.last_name_ar}`
    return name.includes(filter) || s.patient?.mrn?.includes(filter)
  })

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    scheduled: { label: 'مجدولة', color: '#1a8a78', bg: '#e6f7f4' },
    completed: { label: 'مكتملة', color: '#16a34a', bg: '#f0fdf4' },
    postponed: { label: 'مؤجلة', color: '#b45309', bg: '#fff3cd' },
    cancelled: { label: 'ملغية', color: '#e53e3e', bg: '#fde8e8' },
    upcoming: { label: 'قادمة', color: '#b45309', bg: '#fff3cd' },
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>جلسات الكيماوي</h1>
          <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
            Chemotherapy Sessions · {sessions.length} جلسة
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          padding: '9px 20px', background: '#1a8a78', color: '#fff',
          borderRadius: 8, border: 'none', fontSize: 13,
          fontWeight: 700, cursor: 'pointer',
        }}>
          + جدولة جلسة جديدة
        </button>
      </div>

      {error && (
        <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الجلسات', value: sessions.length, color: '#0b1f3a', bg: '#f7f8fc', icon: '💊' },
          { label: 'مجدولة', value: sessions.filter(s => s.status === 'scheduled').length, color: '#1a8a78', bg: '#e6f7f4', icon: '📅' },
          { label: 'مكتملة', value: sessions.filter(s => s.status === 'completed').length, color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
          { label: 'مؤجلة', value: sessions.filter(s => s.status === 'postponed').length, color: '#b45309', bg: '#fff3cd', icon: '⏸️' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0, fontFamily: 'DM Mono' }}>{value}</p>
              <p style={{ fontSize: 10, color: '#8e97b5', margin: 0 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 9, marginBottom: 16, maxWidth: 360 }}>
        <span style={{ color: '#8e97b5' }}>🔍</span>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="بحث باسم المريض أو MRN..."
          style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Cairo', flex: 1, direction: 'rtl' }}
        />
      </div>

      {/* Sessions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ fontWeight: 600, color: '#4a5580' }}>لا توجد جلسات بعد</p>
          <button onClick={() => setShowNew(true)} style={{ color: '#1a8a78', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            جدّل أول جلسة →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => {
            const cfg = statusConfig[s.status] || statusConfig.scheduled
            const isScheduled = s.status === 'scheduled'
            return (
              <div key={s.id} style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Date */}
                <div style={{ textAlign: 'center', minWidth: 60, paddingLeft: 16, borderLeft: '1px solid #eef0f6' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#0b1f3a', margin: 0, fontFamily: 'DM Mono' }}>
                    {s.session_date?.split('-')[2]}
                  </p>
                  <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono' }}>
                    {new Date(s.session_date).toLocaleString('ar-EG', { month: 'short' })}
                  </p>
                  {s.session_time && (
                    <p style={{ fontSize: 10, color: '#1a8a78', fontWeight: 600, margin: '3px 0 0', fontFamily: 'DM Mono' }}>
                      {s.session_time}
                    </p>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                    {s.patient?.first_name_ar} {s.patient?.last_name_ar}
                  </p>
                  <p style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 6px' }}>
                    {s.patient?.mrn} · {s.room || 'غرفة غير محددة'}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#e6f7f4', color: '#1a8a78', border: '1px solid rgba(42,184,160,.3)', fontFamily: 'DM Mono', fontWeight: 600 }}>
                      {s.plan?.protocol_name || 'بدون بروتوكول'}
                    </span>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#f7f8fc', color: '#8e97b5', border: '1px solid #dde2ee', fontFamily: 'DM Mono' }}>
                      Cycle {s.cycle_number}
                    </span>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, fontFamily: 'DM Mono', fontWeight: 600 }}>
                      {cfg.label}
                    </span>
                    {isScheduled && s.labs_cleared === false && (
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#fde8e8', color: '#e53e3e', border: '1px solid rgba(229,62,62,.3)', fontFamily: 'DM Mono', fontWeight: 600 }}>
                        ⚠️ التحاليل غير معتمدة
                      </span>
                    )}
                    {isScheduled && s.labs_cleared === true && (
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(22,163,74,.3)', fontFamily: 'DM Mono', fontWeight: 600 }}>
                        ✅ التحاليل معتمدة
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 320 }}>
                  {isScheduled && (
                    <button
                      onClick={() => setLabsTarget(s)}
                      style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(147,51,234,.3)', background: '#faf5ff', color: '#9333ea', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      🧪 تحاليل
                    </button>
                  )}
                  <button
                    onClick={() => setAdministerSession(s)}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(42,184,160,.3)', background: '#e6f7f4', color: '#1a8a78', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    💊 صرف الأدوية
                  </button>
                  {isScheduled && (
                    <>
                      <button
                        onClick={() => setCompleteTarget(s)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(22,163,74,.3)', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ✅ إتمام
                      </button>
                      <button
                        onClick={() => setPostponeTarget(s)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #dde2ee', background: '#fff', color: '#4a5580', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⏸️ تأجيل
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Session Modal */}
      {showNew && (
        <NewSessionModal
          patients={patients}
          supabase={supabase}
          scheduleSession={scheduleSession}
          schedulerSaving={saving}
          schedulerError={error}
          onClose={() => setShowNew(false)}
          onSaved={async () => {
            setShowNew(false)
            await refresh()
          }}
        />
      )}

      {/* Administer Drugs Modal */}
      {administerSession && (
        <AdministerDrugsModal
          sessionId={administerSession.id}
          patientId={administerSession.patient_id}
          patientName={`${administerSession.patient?.first_name_ar ?? ''} ${administerSession.patient?.last_name_ar ?? ''}`}
          onClose={() => setAdministerSession(null)}
          onDone={() => setAdministerSession(null)}
        />
      )}

      {/* Enter Labs Modal */}
      {labsTarget && (
        <EnterLabsModal
          sessionId={labsTarget.id}
          patientName={`${labsTarget.patient?.first_name_ar ?? ''} ${labsTarget.patient?.last_name_ar ?? ''}`}
          onClose={() => setLabsTarget(null)}
          onDone={async () => {
            setLabsTarget(null)
            await refresh()
          }}
        />
      )}

      {/* Complete Session Modal */}
      {completeTarget && (
        <CompleteSessionModal
          session={completeTarget}
          saving={saving}
          onClose={() => setCompleteTarget(null)}
          onConfirm={async (notes: string, adverseEvents: string) => {
            await completeSession(completeTarget.id, {
              session_notes: notes || undefined,
              adverse_events: adverseEvents || undefined,
            })
            setCompleteTarget(null)
          }}
        />
      )}

      {/* Postpone Session Modal */}
      {postponeTarget && (
        <PostponeSessionModal
          session={postponeTarget}
          saving={saving}
          onClose={() => setPostponeTarget(null)}
          onConfirm={async (newDate: string, reason: string, notes: string) => {
            await postponeSession(postponeTarget.id, newDate, reason, notes)
            setPostponeTarget(null)
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Complete Session Modal
// ────────────────────────────────────────────────────────────
function CompleteSessionModal({ session, saving, onClose, onConfirm }: any) {
  const [notes, setNotes] = useState('')
  const [adverseEvents, setAdverseEvents] = useState('')
  const [error, setError] = useState('')

  async function handleConfirm() {
    setError('')
    try {
      await onConfirm(notes, adverseEvents)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 18, width: 460, direction: 'rtl', fontFamily: 'Cairo' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>✅ إتمام الجلسة</p>
            <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
              {session.patient?.first_name_ar} {session.patient?.last_name_ar} · دورة {session.cycle_number}
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

          <div style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#16a34a' }}>
            سيتم تحديث عدد الدورات المكتملة في خطة العلاج تلقائيًا، وستُجدول الجلسة التالية إذا لم تكتمل الخطة بعد.
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات الجلسة (اختياري)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="أي ملاحظات عن سير الجلسة..."
              style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>آثار جانبية ملحوظة (اختياري)</label>
            <textarea value={adverseEvents} onChange={e => setAdverseEvents(e.target.value)} rows={2}
              placeholder="مثال: غثيان خفيف، حساسية موضعية..."
              style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
          <button onClick={handleConfirm} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
            {saving ? 'جارٍ الحفظ...' : 'تأكيد الإتمام'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Postpone Session Modal
// ────────────────────────────────────────────────────────────
function PostponeSessionModal({ session, saving, onClose, onConfirm }: any) {
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!newDate || !reason) {
      setError('يرجى تحديد التاريخ الجديد وسبب التأجيل')
      return
    }
    setError('')
    try {
      await onConfirm(newDate, reason, notes)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 18, width: 460, direction: 'rtl', fontFamily: 'Cairo' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>⏸️ تأجيل الجلسة</p>
            <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
              {session.patient?.first_name_ar} {session.patient?.last_name_ar} · {session.session_date}
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>التاريخ الجديد *</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'DM Mono', outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>سبب التأجيل *</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }}>
              <option value="">— اختر السبب —</option>
              <option value="نتائج تحاليل غير مناسبة">نتائج تحاليل غير مناسبة</option>
              <option value="ظروف صحية للمريض">ظروف صحية للمريض</option>
              <option value="عدم توفر الدواء">عدم توفر الدواء</option>
              <option value="طلب من المريض">طلب من المريض</option>
              <option value="ظروف إدارية">ظروف إدارية</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات إضافية (اختياري)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
          </div>

          <p style={{ fontSize: 10, color: '#8e97b5', margin: 0 }}>
            📱 سيتم إرسال رسالة نصية تلقائية للمريض بالتاريخ الجديد وسبب التأجيل
          </p>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
          <button onClick={handleConfirm} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#b45309', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
            {saving ? 'جارٍ الحفظ...' : 'تأكيد التأجيل'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// New Session Modal
// ────────────────────────────────────────────────────────────
function NewSessionModal({ patients, supabase, scheduleSession, schedulerSaving, schedulerError, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    patient_id: '',
    plan_id: '',
    session_date: '',
    session_time: '09:00',
    room: '',
  })
  const [plans, setPlans] = useState<any[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPlans() {
      if (!form.patient_id) { setPlans([]); return }
      setPlansLoading(true)
      const { data } = await supabase
        .from('treatment_plans')
        .select('id, protocol_name, status, completed_cycles, planned_cycles, regimen_id')
        .eq('patient_id', form.patient_id)
        .in('status', ['active', 'planned', 'on_hold'])
        .order('created_at', { ascending: false })
      setPlans(data || [])
      setPlansLoading(false)
      setForm((f: any) => ({ ...f, plan_id: '' }))
    }
    loadPlans()
  }, [form.patient_id])

  const selectedPlan = plans.find(p => p.id === form.plan_id)

  async function handleSave() {
    if (!form.patient_id || !form.plan_id || !form.session_date) {
      setError('يرجى اختيار المريض وخطة العلاج وتاريخ الجلسة')
      return
    }
    setError('')
    try {
      const nextCycle = (selectedPlan?.completed_cycles ?? 0) + 1
      await scheduleSession({
        plan_id: form.plan_id,
        patient_id: form.patient_id,
        cycle_number: nextCycle,
        session_date: form.session_date,
        session_time: form.session_time,
        room: form.room || undefined,
      })
      onSaved()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 18, width: 480, maxHeight: '90vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>💊 جدولة جلسة جديدة</p>
          <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(error || schedulerError) && (
            <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>
              {error || schedulerError}
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>المريض *</label>
            <select value={form.patient_id} onChange={e => setForm((f: any) => ({ ...f, patient_id: e.target.value }))}
              style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none' }}>
              <option value="">— اختر المريض —</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.first_name_ar} {p.last_name_ar} · {p.mrn}</option>
              ))}
            </select>
          </div>

          {form.patient_id && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>خطة العلاج *</label>
              {plansLoading ? (
                <p style={{ fontSize: 11, color: '#8e97b5' }}>جارٍ تحميل الخطط...</p>
              ) : plans.length === 0 ? (
                <div style={{ background: '#fff3cd', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#b45309' }}>
                  ⚠️ لا توجد خطة علاج نشطة لهذا المريض.{' '}
                  <Link href="/treatment-plans/new" style={{ color: '#1a8a78', fontWeight: 700, textDecoration: 'underline' }}>
                    إنشاء خطة علاج جديدة
                  </Link>
                </div>
              ) : (
                <select value={form.plan_id} onChange={e => setForm((f: any) => ({ ...f, plan_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none' }}>
                  <option value="">— اختر الخطة —</option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.protocol_name} · دورة {(p.completed_cycles ?? 0) + 1} من {p.planned_cycles}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ الجلسة *</label>
              <input type="date" value={form.session_date} onChange={e => setForm((f: any) => ({ ...f, session_date: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'DM Mono', outline: 'none', direction: 'ltr' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الوقت</label>
              <input type="time" value={form.session_time} onChange={e => setForm((f: any) => ({ ...f, session_time: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'DM Mono', outline: 'none', direction: 'ltr' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الغرفة</label>
            <input type="text" value={form.room} onChange={e => setForm((f: any) => ({ ...f, room: e.target.value }))}
              placeholder="مثال: Room 1"
              style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none' }} />
          </div>

          {selectedPlan && (
            <p style={{ fontSize: 10, color: '#8e97b5', margin: 0 }}>
              💊 سيتم حساب أدوية هذه الجلسة تلقائيًا من بروتوكول {selectedPlan.protocol_name}
            </p>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
          <button onClick={handleSave} disabled={schedulerSaving || plans.length === 0} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: schedulerSaving ? .6 : 1 }}>
            {schedulerSaving ? 'جارٍ الحفظ...' : '✅ تأكيد الجدولة'}
          </button>
        </div>
      </div>
    </div>
  )
}
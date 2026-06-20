'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ChemoSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: pts } = await supabase
        .from('patients')
        .select('id, mrn, first_name_ar, last_name_ar')
        .order('created_at', { ascending: false })

      const { data: sess } = await supabase
        .from('chemo_sessions')
        .select(`
          *,
          plan:treatment_plans(protocol_name, planned_cycles),
          patient:patients(mrn, first_name_ar, last_name_ar)
        `)
        .order('session_date', { ascending: true })

      setPatients(pts || [])
      setSessions(sess || [])
      setLoading(false)
    }
    load()
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
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      await supabase.from('chemo_sessions').update({ status: 'completed' }).eq('id', s.id)
                      setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'completed' } : x))
                    }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(22,163,74,.3)', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✅ إتمام
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.from('chemo_sessions').update({ status: 'postponed' }).eq('id', s.id)
                      setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'postponed' } : x))
                    }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #dde2ee', background: '#fff', color: '#4a5580', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ⏸️ تأجيل
                  </button>
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
          onClose={() => setShowNew(false)}
          onSaved={(newSession: any) => {
            setSessions(prev => [...prev, newSession])
            setShowNew(false)
          }}
        />
      )}
    </div>
  )
}

function NewSessionModal({ patients, supabase, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    patient_id: '',
    session_date: '',
    session_time: '09:00',
    cycle_number: 1,
    room: '',
    status: 'scheduled',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.patient_id || !form.session_date) {
      setError('يرجى اختيار المريض وتاريخ الجلسة')
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('chemo_sessions')
      .insert({
        patient_id: form.patient_id,
        session_date: form.session_date,
        session_time: form.session_time,
        cycle_number: form.cycle_number,
        room: form.room || null,
        status: form.status,
        preauth_status: 'pending',
        dose_modified: false,
        plan_id: null,
      })
      .select(`*, patient:patients(mrn, first_name_ar, last_name_ar)`)
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data)
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
          {error && <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>المريض *</label>
            <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
              style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none' }}>
              <option value="">— اختر المريض —</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.first_name_ar} {p.last_name_ar} · {p.mrn}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ الجلسة *</label>
              <input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'DM Mono', outline: 'none', direction: 'ltr' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الوقت</label>
              <input type="time" value={form.session_time} onChange={e => setForm(f => ({ ...f, session_time: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'DM Mono', outline: 'none', direction: 'ltr' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>رقم الدورة</label>
              <input type="number" min={1} value={form.cycle_number} onChange={e => setForm(f => ({ ...f, cycle_number: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'DM Mono', outline: 'none', direction: 'ltr' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الغرفة</label>
              <input type="text" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                placeholder="مثال: Room 1"
                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none' }} />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
            {saving ? 'جارٍ الحفظ...' : '✅ تأكيد الجدولة'}
          </button>
        </div>
      </div>
    </div>
  )
}
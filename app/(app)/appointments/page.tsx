'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    patient_id: '',
    appointment_date: '',
    appointment_time: '09:00',
    type: 'consultation',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: pts } = await supabase
        .from('patients')
        .select('id, mrn, first_name_ar, last_name_ar')
        .order('created_at', { ascending: false })

      const { data: apts } = await supabase
        .from('appointments')
        .select(`*, patient:patients(mrn, first_name_ar, last_name_ar)`)
        .is('archived_at', null)   // ← إضافة جديدة
        .order('appointment_date', { ascending: true })

      setPatients(pts || [])
      setAppointments(apts || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!form.patient_id || !form.appointment_date) {
      setError('Please select patient and date')
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('appointments')
      .insert({
        patient_id: form.patient_id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        type: form.type,
        notes: form.notes || null,
        status: 'scheduled',
      })
      .select(`*, patient:patients(mrn, first_name_ar, last_name_ar)`)
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    setAppointments(prev => [...prev, data])
    setShowNew(false)
    setForm({ patient_id: '', appointment_date: '', appointment_time: '09:00', type: 'consultation', notes: '' })
    setSaving(false)
  }

  const statusColor: Record<string, { bg: string; color: string }> = {
    scheduled: { bg: '#e6f7f4', color: '#1a8a78' },
    completed: { bg: '#f0fdf4', color: '#16a34a' },
    cancelled: { bg: '#fde8e8', color: '#e53e3e' },
  }

  const typeLabel: Record<string, string> = {
    consultation: 'Consultation',
    followup: 'Follow-up',
    chemo: 'Chemo Session',
    labs: 'Lab Results',
    imaging: 'Imaging',
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Appointments</h1>
          <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
            {appointments.length} appointments total
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          padding: '9px 20px', background: '#1a8a78', color: '#fff',
          borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          + New Appointment
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>Loading...</div>
      ) : appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p style={{ fontWeight: 600, color: '#4a5580' }}>No appointments yet</p>
          <button onClick={() => setShowNew(true)} style={{ color: '#1a8a78', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Book first appointment
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {appointments.map(a => {
            const cfg = statusColor[a.status] || statusColor.scheduled
            return (
              <div key={a.id} style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'center', minWidth: 60, paddingLeft: 16, borderLeft: '1px solid #eef0f6' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#0b1f3a', margin: 0, fontFamily: 'DM Mono' }}>
                    {a.appointment_date?.split('-')[2]}
                  </p>
                  <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono' }}>
                    {new Date(a.appointment_date).toLocaleString('en', { month: 'short' })}
                  </p>
                  {a.appointment_time && (
                    <p style={{ fontSize: 10, color: '#1a8a78', fontWeight: 600, margin: '3px 0 0', fontFamily: 'DM Mono' }}>
                      {a.appointment_time}
                    </p>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                    {a.patient?.first_name_ar} {a.patient?.last_name_ar}
                  </p>
                  <p style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 6px' }}>
                    {a.patient?.mrn}
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#f7f8fc', color: '#4a5580', border: '1px solid #dde2ee', fontFamily: 'DM Mono' }}>
                      {typeLabel[a.type] || a.type}
                    </span>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontFamily: 'DM Mono', fontWeight: 600 }}>
                      {a.status}
                    </span>
                  </div>
                  {a.notes && <p style={{ fontSize: 10, color: '#8e97b5', margin: '6px 0 0' }}>{a.notes}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      await supabase.from('appointments').update({ status: 'completed' }).eq('id', a.id)
                      setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status: 'completed' } : x))
                    }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(22,163,74,.3)', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Done
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', a.id)
                      setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status: 'cancelled' } : x))
                    }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #dde2ee', background: '#fff', color: '#e53e3e', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div style={{ background: '#fff', borderRadius: 18, width: 460, direction: 'rtl', fontFamily: 'Cairo' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>New Appointment</p>
              <button onClick={() => setShowNew(false)} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>x</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Patient *</label>
                <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none' }}>
                  <option value="">Select patient</option>
                  {patients.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.first_name_ar} {p.last_name_ar} · {p.mrn}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Date *</label>
                  <input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Time</label>
                  <input type="time" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none' }}>
                  <option value="consultation">Consultation</option>
                  <option value="followup">Follow-up</option>
                  <option value="chemo">Chemo Session</option>
                  <option value="labs">Lab Results</option>
                  <option value="imaging">Imaging</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Optional notes..."
                  style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo' }} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Saving...' : 'Save Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
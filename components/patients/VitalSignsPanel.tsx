'use client'
import { useState } from 'react'
import { useVitalSigns, evaluateVitals } from '@/lib/hooks/useVitalSigns'

export function VitalSignsPanel({ patientId }: { patientId: string }) {
    const { vitals, latestVitals, loading, saving, error, addVitals } = useVitalSigns(patientId)
    const [showForm, setShowForm] = useState(false)

    return (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>العلامات الحيوية</p>
                    <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Vital Signs</p>
                </div>
                <button onClick={() => setShowForm(true)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(42,184,160,.3)', background: '#e6f7f4', color: '#1a8a78', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    + تسجيل قراءة جديدة
                </button>
            </div>

            {error && <div style={{ margin: 12, background: '#fde8e8', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#e53e3e' }}>{error}</div>}

            {loading ? (
                <p style={{ padding: 20, textAlign: 'center', color: '#8e97b5', fontSize: 12 }}>جارٍ التحميل...</p>
            ) : vitals.length === 0 ? (
                <p style={{ padding: 20, textAlign: 'center', color: '#8e97b5', fontSize: 12 }}>لا توجد قراءات مسجلة</p>
            ) : (
                <>
                    {latestVitals && (
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f6' }}>
                            <VitalReading v={latestVitals} highlight />
                        </div>
                    )}
                    {vitals.length > 1 && (
                        <div style={{ padding: '10px 18px', maxHeight: 300, overflowY: 'auto' }}>
                            {vitals.slice(1).map(v => <VitalReading key={v.id} v={v} />)}
                        </div>
                    )}
                </>
            )}

            {showForm && (
                <VitalSignsFormModal
                    saving={saving}
                    onClose={() => setShowForm(false)}
                    onSave={async (data: any) => {
                        await addVitals({ ...data, patient_id: patientId, session_id: null, recorded_at: new Date().toISOString() })
                        setShowForm(false)
                    }}
                />
            )}
        </div>
    )
}

function VitalReading({ v, highlight }: { v: any; highlight?: boolean }) {
    const flags = evaluateVitals(v)
    return (
        <div style={{ padding: highlight ? 0 : '8px 0', borderBottom: highlight ? undefined : '1px solid #eef0f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>
                    {new Date(v.recorded_at).toLocaleString('ar-EG')}
                </p>
                {flags.anyAbnormal && (
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#fde8e8', color: '#e53e3e', fontWeight: 700 }}>⚠️ غير طبيعي</span>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 8 }}>
                <VitalBox label="Temp" value={v.temperature_c ? `${v.temperature_c}°` : '—'} abnormal={flags.fever} />
                <VitalBox label="BP" value={v.bp_systolic ? `${v.bp_systolic}/${v.bp_diastolic}` : '—'} abnormal={flags.hypotension || flags.hypertension} />
                <VitalBox label="Pulse" value={v.pulse_bpm ?? '—'} abnormal={flags.tachycardia || flags.bradycardia} />
                <VitalBox label="RR" value={v.respiratory_rate ?? '—'} />
                <VitalBox label="SpO2" value={v.spo2_pct ? `${v.spo2_pct}%` : '—'} abnormal={flags.lowSpo2} />
                <VitalBox label="Pain" value={v.pain_score ?? '—'} abnormal={flags.severePain} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                <VitalBox label="Pallor" value={v.pallor == null ? '—' : v.pallor ? 'Yes' : 'No'} abnormal={flags.pallorPresent} />
                <VitalBox label="Jaundice" value={v.jaundice == null ? '—' : v.jaundice ? 'Yes' : 'No'} abnormal={flags.jaundicePresent} />
                <VitalBox label="HBV" value={v.hbv_status ?? '—'} abnormal={v.hbv_status === 'positive'} />
                <VitalBox label="HCV" value={v.hcv_status ?? '—'} abnormal={v.hcv_status === 'positive'} />
                <VitalBox label="HIV" value={v.hiv_status ?? '—'} abnormal={v.hiv_status === 'positive'} />
            </div>
            {v.notes && <p style={{ fontSize: 10, color: '#8e97b5', margin: '6px 0 0' }}>{v.notes}</p>}
        </div>
    )
}

function VitalBox({ label, value, abnormal }: { label: string; value: any; abnormal?: boolean }) {
    return (
        <div>
            <p style={{ fontSize: 8, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: abnormal ? '#e53e3e' : '#1e2540', margin: '2px 0 0', fontFamily: 'DM Mono' }}>{value}</p>
        </div>
    )
}

function VitalSignsFormModal({ saving, onClose, onSave }: any) {
    const [form, setForm] = useState({
        temperature_c: '', bp_systolic: '', bp_diastolic: '', pulse_bpm: '',
        respiratory_rate: '', spo2_pct: '', pain_score: '',
        pallor: '', jaundice: '', hbv_status: '', hcv_status: '', hiv_status: '',
        notes: '',
    })
    const [error, setError] = useState('')

    async function handleSubmit() {
        const hasAnyValue = Object.entries(form).some(([k, v]) => k !== 'notes' && v)
        if (!hasAnyValue) {
            setError('يرجى إدخال قراءة واحدة على الأقل')
            return
        }
        setError('')
        try {
            await onSave({
                temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
                bp_systolic: form.bp_systolic ? parseInt(form.bp_systolic) : null,
                bp_diastolic: form.bp_diastolic ? parseInt(form.bp_diastolic) : null,
                pulse_bpm: form.pulse_bpm ? parseInt(form.pulse_bpm) : null,
                respiratory_rate: form.respiratory_rate ? parseInt(form.respiratory_rate) : null,
                spo2_pct: form.spo2_pct ? parseInt(form.spo2_pct) : null,
                pain_score: form.pain_score ? parseInt(form.pain_score) : null,
                pallor: form.pallor === '' ? null : form.pallor === 'yes',
                jaundice: form.jaundice === '' ? null : form.jaundice === 'yes',
                hbv_status: form.hbv_status || null,
                hcv_status: form.hcv_status || null,
                hiv_status: form.hiv_status || null,
                notes: form.notes || null,
            })
        } catch (e: any) {
            setError(e.message)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 500, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>❤️ تسجيل علامات حيوية</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الحرارة (°C)</label>
                            <input type="number" step="0.1" value={form.temperature_c} onChange={e => setForm(f => ({ ...f, temperature_c: e.target.value }))}
                                placeholder="37.0" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>النبض (bpm)</label>
                            <input type="number" value={form.pulse_bpm} onChange={e => setForm(f => ({ ...f, pulse_bpm: e.target.value }))}
                                placeholder="72" style={inputStyle} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ضغط الدم (Systolic / Diastolic)</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="number" value={form.bp_systolic} onChange={e => setForm(f => ({ ...f, bp_systolic: e.target.value }))}
                                placeholder="120" style={{ ...inputStyle, flex: 1 }} />
                            <span style={{ color: '#8e97b5' }}>/</span>
                            <input type="number" value={form.bp_diastolic} onChange={e => setForm(f => ({ ...f, bp_diastolic: e.target.value }))}
                                placeholder="80" style={{ ...inputStyle, flex: 1 }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>معدل التنفس</label>
                            <input type="number" value={form.respiratory_rate} onChange={e => setForm(f => ({ ...f, respiratory_rate: e.target.value }))}
                                placeholder="16" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>SpO2 (%)</label>
                            <input type="number" value={form.spo2_pct} onChange={e => setForm(f => ({ ...f, spo2_pct: e.target.value }))}
                                placeholder="98" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Pain (0-10)</label>
                            <input type="number" min="0" max="10" value={form.pain_score} onChange={e => setForm(f => ({ ...f, pain_score: e.target.value }))}
                                placeholder="0" style={inputStyle} />
                        </div>
                    </div>

                    <p style={{ fontSize: 9, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono', textTransform: 'uppercase', margin: '4px 0 0' }}>Physical Examination</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Pallor</label>
                            <select value={form.pallor} onChange={e => setForm(f => ({ ...f, pallor: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Jaundice</label>
                            <select value={form.jaundice} onChange={e => setForm(f => ({ ...f, jaundice: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    </div>

                    <p style={{ fontSize: 9, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono', textTransform: 'uppercase', margin: '4px 0 0' }}>Virology</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>HBV</label>
                            <select value={form.hbv_status} onChange={e => setForm(f => ({ ...f, hbv_status: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option value="positive">+ve</option>
                                <option value="negative">-ve</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>HCV</label>
                            <select value={form.hcv_status} onChange={e => setForm(f => ({ ...f, hcv_status: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option value="positive">+ve</option>
                                <option value="negative">-ve</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>HIV</label>
                            <select value={form.hiv_status} onChange={e => setForm(f => ({ ...f, hiv_status: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option value="positive">+ve</option>
                                <option value="negative">-ve</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                            style={{ ...inputStyle, resize: 'none' }} />
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'حفظ القراءة'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee',
    borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr',
    fontFamily: 'DM Mono, monospace', boxSizing: 'border-box',
}
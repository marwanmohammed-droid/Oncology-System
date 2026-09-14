'use client'
import { useState } from 'react'
import { useProtocolHistory } from '@/lib/hooks/useProtocolHistory'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { DateInputHybrid } from '@/components/shared/DateInputHybrid'

const REGIMEN_CLASS_LABELS: Record<string, string> = {
    chemotherapy: 'كيماوي', hormonal: 'هرموني', immunotherapy: 'مناعي', targeted: 'موجّه', combined: 'مركّب',
}

export function ProtocolHistoryPanel({ patientId }: { patientId: string }) {
    const { entries, loading, saving, error, addEntry, markCompleted, deleteEntry } = useProtocolHistory(patientId)
    const [showForm, setShowForm] = useState(false)
    const [completeTarget, setCompleteTarget] = useState<any>(null)

    return (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>سجل البروتوكولات</p>
                    <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Protocol History · {entries.length}</p>
                </div>
                <button onClick={() => setShowForm(true)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(42,184,160,.3)', background: '#e6f7f4', color: '#1a8a78', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    + تسجيل بروتوكول
                </button>
            </div>

            {error && <div style={{ margin: 12, background: '#fde8e8', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#e53e3e' }}>{error}</div>}

            {loading ? (
                <p style={{ padding: 20, textAlign: 'center', color: '#8e97b5', fontSize: 12 }}>جارٍ التحميل...</p>
            ) : entries.length === 0 ? (
                <p style={{ padding: 20, textAlign: 'center', color: '#8e97b5', fontSize: 12 }}>لا توجد بروتوكولات مسجلة</p>
            ) : (
                <div style={{ padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {entries.map(e => (
                        <div key={e.id} style={{ border: '1px solid #eef0f6', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{e.protocol_name}</p>
                                    <p style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 0' }}>
                                        {e.start_date} → {e.is_ongoing ? 'مستمر' : (e.end_date || '—')}
                                        {e.num_cycles ? ` · ${e.num_cycles} جلسة` : ''}
                                        {e.regimen_class ? ` · ${REGIMEN_CLASS_LABELS[e.regimen_class] || e.regimen_class}` : ''}
                                    </p>
                                    {e.notes && <p style={{ fontSize: 11, color: '#4a5580', margin: '6px 0 0' }}>{e.notes}</p>}
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: 9, padding: '2px 10px', borderRadius: 20, fontWeight: 700,
                                        background: e.is_ongoing ? '#e6f7f4' : '#f0fdf4',
                                        color: e.is_ongoing ? '#1a8a78' : '#16a34a',
                                    }}>
                                        {e.is_ongoing ? 'مستمر' : 'مكتمل'}
                                    </span>
                                    {e.is_ongoing && (
                                        <button onClick={() => setCompleteTarget(e)} style={{ fontSize: 10, color: '#1a8a78', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            ✓ إنهاء
                                        </button>
                                    )}
                                    <button onClick={() => { if (confirm('حذف هذا السجل؟')) deleteEntry(e.id) }} style={{ fontSize: 10, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <ProtocolFormModal
                    patientId={patientId}
                    saving={saving}
                    onClose={() => setShowForm(false)}
                    onSave={async (data: any) => { await addEntry(data); setShowForm(false) }}
                />
            )}

            {completeTarget && (
                <CompleteProtocolModal
                    entry={completeTarget}
                    saving={saving}
                    onClose={() => setCompleteTarget(null)}
                    onConfirm={async (endDate: string) => { await markCompleted(completeTarget.id, endDate); setCompleteTarget(null) }}
                />
            )}
        </div>
    )
}

function ProtocolFormModal({ patientId, saving, onClose, onSave }: any) {
    const supabase = createClient()
    const [regimens, setRegimens] = useState<any[]>([])
    const [form, setForm] = useState({
        regimen_id: '', protocol_name: '', regimen_class: '',
        num_cycles: '', start_date: '', end_date: '', is_ongoing: false, notes: '',
    })
    const [error, setError] = useState('')

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from('chemo_regimens').select('id, name, regimen_class, standard_cycles').eq('is_active', true).order('name')
            setRegimens(data || [])
        }
        load()
    }, [])

    function handleRegimenSelect(id: string) {
        const reg = regimens.find(r => r.id === id)
        setForm(f => ({
            ...f, regimen_id: id,
            protocol_name: reg?.name || '',
            regimen_class: reg?.regimen_class || '',
            num_cycles: reg?.standard_cycles ? String(reg.standard_cycles) : f.num_cycles,
        }))
    }

    async function handleSubmit() {
        if (!form.protocol_name || !form.start_date) {
            setError('يرجى اختيار البروتوكول وتاريخ البدء')
            return
        }
        if (!form.is_ongoing && !form.end_date) {
            setError('يرجى إدخال تاريخ الانتهاء أو تحديد أنه مستمر')
            return
        }
        setError('')
        try {
            await onSave({
                patient_id: patientId,
                protocol_name: form.protocol_name,
                regimen_class: form.regimen_class || undefined,
                num_cycles: form.num_cycles ? parseInt(form.num_cycles) : null,
                start_date: form.start_date,
                end_date: form.is_ongoing ? null : form.end_date,
                is_ongoing: form.is_ongoing,
                notes: form.notes,
            })
        } catch (e: any) {
            setError(e.message)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 460, direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>💊 تسجيل بروتوكول</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>البروتوكول *</label>
                        <select value={form.regimen_id} onChange={e => handleRegimenSelect(e.target.value)}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="">— اختر من القائمة —</option>
                            {regimens.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <input value={form.protocol_name} onChange={e => setForm(f => ({ ...f, protocol_name: e.target.value }))}
                            placeholder="أو اكتب اسم البروتوكول يدويًا"
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', marginTop: 8, boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>عدد الجلسات</label>
                        <input type="number" value={form.num_cycles} onChange={e => setForm(f => ({ ...f, num_cycles: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ البدء *</label>
                            <DateInputHybrid value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))}
                                style={{ padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ الانتهاء</label>
                            <DateInputHybrid value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))}
                                style={{ padding: '8px 11px', border: `1.5px solid ${form.is_ongoing ? '#f0f0f0' : '#dde2ee'}`, borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', opacity: form.is_ongoing ? .5 : 1 }} />
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_ongoing} onChange={e => setForm(f => ({ ...f, is_ongoing: e.target.checked, end_date: e.target.checked ? '' : f.end_date }))} />
                        لسه مستمر (Ongoing) — لم ينتهِ بعد
                    </label>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CompleteProtocolModal({ entry, saving, onClose, onConfirm }: any) {
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.7)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 14, width: 340, padding: 20, direction: 'rtl', fontFamily: 'Cairo' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0b1f3a', margin: '0 0 6px' }}>إنهاء بروتوكول: {entry.protocol_name}</p>
                <p style={{ fontSize: 11, color: '#8e97b5', margin: '0 0 14px' }}>تاريخ الانتهاء</p>
                <DateInputHybrid value={endDate} onChange={setEndDate}
                    style={{ padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 7, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={() => onConfirm(endDate)} disabled={saving} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        تأكيد
                    </button>
                </div>
            </div>
        </div>
    )
}
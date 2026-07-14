'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTreatmentPlans } from '@/lib/hooks/useTreatmentPlans'
import { useChemoRegimens } from '@/lib/hooks/useChemoRegimens'

const FREQUENCY_TO_DAYS: Record<string, number> = {
    daily: 1, weekly: 7, q2w: 14, q3w: 21, q4w: 28, monthly: 30,
}

export default function NewTreatmentPlanPage() {
    const router = useRouter()
    const supabase = createClient()
    const { createPlan } = useTreatmentPlans()
    const { regimens, loading: regimensLoading } = useChemoRegimens()

    const [patients, setPatients] = useState<any[]>([])
    const [doctors, setDoctors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        patient_id: '',
        regimen_id: '',
        intent: 'curative',
        line_of_therapy: 'first_line',
        start_date: new Date().toISOString().split('T')[0],
        planned_cycles: '',
        cycle_interval_days: '',
        bsa_at_start: '',
        weight_at_start: '',
        height_at_start: '',
        oncologist_id: '',
        tumor_board_approved: false,
        plan_notes: '',
    })

    useEffect(() => {
        async function load() {
            const patientsResult = await supabase
                .from('patients')
                .select('id, mrn, first_name_ar, last_name_ar')
                .is('archived_at', null)
                .order('created_at', { ascending: false })

            const doctorsResult = await supabase
                .from('profiles')
                .select('id, full_name_ar, full_name_en')
                .eq('role', 'doctor')

            setPatients(patientsResult.data || [])
            setDoctors(doctorsResult.data || [])
            setLoading(false)
        }
        load()
    }, [])

    const selectedRegimen = regimens.find(r => r.id === form.regimen_id)

    function handleRegimenSelect(regimenId: string) {
        const reg = regimens.find(r => r.id === regimenId)
        setForm(f => ({
            ...f,
            regimen_id: regimenId,
            planned_cycles: reg?.standard_cycles ? String(reg.standard_cycles) : f.planned_cycles,
            cycle_interval_days: reg ? String(FREQUENCY_TO_DAYS[reg.cycle_frequency] || 21) : f.cycle_interval_days,
        }))
    }

    function handleAnthro(weight: string, height: string) {
        const w = parseFloat(weight)
        const h = parseFloat(height)
        if (w && h) {
            const bsa = Math.sqrt((w * h) / 3600).toFixed(2)
            setForm(f => ({ ...f, bsa_at_start: bsa }))
        }
    }

    async function handleSave() {
        if (!form.patient_id || !form.regimen_id || !form.planned_cycles || !form.cycle_interval_days) {
            setError('يرجى ملء المريض والبروتوكول وعدد الدورات والفاصل الزمني')
            return
        }
        setSaving(true)
        setError('')
        try {
            const diagResult = await supabase
                .from('diagnoses')
                .select('id')
                .eq('patient_id', form.patient_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            const diag = diagResult.data

            await createPlan({
                patient_id: form.patient_id,
                diagnosis_id: diag?.id ?? null,
                intent: form.intent,
                line_of_therapy: form.line_of_therapy,
                protocol_name: selectedRegimen?.name || '',
                regimen_id: form.regimen_id,
                start_date: form.start_date,
                planned_cycles: parseInt(form.planned_cycles),
                cycle_interval_days: parseInt(form.cycle_interval_days),
                bsa_at_start: form.bsa_at_start ? parseFloat(form.bsa_at_start) : null,
                weight_at_start: form.weight_at_start ? parseFloat(form.weight_at_start) : null,
                height_at_start: form.height_at_start ? parseFloat(form.height_at_start) : null,
                status: 'active',
                end_date: null,
                oncologist_id: form.oncologist_id || null,
                tumor_board_approved: form.tumor_board_approved,
                plan_notes: form.plan_notes || null,
            })

            router.push(`/patients/${form.patient_id}`)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    const inputStyle = {
        width: '100%',
        padding: '8px 11px',
        border: '1.5px solid #dde2ee',
        borderRadius: 7,
        fontSize: 12,
        outline: 'none',
        fontFamily: 'Cairo, sans-serif',
        boxSizing: 'border-box' as const,
    }
    const labelStyle = {
        fontSize: 11,
        fontWeight: 600 as const,
        color: '#4a5580',
        display: 'block' as const,
        marginBottom: 5,
    }

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl', maxWidth: 760, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>خطة علاج جديدة</h1>
                <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>New Treatment Plan</p>
            </div>

            {error && (
                <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>
                    {error}
                </div>
            )}

            {loading || regimensLoading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <span className="card-icon teal">🧬</span>
                        <div>
                            <p className="card-title">تفاصيل الخطة العلاجية</p>
                            <p className="card-subtitle">Treatment Plan Details</p>
                        </div>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                        <div>
                            <label style={labelStyle}>المريض *</label>
                            <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} style={inputStyle}>
                                <option value="">— اختر المريض —</option>
                                {patients.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.first_name_ar} {p.last_name_ar} · {p.mrn}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>البروتوكول العلاجي *</label>
                            <select value={form.regimen_id} onChange={e => handleRegimenSelect(e.target.value)} style={inputStyle}>
                                <option value="">— اختر البروتوكول —</option>
                                {regimens.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name} {r.full_name ? `· ${r.full_name}` : ''}</option>
                                ))}
                            </select>
                            {selectedRegimen && (
                                <p style={{ fontSize: 10, color: '#8e97b5', marginTop: 4, fontFamily: 'DM Mono' }}>
                                    {selectedRegimen.cycle_frequency} · {selectedRegimen.standard_cycles ? `${selectedRegimen.standard_cycles} دورات موصى بها` : 'مستمر'}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>القصد العلاجي</label>
                                <select value={form.intent} onChange={e => setForm(f => ({ ...f, intent: e.target.value }))} style={inputStyle}>
                                    <option value="curative">شفائي · Curative</option>
                                    <option value="neoadjuvant">قبل الجراحة · Neoadjuvant</option>
                                    <option value="adjuvant">مساعد بعد الجراحة · Adjuvant</option>
                                    <option value="palliative">تلطيفي · Palliative</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>خط العلاج</label>
                                <select value={form.line_of_therapy} onChange={e => setForm(f => ({ ...f, line_of_therapy: e.target.value }))} style={inputStyle}>
                                    <option value="first_line">الخط الأول · First line</option>
                                    <option value="second_line">الخط الثاني · Second line</option>
                                    <option value="third_line">الخط الثالث · Third line</option>
                                    <option value="maintenance">علاج صيانة · Maintenance</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>تاريخ البدء *</label>
                                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                    style={{ ...inputStyle, direction: 'ltr' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>عدد الدورات المخططة *</label>
                                <input type="number" min={1} value={form.planned_cycles} onChange={e => setForm(f => ({ ...f, planned_cycles: e.target.value }))}
                                    placeholder="e.g. 6" style={{ ...inputStyle, direction: 'ltr' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>الفاصل بين الدورات (أيام) *</label>
                                <input type="number" min={1} value={form.cycle_interval_days} onChange={e => setForm(f => ({ ...f, cycle_interval_days: e.target.value }))}
                                    placeholder="e.g. 21" style={{ ...inputStyle, direction: 'ltr' }} />
                            </div>
                        </div>

                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                            القياسات الجسدية — لحساب الجرعة (BSA)
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>الوزن (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={form.weight_at_start}
                                    onChange={e => {
                                        const v = e.target.value
                                        setForm(f => ({ ...f, weight_at_start: v }))
                                        handleAnthro(v, form.height_at_start)
                                    }}
                                    placeholder="70"
                                    style={{ ...inputStyle, direction: 'ltr' }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>الطول (cm)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={form.height_at_start}
                                    onChange={e => {
                                        const v = e.target.value
                                        setForm(f => ({ ...f, height_at_start: v }))
                                        handleAnthro(form.weight_at_start, v)
                                    }}
                                    placeholder="170"
                                    style={{ ...inputStyle, direction: 'ltr' }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>BSA (m²) — تلقائي</label>
                                <input value={form.bsa_at_start} readOnly placeholder="Auto"
                                    style={{ ...inputStyle, direction: 'ltr', background: '#e6f7f4', color: '#1a8a78', fontWeight: 700 }} />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>الطبيب المعالج</label>
                            <select value={form.oncologist_id} onChange={e => setForm(f => ({ ...f, oncologist_id: e.target.value }))} style={inputStyle}>
                                <option value="">— بدون تحديد —</option>
                                {doctors.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.full_name_ar || d.full_name_en}</option>
                                ))}
                            </select>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.tumor_board_approved}
                                onChange={e => setForm(f => ({ ...f, tumor_board_approved: e.target.checked }))} />
                            معتمدة من لجنة الأورام (Tumor Board)
                        </label>

                        <div>
                            <label style={labelStyle}>ملاحظات</label>
                            <textarea value={form.plan_notes} onChange={e => setForm(f => ({ ...f, plan_notes: e.target.value }))}
                                rows={2} placeholder="ملاحظات إضافية عن الخطة العلاجية..." style={{ ...inputStyle, resize: 'none' }} />
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={handleSave} disabled={saving} style={{
                    padding: '10px 24px', background: '#1a8a78', color: '#fff',
                    borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', opacity: saving ? .6 : 1,
                }}>
                    {saving ? 'جارٍ الحفظ...' : '✅ إنشاء خطة العلاج'}
                </button>
            </div>
        </div>
    )
}
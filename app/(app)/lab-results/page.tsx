'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLabResults } from '@/lib/hooks/useLabResults'
import Link from 'next/link'

const CATEGORY_TESTS: Record<string, string[]> = {
    cbc: ['WBC', 'ANC', 'Hemoglobin', 'Hematocrit', 'Platelets', 'RBC'],
    chemistry: ['Glucose', 'Sodium', 'Potassium', 'Calcium', 'Albumin', 'Total Protein'],
    tumor_markers: ['CEA', 'CA-125', 'CA 19-9', 'PSA', 'AFP', 'CA 15-3', 'Beta-hCG'],
    coagulation: ['PT', 'PTT', 'INR', 'Fibrinogen'],
    liver_function: ['ALT', 'AST', 'Bilirubin (Total)', 'Bilirubin (Direct)', 'ALP', 'GGT'],
    kidney_function: ['Creatinine', 'BUN', 'eGFR', 'Uric Acid'],
    other: [],
}

export default function LabResultsPage() {
    const { results, loading, saving, error, addResult, markReviewed, criticalResults, categoryLabels } = useLabResults()
    const [patients, setPatients] = useState<any[]>([])
    const [showNew, setShowNew] = useState(false)
    const [filter, setFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const supabase = createClient()

    useEffect(() => {
        async function loadPatients() {
            const { data } = await supabase
                .from('patients')
                .select('id, mrn, first_name_ar, last_name_ar')
                .is('archived_at', null)
                .order('first_name_ar')
            setPatients(data || [])
        }
        loadPatients()
    }, [])

    const filtered = results.filter(r => {
        if (categoryFilter && r.test_category !== categoryFilter) return false
        if (!filter) return true
        const name = `${r.patient?.first_name_ar} ${r.patient?.last_name_ar}`
        return name.includes(filter) || r.patient?.mrn?.includes(filter) || r.test_name.toLowerCase().includes(filter.toLowerCase())
    })

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>نتائج المختبر</h1>
                    <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                        Lab Results · {results.length} نتيجة
                    </p>
                </div>
                <button onClick={() => setShowNew(true)} style={{
                    padding: '9px 20px', background: '#1a8a78', color: '#fff',
                    borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                    + إضافة نتيجة
                </button>
            </div>

            {criticalResults.length > 0 && (
                <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#e53e3e', margin: 0 }}>
                        🚨 {criticalResults.length} نتيجة حرجة تحتاج مراجعة فورية
                    </p>
                </div>
            )}

            {error && (
                <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>
                    {error}
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 9, maxWidth: 320, flex: 1 }}>
                    <span style={{ color: '#8e97b5' }}>🔍</span>
                    <input
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="بحث بالمريض أو اسم التحليل..."
                        style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Cairo', flex: 1, direction: 'rtl' }}
                    />
                </div>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{
                    padding: '8px 14px', border: '1.5px solid #dde2ee', borderRadius: 9, fontSize: 12, fontFamily: 'Cairo', outline: 'none', background: '#fff',
                }}>
                    <option value="">كل الأقسام</option>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Results List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🧪</div>
                    <p style={{ fontWeight: 600, color: '#4a5580' }}>لا توجد نتائج بعد</p>
                </div>
            ) : (
                <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f7f8fc', borderBottom: '1.5px solid #dde2ee' }}>
                                {['المريض', 'التحليل', 'القسم', 'النتيجة', 'المعدل الطبيعي', 'التاريخ', 'الحالة', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 10, fontFamily: 'DM Mono', color: '#8e97b5', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r, i) => (
                                <tr key={r.id} style={{ borderBottom: '1px solid #eef0f6', background: r.is_critical ? '#fef5f5' : i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                                    <td style={{ padding: '12px 14px' }}>
                                        <Link href={`/patients/${r.patient_id}`} style={{ textDecoration: 'none' }}>
                                            <p style={{ margin: 0, fontWeight: 700, color: '#0b1f3a' }}>{r.patient?.first_name_ar} {r.patient?.last_name_ar}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{r.patient?.mrn}</p>
                                        </Link>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e2540' }}>{r.test_name}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 10, color: '#8e97b5' }}>{categoryLabels[r.test_category]}</td>
                                    <td style={{
                                        padding: '12px 14px', fontFamily: 'DM Mono', fontWeight: 700,
                                        color: r.is_critical ? '#e53e3e' : r.is_abnormal ? '#b45309' : '#16a34a',
                                    }}>
                                        {r.result_value ?? r.result_text ?? '—'} {r.unit || ''}
                                    </td>
                                    <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', fontSize: 10, color: '#8e97b5' }}>{r.reference_range || '—'}</td>
                                    <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', fontSize: 10, color: '#8e97b5' }}>{r.test_date}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {r.is_critical && (
                                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#fde8e8', color: '#e53e3e', fontWeight: 700 }}>🚨 حرج</span>
                                        )}
                                        {!r.is_critical && r.is_abnormal && (
                                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#fff3cd', color: '#b45309', fontWeight: 700 }}>⚠️ غير طبيعي</span>
                                        )}
                                        {!r.is_critical && !r.is_abnormal && (
                                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}>✅ طبيعي</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {!r.reviewed_at ? (
                                            <button onClick={() => markReviewed(r.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #dde2ee', background: '#fff', color: '#4a5580', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                                وضع كمراجعة
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: 10, color: '#8e97b5' }}>✓ روجعت</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showNew && (
                <NewLabResultModal
                    patients={patients}
                    saving={saving}
                    onClose={() => setShowNew(false)}
                    onSave={async (data: any) => {
                        await addResult(data)
                        setShowNew(false)
                    }}
                />
            )}
        </div>
    )
}

function NewLabResultModal({ patients, saving, onClose, onSave }: any) {
    const [form, setForm] = useState({
        patient_id: '',
        test_category: 'cbc',
        test_name: '',
        result_value: '',
        result_text: '',
        unit: '',
        reference_range: '',
        is_abnormal: false,
        is_critical: false,
        test_date: new Date().toISOString().split('T')[0],
        notes: '',
    })
    const [error, setError] = useState('')

    const suggestedTests = CATEGORY_TESTS[form.test_category] || []

    async function handleSubmit() {
        if (!form.patient_id || !form.test_name) {
            setError('يرجى اختيار المريض واسم التحليل')
            return
        }
        setError('')
        try {
            await onSave({
                patient_id: form.patient_id,
                test_category: form.test_category,
                test_name: form.test_name,
                result_value: form.result_value ? parseFloat(form.result_value) : null,
                result_text: form.result_text || null,
                unit: form.unit || null,
                reference_range: form.reference_range || null,
                is_abnormal: form.is_abnormal,
                is_critical: form.is_critical,
                test_date: form.test_date,
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
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>🧪 إضافة نتيجة تحليل</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>المريض *</label>
                        <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="">— اختر المريض —</option>
                            {patients.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.first_name_ar} {p.last_name_ar} · {p.mrn}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>القسم *</label>
                        <select value={form.test_category} onChange={e => setForm(f => ({ ...f, test_category: e.target.value, test_name: '' }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="cbc">تعداد دم كامل (CBC)</option>
                            <option value="chemistry">كيمياء الدم</option>
                            <option value="tumor_markers">علامات الأورام</option>
                            <option value="coagulation">تخثر الدم</option>
                            <option value="liver_function">وظائف الكبد</option>
                            <option value="kidney_function">وظائف الكلى</option>
                            <option value="other">أخرى</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>اسم التحليل *</label>
                        {suggestedTests.length > 0 ? (
                            <select value={form.test_name} onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                                <option value="">— اختر —</option>
                                {suggestedTests.map(t => <option key={t} value={t}>{t}</option>)}
                                <option value="__custom__">أخرى (اكتب يدويًا)</option>
                            </select>
                        ) : null}
                        {(suggestedTests.length === 0 || form.test_name === '__custom__') && (
                            <input
                                value={form.test_name === '__custom__' ? '' : form.test_name}
                                onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))}
                                placeholder="اكتب اسم التحليل"
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', marginTop: suggestedTests.length > 0 ? 8 : 0, boxSizing: 'border-box' }}
                            />
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>القيمة الرقمية</label>
                            <input type="number" step="0.01" value={form.result_value} onChange={e => setForm(f => ({ ...f, result_value: e.target.value }))}
                                placeholder="e.g. 5.2" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الوحدة</label>
                            <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                                placeholder="e.g. ×10³/µL" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>أو نتيجة نصية (بدل القيمة الرقمية)</label>
                        <input value={form.result_text} onChange={e => setForm(f => ({ ...f, result_text: e.target.value }))}
                            placeholder="e.g. Positive, Negative" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>المعدل الطبيعي</label>
                            <input value={form.reference_range} onChange={e => setForm(f => ({ ...f, reference_range: e.target.value }))}
                                placeholder="e.g. 4.0-11.0" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ التحليل</label>
                            <input type="date" value={form.test_date} onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.is_abnormal} onChange={e => setForm(f => ({ ...f, is_abnormal: e.target.checked }))} />
                            نتيجة غير طبيعية
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer', color: '#e53e3e' }}>
                            <input type="checkbox" checked={form.is_critical} onChange={e => setForm(f => ({ ...f, is_critical: e.target.checked }))} />
                            🚨 نتيجة حرجة
                        </label>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'حفظ النتيجة'}
                    </button>
                </div>
            </div>
        </div>
    )
}
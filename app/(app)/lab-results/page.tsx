'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLabResults } from '@/lib/hooks/useLabResults'
import { LAB_PANELS } from '@/lib/constants/medicalLists'

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
                    + إضافة نتائج تحليل
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
                                        <p style={{ margin: 0, fontWeight: 700, color: '#0b1f3a' }}>{r.patient?.first_name_ar} {r.patient?.last_name_ar}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{r.patient?.mrn}</p>
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
                <NewLabPanelModal
                    patients={patients}
                    saving={saving}
                    onClose={() => setShowNew(false)}
                    onSave={async (rows: any[]) => {
                        for (const row of rows) {
                            await addResult(row)
                        }
                        setShowNew(false)
                    }}
                />
            )}
        </div>
    )
}

type PanelRowState = { include: boolean; result_value: string; result_text: string; is_abnormal: boolean; is_critical: boolean }

function NewLabPanelModal({ patients, saving, onClose, onSave }: any) {
    const [patientId, setPatientId] = useState('')
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
    const [panelKey, setPanelKey] = useState('')
    const [rows, setRows] = useState<Record<string, PanelRowState>>({})
    const [error, setError] = useState('')
    const [localSaving, setLocalSaving] = useState(false)

    const selectedPanel = LAB_PANELS.find(p => p.key === panelKey)

    function handlePanelSelect(key: string) {
        setPanelKey(key)
        const panel = LAB_PANELS.find(p => p.key === key)
        if (!panel) { setRows({}); return }
        const initialRows: Record<string, PanelRowState> = {}
        panel.items.forEach(item => {
            initialRows[item.name] = { include: true, result_value: '', result_text: '', is_abnormal: false, is_critical: false }
        })
        setRows(initialRows)
    }

    function updateRow(itemName: string, field: keyof PanelRowState, value: any) {
        setRows(prev => ({ ...prev, [itemName]: { ...prev[itemName], [field]: value } }))
    }

    async function handleSubmit() {
        if (!patientId || !selectedPanel) {
            setError('يرجى اختيار المريض والقسم')
            return
        }
        const includedRows = selectedPanel.items.filter(item => rows[item.name]?.include)
        if (includedRows.length === 0) {
            setError('يرجى اختيار تحليل واحد على الأقل')
            return
        }
        setError('')
        setLocalSaving(true)
        try {
            const payload = includedRows.map(item => {
                const rowState = rows[item.name]
                return {
                    patient_id: patientId,
                    test_category: selectedPanel.category,
                    test_name: item.name,
                    result_value: rowState.result_value ? parseFloat(rowState.result_value) : null,
                    result_text: rowState.result_text || null,
                    unit: item.unit || null,
                    reference_range: item.referenceRange || null,
                    is_abnormal: rowState.is_abnormal,
                    is_critical: rowState.is_critical,
                    test_date: testDate,
                }
            })
            await onSave(payload)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLocalSaving(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 620, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>🧪 إضافة نتائج تحليل</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>المريض *</label>
                            <select value={patientId} onChange={e => setPatientId(e.target.value)}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                                <option value="">— اختر المريض —</option>
                                {patients.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.first_name_ar} {p.last_name_ar} · {p.mrn}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ التحليل</label>
                            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>نوع التحليل (Panel) *</label>
                        <select value={panelKey} onChange={e => handlePanelSelect(e.target.value)}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="">— اختر نوع التحليل —</option>
                            {LAB_PANELS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                    </div>

                    {selectedPanel && (
                        <div>
                            <p style={{ fontSize: 10, color: '#8e97b5', margin: '0 0 8px' }}>
                                فُك تحديد أي بند لا تريد تسجيله. البنود المحددة فقط سيتم حفظها.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectedPanel.items.map(item => {
                                    const row = rows[item.name]
                                    if (!row) return null
                                    return (
                                        <div key={item.name} style={{
                                            border: `1.5px solid ${row.include ? '#dde2ee' : '#f0f0f0'}`,
                                            borderRadius: 8, padding: '10px 12px',
                                            opacity: row.include ? 1 : .5,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: row.include ? 8 : 0 }}>
                                                <input type="checkbox" checked={row.include} onChange={e => updateRow(item.name, 'include', e.target.checked)} />
                                                <p style={{ fontSize: 12, fontWeight: 700, color: '#0b1f3a', margin: 0, flex: 1 }}>{item.name}</p>
                                                {item.referenceRange && (
                                                    <span style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono' }}>{item.referenceRange} {item.unit}</span>
                                                )}
                                            </div>
                                            {row.include && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                                                    <input type="number" step="0.01" value={row.result_value} onChange={e => updateRow(item.name, 'result_value', e.target.value)}
                                                        placeholder="Numeric value" style={{ padding: '6px 9px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 11, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono' }} />
                                                    <input value={row.result_text} onChange={e => updateRow(item.name, 'result_text', e.target.value)}
                                                        placeholder="Text result" style={{ padding: '6px 9px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 11, outline: 'none', direction: 'ltr' }} />
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#b45309', whiteSpace: 'nowrap' }}>
                                                        <input type="checkbox" checked={row.is_abnormal} onChange={e => updateRow(item.name, 'is_abnormal', e.target.checked)} />
                                                        غير طبيعي
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#e53e3e', whiteSpace: 'nowrap' }}>
                                                        <input type="checkbox" checked={row.is_critical} onChange={e => updateRow(item.name, 'is_critical', e.target.checked)} />
                                                        حرج
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving || localSaving || !selectedPanel} style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (saving || localSaving) ? .6 : 1,
                    }}>
                        {(saving || localSaving) ? 'جارٍ الحفظ...' : 'حفظ كل النتائج'}
                    </button>
                </div>
            </div>
        </div>
    )
}
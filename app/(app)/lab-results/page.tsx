'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLabResults } from '@/lib/hooks/useLabResults'
import { LAB_PANELS } from '@/lib/constants/medicalLists'
import { useCustomTestTypes } from '@/lib/hooks/useCustomTestTypes'

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
                .select('id, mrn, first_name_ar, last_name_ar, created_at')
                .is('archived_at', null)
                .order('created_at', { ascending: false })   // بدل .order('first_name_ar')
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
type ActivePanel = { key: string; label: string; category: string; rows: Record<string, PanelRowState> }

function NewLabPanelModal({ patients, saving, onClose, onSave, presetPatientId, presetPatientName }: any) {
    const { customTypes, addCustomType } = useCustomTestTypes('lab')
    const [patientId, setPatientId] = useState(presetPatientId || '')
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
    const [panelKeyToAdd, setPanelKeyToAdd] = useState('')
    const [activePanels, setActivePanels] = useState<ActivePanel[]>([])
    const [error, setError] = useState('')
    const [localSaving, setLocalSaving] = useState(false)

    // ── وضع "بحث + إضافة تحليل مفرد" (زي ما كان، شغال بجانب الـ panels) ──
    const [searchMode, setSearchMode] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedSingleTest, setSelectedSingleTest] = useState<{ name: string; category: string; unit?: string; referenceRange?: string } | null>(null)
    const [showAddNew, setShowAddNew] = useState(false)
    const [newTestForm, setNewTestForm] = useState({ name: '', category: 'other', unit: '', reference_range: '' })
    const [singleResult, setSingleResult] = useState({ result_value: '', result_text: '', is_abnormal: false, is_critical: false })

    const availablePanelsToAdd = LAB_PANELS.filter(p => !activePanels.some(ap => ap.key === p.key))

    const allSearchableTests = [
        ...LAB_PANELS.flatMap(p => p.items.map(item => ({ name: item.name, category: p.category, unit: item.unit, referenceRange: item.referenceRange }))),
        ...customTypes.map(t => ({ name: t.name, category: t.category || 'other', unit: t.unit || undefined, referenceRange: t.reference_range || undefined })),
    ]
    const uniqueTests = Array.from(new Map(allSearchableTests.map(t => [t.name.toLowerCase(), t])).values())
    const searchResults = searchQuery.length > 0
        ? uniqueTests.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
        : []

    // ── إضافة بانل جديد للقائمة النشطة ──
    function handleAddPanel(key: string) {
        if (!key) return
        const panel = LAB_PANELS.find(p => p.key === key)
        if (!panel) return
        const rows: Record<string, PanelRowState> = {}
        panel.items.forEach(item => {
            rows[item.name] = { include: true, result_value: '', result_text: '', is_abnormal: false, is_critical: false }
        })
        setActivePanels(prev => [...prev, { key: panel.key, label: panel.label, category: panel.category, rows }])
        setPanelKeyToAdd('')
    }

    function removePanel(key: string) {
        setActivePanels(prev => prev.filter(p => p.key !== key))
    }

    function updatePanelRow(panelKey: string, itemName: string, field: keyof PanelRowState, value: any) {
        setActivePanels(prev => prev.map(p =>
            p.key === panelKey ? { ...p, rows: { ...p.rows, [itemName]: { ...p.rows[itemName], [field]: value } } } : p
        ))
    }

    async function handleAddNewTest() {
        if (!newTestForm.name) { setError('يرجى كتابة اسم التحليل'); return }
        setError('')
        await addCustomType({
            name: newTestForm.name, category: newTestForm.category,
            unit: newTestForm.unit, reference_range: newTestForm.reference_range,
        })
        setSelectedSingleTest({
            name: newTestForm.name, category: newTestForm.category,
            unit: newTestForm.unit || undefined, referenceRange: newTestForm.reference_range || undefined,
        })
        setSearchQuery(newTestForm.name)
        setShowAddNew(false)
        setNewTestForm({ name: '', category: 'other', unit: '', reference_range: '' })
    }

    // ── حفظ كل البانلات النشطة + التحليل المفرد (لو موجود) دفعة واحدة ──
    async function handleSubmitAll() {
        if (!patientId) { setError('يرجى اختيار المريض'); return }

        const payload: any[] = []

        // من كل البانلات النشطة
        activePanels.forEach(activePanel => {
            const panel = LAB_PANELS.find(p => p.key === activePanel.key)
            if (!panel) return
            panel.items.forEach(item => {
                const row = activePanel.rows[item.name]
                if (row?.include) {
                    payload.push({
                        patient_id: patientId,
                        test_category: activePanel.category,
                        test_name: item.name,
                        result_value: row.result_value ? parseFloat(row.result_value) : null,
                        result_text: row.result_text || null,
                        unit: item.unit || null,
                        reference_range: item.referenceRange || null,
                        is_abnormal: row.is_abnormal,
                        is_critical: row.is_critical,
                        test_date: testDate,
                    })
                }
            })
        })

        // التحليل المفرد لو موجود
        if (selectedSingleTest) {
            payload.push({
                patient_id: patientId,
                test_category: selectedSingleTest.category,
                test_name: selectedSingleTest.name,
                result_value: singleResult.result_value ? parseFloat(singleResult.result_value) : null,
                result_text: singleResult.result_text || null,
                unit: selectedSingleTest.unit || null,
                reference_range: selectedSingleTest.referenceRange || null,
                is_abnormal: singleResult.is_abnormal,
                is_critical: singleResult.is_critical,
                test_date: testDate,
            })
        }

        if (payload.length === 0) {
            setError('يرجى إضافة قسم تحليل واحد على الأقل أو تحليل مفرد')
            return
        }

        setError('')
        setLocalSaving(true)
        try {
            await onSave(payload)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLocalSaving(false)
        }
    }

    const totalTestsCount = activePanels.reduce((sum, p) => sum + Object.values(p.rows).filter(r => r.include).length, 0) + (selectedSingleTest ? 1 : 0)

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 680, maxHeight: '90vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 5 }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>🧪 إضافة نتائج تحليل</p>
                        {presetPatientName && <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>{presetPatientName}</p>}
                    </div>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                        {presetPatientId ? (
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>المريض</label>
                                <div style={{ padding: '8px 11px', border: '1.5px solid #e6f7f4', background: '#f0fdf4', borderRadius: 7, fontSize: 12, color: '#1a8a78', fontWeight: 700 }}>
                                    ✓ {presetPatientName}
                                </div>
                            </div>
                        ) : (
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
                        )}
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ التحليل</label>
                            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    {/* إضافة بانلات متعددة */}
                    <div style={{ background: '#f7f8fc', borderRadius: 10, padding: 14 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#4a5580', margin: '0 0 8px' }}>
                            📋 أضف أقسام تحاليل متعددة لنفس الزيارة
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select value={panelKeyToAdd} onChange={e => handleAddPanel(e.target.value)}
                                style={{ flex: 1, padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', background: '#fff' }}>
                                <option value="">— اختر قسم تحليل لإضافته —</option>
                                {availablePanelsToAdd.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                            </select>
                        </div>
                        {activePanels.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                                {activePanels.map(p => (
                                    <span key={p.key} style={{
                                        fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#e6f7f4',
                                        color: '#1a8a78', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                        {p.label}
                                        <button onClick={() => removePanel(p.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontWeight: 700, padding: 0, lineHeight: 1 }}>✕</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* عرض كل بانل نشط بالتفصيل */}
                    {activePanels.map(activePanel => {
                        const panel = LAB_PANELS.find(p => p.key === activePanel.key)
                        if (!panel) return null
                        return (
                            <div key={activePanel.key} style={{ border: '1.5px solid #dde2ee', borderRadius: 10, overflow: 'hidden' }}>
                                <div style={{ background: '#f0fdf4', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1a8a78', margin: 0 }}>{panel.label}</p>
                                    <button onClick={() => removePanel(activePanel.key)} style={{ fontSize: 10, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}>حذف القسم بالكامل</button>
                                </div>
                                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {panel.items.map(item => {
                                        const row = activePanel.rows[item.name]
                                        if (!row) return null
                                        return (
                                            <div key={item.name} style={{ border: `1.5px solid ${row.include ? '#dde2ee' : '#f0f0f0'}`, borderRadius: 8, padding: '8px 10px', opacity: row.include ? 1 : .5 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: row.include ? 6 : 0 }}>
                                                    <input type="checkbox" checked={row.include} onChange={e => updatePanelRow(activePanel.key, item.name, 'include', e.target.checked)} />
                                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#0b1f3a', margin: 0, flex: 1 }}>{item.name}</p>
                                                    {item.referenceRange && <span style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono' }}>{item.referenceRange} {item.unit}</span>}
                                                </div>
                                                {row.include && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 6, alignItems: 'center' }}>
                                                        <input type="number" step="0.01" value={row.result_value} onChange={e => updatePanelRow(activePanel.key, item.name, 'result_value', e.target.value)}
                                                            placeholder="Numeric" style={{ padding: '5px 8px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 11, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono' }} />
                                                        <input value={row.result_text} onChange={e => updatePanelRow(activePanel.key, item.name, 'result_text', e.target.value)}
                                                            placeholder="Text" style={{ padding: '5px 8px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 11, outline: 'none', direction: 'ltr' }} />
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#b45309', whiteSpace: 'nowrap' }}>
                                                            <input type="checkbox" checked={row.is_abnormal} onChange={e => updatePanelRow(activePanel.key, item.name, 'is_abnormal', e.target.checked)} /> غير طبيعي
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#e53e3e', whiteSpace: 'nowrap' }}>
                                                            <input type="checkbox" checked={row.is_critical} onChange={e => updatePanelRow(activePanel.key, item.name, 'is_critical', e.target.checked)} /> حرج
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}

                    {/* بحث عن تحليل مفرد (اختياري، بجانب البانلات) */}
                    <div>
                        <button onClick={() => setSearchMode(!searchMode)} style={{
                            fontSize: 11, color: '#1a8a78', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0,
                        }}>
                            {searchMode ? '− إخفاء بحث التحليل المفرد' : '+ إضافة تحليل مفرد إضافي (بحث)'}
                        </button>
                    </div>

                    {searchMode && (
                        <div style={{ position: 'relative' }}>
                            <input
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setSelectedSingleTest(null) }}
                                placeholder="ابحث عن اسم تحليل..."
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }}
                            />
                            {searchQuery && !selectedSingleTest && (
                                <div style={{ border: '1.5px solid #dde2ee', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto', background: '#fff', position: 'absolute', width: '100%', zIndex: 10 }}>
                                    {searchResults.map(t => (
                                        <div key={t.name} onClick={() => { setSelectedSingleTest(t); setSearchQuery(t.name) }}
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eef0f6', fontSize: 12 }}>
                                            <span style={{ fontWeight: 600, color: '#0b1f3a' }}>{t.name}</span>
                                            {t.referenceRange && <span style={{ fontSize: 9, color: '#8e97b5', marginRight: 8, fontFamily: 'DM Mono' }}>{t.referenceRange} {t.unit}</span>}
                                        </div>
                                    ))}
                                    <div onClick={() => { setShowAddNew(true); setNewTestForm(f => ({ ...f, name: searchQuery })) }}
                                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#1a8a78', fontWeight: 700, background: '#f0fdf4' }}>
                                        + إضافة "{searchQuery}" كتحليل جديد
                                    </div>
                                </div>
                            )}
                            {selectedSingleTest && (
                                <div style={{ border: '1.5px solid #dde2ee', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0b1f3a', margin: '0 0 8px' }}>{selectedSingleTest.name}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                        <input type="number" step="0.01" value={singleResult.result_value} onChange={e => setSingleResult(f => ({ ...f, result_value: e.target.value }))}
                                            placeholder="Numeric value" style={{ padding: '6px 9px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 11, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono' }} />
                                        <input value={singleResult.result_text} onChange={e => setSingleResult(f => ({ ...f, result_text: e.target.value }))}
                                            placeholder="Text result" style={{ padding: '6px 9px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 11, outline: 'none', direction: 'ltr' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#b45309' }}>
                                            <input type="checkbox" checked={singleResult.is_abnormal} onChange={e => setSingleResult(f => ({ ...f, is_abnormal: e.target.checked }))} /> غير طبيعي
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#e53e3e' }}>
                                            <input type="checkbox" checked={singleResult.is_critical} onChange={e => setSingleResult(f => ({ ...f, is_critical: e.target.checked }))} /> حرج
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0, background: '#fff' }}>
                    <span style={{ fontSize: 11, color: '#8e97b5' }}>{totalTestsCount > 0 ? `${totalTestsCount} تحليل سيتم حفظه` : ''}</span>
                    <div style={{ display: 'flex', gap: 9 }}>
                        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                        <button onClick={handleSubmitAll} disabled={saving || localSaving || totalTestsCount === 0} style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (saving || localSaving || totalTestsCount === 0) ? .6 : 1,
                        }}>
                            {(saving || localSaving) ? 'جارٍ الحفظ...' : `حفظ كل النتائج (${totalTestsCount})`}
                        </button>
                    </div>
                </div>

                {showAddNew && (
                    <AddNewTestModal
                        initialName={searchQuery}
                        onClose={() => setShowAddNew(false)}
                        onAdd={async (form: any) => { setNewTestForm(form); await handleAddNewTest() }}
                    />
                )}
            </div>
        </div>
    )
}

function AddNewTestModal({ initialName, onClose, onAdd }: any) {
    const [form, setForm] = useState({ name: initialName, category: 'other', unit: '', reference_range: '' })
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.7)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 14, width: 380, padding: 20, direction: 'rtl', fontFamily: 'Cairo' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0b1f3a', margin: '0 0 14px' }}>➕ إضافة تحليل جديد</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 4 }}>اسم التحليل *</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 4 }}>القسم</label>
                        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="cbc">CBC</option>
                            <option value="chemistry">Chemistry</option>
                            <option value="tumor_markers">Tumor Markers</option>
                            <option value="coagulation">Coagulation</option>
                            <option value="liver_function">Liver Function</option>
                            <option value="kidney_function">Kidney Function</option>
                            <option value="lipid">Lipid</option>
                            <option value="thyroid">Thyroid</option>
                            <option value="electrolytes">Electrolytes</option>
                            <option value="urinalysis">Urinalysis</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 4 }}>الوحدة</label>
                            <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="mg/dL"
                                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 4 }}>المعدل الطبيعي</label>
                            <input value={form.reference_range} onChange={e => setForm(f => ({ ...f, reference_range: e.target.value }))} placeholder="0-100"
                                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                    <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 7, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={() => onAdd(form)} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>إضافة</button>
                </div>
            </div>
        </div>
    )
}
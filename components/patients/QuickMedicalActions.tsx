'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLabResults } from '@/lib/hooks/useLabResults'
import { useImaging } from '@/lib/hooks/useImaging'
import { useChemoScheduler } from '@/lib/hooks/useChemoScheduler'

type Props = {
    patientId: string
    patientName: string
    onDataChanged?: () => void
}

export function QuickMedicalActions({ patientId, patientName, onDataChanged }: Props) {
    const [activeModal, setActiveModal] = useState<'lab' | 'imaging' | 'plan' | null>(null)
    const { addResult, saving: labSaving } = useLabResults()
    const { addStudy, saving: imagingSaving } = useImaging()
    const { scheduleSession, saving: schedulerSaving } = useChemoScheduler()

    return (
        <>
            <div style={{
                background: 'linear-gradient(135deg, #0b1f3a, #1e4580)', borderRadius: 14,
                padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0, marginLeft: 'auto', order: 4 }}>إجراءات سريعة</p>
                <button onClick={() => setActiveModal('lab')} style={quickBtnStyle('#9333ea')}>
                    🧪 إضافة تحليل
                </button>
                <button onClick={() => setActiveModal('imaging')} style={quickBtnStyle('#1a8a78')}>
                    📷 طلب أشعة
                </button>
                <button onClick={() => setActiveModal('plan')} style={quickBtnStyle('#b45309')}>
                    💊 خطة علاج جديدة
                </button>
            </div>

            {activeModal === 'lab' && (
                <QuickLabModal
                    patientId={patientId}
                    patientName={patientName}
                    saving={labSaving}
                    onClose={() => setActiveModal(null)}
                    onSave={async (rows: any[]) => {
                        for (const row of rows) await addResult(row)
                        setActiveModal(null)
                        onDataChanged?.()
                    }}
                />
            )}

            {activeModal === 'imaging' && (
                <QuickImagingModal
                    patientId={patientId}
                    patientName={patientName}
                    saving={imagingSaving}
                    onClose={() => setActiveModal(null)}
                    onSave={async (data: any) => {
                        await addStudy(data)
                        setActiveModal(null)
                        onDataChanged?.()
                    }}
                />
            )}

            {activeModal === 'plan' && (
                <QuickPlanModal
                    patientId={patientId}
                    patientName={patientName}
                    scheduleSession={scheduleSession}
                    onClose={() => setActiveModal(null)}
                    onDone={() => {
                        setActiveModal(null)
                        onDataChanged?.()
                    }}
                />
            )}
        </>
    )
}

function quickBtnStyle(color: string): React.CSSProperties {
    return {
        padding: '8px 16px', borderRadius: 8, border: `1px solid ${color}55`,
        background: `${color}22`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    }
}

// ────────────────────────────────────────────────────────────
// Quick Lab Modal — نسخة مبسطة، المريض متحدد مسبقًا
// ────────────────────────────────────────────────────────────
import { LAB_PANELS } from '@/lib/constants/medicalLists'
import { useCustomTestTypes } from '@/lib/hooks/useCustomTestTypes'
import { SearchableSelect } from '@/components/shared/SearchableSelect'

type PanelRowState = { include: boolean; result_value: string; result_text: string; is_abnormal: boolean; is_critical: boolean }

function QuickLabModal({ patientId, patientName, saving, onClose, onSave }: any) {
    const { customTypes } = useCustomTestTypes('lab')
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
    const [panelKey, setPanelKey] = useState('')
    const [rows, setRows] = useState<Record<string, PanelRowState>>({})
    const [error, setError] = useState('')

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
        if (!selectedPanel) { setError('يرجى اختيار نوع التحليل'); return }
        const includedRows = selectedPanel.items.filter(item => rows[item.name]?.include)
        if (includedRows.length === 0) { setError('يرجى اختيار تحليل واحد على الأقل'); return }
        setError('')
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
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 560, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>🧪 إضافة نتائج تحليل</p>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>{patientName}</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>نوع التحليل (Panel) *</label>
                            <select value={panelKey} onChange={e => handlePanelSelect(e.target.value)}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                                <option value="">— اختر نوع التحليل —</option>
                                {LAB_PANELS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>التاريخ</label>
                            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    {selectedPanel && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {selectedPanel.items.map(item => {
                                const row = rows[item.name]
                                if (!row) return null
                                return (
                                    <div key={item.name} style={{ border: `1.5px solid ${row.include ? '#dde2ee' : '#f0f0f0'}`, borderRadius: 8, padding: '10px 12px', opacity: row.include ? 1 : .5 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: row.include ? 8 : 0 }}>
                                            <input type="checkbox" checked={row.include} onChange={e => updateRow(item.name, 'include', e.target.checked)} />
                                            <p style={{ fontSize: 12, fontWeight: 700, color: '#0b1f3a', margin: 0, flex: 1 }}>{item.name}</p>
                                            {item.referenceRange && <span style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono' }}>{item.referenceRange} {item.unit}</span>}
                                        </div>
                                        {row.include && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                                                <input type="number" step="0.01" value={row.result_value} onChange={e => updateRow(item.name, 'result_value', e.target.value)}
                                                    placeholder="Numeric" style={{ padding: '6px 9px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 11, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono' }} />
                                                <input value={row.result_text} onChange={e => updateRow(item.name, 'result_text', e.target.value)}
                                                    placeholder="Text" style={{ padding: '6px 9px', border: '1.5px solid #dde2ee', borderRadius: 6, fontSize: 11, outline: 'none', direction: 'ltr' }} />
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#b45309', whiteSpace: 'nowrap' }}>
                                                    <input type="checkbox" checked={row.is_abnormal} onChange={e => updateRow(item.name, 'is_abnormal', e.target.checked)} /> غير طبيعي
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#e53e3e', whiteSpace: 'nowrap' }}>
                                                    <input type="checkbox" checked={row.is_critical} onChange={e => updateRow(item.name, 'is_critical', e.target.checked)} /> حرج
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving || !selectedPanel} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'حفظ النتائج'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ────────────────────────────────────────────────────────────
// Quick Imaging Modal
// ────────────────────────────────────────────────────────────
import { IMAGING_TYPES } from '@/lib/constants/medicalLists'

function QuickImagingModal({ patientId, patientName, saving, onClose, onSave }: any) {
    const { customTypes, addCustomType } = useCustomTestTypes('imaging')
    const [form, setForm] = useState({
        imaging_type: '', body_region: '', study_date: new Date().toISOString().split('T')[0],
        is_baseline: false, notes: '',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddNew, setShowAddNew] = useState(false)
    const [newTypeName, setNewTypeName] = useState('')
    const [error, setError] = useState('')

    const allTypes = [
        ...IMAGING_TYPES.map(t => ({ key: t.key, label: t.label })),
        ...customTypes.map(t => ({ key: `custom:${t.id}`, label: t.name })),
    ]
    const searchResults = searchQuery
        ? allTypes.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
        : allTypes.slice(0, 8)
    const selectedTypeLabel = form.imaging_type ? allTypes.find(t => t.key === form.imaging_type)?.label : ''

    async function handleAddNew() {
        if (!newTypeName) return
        const created = await addCustomType({ name: newTypeName })
        if (created) {
            setForm(f => ({ ...f, imaging_type: `custom:${created.id}` }))
            setSearchQuery(created.name)
        }
        setShowAddNew(false)
        setNewTypeName('')
    }

    async function handleSubmit() {
        if (!form.imaging_type) { setError('يرجى اختيار نوع الأشعة'); return }
        setError('')
        const isCustom = form.imaging_type.startsWith('custom:')
        await onSave({
            patient_id: patientId,
            imaging_type: isCustom ? 'other' : form.imaging_type,
            custom_type_label: isCustom ? selectedTypeLabel : null,
            body_region: form.body_region || null,
            study_date: form.study_date,
            is_baseline: form.is_baseline,
            status: 'ordered',
            notes: form.notes || null,
        })
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 460, direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>📷 طلب أشعة جديد</p>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>{patientName}</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ابحث عن نوع الأشعة *</label>
                        <input
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setForm(f => ({ ...f, imaging_type: '' })) }}
                            placeholder="اكتب نوع الأشعة..."
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                        />
                        {searchQuery && !form.imaging_type && (
                            <div style={{ border: '1.5px solid #dde2ee', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto', background: '#fff', position: 'absolute', width: '100%', zIndex: 10 }}>
                                {searchResults.map(t => (
                                    <div key={t.key} onClick={() => { setForm(f => ({ ...f, imaging_type: t.key })); setSearchQuery(t.label) }}
                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eef0f6', fontSize: 12 }}>
                                        {t.label}
                                    </div>
                                ))}
                                <div onClick={() => { setShowAddNew(true); setNewTypeName(searchQuery) }}
                                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#1a8a78', fontWeight: 700, background: '#f0fdf4' }}>
                                    + إضافة "{searchQuery}" كنوع جديد
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>منطقة الجسم</label>
                            <input value={form.body_region} onChange={e => setForm(f => ({ ...f, body_region: e.target.value }))}
                                placeholder="e.g. Chest, Abdomen" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ الدراسة</label>
                            <input type="date" value={form.study_date} onChange={e => setForm(f => ({ ...f, study_date: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_baseline} onChange={e => setForm(f => ({ ...f, is_baseline: e.target.checked }))} />
                        📍 دراسة أساسية (Baseline)
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
                        {saving ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
                    </button>
                </div>

                {showAddNew && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.7)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={e => e.target === e.currentTarget && setShowAddNew(false)}>
                        <div style={{ background: '#fff', borderRadius: 14, width: 340, padding: 20, direction: 'rtl', fontFamily: 'Cairo' }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#0b1f3a', margin: '0 0 14px' }}>➕ إضافة نوع أشعة جديد</p>
                            <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowAddNew(false)} style={{ padding: '7px 14px', borderRadius: 7, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                                <button onClick={handleAddNew} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>إضافة</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ────────────────────────────────────────────────────────────
// Quick Plan Modal — خطة علاج جديدة سريعة (تربط بجلسة أولى مباشرة)
// ────────────────────────────────────────────────────────────
function QuickPlanModal({ patientId, patientName, scheduleSession, onClose, onDone }: any) {
    const supabase = createClient()
    const [regimens, setRegimens] = useState<any[]>([])
    const [loadingRegimens, setLoadingRegimens] = useState(true)
    const [form, setForm] = useState({
        regimen_id: '', intent: 'curative', start_date: new Date().toISOString().split('T')[0],
        planned_cycles: '', cycle_interval_days: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const FREQUENCY_TO_DAYS: Record<string, number> = { daily: 1, weekly: 7, q2w: 14, q3w: 21, q4w: 28, monthly: 30 }

    useState(() => {
        async function load() {
            const { data } = await supabase.from('chemo_regimens').select('*').eq('is_active', true).order('name')
            setRegimens(data || [])
            setLoadingRegimens(false)
        }
        load()
    })

    const selectedRegimen = regimens.find(r => r.id === form.regimen_id)

    function handleRegimenSelect(id: string) {
        const reg = regimens.find(r => r.id === id)
        setForm(f => ({
            ...f, regimen_id: id,
            planned_cycles: reg?.standard_cycles ? String(reg.standard_cycles) : f.planned_cycles,
            cycle_interval_days: reg ? String(FREQUENCY_TO_DAYS[reg.cycle_frequency] || 21) : f.cycle_interval_days,
        }))
    }

    async function handleSubmit() {
        if (!form.regimen_id || !form.planned_cycles || !form.cycle_interval_days) {
            setError('يرجى اختيار البروتوكول وعدد الدورات والفاصل الزمني')
            return
        }
        setError('')
        setSaving(true)
        try {
            const { data: diag } = await supabase
                .from('diagnoses').select('id').eq('patient_id', patientId)
                .order('created_at', { ascending: false }).limit(1).maybeSingle()

            const { data: plan, error: planErr } = await supabase
                .from('treatment_plans')
                .insert({
                    patient_id: patientId,
                    diagnosis_id: diag?.id ?? null,
                    intent: form.intent,
                    protocol_name: selectedRegimen?.name || '',
                    regimen_id: form.regimen_id,
                    start_date: form.start_date,
                    planned_cycles: parseInt(form.planned_cycles),
                    completed_cycles: 0,
                    cycle_interval_days: parseInt(form.cycle_interval_days),
                    status: 'active',
                })
                .select('id').single()
            if (planErr) throw planErr

            onDone()
        } catch (e: any) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 460, direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>💊 خطة علاج جديدة</p>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>{patientName}</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    {loadingRegimens ? (
                        <p style={{ fontSize: 12, color: '#8e97b5', textAlign: 'center' }}>جارٍ تحميل البروتوكولات...</p>
                    ) : (
                        <>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>البروتوكول *</label>
                                <select value={form.regimen_id} onChange={e => handleRegimenSelect(e.target.value)}
                                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                                    <option value="">— اختر البروتوكول —</option>
                                    {regimens.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>عدد الدورات</label>
                                    <input type="number" value={form.planned_cycles} onChange={e => setForm(f => ({ ...f, planned_cycles: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الفاصل (أيام)</label>
                                    <input type="number" value={form.cycle_interval_days} onChange={e => setForm(f => ({ ...f, cycle_interval_days: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>القصد العلاجي</label>
                                    <select value={form.intent} onChange={e => setForm(f => ({ ...f, intent: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                                        <option value="curative">شفائي</option>
                                        <option value="neoadjuvant">قبل الجراحة</option>
                                        <option value="adjuvant">مساعد</option>
                                        <option value="palliative">تلطيفي</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ البدء</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'إنشاء خطة العلاج'}
                    </button>
                </div>
            </div>
        </div>
    )
}
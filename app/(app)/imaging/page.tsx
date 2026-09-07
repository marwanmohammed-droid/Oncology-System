'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useImaging } from '@/lib/hooks/useImaging'
import { IMAGING_TYPES } from '@/lib/constants/medicalLists'
import { useCustomTestTypes } from '@/lib/hooks/useCustomTestTypes'
import { PatientSearchSelect } from '@/components/shared/PatientSearchSelect'
import { DateInputHybrid } from '@/components/shared/DateInputHybrid'
import Link from 'next/link'

// مناطق الجسم القابلة للاختيار المتعدد بدل حقل النص الحر
const BODY_REGIONS = [
    { key: 'brain', label: 'المخ', labelEn: 'Brain' },
    { key: 'neck', label: 'الرقبة', labelEn: 'Neck' },
    { key: 'chest', label: 'الصدر', labelEn: 'Chest' },
    { key: 'abdomen', label: 'البطن', labelEn: 'Abdomen' },
    { key: 'pelvis', label: 'الحوض', labelEn: 'Pelvis' },
    { key: 'abdomen_pelvis', label: 'البطن والحوض', labelEn: 'Abdomen & Pelvis' },
    { key: 'chest_abdomen_pelvis', label: 'الصدر والبطن والحوض', labelEn: 'CAP' },
    { key: 'spine', label: 'العمود الفقري', labelEn: 'Spine' },
    { key: 'both_breasts', label: 'الثديين', labelEn: 'Both Breasts' },
    { key: 'left_breast', label: 'الثدي الأيسر', labelEn: 'Left Breast' },
    { key: 'right_breast', label: 'الثدي الأيمن', labelEn: 'Right Breast' },
    { key: 'thyroid', label: 'الغدة الدرقية', labelEn: 'Thyroid' },
    { key: 'transrectal', label: 'عبر المستقيم', labelEn: 'Transrectal' },
    { key: 'transvaginal', label: 'عبر المهبل', labelEn: 'Transvaginal' },
    { key: 'upper_limbs', label: 'الأطراف العلوية', labelEn: 'Upper Limbs' },
    { key: 'lower_limbs', label: 'الأطراف السفلية', labelEn: 'Lower Limbs' },
    { key: 'whole_body', label: 'كامل الجسم', labelEn: 'Whole Body' },
]

export default function ImagingPage() {
    const { studies, loading, saving, error, addStudy, updateStudy, typeLabels, getTypeLabel, responseLabels } = useImaging()
    const [patients, setPatients] = useState<any[]>([])
    const [showNew, setShowNew] = useState(false)
    const [editingStudy, setEditingStudy] = useState<any | null>(null)
    const [filter, setFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const supabase = createClient()

    useEffect(() => {
        async function loadPatients() {
            const { data } = await supabase
                .from('patients')
                .select('id, mrn, first_name_ar, last_name_ar, created_at')
                .is('archived_at', null)
                .order('created_at', { ascending: false })
            setPatients(data || [])
        }
        loadPatients()
    }, [])

    const filtered = studies.filter(s => {
        if (typeFilter && s.imaging_type !== typeFilter) return false
        if (!filter) return true
        const name = `${s.patient?.first_name_ar} ${s.patient?.last_name_ar}`
        return name.includes(filter) || s.patient?.mrn?.includes(filter)
    })

    const withContrastCount = studies.filter(s => (s.notes || '').includes('بالصبغة')).length
    const progressiveCount = studies.filter(s => s.response_assessment === 'progressive_disease').length

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>الأشعة والتصوير</h1>
                    <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                        Imaging Results · {studies.length} دراسة
                    </p>
                </div>
                <button onClick={() => setShowNew(true)} style={{
                    padding: '9px 20px', background: '#1a8a78', color: '#fff',
                    borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                    + إضافة نتيجة أشعة
                </button>
            </div>

            {error && (
                <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>
                    {error}
                </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'إجمالي الدراسات', value: studies.length, color: '#0b1f3a', bg: '#f7f8fc' },
                    { label: 'دراسات أساسية', value: studies.filter(s => s.is_baseline).length, color: '#9333ea', bg: '#faf5ff' },
                    { label: 'بالصبغة', value: withContrastCount, color: '#1a8a78', bg: '#e6f7f4' },
                    { label: 'تفاقم المرض', value: progressiveCount, color: '#e53e3e', bg: '#fde8e8' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: '14px 18px' }}>
                        <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0, fontFamily: 'DM Mono' }}>{value}</p>
                        <p style={{ fontSize: 10, color: '#8e97b5', margin: '4px 0 0' }}>{label}</p>
                        <div style={{ height: 3, background: bg, borderRadius: 2, marginTop: 8 }} />
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 9, maxWidth: 320, flex: 1 }}>
                    <span style={{ color: '#8e97b5' }}>🔍</span>
                    <input
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="بحث بالمريض أو MRN..."
                        style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Cairo', flex: 1, direction: 'rtl' }}
                    />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
                    padding: '8px 14px', border: '1.5px solid #dde2ee', borderRadius: 9, fontSize: 12, fontFamily: 'Cairo', outline: 'none', background: '#fff',
                }}>
                    <option value="">كل الأنواع</option>
                    {IMAGING_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
            </div>

            {/* Studies List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                    <p style={{ fontWeight: 600, color: '#4a5580' }}>لا توجد نتائج أشعة بعد</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(s => (
                        <div key={s.id} style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ textAlign: 'center', minWidth: 60, paddingLeft: 16, borderLeft: '1px solid #eef0f6' }}>
                                <p style={{ fontSize: 24, fontWeight: 700, color: '#0b1f3a', margin: 0, fontFamily: 'DM Mono' }}>
                                    {s.study_date?.split('-')[2]}
                                </p>
                                <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono' }}>
                                    {new Date(s.study_date).toLocaleString('ar-EG', { month: 'short' })}
                                </p>
                            </div>

                            <div style={{ flex: 1 }}>
                                <Link href={`/patients/${s.patient_id}`} style={{ textDecoration: 'none' }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                                        {s.patient?.first_name_ar} {s.patient?.last_name_ar}
                                    </p>
                                </Link>
                                <p style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 6px' }}>
                                    {s.patient?.mrn} · {s.body_region || 'بدون منطقة محددة'}
                                </p>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#faf5ff', color: '#9333ea', border: '1px solid rgba(147,51,234,.3)', fontFamily: 'DM Mono', fontWeight: 600 }}>
                                        {getTypeLabel(s)}
                                    </span>
                                    {s.is_baseline && (
                                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#e6f7f4', color: '#1a8a78', border: '1px solid rgba(42,184,160,.3)', fontFamily: 'DM Mono', fontWeight: 600 }}>
                                            📍 أساسية
                                        </span>
                                    )}
                                    {s.response_assessment && (
                                        <span style={{
                                            fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                                            background: s.response_assessment === 'complete_response' || s.response_assessment === 'partial_response' ? '#f0fdf4' : s.response_assessment === 'progressive_disease' ? '#fde8e8' : '#fff3cd',
                                            color: s.response_assessment === 'complete_response' || s.response_assessment === 'partial_response' ? '#16a34a' : s.response_assessment === 'progressive_disease' ? '#e53e3e' : '#b45309',
                                        }}>
                                            {responseLabels[s.response_assessment]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setEditingStudy(s)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #dde2ee', background: '#fff', color: '#1a8a78', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                    ✏️ عرض / تعديل
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showNew && (
                <NewImagingModal
                    patients={patients}
                    saving={saving}
                    responseLabels={responseLabels}
                    onClose={() => setShowNew(false)}
                    onSave={async (data: any) => {
                        await addStudy(data)
                        setShowNew(false)
                    }}
                />
            )}

            {editingStudy && (
                <EditImagingModal
                    study={editingStudy}
                    saving={saving}
                    responseLabels={responseLabels}
                    onClose={() => setEditingStudy(null)}
                    onSave={async (updates: any) => {
                        await updateStudy(editingStudy.id, updates)
                        setEditingStudy(null)
                    }}
                />
            )}
        </div>
    )
}

function NewImagingModal({ patients, saving, responseLabels, onClose, onSave, presetPatientId, presetPatientName }: any) {
    const { customTypes, addCustomType } = useCustomTestTypes('imaging')
    const customImagingTypes = customTypes.filter(t => t.category !== 'body_region')
    const customRegions = customTypes.filter(t => t.category === 'body_region')

    const [form, setForm] = useState({
        patient_id: presetPatientId || '', imaging_type: '', custom_type_name: '',
        body_regions: [] as string[], study_date: new Date().toISOString().split('T')[0],
        is_baseline: false, with_contrast: false, notes: '',
        findings: '', response_assessment: '',
        compared_with_previous: false, previous_study_date: '',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddNew, setShowAddNew] = useState(false)
    const [newTypeName, setNewTypeName] = useState('')
    const [showAddRegion, setShowAddRegion] = useState(false)
    const [newRegionName, setNewRegionName] = useState('')
    const [error, setError] = useState('')

    const allTypes = [
        ...IMAGING_TYPES.map(t => ({ key: t.key, label: t.label, isCustom: false })),
        ...customImagingTypes.map(t => ({ key: `custom:${t.id}`, label: t.name, isCustom: true })),
    ]
    const searchResults = searchQuery
        ? allTypes.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
        : allTypes.slice(0, 8)

    const selectedTypeLabel = form.imaging_type
        ? allTypes.find(t => t.key === form.imaging_type)?.label
        : ''

    const allRegions = [
        ...BODY_REGIONS,
        ...customRegions.map((r: any) => ({ key: `custom:${r.id}`, label: r.name, labelEn: '' })),
    ]

    function toggleRegion(key: string) {
        setForm((f: any) => ({
            ...f,
            body_regions: f.body_regions.includes(key)
                ? f.body_regions.filter((r: string) => r !== key)
                : [...f.body_regions, key],
        }))
    }

    async function handleAddNew() {
        if (!newTypeName) return
        const created = await addCustomType({ name: newTypeName })
        if (created) {
            setForm(f => ({ ...f, imaging_type: `custom:${created.id}`, custom_type_name: created.name }))
            setSearchQuery(created.name)
        }
        setShowAddNew(false)
        setNewTypeName('')
    }

    async function handleAddRegion() {
        if (!newRegionName.trim()) return
        const created = await addCustomType({ name: newRegionName.trim(), category: 'body_region' })
        if (created) {
            setForm((f: any) => ({ ...f, body_regions: [...f.body_regions, `custom:${created.id}`] }))
        }
        setShowAddRegion(false)
        setNewRegionName('')
    }

    async function handleSubmit() {
        if (!form.patient_id || !form.imaging_type) {
            setError('يرجى اختيار المريض ونوع الأشعة')
            return
        }
        if (!form.findings.trim()) {
            setError('يرجى إدخال النتيجة (Impression) — الأشعة المُدخلة هنا نتيجتها موجودة بالفعل')
            return
        }
        if (form.compared_with_previous && !form.previous_study_date) {
            setError('يرجى تحديد تاريخ الأشعة السابقة للمقارنة')
            return
        }
        setError('')
        try {
            const isCustom = form.imaging_type.startsWith('custom:')

            const regionText = form.body_regions
                .map(key => allRegions.find(r => r.key === key)?.label)
                .filter(Boolean)
                .join('، ')

            const findingsFinal = form.compared_with_previous && form.previous_study_date
                ? `بالمقارنة مع أشعة بتاريخ ${form.previous_study_date}:\n\n${form.findings.trim()}`
                : form.findings.trim()

            const notesFinal = [
                form.with_contrast ? '💉 بالصبغة (With Contrast)' : null,
                form.notes || null,
            ].filter(Boolean).join('\n') || null

            await onSave({
                patient_id: form.patient_id,
                imaging_type: isCustom ? 'other' : form.imaging_type,
                custom_type_label: isCustom ? selectedTypeLabel : null,
                body_region: regionText || null,
                study_date: form.study_date,
                is_baseline: form.is_baseline,
                status: 'completed',
                notes: notesFinal,
                findings: findingsFinal,
                response_assessment: form.response_assessment || null,
                reported_at: new Date().toISOString(),
            })
        } catch (e: any) {
            setError(e.message)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 500, maxHeight: '90vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 5 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>📷 إضافة نتيجة أشعة</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

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
                            <PatientSearchSelect
                                patients={patients}
                                value={form.patient_id}
                                onChange={(id: string) => setForm((f: any) => ({ ...f, patient_id: id }))}
                            />
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ابحث عن نوع الأشعة *</label>
                        <input
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setForm((f: any) => ({ ...f, imaging_type: '' })) }}
                            placeholder="اكتب نوع الأشعة..."
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                        />
                        {searchQuery && !form.imaging_type && (
                            <div style={{ border: '1.5px solid #dde2ee', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto', background: '#fff' }}>
                                {searchResults.map(t => (
                                    <div key={t.key} onClick={() => { setForm((f: any) => ({ ...f, imaging_type: t.key })); setSearchQuery(t.label) }}
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

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 8 }}>منطقة الجسم</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {allRegions.map(r => (
                                <div
                                    key={r.key}
                                    onClick={() => toggleRegion(r.key)}
                                    className={form.body_regions.includes(r.key) ? 'tag-pill tag-pill-on' : 'tag-pill tag-pill-off'}
                                >
                                    {r.label} {r.labelEn && <span style={{ fontSize: 9, opacity: .7, fontFamily: 'DM Mono' }}>{r.labelEn}</span>}
                                </div>
                            ))}
                            <div
                                onClick={() => setShowAddRegion(true)}
                                className="tag-pill tag-pill-off"
                                style={{ borderStyle: 'dashed', color: '#1a8a78', fontWeight: 700 }}
                            >
                                + إضافة منطقة أخرى
                            </div>
                        </div>
                        {showAddRegion && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <input
                                    value={newRegionName}
                                    onChange={e => setNewRegionName(e.target.value)}
                                    placeholder="مثال: Both Knees"
                                    autoFocus
                                    style={{ flex: 1, padding: '7px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                                    onKeyDown={e => e.key === 'Enter' && handleAddRegion()}
                                />
                                <button onClick={handleAddRegion} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>إضافة</button>
                                <button onClick={() => { setShowAddRegion(false); setNewRegionName('') }} style={{ padding: '7px 12px', borderRadius: 7, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ إجراء الأشعة *</label>
                        <DateInputHybrid
                            value={form.study_date}
                            onChange={(v: string) => setForm((f: any) => ({ ...f, study_date: v }))}
                            className="hybrid-date-modal"
                        />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_baseline} onChange={e => setForm((f: any) => ({ ...f, is_baseline: e.target.checked }))} />
                        📍 دراسة أساسية (Baseline) — قبل بدء العلاج
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.with_contrast} onChange={e => setForm((f: any) => ({ ...f, with_contrast: e.target.checked }))} />
                        💉 بالصبغة (With Contrast)
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={form.compared_with_previous}
                            onChange={e => setForm((f: any) => ({
                                ...f,
                                compared_with_previous: e.target.checked,
                                previous_study_date: e.target.checked ? f.previous_study_date : '',
                            }))}
                        />
                        🔄 بالمقارنة مع أشعة سابقة
                    </label>

                    {form.compared_with_previous && (
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ الأشعة السابقة *</label>
                            <DateInputHybrid
                                value={form.previous_study_date}
                                onChange={(v: string) => setForm((f: any) => ({ ...f, previous_study_date: v }))}
                                className="hybrid-date-modal"
                            />
                            <p style={{ fontSize: 10, color: '#8e97b5', margin: '4px 0 0' }}>هيتكتب تلقائيًا في أول الـ Impression: "بالمقارنة مع أشعة بتاريخ ..."</p>
                        </div>
                    )}

                    <hr style={{ border: 'none', borderTop: '1px solid #eef0f6', margin: '4px 0' }} />

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>
                            النتيجة (Impression) <span style={{ color: '#e53e3e' }}>*</span>
                        </label>
                        <textarea value={form.findings} onChange={e => setForm((f: any) => ({ ...f, findings: e.target.value }))}
                            rows={4} placeholder="اكتب نص النتيجة كامل..."
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تقييم الاستجابة</label>
                        <select value={form.response_assessment} onChange={e => setForm((f: any) => ({ ...f, response_assessment: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="">— بدون —</option>
                            {responseLabels && Object.entries(responseLabels).map(([key, label]: [string, any]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات</label>
                        <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'حفظ'}
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

function EditImagingModal({ study, saving, responseLabels, onClose, onSave }: any) {
    const [form, setForm] = useState({
        study_date: study.study_date || '',
        body_region: study.body_region || '',
        is_baseline: study.is_baseline || false,
        findings: study.findings || '',
        response_assessment: study.response_assessment || '',
        notes: study.notes || '',
    })
    const [localSaving, setLocalSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleSave() {
        if (!form.findings.trim()) {
            setError('النتيجة (Impression) لا يمكن أن تكون فارغة')
            return
        }
        setError('')
        setLocalSaving(true)
        try {
            await onSave({
                study_date: form.study_date,
                body_region: form.body_region || null,
                is_baseline: form.is_baseline,
                findings: form.findings.trim(),
                response_assessment: form.response_assessment || null,
                notes: form.notes || null,
            })
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLocalSaving(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 500, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 5 }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>✏️ تعديل نتيجة أشعة</p>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                            {study.patient?.first_name_ar} {study.patient?.last_name_ar}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ إجراء الأشعة</label>
                        <DateInputHybrid
                            value={form.study_date}
                            onChange={(v: string) => setForm(f => ({ ...f, study_date: v }))}
                            className="hybrid-date-modal"
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>منطقة الجسم</label>
                        <input value={form.body_region} onChange={e => setForm(f => ({ ...f, body_region: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_baseline} onChange={e => setForm(f => ({ ...f, is_baseline: e.target.checked }))} />
                        📍 دراسة أساسية (Baseline)
                    </label>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>
                            النتيجة (Impression) <span style={{ color: '#e53e3e' }}>*</span>
                        </label>
                        <textarea value={form.findings} onChange={e => setForm(f => ({ ...f, findings: e.target.value }))} rows={4}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تقييم الاستجابة</label>
                        <select value={form.response_assessment} onChange={e => setForm(f => ({ ...f, response_assessment: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="">— بدون —</option>
                            {responseLabels && Object.entries(responseLabels).map(([key, label]: [string, any]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSave} disabled={saving || localSaving} style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (saving || localSaving) ? .6 : 1,
                    }}>
                        {(saving || localSaving) ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                    </button>
                </div>
            </div>
        </div>
    )
}
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useImaging } from '@/lib/hooks/useImaging'
import Link from 'next/link'

const IMAGING_TYPES = [
    { key: 'xray', label: 'أشعة سينية (X-Ray)' },
    { key: 'ct', label: 'أشعة مقطعية (CT)' },
    { key: 'pet', label: 'بيت سكان (PET)' },
    { key: 'pet_ct', label: 'بيت-مقطعية (PET/CT)' },
    { key: 'bone_scan', label: 'مسح عظمي (Bone Scan)' },
    { key: 'mri', label: 'رنين مغناطيسي (MRI)' },
    { key: 'ultrasound', label: 'موجات صوتية (Ultrasound)' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    ordered: { label: 'مطلوبة', color: '#8e97b5', bg: '#f7f8fc' },
    scheduled: { label: 'مجدولة', color: '#1a8a78', bg: '#e6f7f4' },
    completed: { label: 'مكتملة', color: '#16a34a', bg: '#f0fdf4' },
    cancelled: { label: 'ملغية', color: '#e53e3e', bg: '#fde8e8' },
}

export default function ImagingPage() {
    const { studies, loading, saving, error, addStudy, updateStatus, typeLabels, responseLabels } = useImaging()
    const [patients, setPatients] = useState<any[]>([])
    const [showNew, setShowNew] = useState(false)
    const [reportTarget, setReportTarget] = useState<any>(null)
    const [filter, setFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
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

    const filtered = studies.filter(s => {
        if (typeFilter && s.imaging_type !== typeFilter) return false
        if (!filter) return true
        const name = `${s.patient?.first_name_ar} ${s.patient?.last_name_ar}`
        return name.includes(filter) || s.patient?.mrn?.includes(filter)
    })

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>الأشعة والتصوير</h1>
                    <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                        Imaging Studies · {studies.length} دراسة
                    </p>
                </div>
                <button onClick={() => setShowNew(true)} style={{
                    padding: '9px 20px', background: '#1a8a78', color: '#fff',
                    borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                    + طلب أشعة جديد
                </button>
            </div>

            {error && (
                <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>
                    {error}
                </div>
            )}

            {/* Stats by type */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'إجمالي الدراسات', value: studies.length, color: '#0b1f3a', bg: '#f7f8fc' },
                    { label: 'مطلوبة/مجدولة', value: studies.filter(s => s.status === 'ordered' || s.status === 'scheduled').length, color: '#b45309', bg: '#fff3cd' },
                    { label: 'مكتملة', value: studies.filter(s => s.status === 'completed').length, color: '#16a34a', bg: '#f0fdf4' },
                    { label: 'دراسات أساسية', value: studies.filter(s => s.is_baseline).length, color: '#9333ea', bg: '#faf5ff' },
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
                    <p style={{ fontWeight: 600, color: '#4a5580' }}>لا توجد دراسات أشعة بعد</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(s => {
                        const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.ordered
                        return (
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
                                            {typeLabels[s.imaging_type]}
                                        </span>
                                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, fontFamily: 'DM Mono', fontWeight: 600 }}>
                                            {cfg.label}
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
                                    {s.status === 'ordered' && (
                                        <button onClick={() => updateStatus(s.id, 'scheduled')} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(42,184,160,.3)', background: '#e6f7f4', color: '#1a8a78', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                            📅 جدولة
                                        </button>
                                    )}
                                    {(s.status === 'scheduled' || s.status === 'ordered') && (
                                        <button onClick={() => setReportTarget(s)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(22,163,74,.3)', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                            📝 إضافة تقرير
                                        </button>
                                    )}
                                    {s.status === 'completed' && (
                                        <button onClick={() => setReportTarget(s)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #dde2ee', background: '#fff', color: '#4a5580', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                            👁️ عرض التقرير
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showNew && (
                <NewImagingModal
                    patients={patients}
                    saving={saving}
                    onClose={() => setShowNew(false)}
                    onSave={async (data: any) => {
                        await addStudy(data)
                        setShowNew(false)
                    }}
                />
            )}

            {reportTarget && (
                <ImagingReportModal
                    study={reportTarget}
                    responseLabels={responseLabels}
                    onClose={() => setReportTarget(null)}
                />
            )}
        </div>
    )
}

function NewImagingModal({ patients, saving, onClose, onSave }: any) {
    const [form, setForm] = useState({
        patient_id: '',
        imaging_type: 'ct',
        body_region: '',
        study_date: new Date().toISOString().split('T')[0],
        is_baseline: false,
        notes: '',
    })
    const [error, setError] = useState('')

    async function handleSubmit() {
        if (!form.patient_id || !form.imaging_type) {
            setError('يرجى اختيار المريض ونوع الأشعة')
            return
        }
        setError('')
        try {
            await onSave({
                patient_id: form.patient_id,
                imaging_type: form.imaging_type,
                body_region: form.body_region || null,
                study_date: form.study_date,
                is_baseline: form.is_baseline,
                status: 'ordered',
                notes: form.notes || null,
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
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>📷 طلب أشعة جديد</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>المريض *</label>
                        <select value={form.patient_id} onChange={e => setForm((f: any) => ({ ...f, patient_id: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="">— اختر المريض —</option>
                            {patients.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.first_name_ar} {p.last_name_ar} · {p.mrn}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>نوع الأشعة *</label>
                        <select value={form.imaging_type} onChange={e => setForm((f: any) => ({ ...f, imaging_type: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            {IMAGING_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>منطقة الجسم</label>
                            <input value={form.body_region} onChange={e => setForm((f: any) => ({ ...f, body_region: e.target.value }))}
                                placeholder="e.g. Chest, Abdomen" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ الدراسة</label>
                            <input type="date" value={form.study_date} onChange={e => setForm((f: any) => ({ ...f, study_date: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_baseline} onChange={e => setForm((f: any) => ({ ...f, is_baseline: e.target.checked }))} />
                        📍 دراسة أساسية (Baseline) — قبل بدء العلاج
                    </label>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات</label>
                        <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ImagingReportModal({ study, responseLabels, onClose }: any) {
    const { addReport, saving, error: hookError } = useImaging()
    const isReadOnly = study.status === 'completed'

    const [findings, setFindings] = useState(study.findings || '')
    const [impression, setImpression] = useState(study.impression || '')
    const [radiologistName, setRadiologistName] = useState(study.radiologist_name || '')
    const [responseAssessment, setResponseAssessment] = useState(study.response_assessment || '')
    const [error, setError] = useState('')

    async function handleSubmit() {
        if (!findings || !impression || !radiologistName) {
            setError('يرجى ملء النتائج والانطباع واسم أخصائي الأشعة')
            return
        }
        setError('')
        try {
            await addReport(study.id, findings, impression, radiologistName, responseAssessment || undefined)
            onClose()
        } catch (e: any) {
            setError(e.message)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 540, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                            {isReadOnly ? '📄 تقرير الأشعة' : '📝 إضافة تقرير الأشعة'}
                        </p>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                            {study.patient?.first_name_ar} {study.patient?.last_name_ar} · {study.study_date}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {(error || hookError) && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error || hookError}</div>}

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>النتائج (Findings) *</label>
                        <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={4} readOnly={isReadOnly}
                            placeholder="وصف تفصيلي لما تم ملاحظته في الدراسة..."
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box', background: isReadOnly ? '#f7f8fc' : '#fff' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الانطباع (Impression) *</label>
                        <textarea value={impression} onChange={e => setImpression(e.target.value)} rows={3} readOnly={isReadOnly}
                            placeholder="الخلاصة والتوصية النهائية..."
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box', background: isReadOnly ? '#f7f8fc' : '#fff' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>اسم أخصائي الأشعة *</label>
                            <input value={radiologistName} onChange={e => setRadiologistName(e.target.value)} readOnly={isReadOnly}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: isReadOnly ? '#f7f8fc' : '#fff' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تقييم الاستجابة</label>
                            <select value={responseAssessment} onChange={e => setResponseAssessment(e.target.value)} disabled={isReadOnly}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box', background: isReadOnly ? '#f7f8fc' : '#fff' }}>
                                <option value="">— بدون —</option>
                                {Object.entries(responseLabels).map(([key, label]: [string, any]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isReadOnly && study.reported_at && (
                        <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono' }}>
                            تم إصدار التقرير في {new Date(study.reported_at).toLocaleString('ar-EG')}
                        </p>
                    )}
                </div>
                {!isReadOnly && (
                    <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                        <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                            {saving ? 'جارٍ الحفظ...' : 'حفظ التقرير'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinicalTrials } from '@/lib/hooks/useClinicalTrials'
import type { TrialEnrollment } from '@/lib/hooks/useClinicalTrials'
import { useTrialResearchData, type TrialResearchRow } from '@/lib/hooks/useTrialResearchData'
import Link from 'next/link'

const PHASE_LABELS: Record<string, string> = {
    I: 'المرحلة الأولى', II: 'المرحلة الثانية', III: 'المرحلة الثالثة',
    IV: 'المرحلة الرابعة', Observational: 'دراسة رصدية',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    recruiting: { label: 'تسجيل مفتوح', color: '#1a8a78', bg: '#e6f7f4' },
    active: { label: 'نشطة', color: '#16a34a', bg: '#f0fdf4' },
    closed: { label: 'مغلقة', color: '#b45309', bg: '#fff3cd' },
    completed: { label: 'مكتملة', color: '#4a5580', bg: '#f7f8fc' },
    suspended: { label: 'موقوفة', color: '#e53e3e', bg: '#fde8e8' },
}

const ENROLLMENT_STATUS_AR: Record<string, string> = {
    screening: 'فحص أولي', enrolled: 'مسجّل', active: 'نشط', withdrawn: 'منسحب', completed: 'مكتمل',
}

export default function ClinicalTrialsPage() {
    const { trials, loading, saving, error, createTrial, updateTrialStatus, enrollPatient, getEnrollments } = useClinicalTrials()
    const { loading: researchLoading, getTrialResearchData, exportResearchCsv } = useTrialResearchData()

    const [doctors, setDoctors] = useState<any[]>([])
    const [showNew, setShowNew] = useState(false)
    const [selectedTrial, setSelectedTrial] = useState<any>(null)
    const [enrollments, setEnrollments] = useState<TrialEnrollment[]>([])
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
    const [showEnroll, setShowEnroll] = useState(false)
    const [showResearch, setShowResearch] = useState(false)
    const [researchData, setResearchData] = useState<TrialResearchRow[]>([])
    const supabase = createClient()

    useEffect(() => {
        async function loadDoctors() {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name_ar')
                .eq('role', 'doctor')
            setDoctors(data || [])
        }
        loadDoctors()
    }, [])

    async function openTrial(trial: any) {
        setSelectedTrial(trial)
        setEnrollmentsLoading(true)
        const data = await getEnrollments(trial.id)
        setEnrollments(data)
        setEnrollmentsLoading(false)
    }

    async function refreshEnrollments() {
        if (!selectedTrial) return
        const data = await getEnrollments(selectedTrial.id)
        setEnrollments(data)
    }

    async function openResearchData() {
        if (!selectedTrial) return
        const data = await getTrialResearchData(selectedTrial.id)
        setResearchData(data)
        setShowResearch(true)
    }

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>الدراسات السريرية</h1>
                    <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                        Clinical Trials · {trials.length} دراسة
                    </p>
                </div>
                <button onClick={() => setShowNew(true)} style={{
                    padding: '9px 20px', background: '#1a8a78', color: '#fff',
                    borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                    + دراسة سريرية جديدة
                </button>
            </div>

            {error && (
                <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: selectedTrial ? '1fr 1fr' : '1fr', gap: 16 }}>
                {/* Trials list */}
                <div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
                    ) : trials.length === 0 ? (
                        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div>
                            <p style={{ fontWeight: 600, color: '#4a5580' }}>لا توجد دراسات سريرية بعد</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {trials.map((t: any) => {
                                const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.recruiting
                                const enrollCount = t.enrollments?.length || 0
                                return (
                                    <div key={t.id} onClick={() => openTrial(t)} style={{
                                        background: '#fff', border: `1.5px solid ${selectedTrial?.id === t.id ? '#2ab8a0' : '#dde2ee'}`,
                                        borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <div>
                                                <p style={{ fontSize: 14, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{t.trial_name}</p>
                                                {t.trial_code && <p style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 0' }}>{t.trial_code}</p>}
                                            </div>
                                            <span style={{ fontSize: 9, padding: '2px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {t.phase && (
                                                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#faf5ff', color: '#9333ea', fontFamily: 'DM Mono' }}>
                                                    {PHASE_LABELS[t.phase] || t.phase}
                                                </span>
                                            )}
                                            {t.cancer_type && (
                                                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#f7f8fc', color: '#4a5580', border: '1px solid #dde2ee' }}>
                                                    {t.cancer_type}
                                                </span>
                                            )}
                                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#e6f7f4', color: '#1a8a78', fontFamily: 'DM Mono', fontWeight: 600 }}>
                                                👥 {enrollCount} مسجّل
                                            </span>
                                        </div>
                                        {t.investigator && (
                                            <p style={{ fontSize: 10, color: '#8e97b5', margin: '8px 0 0' }}>
                                                الباحث الرئيسي: {t.investigator.full_name_ar}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Trial details */}
                {selectedTrial && (
                    <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden', alignSelf: 'start' }}>
                        <div style={{ background: 'linear-gradient(135deg, #0b1f3a, #1e4580)', padding: '18px 22px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{selectedTrial.trial_name}</h2>
                                    {selectedTrial.sponsor && <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', margin: '4px 0 0' }}>{selectedTrial.sponsor}</p>}
                                </div>
                                <select
                                    value={selectedTrial.status}
                                    onChange={e => { updateTrialStatus(selectedTrial.id, e.target.value); setSelectedTrial((t: any) => ({ ...t, status: e.target.value })) }}
                                    style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 6, fontSize: 11, padding: '4px 8px', outline: 'none' }}
                                >
                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key} style={{ color: '#000' }}>{cfg.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ padding: '16px 22px' }}>
                            {selectedTrial.description && (
                                <p style={{ fontSize: 12, color: '#4a5580', margin: '0 0 14px', lineHeight: 1.6 }}>{selectedTrial.description}</p>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                                {selectedTrial.irb_approval_number && (
                                    <InfoRow label="رقم موافقة IRB" value={selectedTrial.irb_approval_number} mono />
                                )}
                                {selectedTrial.start_date && <InfoRow label="تاريخ البدء" value={selectedTrial.start_date} mono />}
                            </div>

                            {selectedTrial.eligibility_criteria && (
                                <div style={{ background: '#f7f8fc', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono', textTransform: 'uppercase', margin: '0 0 6px' }}>معايير الأهلية</p>
                                    <p style={{ fontSize: 11, color: '#4a5580', margin: 0, lineHeight: 1.6 }}>{selectedTrial.eligibility_criteria}</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>المرضى المسجّلون ({enrollments.length})</p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={openResearchData} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(147,51,234,.3)', background: '#faf5ff', color: '#9333ea', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                        📊 بيانات البحث
                                    </button>
                                    <button onClick={() => setShowEnroll(true)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(42,184,160,.3)', background: '#e6f7f4', color: '#1a8a78', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                        + تسجيل مريض
                                    </button>
                                </div>
                            </div>

                            {enrollmentsLoading ? (
                                <p style={{ fontSize: 11, color: '#8e97b5', textAlign: 'center', padding: 16 }}>جارٍ التحميل...</p>
                            ) : enrollments.length === 0 ? (
                                <p style={{ fontSize: 11, color: '#8e97b5', textAlign: 'center', padding: 16 }}>لا يوجد مرضى مسجلون بعد</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {enrollments.map((e: any) => (
                                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafbfd', borderRadius: 8, border: '1px solid #eef0f6' }}>
                                            <div>
                                                <Link href={`/patients/${e.patient_id}`} style={{ textDecoration: 'none' }}>
                                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{e.patient?.first_name_ar} {e.patient?.last_name_ar}</p>
                                                </Link>
                                                <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 0' }}>{e.patient?.mrn} · {e.enrollment_date}</p>
                                            </div>
                                            <span style={{
                                                fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                                                background: e.status === 'withdrawn' ? '#fde8e8' : '#e6f7f4',
                                                color: e.status === 'withdrawn' ? '#e53e3e' : '#1a8a78',
                                            }}>
                                                {ENROLLMENT_STATUS_AR[e.status] || e.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showNew && (
                <NewTrialModal
                    doctors={doctors}
                    saving={saving}
                    onClose={() => setShowNew(false)}
                    onSave={async (data: any) => {
                        await createTrial(data)
                        setShowNew(false)
                    }}
                />
            )}

            {showEnroll && selectedTrial && (
                <EnrollPatientModal
                    trial={selectedTrial}
                    saving={saving}
                    onClose={() => setShowEnroll(false)}
                    onEnroll={async (patientId: string, notes: string) => {
                        await enrollPatient(selectedTrial.id, patientId, notes)
                        await refreshEnrollments()
                        setShowEnroll(false)
                    }}
                />
            )}

            {showResearch && selectedTrial && (
                <TrialResearchModal
                    trial={selectedTrial}
                    data={researchData}
                    loading={researchLoading}
                    onExport={() => exportResearchCsv(selectedTrial.trial_name, researchData)}
                    onClose={() => setShowResearch(false)}
                />
            )}
        </div>
    )
}

function InfoRow({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
    return (
        <div>
            <p style={{ fontSize: 9, color: '#8e97b5', margin: '0 0 2px', fontFamily: 'DM Mono, monospace' }}>{label}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1e2540', margin: 0, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>{value}</p>
        </div>
    )
}

function NewTrialModal({ doctors, saving, onClose, onSave }: any) {
    const [form, setForm] = useState({
        trial_name: '', trial_code: '', sponsor: '', phase: 'II',
        cancer_type: '', principal_investigator_id: '', irb_approval_number: '',
        start_date: '', description: '', eligibility_criteria: '',
    })
    const [error, setError] = useState('')

    async function handleSubmit() {
        if (!form.trial_name) {
            setError('اسم الدراسة مطلوب')
            return
        }
        setError('')
        try {
            await onSave({
                trial_name: form.trial_name,
                trial_code: form.trial_code || null,
                sponsor: form.sponsor || null,
                phase: form.phase || null,
                cancer_type: form.cancer_type || null,
                principal_investigator_id: form.principal_investigator_id || null,
                irb_approval_number: form.irb_approval_number || null,
                start_date: form.start_date || null,
                description: form.description || null,
                eligibility_criteria: form.eligibility_criteria || null,
                status: 'recruiting',
            })
        } catch (e: any) {
            setError(e.message)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 520, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>🔬 دراسة سريرية جديدة</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>اسم الدراسة *</label>
                        <input value={form.trial_name} onChange={e => setForm((f: any) => ({ ...f, trial_name: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>كود الدراسة</label>
                            <input value={form.trial_code} onChange={e => setForm((f: any) => ({ ...f, trial_code: e.target.value }))}
                                placeholder="e.g. NCT01234567" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>المرحلة</label>
                            <select value={form.phase} onChange={e => setForm((f: any) => ({ ...f, phase: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                                {Object.entries(PHASE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الجهة الراعية</label>
                            <input value={form.sponsor} onChange={e => setForm((f: any) => ({ ...f, sponsor: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>نوع السرطان</label>
                            <input value={form.cancer_type} onChange={e => setForm((f: any) => ({ ...f, cancer_type: e.target.value }))}
                                placeholder="e.g. Breast Cancer" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الباحث الرئيسي</label>
                        <select value={form.principal_investigator_id} onChange={e => setForm((f: any) => ({ ...f, principal_investigator_id: e.target.value }))}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                            <option value="">— بدون تحديد —</option>
                            {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.full_name_ar}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>رقم موافقة IRB</label>
                            <input value={form.irb_approval_number} onChange={e => setForm((f: any) => ({ ...f, irb_approval_number: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>تاريخ البدء</label>
                            <input type="date" value={form.start_date} onChange={e => setForm((f: any) => ({ ...f, start_date: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>وصف الدراسة</label>
                        <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={2}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>معايير الأهلية</label>
                        <textarea value={form.eligibility_criteria} onChange={e => setForm((f: any) => ({ ...f, eligibility_criteria: e.target.value }))} rows={3}
                            placeholder="مثال: عمر 18+، مرحلة II-III، ECOG 0-1..."
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'إنشاء الدراسة'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function EnrollPatientModal({ trial, saving, onClose, onEnroll }: any) {
    const [patients, setPatients] = useState<any[]>([])
    const [patientId, setPatientId] = useState('')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState('')
    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from('patients')
                .select('id, mrn, first_name_ar, last_name_ar')
                .is('archived_at', null)
                .order('first_name_ar')
            setPatients(data || [])
        }
        load()
    }, [])

    async function handleSubmit() {
        if (!patientId) {
            setError('يرجى اختيار المريض')
            return
        }
        setError('')
        try {
            await onEnroll(patientId, notes)
        } catch (e: any) {
            setError(e.message?.includes('duplicate') || e.message?.includes('unique') ? 'هذا المريض مسجل بالفعل في هذه الدراسة' : e.message)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 420, direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>تسجيل مريض في {trial.trial_name}</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}
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
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ التسجيل...' : 'تسجيل'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function TrialResearchModal({ trial, data, loading, onExport, onClose }: any) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: '92vw', maxWidth: 1100, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>📊 بيانات البحث</p>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>{trial.trial_name} · {data.length} مريض</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={onExport} disabled={loading || data.length === 0} style={{
                            padding: '8px 18px', background: '#1a8a78', color: '#fff', border: 'none',
                            borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (loading || data.length === 0) ? .6 : 1,
                        }}>
                            ⬇️ تصدير CSV
                        </button>
                        <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 34, height: 34, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                    </div>
                </div>

                <div style={{ padding: '16px 24px' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: '#8e97b5', padding: 40 }}>جارٍ تجميع البيانات البحثية...</p>
                    ) : data.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#8e97b5', padding: 40 }}>لا يوجد مرضى مسجلون في هذه الدراسة</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 900 }}>
                                <thead>
                                    <tr style={{ background: '#f7f8fc' }}>
                                        {['المريض', 'العمر/الجنس', 'التشخيص', 'ECOG', 'البروتوكول', 'الدورات', 'الجلسات', 'تعديلات جرعة', 'آثار جانبية', 'آخر تقييم استجابة', 'آخر تحليل حرج'].map(h => (
                                            <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', borderBottom: '1.5px solid #dde2ee', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((r: TrialResearchRow) => (
                                        <tr key={r.enrollmentId} style={{ borderBottom: '1px solid #eef0f6' }}>
                                            <td style={{ padding: '8px 10px' }}>
                                                <p style={{ margin: 0, fontWeight: 700, color: '#0b1f3a' }}>{r.patientName}</p>
                                                <p style={{ margin: '2px 0 0', fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono' }}>{r.mrn}</p>
                                            </td>
                                            <td style={{ padding: '8px 10px', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>{r.age} / {r.sex}</td>
                                            <td style={{ padding: '8px 10px' }}>{r.primarySite ?? '—'} {r.stage ? `· ${r.stage}` : ''}</td>
                                            <td style={{ padding: '8px 10px', fontFamily: 'DM Mono' }}>{r.ecogPs ?? '—'}</td>
                                            <td style={{ padding: '8px 10px' }}>{r.activeProtocol ?? '—'}</td>
                                            <td style={{ padding: '8px 10px', fontFamily: 'DM Mono' }}>{r.completedCycles ?? '—'}/{r.plannedCycles ?? '—'}</td>
                                            <td style={{ padding: '8px 10px', fontFamily: 'DM Mono' }}>{r.completedSessions}/{r.totalSessions}</td>
                                            <td style={{ padding: '8px 10px', fontFamily: 'DM Mono', color: r.doseModifications > 0 ? '#b45309' : undefined, fontWeight: r.doseModifications > 0 ? 700 : undefined }}>{r.doseModifications}</td>
                                            <td style={{ padding: '8px 10px', fontFamily: 'DM Mono', color: r.adverseEventsCount > 0 ? '#e53e3e' : undefined, fontWeight: r.adverseEventsCount > 0 ? 700 : undefined }}>{r.adverseEventsCount}</td>
                                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                {r.lastResponseAssessment ? (
                                                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>
                                                        {r.lastResponseAssessment}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', fontSize: 10, color: r.latestCriticalLab ? '#e53e3e' : '#8e97b5' }}>{r.latestCriticalLab ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
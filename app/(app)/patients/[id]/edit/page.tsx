'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function EditPatientPage() {
    const { id } = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [isArchived, setIsArchived] = useState(false)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [archiveReason, setArchiveReason] = useState('')
    const [archiving, setArchiving] = useState(false)

    const [form, setForm] = useState({
        first_name_ar: '', last_name_ar: '',
        first_name_en: '', last_name_en: '',
        date_of_birth: '', sex: '',
        nationality: '', marital_status: '', occupation: '',
        mobile_primary: '', email: '',
        governorate: '', district: '',
        emergency_name: '', emergency_relation: '', emergency_phone: '',
    })

    const [mrn, setMrn] = useState('')

    useEffect(() => {
        async function load() {
            const { data, error: err } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single()

            if (err || !data) {
                setError('تعذر تحميل بيانات المريض')
                setLoading(false)
                return
            }

            setMrn(data.mrn)
            setIsArchived(!!data.archived_at)
            setForm({
                first_name_ar: data.first_name_ar || '',
                last_name_ar: data.last_name_ar || '',
                first_name_en: data.first_name_en || '',
                last_name_en: data.last_name_en || '',
                date_of_birth: data.date_of_birth || '',
                sex: data.sex || '',
                nationality: data.nationality || '',
                marital_status: data.marital_status || '',
                occupation: data.occupation || '',
                mobile_primary: data.mobile_primary || '',
                email: data.email || '',
                governorate: data.governorate || '',
                district: data.district || '',
                emergency_name: data.emergency_name || '',
                emergency_relation: data.emergency_relation || '',
                emergency_phone: data.emergency_phone || '',
            })
            setLoading(false)
        }
        load()
    }, [id])

    async function handleSave() {
        if (!form.first_name_ar || !form.first_name_en || !form.date_of_birth || !form.sex || !form.mobile_primary || !form.emergency_name || !form.emergency_phone) {
            setError('يرجى ملء جميع الحقول الإلزامية')
            return
        }
        setSaving(true); setError('')

        const { error: err } = await supabase
            .from('patients')
            .update({
                first_name_ar: form.first_name_ar,
                last_name_ar: form.last_name_ar,
                first_name_en: form.first_name_en.toLowerCase(),
                last_name_en: form.last_name_en.toLowerCase(),
                date_of_birth: form.date_of_birth,
                sex: form.sex,
                nationality: form.nationality || null,
                marital_status: form.marital_status || null,
                occupation: form.occupation || null,
                mobile_primary: form.mobile_primary,
                email: form.email || null,
                governorate: form.governorate || null,
                district: form.district || null,
                emergency_name: form.emergency_name,
                emergency_relation: form.emergency_relation || null,
                emergency_phone: form.emergency_phone,
            })
            .eq('id', id)

        setSaving(false)
        if (err) { setError(err.message); return }
        router.push(`/patients/${id}`)
    }

    async function handleArchive() {
        setArchiving(true); setError('')
        const { error: err } = await supabase
            .from('patients')
            .update({
                archived_at: new Date().toISOString(),
                archived_reason: archiveReason || null,
            })
            .eq('id', id)

        setArchiving(false)
        if (err) { setError(err.message); return }
        router.push('/patients')
    }

    async function handleRestore() {
        setArchiving(true); setError('')
        const { error: err } = await supabase
            .from('patients')
            .update({ archived_at: null, archived_reason: null })
            .eq('id', id)

        setArchiving(false)
        if (err) { setError(err.message); return }
        setIsArchived(false)
    }

    const inputStyle = {
        width: '100%', padding: '8px 11px',
        border: '1.5px solid #dde2ee', borderRadius: 7,
        fontSize: 12, outline: 'none', fontFamily: 'Cairo, sans-serif',
        boxSizing: 'border-box' as const,
    }
    const labelStyle = {
        fontSize: 11, fontWeight: 600 as const,
        color: '#4a5580', display: 'block' as const, marginBottom: 5,
    }
    const cardStyle = {
        background: '#fff', border: '1.5px solid #dde2ee',
        borderRadius: 14, overflow: 'hidden' as const, marginBottom: 16,
    }
    const cardHeaderStyle = {
        padding: '12px 18px', borderBottom: '1px solid #eef0f6',
        display: 'flex', alignItems: 'center', gap: 10,
    }

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#8e97b5', fontFamily: 'Cairo' }}>
                جارٍ التحميل...
            </div>
        )
    }

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl', maxWidth: 800, margin: '0 auto' }}>

            {/* Breadcrumb + Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: '#8e97b5', marginBottom: 10, display: 'flex', gap: 6 }}>
                    <Link href="/patients" style={{ color: '#8e97b5', textDecoration: 'none' }}>المرضى</Link>
                    <span>›</span>
                    <Link href={`/patients/${id}`} style={{ color: '#8e97b5', textDecoration: 'none' }}>{mrn}</Link>
                    <span>›</span>
                    <span style={{ color: '#4a5580' }}>تعديل</span>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>تعديل بيانات المريض</h1>
                <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>{mrn}</p>
            </div>

            {isArchived && (
                <div style={{
                    background: '#fff3cd', border: '1px solid rgba(180,83,9,.3)', borderRadius: 10,
                    padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <p style={{ fontSize: 12, color: '#b45309', margin: 0 }}>
                        📦 هذا الملف مؤرشف حاليًا ولا يظهر في قائمة المرضى النشطين
                    </p>
                    <button onClick={handleRestore} disabled={archiving} style={{
                        padding: '7px 16px', background: '#b45309', color: '#fff',
                        borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}>
                        {archiving ? 'جارٍ الاستعادة...' : '↩️ استعادة الملف'}
                    </button>
                </div>
            )}

            {error && (
                <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>
                    {error}
                </div>
            )}

            {/* Personal Info Card */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <span>👤</span>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Personal Information</p>
                        <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>البيانات الشخصية</p>
                    </div>
                </div>
                <div style={{ padding: '16px 18px' }}>

                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Full Name</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>First Name (AR) *</label>
                            <input value={form.first_name_ar} onChange={e => setForm(f => ({ ...f, first_name_ar: e.target.value }))}
                                style={{ ...inputStyle, direction: 'rtl' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Last Name (AR) *</label>
                            <input value={form.last_name_ar} onChange={e => setForm(f => ({ ...f, last_name_ar: e.target.value }))}
                                style={{ ...inputStyle, direction: 'rtl' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>First Name (EN) *</label>
                            <input value={form.first_name_en} onChange={e => setForm(f => ({ ...f, first_name_en: e.target.value }))}
                                style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Last Name (EN) *</label>
                            <input value={form.last_name_en} onChange={e => setForm(f => ({ ...f, last_name_en: e.target.value }))}
                                style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                        </div>
                    </div>

                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Demographics</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Date of Birth *</label>
                            <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                                style={{ ...inputStyle, direction: 'ltr' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Sex *</label>
                            <select value={form.sex} onChange={e => setForm(f => ({ ...f, sex: e.target.value }))} style={inputStyle}>
                                <option value="">— Select —</option>
                                <option value="M">Male · ذكر</option>
                                <option value="F">Female · أنثى</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Nationality</label>
                            <select value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option value="Egyptian">Egyptian · مصري</option>
                                <option value="Saudi">Saudi · سعودي</option>
                                <option value="Other">Other · أخرى</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Marital Status</label>
                            <select value={form.marital_status} onChange={e => setForm(f => ({ ...f, marital_status: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option value="single">Single · أعزب</option>
                                <option value="married">Married · متزوج</option>
                                <option value="divorced">Divorced · مطلق</option>
                                <option value="widowed">Widowed · أرمل</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Occupation</label>
                            <input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                                style={{ ...inputStyle, direction: 'ltr' }} />
                        </div>
                    </div>

                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Contact & Address</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Mobile *</label>
                            <input value={form.mobile_primary} onChange={e => setForm(f => ({ ...f, mobile_primary: e.target.value }))}
                                style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Governorate</label>
                            <select value={form.governorate} onChange={e => setForm(f => ({ ...f, governorate: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option>Cairo · القاهرة</option>
                                <option>Alexandria · الإسكندرية</option>
                                <option>Giza · الجيزة</option>
                                <option>Other · أخرى</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>District</label>
                            <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} style={inputStyle} />
                        </div>
                    </div>

                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Emergency Contact</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Name *</label>
                            <input value={form.emergency_name} onChange={e => setForm(f => ({ ...f, emergency_name: e.target.value }))} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Relationship</label>
                            <select value={form.emergency_relation} onChange={e => setForm(f => ({ ...f, emergency_relation: e.target.value }))} style={inputStyle}>
                                <option value="">—</option>
                                <option value="spouse">Spouse · زوج/زوجة</option>
                                <option value="child">Child · ابن/ابنة</option>
                                <option value="sibling">Sibling · أخ/أخت</option>
                                <option value="parent">Parent · والد/والدة</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Phone *</label>
                            <input value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))}
                                style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save / Cancel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
                <Link href={`/patients/${id}`} style={{
                    padding: '10px 20px', background: '#fff', color: '#4a5580',
                    borderRadius: 9, border: '1.5px solid #dde2ee', fontSize: 13,
                    fontWeight: 600, textDecoration: 'none',
                }}>
                    إلغاء
                </Link>
                <button onClick={handleSave} disabled={saving} style={{
                    padding: '10px 24px', background: '#1a8a78', color: '#fff',
                    borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', opacity: saving ? .6 : 1,
                }}>
                    {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
            </div>

            {/* Archive Zone */}
            {!isArchived && (
                <div style={{ background: '#fff', border: '1.5px solid rgba(180,83,9,.3)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(180,83,9,.15)', background: '#fff3cd' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#b45309', margin: 0 }}>📦 أرشفة الملف</p>
                        <p style={{ fontSize: 9, color: '#b45309', fontFamily: 'DM Mono', margin: '2px 0 0', opacity: .8 }}>Archive Patient</p>
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                        <p style={{ fontSize: 12, color: '#4a5580', margin: '0 0 12px' }}>
                            أرشفة المريض ستخفي ملفه من قائمة المرضى النشطين، دون حذف أي بيانات طبية.
                            يمكن استعادة الملف في أي وقت من هذه الصفحة.
                        </p>
                        {!showArchiveConfirm ? (
                            <button onClick={() => setShowArchiveConfirm(true)} style={{
                                padding: '9px 18px', background: '#fff3cd', color: '#b45309',
                                borderRadius: 8, border: '1.5px solid rgba(180,83,9,.3)', fontSize: 12,
                                fontWeight: 700, cursor: 'pointer',
                            }}>
                                📦 أرشفة هذا الملف
                            </button>
                        ) : (
                            <div style={{ background: '#fff3cd', borderRadius: 10, padding: 16 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#b45309', display: 'block', marginBottom: 6 }}>
                                    سبب الأرشفة (اختياري)
                                </label>
                                <input
                                    value={archiveReason}
                                    onChange={e => setArchiveReason(e.target.value)}
                                    placeholder="مثال: تكرار في التسجيل، انتقل لمركز آخر..."
                                    style={{
                                        width: '100%', padding: '8px 11px', border: '1.5px solid rgba(180,83,9,.3)',
                                        borderRadius: 7, fontSize: 12, outline: 'none', marginBottom: 12, boxSizing: 'border-box',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setShowArchiveConfirm(false)}
                                        style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={handleArchive}
                                        disabled={archiving}
                                        style={{
                                            padding: '8px 20px', borderRadius: 8, border: 'none',
                                            background: '#b45309', color: '#fff', fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', opacity: archiving ? .6 : 1,
                                        }}
                                    >
                                        {archiving ? 'جارٍ الأرشفة...' : 'تأكيد الأرشفة'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
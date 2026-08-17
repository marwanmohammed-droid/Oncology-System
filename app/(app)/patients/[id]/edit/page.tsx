'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { GOVERNORATES, COUNTRIES, PRIMARY_SITES, HISTOLOGY_TYPES } from '@/lib/constants/medicalLists'

type PathologyTest = { id: string; test_name: string; modality: string; result_numeric: string; result_text: string; test_date: string; isNew?: boolean }
type PriorProtocol = { id: string; protocol_name: string; num_cycles: string; duration_months: string; notes: string; isNew?: boolean }

const COMORBIDITIES = ['DM Type 2', 'HTN', 'IHD / CAD', 'CKD', 'Hepatic disease', 'Autoimmune', 'Neuropathy', 'Previous malignancy']
const FAMILY_HISTORY_CONDITIONS = ['DM1', 'DM2', 'HTN', 'Cardiac Disease', 'Autoimmune Disease', 'Other']

export default function EditPatientPage() {
    const { id } = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [activeTab, setActiveTab] = useState<'personal' | 'medical'>('personal')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    const [mrn, setMrn] = useState('')
    const [sex, setSex] = useState<'M' | 'F' | ''>('')
    const [isArchived, setIsArchived] = useState(false)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [archiveReason, setArchiveReason] = useState('')
    const [archiving, setArchiving] = useState(false)

    // ── Personal form ──
    const [personalForm, setPersonalForm] = useState({
        first_name_ar: '', last_name_ar: '',
        first_name_en: '', last_name_en: '',
        date_of_birth: '', sex: '',
        nationality: '', marital_status: '', num_children: '', occupation: '',
        mobile_primary: '', email: '',
        governorate: '', district: '',
        emergency_name: '', emergency_relation: '', emergency_phone: '',
    })

    // ── Medical form ──
    const [diagnosisId, setDiagnosisId] = useState<string | null>(null)
    const [diagForm, setDiagForm] = useState({
        confirmed_cancer_patient: 'no',
        chief_complaint: '',
        double_primary: 'no',
        primary_site: '', icd10_code: '', histology: '',
        primary_site_2: '', icd10_code_2: '', histology_2: '',
        stage: '', grade: '', laterality: '',
        tnm_t: '', tnm_n: '', tnm_m: '',
        metastasis_flag: 'no', metastatic_sites: '',
        treatment_intent: '', date_of_diagnosis: '',
        sample_type: 'tissue', liquid_type: '',
        final_pathology_report: '',
    })

    const [histForm, setHistForm] = useState({
        ecog_ps: '0',
        previous_surgeries: '', previous_chemo: 'none', previous_radiation: 'none',
        drug_allergies: '',
        oncology_fh: 'no', oncology_fh_person: '', oncology_fh_type: '',
        smoking_status: 'never', cigarettes_pack_per_day: '', cigarettes_duration_years: '', other_habit_details: '',
        menstrual_status: '',
    })
    const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([])
    const [selectedFamilyConditions, setSelectedFamilyConditions] = useState<string[]>([])
    const [familyHistoryOther, setFamilyHistoryOther] = useState('')

    const [ihcTests, setIhcTests] = useState<PathologyTest[]>([])
    const [molecularTests, setMolecularTests] = useState<PathologyTest[]>([])
    const [deletedTestIds, setDeletedTestIds] = useState<string[]>([])

    const [priorProtocols, setPriorProtocols] = useState<PriorProtocol[]>([])
    const [deletedProtocolIds, setDeletedProtocolIds] = useState<string[]>([])

    useEffect(() => {
        async function load() {
            const [{ data: pt }, { data: diag }, { data: hist }, { data: tests }, { data: protocols }] = await Promise.all([
                supabase.from('patients').select('*').eq('id', id).single(),
                supabase.from('diagnoses').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
                supabase.from('medical_history').select('*').eq('patient_id', id).maybeSingle(),
                supabase.from('pathology_tests').select('*').eq('patient_id', id).order('test_date', { ascending: false }),
                supabase.from('prior_treatment_protocols').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
            ])

            if (!pt) { setError('تعذر تحميل بيانات المريض'); setLoading(false); return }

            setMrn(pt.mrn)
            setSex(pt.sex)
            setIsArchived(!!pt.archived_at)
            setPersonalForm({
                first_name_ar: pt.first_name_ar || '', last_name_ar: pt.last_name_ar || '',
                first_name_en: pt.first_name_en || '', last_name_en: pt.last_name_en || '',
                date_of_birth: pt.date_of_birth || '', sex: pt.sex || '',
                nationality: pt.nationality || '', marital_status: pt.marital_status || '',
                num_children: pt.num_children != null ? String(pt.num_children) : '', occupation: pt.occupation || '',
                mobile_primary: pt.mobile_primary || '', email: pt.email || '',
                governorate: pt.governorate || '', district: pt.district || '',
                emergency_name: pt.emergency_name || '', emergency_relation: pt.emergency_relation || '', emergency_phone: pt.emergency_phone || '',
            })

            if (diag) {
                setDiagnosisId(diag.id)
                setDiagForm({
                    confirmed_cancer_patient: diag.confirmed_cancer_patient ? 'yes' : 'no',
                    chief_complaint: diag.chief_complaint || '',
                    double_primary: diag.double_primary ? 'yes' : 'no',
                    primary_site: diag.primary_site || '', icd10_code: diag.icd10_code || '', histology: diag.histology || '',
                    primary_site_2: diag.primary_site_2 || '', icd10_code_2: diag.icd10_code_2 || '', histology_2: diag.histology_2 || '',
                    stage: diag.stage || '', grade: diag.grade || '', laterality: diag.laterality || '',
                    tnm_t: diag.tnm_t || '', tnm_n: diag.tnm_n || '', tnm_m: diag.tnm_m || '',
                    metastasis_flag: diag.is_metastatic ? 'yes' : 'no', metastatic_sites: diag.metastatic_sites || '',
                    treatment_intent: diag.treatment_intent || '', date_of_diagnosis: diag.date_of_diagnosis || '',
                    sample_type: diag.sample_type || 'tissue', liquid_type: diag.liquid_type || '',
                    final_pathology_report: diag.final_pathology_report || '',
                })
            }

            if (hist) {
                setHistForm({
                    ecog_ps: hist.ecog_ps || '0',
                    previous_surgeries: hist.previous_surgeries || '',
                    previous_chemo: hist.previous_chemo || 'none',
                    previous_radiation: hist.previous_radiation || 'none',
                    drug_allergies: hist.drug_allergies || '',
                    oncology_fh: hist.oncology_fh ? 'yes' : 'no',
                    oncology_fh_person: hist.oncology_fh_person || '',
                    oncology_fh_type: hist.oncology_fh_type || '',
                    smoking_status: hist.smoking_status || 'never',
                    cigarettes_pack_per_day: hist.cigarettes_pack_per_day != null ? String(hist.cigarettes_pack_per_day) : '',
                    cigarettes_duration_years: hist.cigarettes_duration_years != null ? String(hist.cigarettes_duration_years) : '',
                    other_habit_details: hist.other_habit_details || '',
                    menstrual_status: hist.menstrual_status || '',
                })
                setSelectedComorbidities(hist.comorbidities || [])
                setSelectedFamilyConditions(hist.family_history_conditions || [])
                setFamilyHistoryOther(hist.family_history_other || '')
            }

            setIhcTests((tests || []).filter(t => t.category === 'ihc').map(t => ({
                id: t.id, test_name: t.test_name, modality: t.modality || '',
                result_numeric: t.result_numeric != null ? String(t.result_numeric) : '',
                result_text: t.result_text || '', test_date: t.test_date || '',
            })))
            setMolecularTests((tests || []).filter(t => t.category === 'molecular').map(t => ({
                id: t.id, test_name: t.test_name, modality: t.modality || '',
                result_numeric: t.result_numeric != null ? String(t.result_numeric) : '',
                result_text: t.result_text || '', test_date: t.test_date || '',
            })))

            setPriorProtocols((protocols || []).map(p => ({
                id: p.id, protocol_name: p.protocol_name,
                num_cycles: p.num_cycles != null ? String(p.num_cycles) : '',
                duration_months: p.duration_months != null ? String(p.duration_months) : '',
                notes: p.notes || '',
            })))

            setLoading(false)
        }
        load()
    }, [id])

    // ── Helpers لإدارة قوائم IHC/Molecular/Protocols ──
    function toggleComorbidity(item: string) {
        setSelectedComorbidities(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item])
    }
    function toggleFamilyCondition(item: string) {
        setSelectedFamilyConditions(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item])
    }
    function addTest(category: 'ihc' | 'molecular') {
        const newTest: PathologyTest = { id: `new-${Math.random().toString(36).slice(2)}`, test_name: '', modality: '', result_numeric: '', result_text: '', test_date: '', isNew: true }
        if (category === 'ihc') setIhcTests(prev => [...prev, newTest])
        else setMolecularTests(prev => [...prev, newTest])
    }
    function updateTest(category: 'ihc' | 'molecular', testId: string, field: keyof PathologyTest, value: string) {
        const updater = (prev: PathologyTest[]) => prev.map(t => t.id === testId ? { ...t, [field]: value } : t)
        if (category === 'ihc') setIhcTests(updater)
        else setMolecularTests(updater)
    }
    function removeTest(category: 'ihc' | 'molecular', testId: string, isNew?: boolean) {
        if (!isNew) setDeletedTestIds(prev => [...prev, testId])
        if (category === 'ihc') setIhcTests(prev => prev.filter(t => t.id !== testId))
        else setMolecularTests(prev => prev.filter(t => t.id !== testId))
    }
    function addProtocol() {
        setPriorProtocols(prev => [...prev, { id: `new-${Math.random().toString(36).slice(2)}`, protocol_name: '', num_cycles: '', duration_months: '', notes: '', isNew: true }])
    }
    function updateProtocol(protocolId: string, field: keyof PriorProtocol, value: string) {
        setPriorProtocols(prev => prev.map(p => p.id === protocolId ? { ...p, [field]: value } : p))
    }
    function removeProtocol(protocolId: string, isNew?: boolean) {
        if (!isNew) setDeletedProtocolIds(prev => [...prev, protocolId])
        setPriorProtocols(prev => prev.filter(p => p.id !== protocolId))
    }

    // ── حفظ التبويب الشخصي ──
    async function handleSavePersonal() {
        if (!personalForm.first_name_ar || !personalForm.first_name_en || !personalForm.date_of_birth || !personalForm.sex || !personalForm.mobile_primary) {
            setError('يرجى ملء الحقول الأساسية (الاسم، تاريخ الميلاد، الجنس، الموبايل)')
            return
        }
        setSaving(true); setError(''); setSuccessMsg('')

        const { error: err } = await supabase
            .from('patients')
            .update({
                first_name_ar: personalForm.first_name_ar,
                last_name_ar: personalForm.last_name_ar,
                first_name_en: personalForm.first_name_en.toLowerCase(),
                last_name_en: personalForm.last_name_en.toLowerCase(),
                date_of_birth: personalForm.date_of_birth,
                sex: personalForm.sex,
                nationality: personalForm.nationality || null,
                marital_status: personalForm.marital_status || null,
                num_children: personalForm.num_children ? parseInt(personalForm.num_children) : null,
                occupation: personalForm.occupation || null,
                mobile_primary: personalForm.mobile_primary,
                email: personalForm.email || null,
                governorate: personalForm.governorate || null,
                district: personalForm.district || null,
                emergency_name: personalForm.emergency_name || null,
                emergency_relation: personalForm.emergency_relation || null,
                emergency_phone: personalForm.emergency_phone || null,
            })
            .eq('id', id)

        setSaving(false)
        if (err) { setError(err.message); return }
        setSex(personalForm.sex as 'M' | 'F')
        setSuccessMsg('تم حفظ البيانات الشخصية بنجاح')
        setTimeout(() => setSuccessMsg(''), 3000)
    }

    // ── حفظ التبويب الطبي ──
    async function handleSaveMedical() {
        setSaving(true); setError(''); setSuccessMsg('')
        try {
            const isDouble = diagForm.double_primary === 'yes'
            const isMeta = diagForm.metastasis_flag === 'yes'

            const diagPayload = {
                confirmed_cancer_patient: diagForm.confirmed_cancer_patient === 'yes',
                chief_complaint: diagForm.chief_complaint || null,
                double_primary: isDouble,
                primary_site: diagForm.primary_site || null,
                icd10_code: diagForm.icd10_code || null,
                histology: diagForm.histology || null,
                primary_site_2: isDouble ? (diagForm.primary_site_2 || null) : null,
                icd10_code_2: isDouble ? (diagForm.icd10_code_2 || null) : null,
                histology_2: isDouble ? (diagForm.histology_2 || null) : null,
                stage: diagForm.stage || null,
                grade: diagForm.grade || null,
                laterality: diagForm.laterality || null,
                tnm_t: diagForm.tnm_t || null,
                tnm_n: diagForm.tnm_n || null,
                tnm_m: diagForm.tnm_m || null,
                is_metastatic: isMeta,
                metastatic_sites: isMeta ? (diagForm.metastatic_sites || null) : null,
                treatment_intent: diagForm.treatment_intent || null,
                date_of_diagnosis: diagForm.date_of_diagnosis || null,
                sample_type: diagForm.sample_type || null,
                liquid_type: diagForm.sample_type === 'liquid' ? (diagForm.liquid_type || null) : null,
                final_pathology_report: diagForm.final_pathology_report || null,
            }

            let currentDiagnosisId = diagnosisId
            if (diagnosisId) {
                const { error: updErr } = await supabase.from('diagnoses').update(diagPayload).eq('id', diagnosisId)
                if (updErr) throw updErr
            } else {
                const { data: newDiag, error: insErr } = await supabase
                    .from('diagnoses').insert({ patient_id: id, ...diagPayload }).select('id').single()
                if (insErr) throw insErr
                currentDiagnosisId = newDiag.id
                setDiagnosisId(newDiag.id)
            }

            // حذف اختبارات الباثولوجي المطلوب حذفها
            if (deletedTestIds.length > 0) {
                await supabase.from('pathology_tests').delete().in('id', deletedTestIds)
            }

            // تحديث/إضافة اختبارات الباثولوجي
            const allTests = [
                ...ihcTests.map(t => ({ ...t, category: 'ihc' })),
                ...molecularTests.map(t => ({ ...t, category: 'molecular' })),
            ].filter(t => t.test_name)

            for (const t of allTests) {
                const payload = {
                    patient_id: id,
                    diagnosis_id: currentDiagnosisId,
                    category: t.category,
                    test_name: t.test_name,
                    modality: t.modality || null,
                    result_numeric: t.result_numeric ? parseFloat(t.result_numeric) : null,
                    result_text: t.result_text || null,
                    test_date: t.test_date || null,
                }
                if (t.isNew) {
                    await supabase.from('pathology_tests').insert(payload)
                } else {
                    await supabase.from('pathology_tests').update(payload).eq('id', t.id)
                }
            }

            // حذف بروتوكولات سابقة مطلوب حذفها
            if (deletedProtocolIds.length > 0) {
                await supabase.from('prior_treatment_protocols').delete().in('id', deletedProtocolIds)
            }

            // تحديث/إضافة بروتوكولات سابقة
            if (diagForm.confirmed_cancer_patient === 'yes') {
                for (const p of priorProtocols) {
                    if (!p.protocol_name) continue
                    const payload = {
                        patient_id: id,
                        diagnosis_id: currentDiagnosisId,
                        protocol_name: p.protocol_name,
                        num_cycles: p.num_cycles ? parseInt(p.num_cycles) : null,
                        duration_months: p.duration_months ? parseFloat(p.duration_months) : null,
                        notes: p.notes || null,
                    }
                    if (p.isNew) {
                        await supabase.from('prior_treatment_protocols').insert(payload)
                    } else {
                        await supabase.from('prior_treatment_protocols').update(payload).eq('id', p.id)
                    }
                }
            }

            // التاريخ المرضي — upsert
            await supabase.from('medical_history').upsert({
                patient_id: id,
                comorbidities: selectedComorbidities,
                family_history_conditions: selectedFamilyConditions,
                family_history_other: selectedFamilyConditions.includes('Other') ? familyHistoryOther : null,
                oncology_fh: histForm.oncology_fh === 'yes',
                oncology_fh_person: histForm.oncology_fh === 'yes' ? (histForm.oncology_fh_person || null) : null,
                oncology_fh_type: histForm.oncology_fh === 'yes' ? (histForm.oncology_fh_type || null) : null,
                previous_surgeries: histForm.previous_surgeries || null,
                previous_chemo: histForm.previous_chemo || null,
                previous_radiation: histForm.previous_radiation || null,
                drug_allergies: histForm.drug_allergies || null,
                ecog_ps: histForm.ecog_ps || null,
                smoking_status: histForm.smoking_status || null,
                cigarettes_pack_per_day: histForm.smoking_status === 'cigarettes' && histForm.cigarettes_pack_per_day
                    ? parseFloat(histForm.cigarettes_pack_per_day) : null,
                cigarettes_duration_years: histForm.smoking_status === 'cigarettes' && histForm.cigarettes_duration_years
                    ? parseFloat(histForm.cigarettes_duration_years) : null,
                other_habit_details: histForm.smoking_status === 'other' ? (histForm.other_habit_details || null) : null,
                menstrual_status: histForm.menstrual_status || null,
            }, { onConflict: 'patient_id' })

            setDeletedTestIds([])
            setDeletedProtocolIds([])
            setIhcTests(prev => prev.map(t => ({ ...t, isNew: false })))
            setMolecularTests(prev => prev.map(t => ({ ...t, isNew: false })))
            setPriorProtocols(prev => prev.map(p => ({ ...p, isNew: false })))
            setSuccessMsg('تم حفظ البيانات الطبية بنجاح')
            setTimeout(() => setSuccessMsg(''), 3000)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleArchive() {
        setArchiving(true); setError('')
        const { error: err } = await supabase
            .from('patients')
            .update({ archived_at: new Date().toISOString(), archived_reason: archiveReason || null })
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

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#8e97b5', fontFamily: 'Cairo' }}>جارٍ التحميل...</div>
    }

    const doublePrimary = diagForm.double_primary === 'yes'
    const metastasisFlag = diagForm.metastasis_flag === 'yes'
    const oncologyFh = histForm.oncology_fh === 'yes'
    const confirmedCancer = diagForm.confirmed_cancer_patient === 'yes'
    const smokingStatus = histForm.smoking_status

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>

            <div style={{ marginBottom: 20 }}>
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
                <div style={{ background: '#fff3cd', border: '1px solid rgba(180,83,9,.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 12, color: '#b45309', margin: 0 }}>📦 هذا الملف مؤرشف حاليًا</p>
                    <button onClick={handleRestore} disabled={archiving} style={{ padding: '7px 16px', background: '#b45309', color: '#fff', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {archiving ? 'جارٍ الاستعادة...' : '↩️ استعادة الملف'}
                    </button>
                </div>
            )}

            {error && <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>{error}</div>}
            {successMsg && <div style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#16a34a' }}>{successMsg}</div>}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button onClick={() => setActiveTab('personal')} style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: activeTab === 'personal' ? '#1a8a78' : '#fff',
                    color: activeTab === 'personal' ? '#fff' : '#4a5580',
                    fontSize: 12, fontWeight: 600, boxShadow: activeTab === 'personal' ? 'none' : 'inset 0 0 0 1.5px #dde2ee',
                }}>
                    👤 البيانات الشخصية
                </button>
                <button onClick={() => setActiveTab('medical')} style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: activeTab === 'medical' ? '#1a8a78' : '#fff',
                    color: activeTab === 'medical' ? '#fff' : '#4a5580',
                    fontSize: 12, fontWeight: 600, boxShadow: activeTab === 'medical' ? 'none' : 'inset 0 0 0 1.5px #dde2ee',
                }}>
                    🔬 البيانات الطبية
                </button>
            </div>

            {/* ═══════════ PERSONAL TAB ═══════════ */}
            {activeTab === 'personal' && (
                <div dir="rtl">
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon teal">👤</span>
                            <div><p className="card-title">Personal Information</p><p className="card-subtitle">البيانات الشخصية</p></div>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="field-label">الاسم الأول (عربي) *</label>
                                    <input value={personalForm.first_name_ar} onChange={e => setPersonalForm(f => ({ ...f, first_name_ar: e.target.value }))} className="input-ar" />
                                </div>
                                <div>
                                    <label className="field-label">اسم الأب (عربي) *</label>
                                    <input value={personalForm.last_name_ar} onChange={e => setPersonalForm(f => ({ ...f, last_name_ar: e.target.value }))} className="input-ar" />
                                </div>
                                <div>
                                    <label className="field-label">First name (EN) *</label>
                                    <input value={personalForm.first_name_en} onChange={e => setPersonalForm(f => ({ ...f, first_name_en: e.target.value }))} className="input-en" />
                                </div>
                                <div>
                                    <label className="field-label">Last name (EN) *</label>
                                    <input value={personalForm.last_name_en} onChange={e => setPersonalForm(f => ({ ...f, last_name_en: e.target.value }))} className="input-en" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="field-label">تاريخ الميلاد *</label>
                                    <input type="date" value={personalForm.date_of_birth} onChange={e => setPersonalForm(f => ({ ...f, date_of_birth: e.target.value }))} className="input-en" />
                                </div>
                                <div>
                                    <label className="field-label">الجنس *</label>
                                    <select value={personalForm.sex} onChange={e => setPersonalForm(f => ({ ...f, sex: e.target.value }))} className="input-select">
                                        <option value="">— اختر —</option>
                                        <option value="M">ذكر · Male</option>
                                        <option value="F">أنثى · Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">الجنسية</label>
                                    <select value={personalForm.nationality} onChange={e => setPersonalForm(f => ({ ...f, nationality: e.target.value }))} className="input-select">
                                        <option value="">—</option>
                                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="field-label">الحالة الاجتماعية</label>
                                    <select value={personalForm.marital_status} onChange={e => setPersonalForm(f => ({ ...f, marital_status: e.target.value }))} className="input-select">
                                        <option value="">—</option>
                                        <option value="single">أعزب · Single</option>
                                        <option value="married">متزوج · Married</option>
                                        <option value="divorced">مطلق · Divorced</option>
                                        <option value="widowed">أرمل · Widowed</option>
                                    </select>
                                </div>
                                {personalForm.marital_status === 'married' && (
                                    <div>
                                        <label className="field-label">عدد الأطفال</label>
                                        <input type="number" min="0" value={personalForm.num_children} onChange={e => setPersonalForm(f => ({ ...f, num_children: e.target.value }))} className="input-en" />
                                    </div>
                                )}
                                <div>

                                    <label className="field-label">المهنة</label>
                                    <input value={personalForm.occupation} onChange={e => setPersonalForm(f => ({ ...f, occupation: e.target.value }))} className="input-en" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon teal">📬</span>
                            <div><p className="card-title">Contact &amp; Address</p><p className="card-subtitle">التواصل والعنوان</p></div>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="field-label">رقم الموبايل *</label>
                                    <input value={personalForm.mobile_primary} onChange={e => setPersonalForm(f => ({ ...f, mobile_primary: e.target.value }))} className="input-en" />
                                </div>
                                <div>
                                    <label className="field-label">البريد الإلكتروني</label>
                                    <input type="email" value={personalForm.email} onChange={e => setPersonalForm(f => ({ ...f, email: e.target.value }))} className="input-en" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="field-label">المحافظة</label>
                                    <select value={personalForm.governorate} onChange={e => setPersonalForm(f => ({ ...f, governorate: e.target.value }))} className="input-select">
                                        <option value="">—</option>
                                        {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">المدينة / الحي</label>
                                    <input value={personalForm.district} onChange={e => setPersonalForm(f => ({ ...f, district: e.target.value }))} className="input-ar" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon amber">📞</span>
                            <div><p className="card-title">Emergency Contact</p><p className="card-subtitle">جهة الاتصال في الطوارئ</p></div>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="field-label">الاسم</label>
                                    <input value={personalForm.emergency_name} onChange={e => setPersonalForm(f => ({ ...f, emergency_name: e.target.value }))} className="input-ar" />
                                </div>
                                <div>
                                    <label className="field-label">صلة القرابة</label>
                                    <select value={personalForm.emergency_relation} onChange={e => setPersonalForm(f => ({ ...f, emergency_relation: e.target.value }))} className="input-select">
                                        <option value="">—</option>
                                        <option value="spouse">زوج/زوجة</option>
                                        <option value="child">ابن/ابنة</option>
                                        <option value="sibling">أخ/أخت</option>
                                        <option value="parent">والد/والدة</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label">رقم الهاتف</label>
                                    <input value={personalForm.emergency_phone} onChange={e => setPersonalForm(f => ({ ...f, emergency_phone: e.target.value }))} className="input-en" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                        <button onClick={handleSavePersonal} disabled={saving} style={{
                            padding: '10px 24px', background: '#1a8a78', color: '#fff', borderRadius: 9, border: 'none',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1,
                        }}>
                            {saving ? 'جارٍ الحفظ...' : 'حفظ البيانات الشخصية'}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════ MEDICAL TAB ═══════════ */}
            {activeTab === 'medical' && (
                <div dir="ltr">
                    {/* Confirmed Cancer Patient */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon navy">✅</span>
                            <div><p className="card-title">Confirmed Cancer Patient?</p><p className="card-subtitle">مريض مؤكد الإصابة؟</p></div>
                        </div>
                        <div className="card-body">
                            <select value={diagForm.confirmed_cancer_patient} onChange={e => setDiagForm(f => ({ ...f, confirmed_cancer_patient: e.target.value }))} className="input-en-full">
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>

                            {confirmedCancer && (
                                <div className="mt-4 border border-slate-200 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="section-label-en m-0">Prior Treatment Protocols</p>
                                        <button type="button" onClick={addProtocol} className="tag-pill tag-pill-on">+ Add protocol</button>
                                    </div>
                                    {priorProtocols.length === 0 && <p className="text-xs text-slate-400">No prior protocols added yet</p>}
                                    <div className="space-y-2">
                                        {priorProtocols.map(p => (
                                            <div key={p.id} className="grid grid-cols-5 gap-2 items-center border border-slate-200 rounded-lg p-2">
                                                <input value={p.protocol_name} onChange={e => updateProtocol(p.id, 'protocol_name', e.target.value)} placeholder="Protocol name" className="input-en-full col-span-2" />
                                                <input type="number" value={p.num_cycles} onChange={e => updateProtocol(p.id, 'num_cycles', e.target.value)} placeholder="No. of cycles" className="input-en-full" />
                                                <input type="number" step="0.5" value={p.duration_months} onChange={e => updateProtocol(p.id, 'duration_months', e.target.value)} placeholder="Duration (months)" className="input-en-full" />
                                                <div className="flex gap-1">
                                                    <input value={p.notes} onChange={e => updateProtocol(p.id, 'notes', e.target.value)} placeholder="Notes" className="input-en-full" />
                                                    <button type="button" onClick={() => removeProtocol(p.id, p.isNew)} className="text-red-500 text-xs px-2">✕</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chief Complaint */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon teal">💬</span>
                            <div><p className="card-title">Chief Complaint</p><p className="card-subtitle">الشكوى الرئيسية</p></div>
                        </div>
                        <div className="card-body">
                            <textarea value={diagForm.chief_complaint} onChange={e => setDiagForm(f => ({ ...f, chief_complaint: e.target.value }))} rows={2} className="input-en-full" />
                        </div>
                    </div>

                    {/* Primary Diagnosis */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon red">🔬</span>
                            <div><p className="card-title">Primary Diagnosis</p><p className="card-subtitle">التشخيص الرئيسي</p></div>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="field-label-en">Double primary?</label>
                                    <select value={diagForm.double_primary} onChange={e => setDiagForm(f => ({ ...f, double_primary: e.target.value }))} className="input-en-full">
                                        <option value="no">No</option>
                                        <option value="yes">Yes</option>
                                    </select>
                                </div>
                            </div>

                            {!doublePrimary ? (
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="field-label-en">Primary site</label>
                                        <select value={diagForm.primary_site} onChange={e => setDiagForm(f => ({ ...f, primary_site: e.target.value }))} className="input-en-full">
                                            <option value="">— Select —</option>
                                            {PRIMARY_SITES.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="field-label-en">ICD-10 Code</label>
                                        <input value={diagForm.icd10_code} onChange={e => setDiagForm(f => ({ ...f, icd10_code: e.target.value }))} className="input-en-full font-mono" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="field-label-en">Histology</label>
                                        <select value={diagForm.histology} onChange={e => setDiagForm(f => ({ ...f, histology: e.target.value }))} className="input-en-full">
                                            <option value="">— Select —</option>
                                            {HISTOLOGY_TYPES.map(h => <option key={h}>{h}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div className="border border-slate-200 rounded-lg p-3">
                                        <p className="section-label-en">Primary Site 1</p>
                                        <div className="space-y-2">
                                            <select value={diagForm.primary_site} onChange={e => setDiagForm(f => ({ ...f, primary_site: e.target.value }))} className="input-en-full">
                                                <option value="">— Select —</option>
                                                {PRIMARY_SITES.map(s => <option key={s}>{s}</option>)}
                                            </select>
                                            <input value={diagForm.icd10_code} onChange={e => setDiagForm(f => ({ ...f, icd10_code: e.target.value }))} placeholder="ICD-10" className="input-en-full font-mono" />
                                            <select value={diagForm.histology} onChange={e => setDiagForm(f => ({ ...f, histology: e.target.value }))} className="input-en-full">
                                                <option value="">— Histology —</option>
                                                {HISTOLOGY_TYPES.map(h => <option key={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="border border-slate-200 rounded-lg p-3">
                                        <p className="section-label-en">Primary Site 2</p>
                                        <div className="space-y-2">
                                            <select value={diagForm.primary_site_2} onChange={e => setDiagForm(f => ({ ...f, primary_site_2: e.target.value }))} className="input-en-full">
                                                <option value="">— Select —</option>
                                                {PRIMARY_SITES.map(s => <option key={s}>{s}</option>)}
                                            </select>
                                            <input value={diagForm.icd10_code_2} onChange={e => setDiagForm(f => ({ ...f, icd10_code_2: e.target.value }))} placeholder="ICD-10" className="input-en-full font-mono" />
                                            <select value={diagForm.histology_2} onChange={e => setDiagForm(f => ({ ...f, histology_2: e.target.value }))} className="input-en-full">
                                                <option value="">— Histology —</option>
                                                {HISTOLOGY_TYPES.map(h => <option key={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="field-label-en">2ry site (metastasis)?</label>
                                    <select value={diagForm.metastasis_flag} onChange={e => setDiagForm(f => ({ ...f, metastasis_flag: e.target.value }))} className="input-en-full">
                                        <option value="no">No</option>
                                        <option value="yes">Yes</option>
                                    </select>
                                </div>
                                {metastasisFlag && (
                                    <div>
                                        <label className="field-label-en">Metastatic sites</label>
                                        <input value={diagForm.metastatic_sites} onChange={e => setDiagForm(f => ({ ...f, metastatic_sites: e.target.value }))} className="input-en-full" />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="field-label-en">Stage</label>
                                    <select value={diagForm.stage} onChange={e => setDiagForm(f => ({ ...f, stage: e.target.value }))} className="input-en-full">
                                        <option value="">—</option>
                                        {['I', 'IA', 'IB', 'II', 'IIA', 'IIB', 'III', 'IIIA', 'IIIB', 'IIIC', 'IV'].map(s => <option key={s} value={`Stage ${s}`}>Stage {s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label-en">Grade</label>
                                    <select value={diagForm.grade} onChange={e => setDiagForm(f => ({ ...f, grade: e.target.value }))} className="input-en-full">
                                        <option value="">—</option>
                                        <option value="G1">G1</option><option value="G2">G2</option><option value="G3">G3</option><option value="G4">G4</option><option value="GX">GX</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label-en">Laterality</label>
                                    <select value={diagForm.laterality} onChange={e => setDiagForm(f => ({ ...f, laterality: e.target.value }))} className="input-en-full">
                                        <option value="N/A">N/A</option><option value="Left">Left</option><option value="Right">Right</option>
                                        <option value="Bilateral">Bilateral</option><option value="Midline">Midline</option>
                                    </select>
                                </div>
                            </div>

                            <p className="section-label-en">TNM Classification</p>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="field-label-en">T</label>
                                    <select value={diagForm.tnm_t} onChange={e => setDiagForm(f => ({ ...f, tnm_t: e.target.value }))} className="input-en-full font-mono">
                                        <option value="">—</option>
                                        {['T0', 'Tis', 'T1', 'T1a', 'T1b', 'T1c', 'T2', 'T2a', 'T2b', 'T3', 'T4', 'T4a', 'T4b', 'TX'].map(v => <option key={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label-en">N</label>
                                    <select value={diagForm.tnm_n} onChange={e => setDiagForm(f => ({ ...f, tnm_n: e.target.value }))} className="input-en-full font-mono">
                                        <option value="">—</option>
                                        {['N0', 'N1', 'N1a', 'N1b', 'N2', 'N2a', 'N2b', 'N3', 'NX'].map(v => <option key={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="field-label-en">M</label>
                                    <select value={diagForm.tnm_m} onChange={e => setDiagForm(f => ({ ...f, tnm_m: e.target.value }))} className="input-en-full font-mono">
                                        <option value="">—</option>
                                        {['M0', 'M1', 'M1a', 'M1b', 'M1c', 'MX'].map(v => <option key={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="field-label-en">Date of diagnosis</label>
                                    <input type="date" value={diagForm.date_of_diagnosis} onChange={e => setDiagForm(f => ({ ...f, date_of_diagnosis: e.target.value }))} className="input-en-full" />
                                </div>
                                <div>
                                    <label className="field-label-en">Treatment intent</label>
                                    <select value={diagForm.treatment_intent} onChange={e => setDiagForm(f => ({ ...f, treatment_intent: e.target.value }))} className="input-en-full">
                                        <option value="curative">Curative</option>
                                        <option value="neoadjuvant">Neoadjuvant</option>
                                        <option value="adjuvant">Adjuvant</option>
                                        <option value="palliative">Palliative</option>
                                        <option value="supportive">Supportive</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pathology & Biomarkers */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon purple">🧬</span>
                            <div><p className="card-title">Pathology &amp; Biomarkers</p><p className="card-subtitle">التشريح المرضي والعلامات الجزيئية</p></div>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="field-label-en">Sample type</label>
                                    <select value={diagForm.sample_type} onChange={e => setDiagForm(f => ({ ...f, sample_type: e.target.value }))} className="input-en-full">
                                        <option value="tissue">Tissue</option>
                                        <option value="liquid">Liquid</option>
                                    </select>
                                </div>
                                {diagForm.sample_type === 'liquid' && (
                                    <div>
                                        <label className="field-label-en">Type of liquid</label>
                                        <select value={diagForm.liquid_type} onChange={e => setDiagForm(f => ({ ...f, liquid_type: e.target.value }))} className="input-en-full">
                                            <option value="">— Select —</option>
                                            <option value="blood">Blood / Plasma (ctDNA)</option>
                                            <option value="pleural_fluid">Pleural fluid</option>
                                            <option value="ascites">Ascites</option>
                                            <option value="csf">CSF</option>
                                            <option value="urine">Urine</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center mb-2">
                                <p className="section-label-en m-0">IHC (Immunohistochemistry)</p>
                                <button type="button" onClick={() => addTest('ihc')} className="tag-pill tag-pill-on">+ Add IHC test</button>
                            </div>
                            <div className="space-y-2 mb-4">
                                {ihcTests.length === 0 && <p className="text-xs text-slate-400">No IHC tests</p>}
                                {ihcTests.map(t => (
                                    <div key={t.id} className="grid grid-cols-6 gap-2 items-center border border-slate-200 rounded-lg p-2">
                                        <input value={t.test_name} onChange={e => updateTest('ihc', t.id, 'test_name', e.target.value)} placeholder="Test name" className="input-en-full col-span-2" />
                                        <input value={t.modality} onChange={e => updateTest('ihc', t.id, 'modality', e.target.value)} placeholder="Modality" className="input-en-full" />
                                        <input type="number" step="0.01" value={t.result_numeric} onChange={e => updateTest('ihc', t.id, 'result_numeric', e.target.value)} placeholder="Numeric" className="input-en-full" />
                                        <input value={t.result_text} onChange={e => updateTest('ihc', t.id, 'result_text', e.target.value)} placeholder="Result (text)" className="input-en-full" />
                                        <div className="flex gap-1">
                                            <input type="date" value={t.test_date} onChange={e => updateTest('ihc', t.id, 'test_date', e.target.value)} className="input-en-full" />
                                            <button type="button" onClick={() => removeTest('ihc', t.id, t.isNew)} className="text-red-500 text-xs px-2">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mb-2">
                                <p className="section-label-en m-0">Molecular Testing</p>
                                <button type="button" onClick={() => addTest('molecular')} className="tag-pill tag-pill-on">+ Add molecular test</button>
                            </div>
                            <div className="space-y-2 mb-4">
                                {molecularTests.length === 0 && <p className="text-xs text-slate-400">No molecular tests</p>}
                                {molecularTests.map(t => (
                                    <div key={t.id} className="grid grid-cols-6 gap-2 items-center border border-slate-200 rounded-lg p-2">
                                        <input value={t.test_name} onChange={e => updateTest('molecular', t.id, 'test_name', e.target.value)} placeholder="Test name" className="input-en-full col-span-2" />
                                        <input value={t.modality} onChange={e => updateTest('molecular', t.id, 'modality', e.target.value)} placeholder="Modality" className="input-en-full" />
                                        <input type="number" step="0.01" value={t.result_numeric} onChange={e => updateTest('molecular', t.id, 'result_numeric', e.target.value)} placeholder="Numeric" className="input-en-full" />
                                        <input value={t.result_text} onChange={e => updateTest('molecular', t.id, 'result_text', e.target.value)} placeholder="Result (text)" className="input-en-full" />
                                        <div className="flex gap-1">
                                            <input type="date" value={t.test_date} onChange={e => updateTest('molecular', t.id, 'test_date', e.target.value)} className="input-en-full" />
                                            <button type="button" onClick={() => removeTest('molecular', t.id, t.isNew)} className="text-red-500 text-xs px-2">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="field-label-en">Final Pathology Report</label>
                                <textarea value={diagForm.final_pathology_report} onChange={e => setDiagForm(f => ({ ...f, final_pathology_report: e.target.value }))} rows={3} className="input-en-full" />
                            </div>
                        </div>
                    </div>

                    {/* Social Habits */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon amber">🚬</span>
                            <div><p className="card-title">Social Habits</p><p className="card-subtitle">العادات الاجتماعية</p></div>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="field-label-en">Smoking / habits</label>
                                    <select value={histForm.smoking_status} onChange={e => setHistForm(f => ({ ...f, smoking_status: e.target.value }))} className="input-en-full">
                                        <option value="never">Never</option>
                                        <option value="cigarettes">Cigarettes</option>
                                        <option value="former">Former smoker</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                {sex === 'F' && (
                                    <div>
                                        <label className="field-label-en">Menstrual status</label>
                                        <select value={histForm.menstrual_status} onChange={e => setHistForm(f => ({ ...f, menstrual_status: e.target.value }))} className="input-en-full">
                                            <option value="">—</option>
                                            <option value="menstrual">Menstrual</option>
                                            <option value="postmenopausal">Postmenopausal</option>
                                            <option value="1st_amenorrhea">1st Amenorrhea</option>
                                            <option value="2nd_amenorrhea">2nd Amenorrhea</option>
                                            <option value="irregular_menses">Irregular Menses</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            {smokingStatus === 'cigarettes' && (
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="field-label-en">Packs / day</label>
                                        <input type="number" step="0.1" value={histForm.cigarettes_pack_per_day} onChange={e => setHistForm(f => ({ ...f, cigarettes_pack_per_day: e.target.value }))} className="input-en-full" />
                                    </div>
                                    <div>
                                        <label className="field-label-en">Duration (years)</label>
                                        <input type="number" value={histForm.cigarettes_duration_years} onChange={e => setHistForm(f => ({ ...f, cigarettes_duration_years: e.target.value }))} className="input-en-full" />
                                    </div>
                                </div>
                            )}
                            {smokingStatus === 'other' && (
                                <div>
                                    <label className="field-label-en">Specify habit</label>
                                    <input value={histForm.other_habit_details} onChange={e => setHistForm(f => ({ ...f, other_habit_details: e.target.value }))} className="input-en-full" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Medical History */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">
                            <span className="card-icon navy">📋</span>
                            <div><p className="card-title">Past Medical &amp; Family History</p><p className="card-subtitle">التاريخ المرضي والعائلي</p></div>
                        </div>
                        <div className="card-body">
                            <p className="section-label-en">Comorbidities</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {COMORBIDITIES.map(item => (
                                    <button type="button" key={item} onClick={() => toggleComorbidity(item)}
                                        className={`tag-pill ${selectedComorbidities.includes(item) ? 'tag-pill-on' : 'tag-pill-off'}`}>
                                        {item}
                                    </button>
                                ))}
                            </div>

                            <p className="section-label-en">Family History</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {FAMILY_HISTORY_CONDITIONS.map(item => (
                                    <button type="button" key={item} onClick={() => toggleFamilyCondition(item)}
                                        className={`tag-pill ${selectedFamilyConditions.includes(item) ? 'tag-pill-on' : 'tag-pill-off'}`}>
                                        {item}
                                    </button>
                                ))}
                            </div>
                            {selectedFamilyConditions.includes('Other') && (
                                <input value={familyHistoryOther} onChange={e => setFamilyHistoryOther(e.target.value)} placeholder="Specify other..." className="input-en-full mb-4" />
                            )}

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="field-label-en">Oncology FH?</label>
                                    <select value={histForm.oncology_fh} onChange={e => setHistForm(f => ({ ...f, oncology_fh: e.target.value }))} className="input-en-full">
                                        <option value="no">No</option>
                                        <option value="yes">Yes</option>
                                    </select>
                                </div>
                                {oncologyFh && (
                                    <>
                                        <div>
                                            <label className="field-label-en">Which person</label>
                                            <select value={histForm.oncology_fh_person} onChange={e => setHistForm(f => ({ ...f, oncology_fh_person: e.target.value }))} className="input-en-full">
                                                <option value="">—</option>
                                                <option value="mother">Mother</option>
                                                <option value="father">Father</option>
                                                <option value="sibling">Sibling</option>
                                                <option value="grandparent">Grandparent</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="field-label-en">Type of cancer</label>
                                            <input value={histForm.oncology_fh_type} onChange={e => setHistForm(f => ({ ...f, oncology_fh_type: e.target.value }))} className="input-en-full" />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="field-label-en">Previous surgeries</label>
                                    <textarea value={histForm.previous_surgeries} onChange={e => setHistForm(f => ({ ...f, previous_surgeries: e.target.value }))} rows={2} className="input-en-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="field-label-en">Previous chemotherapy</label>
                                        <select value={histForm.previous_chemo} onChange={e => setHistForm(f => ({ ...f, previous_chemo: e.target.value }))} className="input-en-full">
                                            <option value="none">None</option>
                                            <option value="adjuvant">Yes — adjuvant</option>
                                            <option value="neoadjuvant">Yes — neoadjuvant</option>
                                            <option value="palliative">Yes — palliative</option>
                                            <option value="multiple_lines">Yes — multiple lines</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="field-label-en">Radiation history</label>
                                        <select value={histForm.previous_radiation} onChange={e => setHistForm(f => ({ ...f, previous_radiation: e.target.value }))} className="input-en-full">
                                            <option value="none">None</option>
                                            <option value="same_site">Yes — same site</option>
                                            <option value="different_site">Yes — different site</option>
                                            <option value="wbrt">Yes — WBRT</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="field-label-en">Known drug allergies</label>
                                    <input value={histForm.drug_allergies} onChange={e => setHistForm(f => ({ ...f, drug_allergies: e.target.value }))} placeholder="NKDA if none" className="input-en-full" />
                                </div>
                            </div>

                            <p className="section-label-en">ECOG Performance Status</p>
                            <div className="flex gap-2 flex-wrap">
                                {['0', '1', '2', '3', '4'].map(ps => (
                                    <label key={ps} className={`radio-opt-en ${histForm.ecog_ps === ps ? 'sel' : ''}`}>
                                        <input type="radio" checked={histForm.ecog_ps === ps} onChange={() => setHistForm(f => ({ ...f, ecog_ps: ps }))} />
                                        <span className="rdot" />
                                        PS {ps}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                        <button onClick={handleSaveMedical} disabled={saving} style={{
                            padding: '10px 24px', background: '#1a8a78', color: '#fff', borderRadius: 9, border: 'none',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1,
                        }}>
                            {saving ? 'جارٍ الحفظ...' : 'حفظ البيانات الطبية'}
                        </button>
                    </div>
                </div>
            )}

            {/* Archive Zone */}
            {!isArchived && (
                <div style={{ background: '#fff', border: '1.5px solid rgba(180,83,9,.3)', borderRadius: 14, overflow: 'hidden' }} dir="rtl">
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(180,83,9,.15)', background: '#fff3cd' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#b45309', margin: 0 }}>📦 أرشفة الملف</p>
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                        <p style={{ fontSize: 12, color: '#4a5580', margin: '0 0 12px' }}>
                            أرشفة المريض ستخفي ملفه من قائمة المرضى النشطين، دون حذف أي بيانات طبية.
                        </p>
                        {!showArchiveConfirm ? (
                            <button onClick={() => setShowArchiveConfirm(true)} style={{
                                padding: '9px 18px', background: '#fff3cd', color: '#b45309', borderRadius: 8,
                                border: '1.5px solid rgba(180,83,9,.3)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}>
                                📦 أرشفة هذا الملف
                            </button>
                        ) : (
                            <div style={{ background: '#fff3cd', borderRadius: 10, padding: 16 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#b45309', display: 'block', marginBottom: 6 }}>سبب الأرشفة (اختياري)</label>
                                <input value={archiveReason} onChange={e => setArchiveReason(e.target.value)}
                                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid rgba(180,83,9,.3)', borderRadius: 7, fontSize: 12, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setShowArchiveConfirm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                                    <button onClick={handleArchive} disabled={archiving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#b45309', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: archiving ? .6 : 1 }}>
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
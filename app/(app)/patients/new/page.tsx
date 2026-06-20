'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewPatientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [patientId, setPatientId] = useState('')

  const [form, setForm] = useState({
    first_name_ar: '', last_name_ar: '',
    first_name_en: '', last_name_en: '',
    date_of_birth: '', sex: '',
    nationality: 'Egyptian',
    marital_status: '', occupation: '',
    mobile_primary: '', email: '',
    governorate: '', district: '',
    emergency_name: '', emergency_relation: '', emergency_phone: '',
    referral_source: 'physician', referring_provider: '',
    nid: '', insurance_id: '', passport: '',
  })

  const [medForm, setMedForm] = useState({
    primary_site: '', icd10_code: '', histology: '',
    stage: '', grade: '', laterality: 'N/A',
    tnm_t: '', tnm_n: '', tnm_m: '',
    treatment_intent: 'curative',
    date_of_diagnosis: '',
    is_metastatic: false,
    drug_allergies: 'NKDA', ecog_ps: '0',
    weight_kg: '', height_cm: '',
  })

  async function saveStep1() {
    if (!form.first_name_ar || !form.first_name_en || !form.date_of_birth || !form.sex || !form.mobile_primary || !form.emergency_name || !form.emergency_phone) {
      setError('Please fill all required fields')
      return
    }
    setSaving(true); setError('')
    const { data, error: err } = await supabase
      .from('patients')
      .insert({
        mrn: '',
        first_name_ar: form.first_name_ar,
        last_name_ar: form.last_name_ar,
        first_name_en: form.first_name_en.toLowerCase(),
        last_name_en: form.last_name_en.toLowerCase(),
        date_of_birth: form.date_of_birth,
        sex: form.sex,
        nationality: form.nationality,
        marital_status: form.marital_status || null,
        occupation: form.occupation || null,
        mobile_primary: form.mobile_primary,
        email: form.email || null,
        governorate: form.governorate || null,
        district: form.district || null,
        emergency_name: form.emergency_name,
        emergency_relation: form.emergency_relation || null,
        emergency_phone: form.emergency_phone,
        referral_source: form.referral_source || null,
        referring_provider: form.referring_provider || null,
      })
      .select('id, mrn')
      .single()

    if (err) { setError(err.message); setSaving(false); return }

    const identities = [
      { id_type: 'NID', id_number: form.nid },
      { id_type: 'INSURANCE', id_number: form.insurance_id },
      { id_type: 'PASSPORT', id_number: form.passport },
    ].filter(i => i.id_number?.trim())

    if (identities.length > 0) {
      await supabase.from('patient_identities').insert(
        identities.map(i => ({ ...i, patient_id: data.id }))
      )
    }

    setPatientId(data.id)
    setSaving(false)
    setStep(2)
  }

  async function saveStep2() {
    if (!medForm.primary_site || !medForm.icd10_code || !medForm.histology || !medForm.date_of_diagnosis) {
      setError('Please fill all required fields')
      return
    }
    setSaving(true); setError('')
    const { data: diag, error: err } = await supabase
      .from('diagnoses')
      .insert({
        patient_id: patientId,
        primary_site: medForm.primary_site,
        icd10_code: medForm.icd10_code,
        histology: medForm.histology,
        stage: medForm.stage || null,
        grade: medForm.grade || null,
        laterality: medForm.laterality,
        tnm_t: medForm.tnm_t || null,
        tnm_n: medForm.tnm_n || null,
        tnm_m: medForm.tnm_m || null,
        treatment_intent: medForm.treatment_intent,
        date_of_diagnosis: medForm.date_of_diagnosis,
        is_metastatic: medForm.is_metastatic,
      })
      .select('id').single()

    if (err) { setError(err.message); setSaving(false); return }

    await supabase.from('medical_history').insert({
      patient_id: patientId,
      drug_allergies: medForm.drug_allergies,
      ecog_ps: medForm.ecog_ps,
      weight_kg: medForm.weight_kg ? parseFloat(medForm.weight_kg) : null,
      height_cm: medForm.height_cm ? parseFloat(medForm.height_cm) : null,
    })

    setSaving(false)
    setStep(3)
  }

  async function finish() {
    router.push(`/patients/${patientId}`)
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

  const steps = [
    { id: 1, label: 'Personal Info' },
    { id: 2, label: 'Medical Data' },
    { id: 3, label: 'Done' },
  ]

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>New Patient Registration</h1>
        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
          Step {step} of 3
        </p>
      </div>

      {/* Steps Bar */}
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: step > s.id ? '#2ab8a0' : step === s.id ? '#fff' : '#eef0f6',
                color: step > s.id ? '#fff' : step === s.id ? '#1a8a78' : '#8e97b5',
                border: step === s.id ? '2px solid #2ab8a0' : step > s.id ? '2px solid #2ab8a0' : '2px solid #dde2ee',
              }}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: step === s.id ? '#1a8a78' : step > s.id ? '#0b1f3a' : '#8e97b5' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > s.id ? '#2ab8a0' : '#dde2ee', margin: '0 12px' }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e53e3e' }}>
          {error}
        </div>
      )}

      {/* STEP 1: Personal Info */}
      {step === 1 && (
        <>
          {/* Name */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span>👤</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Personal Information</p>
                <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>البيانات الشخصية</p>
              </div>
            </div>
            <div style={{ padding: '16px 18px' }}>

              {/* Full Name */}
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Full Name</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>First Name (AR) *</label>
                  <input value={form.first_name_ar} onChange={e => setForm(f => ({ ...f, first_name_ar: e.target.value }))}
                    placeholder="الاسم الأول" style={{ ...inputStyle, direction: 'rtl' }} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name (AR) *</label>
                  <input value={form.last_name_ar} onChange={e => setForm(f => ({ ...f, last_name_ar: e.target.value }))}
                    placeholder="اسم الأب / اللقب" style={{ ...inputStyle, direction: 'rtl' }} />
                </div>
                <div>
                  <label style={labelStyle}>First Name (EN) *</label>
                  <input value={form.first_name_en} onChange={e => setForm(f => ({ ...f, first_name_en: e.target.value }))}
                    placeholder="First name" style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name (EN) *</label>
                  <input value={form.last_name_en} onChange={e => setForm(f => ({ ...f, last_name_en: e.target.value }))}
                    placeholder="Last name" style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                </div>
              </div>

              {/* Demographics */}
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
                    placeholder="e.g. Teacher" style={{ ...inputStyle, direction: 'ltr' }} />
                </div>
              </div>

              {/* IDs */}
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Identification</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ border: '1.5px dashed #dde2ee', borderRadius: 10, padding: 12, background: '#f7f8fc' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#4a5580', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    National ID <span style={{ fontSize: 8, background: '#0b1f3a', color: '#2ab8a0', padding: '1px 5px', borderRadius: 3, fontFamily: 'DM Mono' }}>NID</span>
                  </p>
                  <input value={form.nid} onChange={e => setForm(f => ({ ...f, nid: e.target.value }))}
                    placeholder="30XXXXXXXXXXX" maxLength={14}
                    style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono', letterSpacing: '.08em' }} />
                </div>
                <div style={{ border: '1.5px dashed #dde2ee', borderRadius: 10, padding: 12, background: '#f7f8fc' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#4a5580', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Insurance ID <span style={{ fontSize: 8, background: '#0b1f3a', color: '#2ab8a0', padding: '1px 5px', borderRadius: 3, fontFamily: 'DM Mono' }}>INS</span>
                  </p>
                  <input value={form.insurance_id} onChange={e => setForm(f => ({ ...f, insurance_id: e.target.value }))}
                    placeholder="HI-XXXXXXXXX" style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                </div>
                <div style={{ border: '1.5px dashed #dde2ee', borderRadius: 10, padding: 12, background: '#f7f8fc' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#4a5580', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Passport <span style={{ fontSize: 8, background: '#0b1f3a', color: '#2ab8a0', padding: '1px 5px', borderRadius: 3, fontFamily: 'DM Mono' }}>PASS</span>
                  </p>
                  <input value={form.passport} onChange={e => setForm(f => ({ ...f, passport: e.target.value }))}
                    placeholder="A12345678" style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                </div>
              </div>

              {/* Contact */}
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Contact & Address</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Mobile * </label>
                  <input value={form.mobile_primary} onChange={e => setForm(f => ({ ...f, mobile_primary: e.target.value }))}
                    placeholder="+20 1XX XXX XXXX" style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="patient@email.com" style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
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
                  <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                    placeholder="e.g. Nasr City" style={inputStyle} />
                </div>
              </div>

              {/* Emergency */}
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Emergency Contact</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input value={form.emergency_name} onChange={e => setForm(f => ({ ...f, emergency_name: e.target.value }))}
                    placeholder="Contact name" style={inputStyle} />
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
                    placeholder="+20 1XX XXX XXXX" style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={saveStep1} disabled={saving} style={{
              padding: '10px 24px', background: '#1a8a78', color: '#fff',
              borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', opacity: saving ? .6 : 1,
            }}>
              {saving ? 'Saving...' : 'Next: Medical Data →'}
            </button>
          </div>
        </>
      )}

      {/* STEP 2: Medical Data */}
      {step === 2 && (
        <>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span>🔬</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Medical Data</p>
                <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>All fields in English · ICD-10 compliant</p>
              </div>
            </div>
            <div style={{ padding: '16px 18px' }}>

              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Primary Diagnosis</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Primary Site *</label>
                  <select value={medForm.primary_site} onChange={e => setMedForm(f => ({ ...f, primary_site: e.target.value }))} style={inputStyle}>
                    <option value="">— Select —</option>
                    {['Breast','Lung','Colorectal','Lymphoma','Leukemia','Liver','Cervix','Prostate','Bladder','Thyroid','Brain','Pancreas','Ovary','Stomach','Other'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ICD-10 Code *</label>
                  <input value={medForm.icd10_code} onChange={e => setMedForm(f => ({ ...f, icd10_code: e.target.value }))}
                    placeholder="e.g. C50.1" style={{ ...inputStyle, direction: 'ltr', fontFamily: 'DM Mono' }} />
                </div>
                <div>
                  <label style={labelStyle}>Histology *</label>
                  <select value={medForm.histology} onChange={e => setMedForm(f => ({ ...f, histology: e.target.value }))} style={inputStyle}>
                    <option value="">— Select —</option>
                    {['Adenocarcinoma','Squamous cell','Small cell','Ductal carcinoma','Lobular carcinoma','Large B-cell lymphoma','Sarcoma','Melanoma','Other'].map(h => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Stage</label>
                  <select value={medForm.stage} onChange={e => setMedForm(f => ({ ...f, stage: e.target.value }))} style={inputStyle}>
                    <option value="">—</option>
                    {['Stage I','Stage IA','Stage IB','Stage II','Stage IIA','Stage IIB','Stage III','Stage IIIA','Stage IIIB','Stage IIIC','Stage IV'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Grade</label>
                  <select value={medForm.grade} onChange={e => setMedForm(f => ({ ...f, grade: e.target.value }))} style={inputStyle}>
                    <option value="">—</option>
                    <option value="G1">G1 - Well differentiated</option>
                    <option value="G2">G2 - Moderately differentiated</option>
                    <option value="G3">G3 - Poorly differentiated</option>
                    <option value="G4">G4 - Undifferentiated</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date of Diagnosis *</label>
                  <input type="date" value={medForm.date_of_diagnosis} onChange={e => setMedForm(f => ({ ...f, date_of_diagnosis: e.target.value }))}
                    style={{ ...inputStyle, direction: 'ltr' }} />
                </div>
              </div>

              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>TNM Classification</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>T — Tumor</label>
                  <select value={medForm.tnm_t} onChange={e => setMedForm(f => ({ ...f, tnm_t: e.target.value }))} style={{ ...inputStyle, fontFamily: 'DM Mono' }}>
                    <option value="">—</option>
                    {['T0','Tis','T1','T1a','T1b','T2','T2a','T2b','T3','T4','TX'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>N — Nodes</label>
                  <select value={medForm.tnm_n} onChange={e => setMedForm(f => ({ ...f, tnm_n: e.target.value }))} style={{ ...inputStyle, fontFamily: 'DM Mono' }}>
                    <option value="">—</option>
                    {['N0','N1','N1a','N1b','N2','N2a','N3','NX'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>M — Metastasis</label>
                  <select value={medForm.tnm_m} onChange={e => setMedForm(f => ({ ...f, tnm_m: e.target.value }))} style={{ ...inputStyle, fontFamily: 'DM Mono' }}>
                    <option value="">—</option>
                    {['M0','M1','M1a','M1b','MX'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8e97b5', fontFamily: 'DM Mono', marginBottom: 12 }}>Performance & Anthropometrics</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>ECOG PS</label>
                  <select value={medForm.ecog_ps} onChange={e => setMedForm(f => ({ ...f, ecog_ps: e.target.value }))} style={inputStyle}>
                    {['0','1','2','3','4'].map(v => <option key={v}>PS {v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Weight (kg)</label>
                  <input type="number" value={medForm.weight_kg} onChange={e => setMedForm(f => ({ ...f, weight_kg: e.target.value }))}
                    placeholder="70" style={{ ...inputStyle, direction: 'ltr' }} />
                </div>
                <div>
                  <label style={labelStyle}>Height (cm)</label>
                  <input type="number" value={medForm.height_cm} onChange={e => setMedForm(f => ({ ...f, height_cm: e.target.value }))}
                    placeholder="170" style={{ ...inputStyle, direction: 'ltr' }} />
                </div>
                <div>
                  <label style={labelStyle}>Drug Allergies</label>
                  <input value={medForm.drug_allergies} onChange={e => setMedForm(f => ({ ...f, drug_allergies: e.target.value }))}
                    placeholder="NKDA" style={{ ...inputStyle, direction: 'ltr' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{
              padding: '10px 20px', background: '#fff', color: '#4a5580',
              borderRadius: 9, border: '1.5px solid #dde2ee', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}>
              ← Back
            </button>
            <button onClick={saveStep2} disabled={saving} style={{
              padding: '10px 24px', background: '#1a8a78', color: '#fff',
              borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', opacity: saving ? .6 : 1,
            }}>
              {saving ? 'Saving...' : 'Next: Finish →'}
            </button>
          </div>
        </>
      )}

      {/* STEP 3: Done */}
      {step === 3 && (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0b1f3a', margin: '0 0 8px' }}>Patient Registered Successfully!</h2>
          <p style={{ fontSize: 13, color: '#8e97b5', margin: '0 0 24px' }}>
            The patient file has been created and saved to the database.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={finish} style={{
              padding: '10px 24px', background: '#1a8a78', color: '#fff',
              borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              View Patient File
            </button>
            <button onClick={() => { setStep(1); setPatientId(''); setForm({ first_name_ar: '', last_name_ar: '', first_name_en: '', last_name_en: '', date_of_birth: '', sex: '', nationality: 'Egyptian', marital_status: '', occupation: '', mobile_primary: '', email: '', governorate: '', district: '', emergency_name: '', emergency_relation: '', emergency_phone: '', referral_source: 'physician', referring_provider: '', nid: '', insurance_id: '', passport: '' }) }} style={{
              padding: '10px 24px', background: '#fff', color: '#4a5580',
              borderRadius: 9, border: '1.5px solid #dde2ee', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Register Another Patient
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
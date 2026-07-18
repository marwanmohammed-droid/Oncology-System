'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useMedicalRecord } from '@/lib/hooks/useMedicalRecord'

export default function PatientProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [patient, setPatient] = useState<any>(null)
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function load() {
      const { data: pt } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single()

      const { data: diag } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setPatient(pt)
      setDiagnosis(diag)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#8e97b5', fontFamily: 'Cairo' }}>
      جارٍ التحميل...
    </div>
  )

  if (!patient) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e', fontFamily: 'Cairo' }}>
      المريض غير موجود
    </div>
  )

  const age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))

  const tabs = [
    { id: 'overview', label: '⊞ نظرة عامة' },
    { id: 'medical', label: '🔬 السجل الطبي' },
    { id: 'consents', label: '📄 الموافقات' },
    { id: 'financial', label: '💳 المالية' },
  ]

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl', minHeight: '100vh', background: '#f7f8fc' }}>

      {/* Patient Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1f3a 0%, #132d52 60%, #1e4580 100%)',
        padding: '24px 28px 0',
      }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 16, display: 'flex', gap: 6 }}>
          <Link href="/patients" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none' }}>المرضى</Link>
          <span>›</span>
          <span style={{ color: '#fff' }}>{patient.first_name_ar} {patient.last_name_ar}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2ab8a0, #1a8a78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
            border: '3px solid rgba(255,255,255,.2)',
          }}>
            {patient.first_name_ar[0]}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
              {patient.first_name_ar} {patient.last_name_ar}
            </h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', fontFamily: 'DM Mono', margin: '4px 0 8px' }}>
              {patient.first_name_en} {patient.last_name_en} · {age} سنة · {patient.sex === 'M' ? 'ذكر' : 'أنثى'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: patient.mrn, mono: true },
                diagnosis && { label: `${diagnosis.primary_site} · ${diagnosis.stage || '—'}` },
                { label: patient.mobile_primary, mono: true },
              ].filter(Boolean).map((chip: any, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.85)',
                  padding: '3px 10px', borderRadius: 20, fontSize: 10,
                  fontFamily: chip.mono ? 'DM Mono' : 'inherit',
                  border: '1px solid rgba(255,255,255,.1)',
                }}>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/patients/${id}/edit`} style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.22)',
              background: 'rgba(255,255,255,.1)', color: '#fff',
              fontSize: 11, fontWeight: 600, textDecoration: 'none',
            }}>
              ✏️ تعديل
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginTop: 16 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 16px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(255,255,255,.1)' : 'transparent',
              color: activeTab === tab.id ? '#2ab8a0' : 'rgba(255,255,255,.45)',
              fontSize: 11, fontWeight: 600, fontFamily: 'Cairo, sans-serif',
              borderBottom: activeTab === tab.id ? '2.5px solid #2ab8a0' : '2.5px solid transparent',
              transition: 'all .15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 28px' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Personal Info */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>👤</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>البيانات الشخصية</p>
                  <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Personal Information</p>
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  ['MRN', patient.mrn],
                  ['تاريخ الميلاد', patient.date_of_birth],
                  ['الجنس', patient.sex === 'M' ? 'ذكر · Male' : 'أنثى · Female'],
                  ['الجنسية', patient.nationality],
                  ['الموبايل', patient.mobile_primary],
                  ['البريد الإلكتروني', patient.email || '—'],
                  ['المحافظة', patient.governorate || '—'],
                  ['جهة الطوارئ', patient.emergency_name + ' · ' + (patient.emergency_relation || '')],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnosis */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🔬</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>التشخيص</p>
                  <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Diagnosis</p>
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {diagnosis ? [
                  ['Primary site', diagnosis.primary_site],
                  ['ICD-10', diagnosis.icd10_code],
                  ['Histology', diagnosis.histology],
                  ['Stage', diagnosis.stage || '—'],
                  ['TNM', `${diagnosis.tnm_t || '—'} ${diagnosis.tnm_n || '—'} ${diagnosis.tnm_m || '—'}`],
                  ['Intent', diagnosis.treatment_intent || '—'],
                  ['تاريخ التشخيص', diagnosis.date_of_diagnosis],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540' }}>{v}</span>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: 20, color: '#8e97b5' }}>
                    <p style={{ fontSize: 12 }}>لم يتم إدخال التشخيص بعد</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MEDICAL TAB */}
        {activeTab === 'medical' && (
          <MedicalTabContent patientId={id as string} />
        )}

        {/* CONSENTS TAB */}
        {activeTab === 'consents' && (
          <ConsentsTabContent patientId={id as string} supabase={supabase} />
        )}

        {/* FINANCIAL TAB */}
        {activeTab === 'financial' && (
          <FinancialTabContent patientId={id as string} supabase={supabase} />
        )}

      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// MedicalTabContent — محتوى تبويب "السجل الطبي"
// ────────────────────────────────────────────────────────────
function MedicalTabContent({ patientId }: { patientId: string }) {
  const { data, loading } = useMedicalRecord(patientId)

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
        جارٍ التحميل...
      </div>
    )
  }
  if (!data) return null

  const { diagnoses, treatmentPlans, chemoSessions } = data
  const completedSessions = chemoSessions.filter((s: any) => s.status === 'completed')

  const reportLinkStyle: React.CSSProperties = {
    background: '#2ab8a0',
    color: '#0b1f3a',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, #0b1f3a, #1e4580)', borderRadius: 14,
        padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>التقرير الطبي الكامل</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', margin: '4px 0 0' }}>
            تجميع كل البيانات الإكلينيكية للمريض في تقرير واحد قابل للطباعة والتصدير كـ PDF
          </p>
        </div>
        <a href={`/medical-report/${patientId}`} target="_blank" rel="noopener noreferrer" style={reportLinkStyle}>
          عرض التقرير الكامل
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#0b1f3a', margin: 0, fontFamily: 'DM Mono' }}>{diagnoses.length}</p>
          <p style={{ fontSize: 11, color: '#8e97b5', margin: '4px 0 0' }}>تشخيصات مسجلة</p>
        </div>
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#1a8a78', margin: 0, fontFamily: 'DM Mono' }}>{treatmentPlans.length}</p>
          <p style={{ fontSize: 11, color: '#8e97b5', margin: '4px 0 0' }}>خطط علاج</p>
        </div>
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', margin: 0, fontFamily: 'DM Mono' }}>{completedSessions.length} / {chemoSessions.length}</p>
          <p style={{ fontSize: 11, color: '#8e97b5', margin: '4px 0 0' }}>جلسات مكتملة</p>
        </div>
      </div>

      {diagnoses[0] && (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>آخر تشخيص</p>
          </div>
          <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              ['الموقع', diagnoses[0].primary_site],
              ['المرحلة', diagnoses[0].stage || '—'],
              ['تاريخ التشخيص', diagnoses[0].date_of_diagnosis],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono' }}>{k}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1e2540', margin: '2px 0 0' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// ConsentsTabContent — محتوى تبويب "الموافقات"
// ────────────────────────────────────────────────────────────
const CONSENT_LABELS: Record<string, { ar: string; en: string; required: boolean }> = {
  general_treatment: { ar: 'الموافقة العامة على العلاج', en: 'General Treatment Consent', required: true },
  chemotherapy: { ar: 'الموافقة على العلاج الكيماوي', en: 'Chemotherapy Informed Consent', required: true },
  data_privacy: { ar: 'حفظ واستخدام البيانات الطبية', en: 'Data Privacy & HIPAA Consent', required: true },
  photography: { ar: 'التصوير والتوثيق التعليمي', en: 'Photography & Documentation', required: false },
  research_trials: { ar: 'المشاركة في الدراسات السريرية', en: 'Clinical Research & Trials', required: false },
  telemedicine: { ar: 'الاستشارة عن بُعد', en: 'Telemedicine & Remote Consultation', required: false },
}

function ConsentsTabContent({ patientId, supabase }: { patientId: string; supabase: any }) {
  const [consents, setConsents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('consents')
        .select('*')
        .eq('patient_id', patientId)
        .order('consent_type')
      setConsents(data || [])
      setLoading(false)
    }
    load()
  }, [patientId])

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
        جارٍ التحميل...
      </div>
    )
  }

  if (consents.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
        <p style={{ fontWeight: 600, color: '#4a5580' }}>لا توجد موافقات مسجلة</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>الموافقات تُنشأ تلقائيًا عند تسجيل المريض</p>
      </div>
    )
  }

  const required = consents.filter((c: any) => c.is_required)
  const optional = consents.filter((c: any) => !c.is_required)
  const requiredSignedCount = required.filter((c: any) => c.status === 'signed').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Progress summary */}
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>الموافقات الإلزامية الموقعة</p>
          <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 0' }}>Required Consents Signed</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: requiredSignedCount === required.length ? '#16a34a' : '#b45309', fontFamily: 'DM Mono' }}>
            {requiredSignedCount}
          </span>
          <span style={{ fontSize: 13, color: '#8e97b5' }}> / {required.length}</span>
        </div>
      </div>

      {/* Required consents */}
      <ConsentGroup title="الموافقات الإلزامية" subtitle="Required Consents" items={required} />

      {/* Optional consents */}
      {optional.length > 0 && (
        <ConsentGroup title="الموافقات الاختيارية" subtitle="Optional Consents" items={optional} />
      )}
    </div>
  )
}

function ConsentGroup({ title, subtitle, items }: { title: string; subtitle: string; items: any[] }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 0' }}>{subtitle}</p>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((c: any) => {
          const meta = CONSENT_LABELS[c.consent_type] || { ar: c.consent_type, en: c.consent_type }
          const signed = c.status === 'signed'
          return (
            <div key={c.id} style={{
              border: `1.5px solid ${signed ? 'rgba(22,163,74,.25)' : '#dde2ee'}`,
              background: signed ? '#f0fdf4' : '#fafbfd',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{meta.ar}</p>
                <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 0' }}>{meta.en}</p>
                {signed && c.signed_at && (
                  <p style={{ fontSize: 9, color: '#16a34a', margin: '4px 0 0', fontFamily: 'DM Mono' }}>
                    وُقّعت في {new Date(c.signed_at).toLocaleString('ar-EG')}
                  </p>
                )}
              </div>
              <span style={{
                fontSize: 10, padding: '3px 12px', borderRadius: 20, fontWeight: 700,
                background: signed ? '#16a34a' : '#fff3cd',
                color: signed ? '#fff' : '#b45309',
              }}>
                {signed ? '✓ موقّعة' : 'غير موقّعة'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// FinancialTabContent — محتوى تبويب "المالية"
// ────────────────────────────────────────────────────────────
const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: 'نقدي', installment: 'تقسيط', ngo: 'خيري / NGO',
  clinical_trial: 'دراسة سريرية', exemption: 'إعفاء',
}
const INSURANCE_TYPE_AR: Record<string, string> = {
  government: 'تأمين حكومي', private: 'تأمين خاص',
  comprehensive: 'تأمين شامل', self_pay: 'بدون تأمين',
}

function FinancialTabContent({ patientId, supabase }: { patientId: string; supabase: any }) {
  const [insurance, setInsurance] = useState<any>(null)
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: ins }, { data: pay }] = await Promise.all([
        supabase.from('insurance_policies').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('payment_plans').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      setInsurance(ins)
      setPayment(pay)
      setLoading(false)
    }
    load()
  }, [patientId])

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
        جارٍ التحميل...
      </div>
    )
  }

  if (!insurance && !payment) {
    return (
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
        <p style={{ fontWeight: 600, color: '#4a5580' }}>لا توجد بيانات مالية أو تأمينية مسجلة</p>
      </div>
    )
  }

  const coverage = insurance?.coverage || {}
  const serviceLabels: Record<string, string> = {
    consultation: 'كشف', chemo_drugs: 'أدوية الكيماوي', imaging: 'أشعة',
    lab_tests: 'تحاليل', radiation: 'إشعاع علاجي', surgery: 'جراحة',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Insurance */}
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🛡️</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>التغطية التأمينية</p>
            <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Insurance Coverage</p>
          </div>
        </div>
        {!insurance ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#8e97b5', fontSize: 12 }}>لا توجد بيانات تأمين مسجلة</div>
        ) : (
          <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <InfoField label="نوع التأمين" value={INSURANCE_TYPE_AR[insurance.insurance_type] || insurance.insurance_type} />
              {insurance.provider_name && <InfoField label="شركة التأمين" value={insurance.provider_name} />}
              {insurance.policy_number && <InfoField label="رقم البوليصة" value={insurance.policy_number} mono />}
            </div>

            {Object.keys(coverage).length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                  تفاصيل التغطية
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f7f8fc' }}>
                      {['الخدمة', 'نسبة التغطية', 'المشاركة (ج.م)', 'تفويض مسبق', 'الحد السنوي'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', borderBottom: '1.5px solid #dde2ee' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(coverage).map(([key, val]: [string, any]) => (
                      <tr key={key}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #eef0f6', fontWeight: 600 }}>{serviceLabels[key] || key}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #eef0f6', fontFamily: 'DM Mono' }}>{val.pct}%</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #eef0f6', fontFamily: 'DM Mono' }}>{val.copay}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #eef0f6' }}>{val.preauth ? 'نعم' : 'لا'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #eef0f6', fontFamily: 'DM Mono' }}>{val.annual_max ?? 'غير محدود'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

      {/* Payment */}
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>💰</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>خطة السداد</p>
            <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Payment Plan</p>
          </div>
        </div>
        {!payment ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#8e97b5', fontSize: 12 }}>لا توجد خطة سداد مسجلة</div>
        ) : (
          <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <InfoField label="طريقة السداد" value={PAYMENT_METHOD_AR[payment.payment_method] || payment.payment_method} />
            {payment.initial_deposit != null && <InfoField label="الدفعة الأولى" value={`${payment.initial_deposit} ج.م`} mono />}
            {payment.billing_cycle && <InfoField label="دورة الفوترة" value={payment.billing_cycle} />}
            {payment.down_payment != null && <InfoField label="مقدم التقسيط" value={`${payment.down_payment} ج.م`} mono />}
            {payment.num_installments != null && <InfoField label="عدد الأقساط" value={payment.num_installments} mono />}
            {payment.ngo_name && <InfoField label="الجهة الخيرية" value={payment.ngo_name} />}
            {payment.financial_notes && <InfoField label="ملاحظات مالية" value={payment.financial_notes} full />}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoField({ label, value, mono, full }: { label: string; value: any; mono?: boolean; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <p style={{ fontSize: 9, color: '#8e97b5', margin: '0 0 3px', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#1e2540', margin: 0, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>{value ?? '—'}</p>
    </div>
  )
}
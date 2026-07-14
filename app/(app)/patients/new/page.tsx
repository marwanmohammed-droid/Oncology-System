'use client'
import { useRegistration } from '@/lib/hooks/useRegistration'
import { Step1Personal } from '@/components/patients/registration/Step1Personal'
import { Step2Medical } from '@/components/patients/registration/Step2Medical'
import { Step3Insurance } from '@/components/patients/registration/Step3Insurance'
import { Step4Consents } from '@/components/patients/registration/Step4Consents'
import { useRouter } from 'next/navigation'

const STEPS = [
  { id: 1, labelAr: 'البيانات الشخصية', labelEn: 'Personal' },
  { id: 2, labelAr: 'البيانات الطبية', labelEn: 'Medical' },
  { id: 3, labelAr: 'التأمين والسداد', labelEn: 'Insurance' },
  { id: 4, labelAr: 'الموافقات', labelEn: 'Consents' },
]

export default function NewPatientPage() {
  const router = useRouter()
  const {
    step, patientId, saving, error,
    saveStep1, saveStep2, saveStep3, signConsent, completeRegistration,
  } = useRegistration()

  async function handleComplete() {
    const ok = await completeRegistration()
    if (ok && patientId) router.push(`/patients/${patientId}`)
    return ok
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }} dir="rtl">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
          تسجيل مريض جديد
        </h1>
        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
          Step {step} of 4 · {STEPS.find(s => s.id === step)?.labelEn}
        </p>
      </div>

      {/* Steps Bar */}
      <div style={{
        background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12,
        padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center',
      }} dir="rtl">
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: step > s.id ? '#2ab8a0' : step === s.id ? '#fff' : '#eef0f6',
                color: step > s.id ? '#fff' : step === s.id ? '#1a8a78' : '#8e97b5',
                border: step >= s.id ? '2px solid #2ab8a0' : '2px solid #dde2ee',
              }}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: step === s.id ? '#1a8a78' : step > s.id ? '#0b1f3a' : '#8e97b5',
              }}>
                {s.labelAr}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > s.id ? '#2ab8a0' : '#dde2ee', margin: '0 12px' }} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && <Step1Personal onSave={saveStep1} saving={saving} error={error} />}
      {step === 2 && <Step2Medical onSave={saveStep2} saving={saving} error={error} />}
      {step === 3 && <Step3Insurance onSave={saveStep3} saving={saving} error={error} />}
      {step === 4 && patientId && (
        <Step4Consents
          patientId={patientId}
          onSignConsent={signConsent}
          onComplete={handleComplete}
          saving={saving}
          error={error}
        />
      )}
    </div>
  )
}
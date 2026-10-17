'use client'
import { useRegistration } from '@/lib/hooks/useRegistration'
import { Step1Personal } from '@/components/patients/registration/Step1Personal'
import { Step2Medical } from '@/components/patients/registration/Step2Medical'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRole } from '@/lib/hooks/useRole'

const STEPS = [
  { id: 1, labelAr: 'البيانات الشخصية', labelEn: 'Personal' },
  { id: 2, labelAr: 'البيانات الطبية', labelEn: 'Medical' },
]

export default function NewPatientPage() {
  return (
    <Suspense fallback={null}>
      <NewPatientForm />
    </Suspense>
  )
}

function NewPatientForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const existingPatientId = searchParams.get('patientId')
  const { loading: roleLoading, isReceptionist, canEditMedical } = useRole()
  const {
    step, setStep, patientId, patientSex, saving, error,
    patientNotPresent, setPatientNotPresent,
    step1InitialData, socialHabitsInitialData, loadingPatientData, // ⬅️ جديد
    goBackToStep1, // ⬅️ جديد
    saveStep1, saveStep2,
  } = useRegistration(existingPatientId)

  // الدكتور/الأدمن بيفتح ملف سجّله السكرتير → يروح مباشرة للبيانات الطبية
  useEffect(() => {
    if (existingPatientId && canEditMedical && patientSex) setStep(2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPatientId, canEditMedical, patientSex])

  // السكرتير: Step 1 فقط وبيحفظ كمسودة
  const receptionistOnly = isReceptionist
  const steps = receptionistOnly ? STEPS.slice(0, 1) : STEPS

  async function handleSaveStep1(data: any) {
    const patient = await saveStep1(data, { draftOnly: receptionistOnly })
    if (patient && receptionistOnly) router.push('/patients')
  }

  async function handleSaveStep2(data: any) {
    // Save & Confirm — الدكتور فقط
    const ok = await saveStep2(data)
    if (ok && patientId) router.push(`/patients/${patientId}`)
  }

  if (roleLoading) return null

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }} dir="rtl">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
          تسجيل مريض جديد
        </h1>
        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
          Step {step} of {steps.length} · {STEPS.find(s => s.id === step)?.labelEn}
        </p>
      </div>

      {/* Steps Bar */}
      <div style={{
        background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12,
        padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center',
      }} dir="rtl">
        {steps.map((s, i) => (
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
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > s.id ? '#2ab8a0' : '#dde2ee', margin: '0 12px' }} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Step1Personal
          onSave={handleSaveStep1}
          isReceptionist={receptionistOnly}
          saving={saving}
          error={error}
          patientNotPresent={patientNotPresent}
          onPatientNotPresentChange={setPatientNotPresent}
          initialData={step1InitialData}
          initialSocialHabits={socialHabitsInitialData}
          loadingInitialData={loadingPatientData}
        />
      )}
      {step === 2 && canEditMedical && (
        <Step2Medical
          onSave={handleSaveStep2}
          saving={saving}
          error={error}
          patientSex={patientSex ?? undefined}
          patientNotPresent={patientNotPresent}
          onBack={goBackToStep1}
        />
      )}
    </div>
  )
}
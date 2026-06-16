// app/(app)/patients/new/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRegistration } from '@/lib/hooks/useRegistration'
import { useRole } from '@/lib/hooks/useRole'
import { Step1Personal } from '@/components/patients/registration/Step1Personal'
import { Step2Medical }   from '@/components/patients/registration/Step2Medical'
import { Step3Insurance } from '@/components/patients/registration/Step3Insurance'
import { Step4Consents }  from '@/components/patients/registration/Step4Consents'

const STEPS = [
  { id: 1, ar: 'البيانات الشخصية', en: 'Personal Info' },
  { id: 2, ar: 'البيانات الطبية',  en: 'Medical Data' },
  { id: 3, ar: 'التأمين والمالية', en: 'Insurance' },
  { id: 4, ar: 'الموافقات',        en: 'Consents' },
]

export default function NewPatientPage() {
  const router = useRouter()
  const { role, isDoctor, isAdmin, canEditMedical, loading: roleLoading } = useRole()
  const {
    step, setStep, patientId, saving, error,
    saveStep1, saveStep2, saveStep3, signConsent, completeRegistration,
  } = useRegistration()

  // Guard: receptionist can only do step 1
  const canAccessStep = (s: number) => {
    if (s === 1) return true
    return canEditMedical
  }

  if (roleLoading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-navy-900">تسجيل بيانات مريض جديد</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">New Patient Registration</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`sb-badge ${step < 4 ? 'sb-pend' : 'sb-done'}`}>
            Step {step} / 4
          </span>
          {patientId && (
            <span className="pt-id font-mono text-xs bg-navy-900 text-teal-400 px-3 py-1 rounded-full">
              {patientId}
            </span>
          )}
        </div>
      </div>

      {/* Step indicators */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center shadow-sm">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              onClick={() => canAccessStep(s.id) && step > s.id && setStep(s.id)}
              className={`flex items-center gap-2 ${
                step > s.id && canAccessStep(s.id) ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${step > s.id  ? 'bg-teal-400 text-white border-teal-400' : ''}
                ${step === s.id ? 'bg-white text-teal-600 border-teal-400 shadow-[0_0_0_3px_rgba(42,184,160,.15)]' : ''}
                ${step < s.id  ? 'bg-slate-100 text-slate-400 border-slate-200' : ''}
                ${!canAccessStep(s.id) && step < s.id ? 'opacity-40' : ''}
              `}>
                {step > s.id ? '✓' : s.id}
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${step === s.id ? 'text-teal-600' : step > s.id ? 'text-slate-700' : 'text-slate-400'}`}>
                  {s.ar}
                </p>
                <p className="text-[9px] text-slate-400 font-mono">{s.en}</p>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 transition-all ${step > s.id ? 'bg-teal-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Role notice for receptionist */}
      {!canEditMedical && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-blue-700">
          <span>ℹ️</span>
          <span>أنت مسجل كـ <strong>Receptionist</strong> — يمكنك إدخال البيانات الشخصية فقط (Step 1). البيانات الطبية تحتاج صلاحية الطبيب.</span>
        </div>
      )}

      {/* Form grid */}
      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">

        {/* Main form */}
        <div>
          {step === 1 && (
            <Step1Personal onSave={saveStep1} saving={saving} error={error} />
          )}
          {step === 2 && canEditMedical && (
            <Step2Medical onSave={saveStep2} saving={saving} error={error} />
          )}
          {step === 2 && !canEditMedical && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
              <div className="text-4xl mb-3">🔒</div>
              <p className="font-semibold text-slate-600">هذا القسم للأطباء فقط</p>
              <p className="text-sm font-mono mt-1">Medical data — Doctor access required</p>
            </div>
          )}
          {step === 3 && (
            <Step3Insurance onSave={saveStep3} saving={saving} error={error} />
          )}
          {step === 4 && patientId && (
            <Step4Consents
              patientId={patientId}
              onSignConsent={signConsent}
              onComplete={completeRegistration}
              saving={saving}
              error={error}
            />
          )}
        </div>

        {/* Right panel: Live summary */}
        <div className="space-y-4 sticky top-20">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-navy-900">ملخص البيانات</p>
              <p className="text-[9px] text-slate-400 font-mono">Live Registration Summary</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              {[
                { k: 'patient_id',    v: patientId ?? 'PT-YYYY-####' },
                { k: 'current_step',  v: `${step} / 4` },
                { k: 'entered_by',    v: role ?? '—' },
                { k: 'status',        v: step < 4 ? 'in_progress' : 'complete' },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] text-slate-400 font-mono">{k}</span>
                  <span className="text-xs font-semibold text-slate-800 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Access matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-bold text-navy-900">صلاحيات الإدخال</p>
              <p className="text-[9px] text-slate-400 font-mono">Data entry permissions</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              {[
                { step: 'Step 1 — Personal', roles: 'Receptionist + Doctor', ok: true },
                { step: 'Step 2 — Medical',  roles: 'Doctor only',           ok: canEditMedical },
                { step: 'Step 3 — Insurance',roles: 'Doctor only',           ok: canEditMedical },
                { step: 'Step 4 — Consents', roles: 'Doctor only',           ok: canEditMedical },
              ].map(({ step: s, roles, ok }) => (
                <div key={s} className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-700">{s}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{roles}</p>
                  </div>
                  <span className={`text-xs font-bold ${ok ? 'text-green-600' : 'text-red-400'}`}>
                    {ok ? '✅' : '🔒'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            <p className="font-bold mb-1">⚠️ Data Entry Rules</p>
            <p>Step 1: العربي + English</p>
            <p>Steps 2-4: English only (ICD-10, HL7)</p>
          </div>
        </div>

      </div>
    </div>
  )
}

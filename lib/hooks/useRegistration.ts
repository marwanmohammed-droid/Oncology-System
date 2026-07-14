// ============================================================
// lib/hooks/useRegistration.ts — Multi-step form state
// ============================================================
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import { z } from "zod"

export const schema = z.object({
  first_name_ar: z.string().min(2, 'الاسم الأول مطلوب'),
  last_name_ar: z.string().min(2, 'اسم الأب مطلوب'),
  first_name_en: z.string().min(2, 'First name required').regex(/^[a-zA-Z\s]+$/, 'English only'),
  last_name_en: z.string().min(2, 'Last name required').regex(/^[a-zA-Z\s]+$/, 'English only'),
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  sex: z.enum(["M", "F"], { message: 'الجنس مطلوب' }),

  nationality: z.string().min(1, 'الجنسية مطلوبة').default("Egyptian"),
  marital_status: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),

  mobile_primary: z.string().min(11, 'رقم الموبايل غير صحيح'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),

  governorate: z.string().optional().or(z.literal('')),
  district: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),

  emergency_name: z.string().min(2, 'اسم جهة الطوارئ مطلوب'),
  emergency_relation: z.string().optional().or(z.literal('')),
  emergency_phone: z.string().min(11, 'رقم الطوارئ غير صحيح'),

  referral_source: z.string().optional().or(z.literal('')).default("physician"),
  referring_provider: z.string().optional().or(z.literal('')),

  // تاريخ أول زيارة بقى إلزامي لأن سنة رقم الملف (MRN) مبنية عليه
  first_visit_date: z.string().min(1, 'تاريخ أول زيارة مطلوب — أساس رقم الملف'),

  // الرقم التسلسلي اللي بيدخله الموظف يدويًا بعد السنة (مثال: 0001)
  mrn_sequence: z.string()
    .min(1, 'رقم الملف مطلوب')
    .regex(/^\d{1,6}$/, 'أرقام فقط (حتى 6 أرقام)'),

  nid: z.string().length(14, 'الرقم القومي 14 رقم').optional().or(z.literal('')),
  insurance_id: z.string().optional().or(z.literal('')),
  passport: z.string().optional().or(z.literal('')), // مهم
})

export type Step1Data = z.infer<typeof schema>

// بناء رقم الملف: {سنة أول زيارة}-{الرقم التسلسلي مبطّن بأصفار لـ 4 خانات}
function buildMrn(firstVisitDate: string, sequence: string): string {
  const year = new Date(firstVisitDate).getFullYear()
  const padded = sequence.padStart(4, '0')
  return `${year}-${padded}`
}

export function useRegistration() {
  const [step, setStep] = useState(1)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // STEP 1 — Receptionist creates patient
  async function saveStep1(data: Step1Data) {
    setSaving(true); setError(null)
    try {
      const mrn = buildMrn(data.first_visit_date, data.mrn_sequence)

      // فحص مبكر ودّي: هل رقم الملف ده مستخدم بالفعل؟
      const { data: existing } = await supabase
        .from('patients')
        .select('id')
        .eq('mrn', mrn)
        .maybeSingle()

      if (existing) {
        throw new Error(`رقم الملف ${mrn} مستخدم بالفعل — من فضلك اختر رقمًا مختلفًا`)
      }

      // Insert patient (MRN يدوي الآن — بيتحدد من السنة + الرقم التسلسلي)
      const { data: patient, error: err } = await supabase
        .from('patients')
        .insert({
          mrn,
          first_name_ar: data.first_name_ar,
          last_name_ar: data.last_name_ar,
          first_name_en: data.first_name_en.toLowerCase(),
          last_name_en: data.last_name_en.toLowerCase(),
          date_of_birth: data.date_of_birth,
          sex: data.sex,
          nationality: data.nationality || 'Egyptian',
          marital_status: data.marital_status || null,
          occupation: data.occupation || null,
          mobile_primary: data.mobile_primary,
          email: data.email || null,
          governorate: data.governorate || null,
          district: data.district || null,
          emergency_name: data.emergency_name,
          emergency_relation: data.emergency_relation || null,
          emergency_phone: data.emergency_phone,
          referral_source: data.referral_source || 'physician',
          referring_provider: data.referring_provider || null,
        })
        .select('id,mrn')
        .single()

      if (err) {
        // 23505 = unique_violation في Postgres — تعارض سباق نادر بين موظفين
        if ((err as any).code === '23505') {
          throw new Error(`رقم الملف ${mrn} مستخدم بالفعل — من فضلك اختر رقمًا مختلفًا`)
        }
        throw err
      }

      // Insert identity documents
      const identities = [
        { id_type: 'NID', id_number: data.nid },
        { id_type: 'INSURANCE', id_number: data.insurance_id },
        { id_type: 'PASSPORT', id_number: data.passport },
      ].filter(i => i.id_number?.trim())

      if (identities.length > 0) {
        await supabase.from('patient_identities').insert(
          identities.map(i => ({ ...i, patient_id: patient!.id }))
        )
      }

      // Consents auto-created by DB trigger
      setPatientId(patient!.id)
      setStep(2)
      return patient
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  // STEP 2 — Doctor saves medical data
  async function saveStep2(data: any) {
    if (!patientId) return
    setSaving(true); setError(null)
    try {
      // Diagnosis
      const { data: diag, error: diagErr } = await supabase
        .from('diagnoses')
        .insert({ patient_id: patientId, ...data.diagnosis })
        .select('id').single()
      if (diagErr) throw diagErr

      // Biomarkers
      await supabase.from('biomarkers')
        .insert({ patient_id: patientId, diagnosis_id: diag.id, ...data.biomarkers })

      // Medical history (includes ECOG + BSA — BSA auto-calc by trigger)
      await supabase.from('medical_history')
        .insert({ patient_id: patientId, ...data.history })

      setStep(3)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // STEP 3 — Insurance + payment
  async function saveStep3(data: any) {
    if (!patientId) return
    setSaving(true); setError(null)
    try {
      await supabase.from('insurance_policies')
        .insert({ patient_id: patientId, ...data.insurance })
      await supabase.from('payment_plans')
        .insert({ patient_id: patientId, ...data.payment })
      setStep(4)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // STEP 4 — Sign consent
  async function signConsent(consentType: string) {
    if (!patientId) return
    const { error: err } = await supabase
      .from('consents')
      .update({
        status: 'signed',
        signed_by_patient: true,
        signed_at: new Date().toISOString(),
      })
      .eq('patient_id', patientId)
      .eq('consent_type', consentType)
    if (err) setError(err.message)
  }

  async function completeRegistration() {
    // Verify all required consents signed
    const { data: consents } = await supabase
      .from('consents')
      .select('consent_type,status,is_required')
      .eq('patient_id', patientId!)
    const allSigned = consents
      ?.filter(c => c.is_required)
      .every(c => c.status === 'signed')
    if (!allSigned) {
      setError('يرجى توقيع جميع الموافقات الإلزامية')
      return false
    }
    return true
  }

  return {
    step, setStep, patientId, saving, error,
    saveStep1, saveStep2, saveStep3, signConsent, completeRegistration,
  }
}
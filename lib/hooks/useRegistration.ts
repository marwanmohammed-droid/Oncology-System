// ============================================================
// lib/hooks/useRegistration.ts — Multi-step form state
// ============================================================
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

import { z } from "zod"

export const schema = z.object({
  first_name_ar: z.string().min(2, 'الاسم الأول مطلوب'),
  last_name_ar: z.string().min(2, 'اسم الأب مطلوب'),
  first_name_en: z.string().min(2, 'First name required').regex(/^[a-zA-Z\s]+$/, 'English only'),
  last_name_en: z.string().min(2, 'Last name required').regex(/^[a-zA-Z\s]+$/, 'English only'),
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  sex: z.enum(["M", "F"], { message: 'الجنس مطلوب' }),

  nationality: z.string().optional().or(z.literal('')),
  marital_status: z.string().optional().or(z.literal('')),
  num_children: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),

  mobile_primary: z.string().min(11, 'رقم الموبايل غير صحيح'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),

  governorate: z.string().optional().or(z.literal('')),
  district: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),

  referral_source: z.string().optional().or(z.literal('')),
  referring_person_name: z.string().optional().or(z.literal('')),

  first_visit_date: z.string().min(1, 'تاريخ أول زيارة مطلوب — أساس رقم الملف'),

  mrn_sequence: z.string()
    .min(1, 'رقم الملف مطلوب')
    .regex(/^\d{1,6}$/, 'أرقام فقط (حتى 6 أرقام)'),

  nid: z.string().length(14, 'الرقم القومي 14 رقم').optional().or(z.literal('')),
  insurance_id: z.string().optional().or(z.literal('')),
  passport: z.string().optional().or(z.literal('')),

  weight_kg: z.string().optional().or(z.literal('')),
  height_cm: z.string().optional().or(z.literal('')),
  bsa: z.string().optional().or(z.literal('')),
  bmi: z.string().optional().or(z.literal('')),
  nutri_score: z.string().optional().or(z.literal('')),
})

export type Step1Data = z.infer<typeof schema>

// ⬅️ جديد: شكل بيانات العادات الاجتماعية (Step1Personal بيديرها كـ local state مش react-hook-form)
export type SocialHabitsData = {
  smoking_status: 'never' | 'cigarettes' | 'former' | 'passive' | 'other'
  cigarettes_pack_per_day: string
  cigarettes_duration_years: string
  smoking_stopped: boolean
  other_habit_details: string
  menstrual_status: string
}

function buildMrn(firstVisitDate: string, sequence: string): string {
  const year = new Date(firstVisitDate).getFullYear()
  const padded = sequence.padStart(4, '0')
  return `${year}-${padded}`
}

export function useRegistration() {
  const [step, setStep] = useState(1)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientSex, setPatientSex] = useState<'M' | 'F' | null>(null)
  const [patientNotPresent, setPatientNotPresent] = useState(false) // ⬅️ جديد
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // ⬅️ جديد: بيانات المريض اللي بترجع من Supabase عشان نملأ بيها Step1 لما نرجعله
  const [step1InitialData, setStep1InitialData] = useState<Partial<Step1Data> | null>(null)
  const [socialHabitsInitialData, setSocialHabitsInitialData] = useState<SocialHabitsData | null>(null)
  const [loadingPatientData, setLoadingPatientData] = useState(false)

  // كل مرة تتغير فيها الخطوة (تقدم أو رجوع)، نطلع لفوق الصفحة
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step])

  // ⬅️ جديد: يجيب بيانات المريض المحفوظة فعليًا من Supabase (patients + patient_identities + medical_history)
  async function loadPatientForEdit(id: string) {
    setLoadingPatientData(true)
    setError(null)
    try {
      const { data: patient, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single()
      if (pErr) throw pErr

      const { data: identities } = await supabase
        .from('patient_identities')
        .select('id_type,id_number')
        .eq('patient_id', id)

      const { data: hist } = await supabase
        .from('medical_history')
        .select('*')
        .eq('patient_id', id)
        .maybeSingle()

      const nid = identities?.find(i => i.id_type === 'NID')?.id_number || ''
      const insurance_id = identities?.find(i => i.id_type === 'INSURANCE')?.id_number || ''
      const passport = identities?.find(i => i.id_type === 'PASSPORT')?.id_number || ''

      // الرقم التسلسلي بيتفصل من MRN بصيغة "YYYY-0001"
      const mrnParts = (patient?.mrn || '').split('-')
      const mrnSeq = mrnParts.length > 1 ? mrnParts[1] : ''

      setStep1InitialData({
        first_name_ar: patient?.first_name_ar || '',
        last_name_ar: patient?.last_name_ar || '',
        first_name_en: patient?.first_name_en || '',
        last_name_en: patient?.last_name_en || '',
        date_of_birth: patient?.date_of_birth || '',
        sex: patient?.sex || undefined,
        nationality: patient?.nationality || '',
        marital_status: patient?.marital_status || '',
        num_children: patient?.num_children != null ? String(patient.num_children) : '',
        occupation: patient?.occupation || '',
        mobile_primary: patient?.mobile_primary || '',
        email: patient?.email || '',
        governorate: patient?.governorate || '',
        district: patient?.district || '',
        postal_code: patient?.postal_code || '',
        referral_source: patient?.referral_source || 'physician',
        referring_person_name: patient?.referring_provider || '',
        first_visit_date: patient?.first_visit_date || '',
        mrn_sequence: mrnSeq,
        nid,
        insurance_id,
        passport,
        weight_kg: hist?.weight_kg != null ? String(hist.weight_kg) : '',
        height_cm: hist?.height_cm != null ? String(hist.height_cm) : '',
        bsa: hist?.bsa != null ? String(hist.bsa) : '',
        bmi: hist?.bmi != null ? String(hist.bmi) : '',
        nutri_score: hist?.nutri_score != null ? String(hist.nutri_score) : '',
      })

      setSocialHabitsInitialData({
        smoking_status: (hist?.smoking_status as SocialHabitsData['smoking_status']) || 'never',
        cigarettes_pack_per_day: hist?.cigarettes_pack_per_day != null ? String(hist.cigarettes_pack_per_day) : '',
        cigarettes_duration_years: hist?.cigarettes_duration_years != null ? String(hist.cigarettes_duration_years) : '',
        smoking_stopped: !!hist?.smoking_stopped,
        other_habit_details: hist?.other_habit_details || '',
        menstrual_status: hist?.menstrual_status || '',
      })

      if (patient?.sex) setPatientSex(patient.sex)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingPatientData(false)
    }
  }

  // ⬅️ جديد: الرجوع لـ Step1 مع جلب بيانات المريض الحالية أول ما نرجع
  async function goBackToStep1() {
    if (patientId) {
      await loadPatientForEdit(patientId)
    }
    setStep(1)
  }

  // STEP 1 — Receptionist creates patient
  async function saveStep1(data: Step1Data) {
    setSaving(true); setError(null)
    try {
      const mrn = buildMrn(data.first_visit_date, data.mrn_sequence)

      // لو إحنا رجعنا من Step2 وعدّلنا بيانات نفس المريض، منعملش تحقق "الرقم مستخدم" ضد نفسه
      const { data: existing } = await supabase
        .from('patients')
        .select('id')
        .eq('mrn', mrn)
        .maybeSingle()

      if (existing && existing.id !== patientId) {
        throw new Error(`رقم الملف ${mrn} مستخدم بالفعل — من فضلك اختر رقمًا مختلفًا`)
      }

      const patientPayload = {
        mrn,
        first_name_ar: data.first_name_ar,
        last_name_ar: data.last_name_ar,
        first_name_en: data.first_name_en.toLowerCase(),
        last_name_en: data.last_name_en.toLowerCase(),
        date_of_birth: data.date_of_birth,
        sex: data.sex,
        nationality: data.nationality || null,
        marital_status: data.marital_status || null,
        num_children: data.num_children ? parseInt(data.num_children) : null,
        occupation: data.occupation || null,
        mobile_primary: data.mobile_primary,
        email: data.email || null,
        governorate: data.governorate || null,
        district: data.district || null,
        postal_code: data.postal_code || null, // ⬅️ جديد: كان بيتاخد من اليوزر ومكنش بيتحفظ
        referral_source: data.referral_source || null,
        referring_provider: data.referring_person_name || null,
        first_visit_date: data.first_visit_date || null, // ⬅️ جديد: نفس الملاحظة
      }

      let patient: { id: string; mrn: string; sex: 'M' | 'F' } | null = null

      if (patientId) {
        // ⬅️ رجعنا من Step2 وعدّلنا بيانات نفس المريض → update بدل insert
        const { data: updated, error: updErr } = await supabase
          .from('patients')
          .update(patientPayload)
          .eq('id', patientId)
          .select('id,mrn,sex')
          .single()
        if (updErr) throw updErr
        patient = updated
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('patients')
          .insert(patientPayload)
          .select('id,mrn,sex')
          .single()
        if (insErr) {
          if ((insErr as any).code === '23505') {
            throw new Error(`رقم الملف ${mrn} مستخدم بالفعل — من فضلك اختر رقمًا مختلفًا`)
          }
          throw insErr
        }
        patient = inserted
      }

      const identities = [
        { id_type: 'NID', id_number: data.nid },
        { id_type: 'INSURANCE', id_number: data.insurance_id },
        { id_type: 'PASSPORT', id_number: data.passport },
      ].filter(i => i.id_number?.trim())

      if (identities.length > 0) {
        // نمسح القديم ونعيد الإدخال عشان نتجنب تكرار الصفوف لو عدّلنا بعد الرجوع
        await supabase.from('patient_identities').delete().eq('patient_id', patient!.id)
        await supabase.from('patient_identities').insert(
          identities.map(i => ({ ...i, patient_id: patient!.id }))
        )
      }

      if (data.weight_kg || data.height_cm || data.bsa || data.bmi || data.nutri_score) {
        await supabase.from('medical_history').upsert({
          patient_id: patient!.id,
          weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
          height_cm: data.height_cm ? parseFloat(data.height_cm) : null,
          bsa: data.bsa ? parseFloat(data.bsa) : null,
          bmi: data.bmi ? parseFloat(data.bmi) : null,
          nutri_score: data.nutri_score ? parseFloat(data.nutri_score) : null,
        }, { onConflict: 'patient_id' })
      }

      setPatientId(patient!.id)
      setPatientSex(patient!.sex)
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
      const diag = data.diagnosis
      const isDouble = diag.double_primary === 'yes'
      const isMeta = diag.metastasis_flag === 'yes'

      const { data: diagRow, error: diagErr } = await supabase
        .from('diagnoses')
        .insert({
          patient_id: patientId,
          confirmed_cancer_patient: diag.confirmed_cancer_patient === true || diag.confirmed_cancer_patient === 'yes',
          chief_complaint: diag.chief_complaint || null,
          double_primary: isDouble,
          primary_site: diag.primary_site || null,
          histology: diag.histology || null,
          primary_site_2: isDouble ? (diag.primary_site_2 || null) : null,
          histology_2: isDouble ? (diag.histology_2 || null) : null,
          stage: diag.stage || null,
          grade: diag.grade || null,
          laterality: diag.laterality || null,
          tnm_t: diag.tnm_t || null,
          tnm_n: diag.tnm_n || null,
          tnm_m: diag.tnm_m || null,
          is_metastatic: isMeta,
          metastatic_sites: isMeta ? (diag.metastatic_sites || null) : null,
          treatment_intent: diag.treatment_intent || null,
          date_of_diagnosis: diag.date_of_diagnosis || null,
          sample_type: diag.sample_type || null,
          liquid_type: diag.sample_type === 'liquid' ? (diag.liquid_type || null) : null,
          final_pathology_report: diag.final_pathology_report || null,
        })
        .select('id').single()
      if (diagErr) throw diagErr

      // اختبارات الباثولوجي (IHC + Molecular)
      const allTests = [
        ...((data.ihcTests || []).map((t: any) => ({ ...t, category: 'ihc' }))),
        ...((data.molecularTests || []).map((t: any) => ({ ...t, category: 'molecular' }))),
      ].filter((t: any) => t.test_name)

      if (allTests.length > 0) {
        await supabase.from('pathology_tests').insert(
          allTests.map((t: any) => ({
            patient_id: patientId,
            diagnosis_id: diagRow.id,
            category: t.category,
            test_name: t.test_name,
            modality: t.modality || null,
            result_numeric: t.result_numeric ? parseFloat(t.result_numeric) : null,
            result_text: t.result_text || null,
            test_date: t.test_date || null,
          }))
        )
      }

      // بروتوكولات العلاج السابقة (لو مريض مؤكد الإصابة)
      const priorProtocols = data.priorProtocols || []
      if (priorProtocols.length > 0) {
        await supabase.from('prior_treatment_protocols').insert(
          priorProtocols
            .filter((p: any) => p.protocol_name)
            .map((p: any) => ({
              patient_id: patientId,
              diagnosis_id: diagRow.id,
              protocol_name: p.protocol_name,
              num_cycles: p.num_cycles ? parseInt(p.num_cycles) : null,
              duration_months: p.duration_months ? parseFloat(p.duration_months) : null,
              notes: p.notes || null,
            }))
        )
      }

      // التاريخ المرضي — upsert لأن Step1 غالبًا عمل أول صف
      const hist = data.history
      await supabase.from('medical_history')
        .upsert({
          patient_id: patientId,
          comorbidities: hist.comorbidities || [],
          past_history: hist.past_history || null,
          family_history_conditions: hist.family_history_conditions || [],
          family_history_other: hist.family_history_other || null,
          oncology_fh: (hist.oncology_fh_details || []).length > 0,
          oncology_fh_details: hist.oncology_fh_details || [],
          ongoing_medications: hist.ongoing_medications || [],
          ongoing_medications_other: hist.ongoing_medications_other || null,
          previous_surgeries: hist.previous_surgeries || null,
          previous_chemo: hist.previous_chemo || null,
          previous_radiation: hist.previous_radiation || null,
          drug_allergies: hist.drug_allergies || null,
          ecog_ps: hist.ecog_ps || null,
          ocp_use: hist.ocp_use || null, // ⬅️ جديد: OCP (إناث فقط)
          smoking_status: hist.smoking_status || null,
          cigarettes_pack_per_day: (hist.smoking_status === 'cigarettes' || hist.smoking_status === 'former') && hist.cigarettes_pack_per_day
            ? parseFloat(hist.cigarettes_pack_per_day) : null,
          cigarettes_duration_years: (hist.smoking_status === 'cigarettes' || hist.smoking_status === 'former') && hist.cigarettes_duration_years
            ? parseFloat(hist.cigarettes_duration_years) : null,
          smoking_stopped: (hist.smoking_status === 'cigarettes' || hist.smoking_status === 'former')
            ? !!hist.smoking_stopped : null, // ⬅️ جديد: كان بيضيع قبل كده
          other_habit_details: hist.smoking_status === 'other' ? (hist.other_habit_details || null) : null,
          menstrual_status: hist.menstrual_status || null,
        }, { onConflict: 'patient_id' })

      // حفظ أول قراءة للعلامات الحيوية (لو المستخدم دخل أي قيمة منها)
      const vitals = hist.vitals
      if (vitals && Object.values(vitals).some((v: any) => v)) {
        await supabase.from('vital_signs').insert({
          patient_id: patientId,
          temperature_c: vitals.temperature_c ? parseFloat(vitals.temperature_c) : null,
          bp_systolic: vitals.bp_systolic ? parseInt(vitals.bp_systolic) : null,
          bp_diastolic: vitals.bp_diastolic ? parseInt(vitals.bp_diastolic) : null,
          pulse_bpm: vitals.pulse_bpm ? parseInt(vitals.pulse_bpm) : null,
          respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : null,
          spo2_pct: vitals.spo2_pct ? parseInt(vitals.spo2_pct) : null,
          pain_score: vitals.pain_score ? parseInt(vitals.pain_score) : null,
          pallor: vitals.pallor === '' || !vitals.pallor ? null : vitals.pallor === 'yes',
          jaundice: vitals.jaundice === '' || !vitals.jaundice ? null : vitals.jaundice === 'yes',
          hbv_status: vitals.hbv_status || null,
          hcv_status: vitals.hcv_status || null,
          hiv_status: vitals.hiv_status || null,
        })
      }

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
    step, setStep, patientId, patientSex, saving, error,
    patientNotPresent, setPatientNotPresent,
    step1InitialData, socialHabitsInitialData, loadingPatientData, // ⬅️ جديد
    goBackToStep1, // ⬅️ جديد
    saveStep1, saveStep2, saveStep3, signConsent, completeRegistration,
  }
}
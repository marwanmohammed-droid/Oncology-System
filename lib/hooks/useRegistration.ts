// ============================================================
// lib/hooks/useRegistration.ts — Multi-step form state (Phase A fixes)
//
// التعديلات عن النسخة القديمة:
//  1. saveStep1 بقت بتحفظ العادات الاجتماعية (التدخين/الطمث) — كانت بتضيع.
//  2. saveStep2 ما بقتش تعمل upsert بقيم null على أعمدة Step1
//     (smoking_status / menstrual_status...) — كانت بتمسحها.
//  3. saveStep2 بتحفظ icd10_code / icd10_code_2.
//  4. كل عملية كتابة بتتأكد من الـ error (قبل كده pathology/protocols/
//     medical_history/vitals كانت بتفشل بصمت).
//  5. saveStep2 بترجّع true/false (الصفحة كانت بتعمل redirect حتى لو فشل الحفظ).
//  6. إعادة المحاولة آمنة: لو الضغط على Save اتكرر، بيحدّث نفس التشخيص بدل
//     ما يعمل تشخيص مكرر.
//  7. الحد الأدنى من البيانات (validateMinimumDataset) بيتفرض على السيرفر كمان.
//  8. التاريخ العائلي بيتحفظ في oncology_fh_details + أول عنصر في
//     oncology_fh_person/type (توافق مع الشاشات القديمة).
// ============================================================
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { z } from 'zod'
import { validateMinimumDataset } from '@/lib/validation/minimumDataset'

function friendlyError(message: string): string {
  return message || 'حدث خطأ غير متوقع'
}

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

// '' = غير محدد (مختلفة عن 'never' = مش مدخّن). الافتراضي لازم يكون غير محدد.
export type SocialHabitsData = {
  smoking_status: '' | 'never' | 'cigarettes' | 'former' | 'passive' | 'other'
  cigarettes_pack_per_day: string
  cigarettes_duration_years: string
  smoking_stopped: boolean
  other_habit_details: string
  menstrual_status: string
}

/** اللي Step1Personal بيبعته فعليًا (Step1Data + social_habits) */
export type Step1Submit = Step1Data & { social_habits?: Partial<SocialHabitsData> }

function buildMrn(firstVisitDate: string, sequence: string): string {
  const year = firstVisitDate.slice(0, 4) // 'YYYY-MM-DD' — من غير new Date() عشان مفيش تحويل timezone
  if (!/^\d{4}$/.test(year)) throw new Error('تاريخ أول زيارة غير صالح')
  return `${year}-${sequence.padStart(4, '0')}`
}

function num(v: string | number | null | undefined): number | null {
  if (v === undefined || v === null || String(v).trim() === '') return null
  const n = parseFloat(String(v))
  return Number.isNaN(n) ? null : n
}

function int(v: string | number | null | undefined): number | null {
  const n = num(v)
  return n === null ? null : Math.trunc(n)
}

export function useRegistration() {
  const [step, setStep] = useState(1)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientSex, setPatientSex] = useState<'M' | 'F' | null>(null)
  const [patientDob, setPatientDob] = useState<string | null>(null)
  const [patientNotPresent, setPatientNotPresent] = useState(false)
  const [savedDiagnosisId, setSavedDiagnosisId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [step1InitialData, setStep1InitialData] = useState<Partial<Step1Data> | null>(null)
  const [socialHabitsInitialData, setSocialHabitsInitialData] = useState<SocialHabitsData | null>(null)
  const [loadingPatientData, setLoadingPatientData] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step])

  // يجيب بيانات المريض المحفوظة فعليًا (patients + patient_identities + medical_history)
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
        smoking_status: (hist?.smoking_status as SocialHabitsData['smoking_status']) || '',
        cigarettes_pack_per_day: hist?.cigarettes_pack_per_day != null ? String(hist.cigarettes_pack_per_day) : '',
        cigarettes_duration_years: hist?.cigarettes_duration_years != null ? String(hist.cigarettes_duration_years) : '',
        smoking_stopped: !!hist?.smoking_stopped,
        other_habit_details: hist?.other_habit_details || '',
        menstrual_status: hist?.menstrual_status || '',
      })

      if (patient?.sex) setPatientSex(patient.sex)
      if (patient?.date_of_birth) setPatientDob(patient.date_of_birth)
    } catch (e: any) {
      console.error('[registration] loadPatientForEdit', e)
      setError(friendlyError(e.message))
    } finally {
      setLoadingPatientData(false)
    }
  }

  async function goBackToStep1() {
    if (patientId) {
      await loadPatientForEdit(patientId)
    }
    setStep(1)
  }

  // ── STEP 1 — Receptionist creates patient ─────────────────
  async function saveStep1(data: Step1Submit) {
    setSaving(true); setError(null)
    try {
      const mrn = buildMrn(data.first_visit_date, data.mrn_sequence)

      const { data: existing, error: exErr } = await supabase
        .from('patients')
        .select('id')
        .eq('mrn', mrn)
        .maybeSingle()
      if (exErr) throw exErr

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
        num_children: int(data.num_children),
        occupation: data.occupation || null,
        mobile_primary: data.mobile_primary,
        email: data.email || null,
        governorate: data.governorate || null,
        district: data.district || null,
        postal_code: data.postal_code || null,
        referral_source: data.referral_source || null,
        referring_provider: data.referring_person_name || null,
        first_visit_date: data.first_visit_date || null,
      }

      let patient: { id: string; mrn: string; sex: 'M' | 'F' } | null = null

      if (patientId) {
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

      // الهويات: نمسح ونعيد الإدخال (حتى لو المستخدم مسح كل الأرقام بعد الرجوع)
      const identities = [
        { id_type: 'NID', id_number: data.nid },
        { id_type: 'INSURANCE', id_number: data.insurance_id },
        { id_type: 'PASSPORT', id_number: data.passport },
      ].filter(i => i.id_number?.trim())

      const { error: delErr } = await supabase.from('patient_identities').delete().eq('patient_id', patient!.id)
      if (delErr) throw delErr
      if (identities.length > 0) {
        const { error: idErr } = await supabase.from('patient_identities').insert(
          identities.map(i => ({ ...i, patient_id: patient!.id }))
        )
        if (idErr) throw idErr
      }

      // medical_history: القياسات الجسدية + العادات الاجتماعية (ملك Step1)
      const sh = data.social_habits
      const histPayload: Record<string, any> = { patient_id: patient!.id }

      if (!patientNotPresent) {
        histPayload.weight_kg = num(data.weight_kg)
        histPayload.height_cm = num(data.height_cm)
        histPayload.bsa = num(data.bsa)
        histPayload.bmi = num(data.bmi)
        histPayload.nutri_score = num(data.nutri_score)
      }

      if (sh) {
        const smokes = sh.smoking_status === 'cigarettes' || sh.smoking_status === 'former'
        histPayload.smoking_status = sh.smoking_status || null // '' = غير محدد → null
        histPayload.cigarettes_pack_per_day = smokes ? num(sh.cigarettes_pack_per_day) : null
        histPayload.cigarettes_duration_years = smokes ? num(sh.cigarettes_duration_years) : null
        histPayload.smoking_stopped = smokes ? !!sh.smoking_stopped : null
        histPayload.other_habit_details = sh.smoking_status === 'other' ? (sh.other_habit_details || null) : null
        histPayload.menstrual_status = data.sex === 'F' ? (sh.menstrual_status || null) : null
      }

      const { error: histErr } = await supabase
        .from('medical_history')
        .upsert(histPayload, { onConflict: 'patient_id' })
      if (histErr) throw histErr

      setPatientId(patient!.id)
      setPatientSex(patient!.sex)
      setPatientDob(data.date_of_birth)
      setStep(2)
      return patient
    } catch (e: any) {
      console.error('[registration] saveStep1', e)
      setError(friendlyError(e.message))
      return null
    } finally {
      setSaving(false)
    }
  }

  // ── STEP 2 — Doctor saves medical data ────────────────────
  // بترجّع true لو كل شيء اتحفظ. الصفحة لازم تعمل redirect بس لو true.
  async function saveStep2(data: any): Promise<boolean> {
    if (!patientId) {
      setError('لا يوجد مريض مسجل — ارجع للخطوة الأولى')
      return false
    }
    setSaving(true); setError(null)
    try {
      // 1) الحد الأدنى من البيانات (مفروض كمان على السيرفر، مش بس في الفورم)
      const problems = validateMinimumDataset(
        { diagnosis: data.diagnosis, history: data.history },
        { patientNotPresent, dateOfBirth: patientDob },
      )
      if (problems.length > 0) throw new Error(problems.join(' • '))

      const diag = data.diagnosis
      const hist = data.history
      const isDouble = diag.double_primary === 'yes'
      const isMeta = diag.metastasis_flag === 'yes'

      // 2) التشخيص (insert أول مرة، update لو المحاولة اتكررت)
      const diagPayload = {
        patient_id: patientId,
        confirmed_cancer_patient: diag.confirmed_cancer_patient === true || diag.confirmed_cancer_patient === 'yes',
        chief_complaint: diag.chief_complaint || null,
        double_primary: isDouble,
        primary_site: diag.primary_site || null,
        icd10_code: diag.icd10_code || null,
        histology: diag.histology || null,
        primary_site_2: isDouble ? (diag.primary_site_2 || null) : null,
        icd10_code_2: isDouble ? (diag.icd10_code_2 || null) : null,
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
      }

      let diagnosisId = savedDiagnosisId
      if (diagnosisId) {
        const { error: updErr } = await supabase.from('diagnoses').update(diagPayload).eq('id', diagnosisId)
        if (updErr) throw updErr
      } else {
        const { data: diagRow, error: diagErr } = await supabase
          .from('diagnoses')
          .insert(diagPayload)
          .select('id')
          .single()
        if (diagErr) throw diagErr
        diagnosisId = diagRow.id as string
        setSavedDiagnosisId(diagnosisId)
      }

      // 3) اختبارات الباثولوجي (IHC + Molecular) — نمسح بتاعة نفس التشخيص ونعيد (للـ retry)
      const { error: ptDelErr } = await supabase.from('pathology_tests').delete().eq('diagnosis_id', diagnosisId)
      if (ptDelErr) throw ptDelErr

      const allTests = [
        ...((data.ihcTests || []).map((t: any) => ({ ...t, category: 'ihc' }))),
        ...((data.molecularTests || []).map((t: any) => ({ ...t, category: 'molecular' }))),
      ].filter((t: any) => t.test_name)

      if (allTests.length > 0) {
        const { error: ptErr } = await supabase.from('pathology_tests').insert(
          allTests.map((t: any) => ({
            patient_id: patientId,
            diagnosis_id: diagnosisId,
            category: t.category,
            test_name: t.test_name,
            modality: t.modality || null,
            result_numeric: num(t.result_numeric),
            result_text: t.result_text || null,
            test_date: t.test_date || null,
          }))
        )
        if (ptErr) throw ptErr
      }

      // 4) بروتوكولات العلاج السابقة
      const { error: ppDelErr } = await supabase.from('prior_treatment_protocols').delete().eq('diagnosis_id', diagnosisId)
      if (ppDelErr) throw ppDelErr

      const priorProtocols = (data.priorProtocols || []).filter((p: any) => p.protocol_name)
      if (priorProtocols.length > 0) {
        const { error: ppErr } = await supabase.from('prior_treatment_protocols').insert(
          priorProtocols.map((p: any) => ({
            patient_id: patientId,
            diagnosis_id: diagnosisId,
            protocol_name: p.protocol_name,
            num_cycles: int(p.num_cycles),
            duration_months: num(p.duration_months),
            notes: p.notes || null,
          }))
        )
        if (ppErr) throw ppErr
      }

      // 5) التاريخ المرضي — الأعمدة بتاعة Step2 بس.
      //    (التدخين/الطمث/القياسات ملك Step1 ومش بنلمسها هنا)
      const fhDetails: { person: string; type: string }[] = hist.oncology_fh_details || []
      const { error: histErr } = await supabase.from('medical_history').upsert({
        patient_id: patientId,
        comorbidities: hist.comorbidities || [],
        past_history: hist.past_history || null,
        family_history_conditions: hist.family_history_conditions || [],
        family_history_other: hist.family_history_other || null,
        oncology_fh: fhDetails.length > 0,
        oncology_fh_details: fhDetails,
        oncology_fh_person: fhDetails[0]?.person || null, // توافق مع الشاشات القديمة
        oncology_fh_type: fhDetails[0]?.type || null,
        ongoing_medications: hist.ongoing_medications || [],
        ongoing_medications_other: hist.ongoing_medications_other || null,
        previous_surgeries: hist.previous_surgeries || null,
        previous_chemo: hist.previous_chemo || null,
        previous_radiation: hist.previous_radiation || null,
        drug_allergies: hist.drug_allergies || null,
        ecog_ps: patientNotPresent ? null : (hist.ecog_ps || null),
        ocp_use: hist.ocp_use || null,
      }, { onConflict: 'patient_id' })
      if (histErr) throw histErr

      // 6) أول قراءة علامات حيوية (لو اتدخل أي قيمة)
      const vitals = hist.vitals
      if (!patientNotPresent && vitals && Object.values(vitals).some((v: any) => v)) {
        const { error: vErr } = await supabase.from('vital_signs').insert({
          patient_id: patientId,
          temperature_c: num(vitals.temperature_c),
          bp_systolic: int(vitals.bp_systolic),
          bp_diastolic: int(vitals.bp_diastolic),
          pulse_bpm: int(vitals.pulse_bpm),
          respiratory_rate: int(vitals.respiratory_rate),
          spo2_pct: int(vitals.spo2_pct),
          pain_score: int(vitals.pain_score),
          pallor: !vitals.pallor ? null : vitals.pallor === 'yes',
          jaundice: !vitals.jaundice ? null : vitals.jaundice === 'yes',
          hbv_status: vitals.hbv_status || null,
          hcv_status: vitals.hcv_status || null,
          hiv_status: vitals.hiv_status || null,
        })
        if (vErr) throw vErr
      }

      return true
    } catch (e: any) {
      console.error('[registration] saveStep2', e)
      setError(friendlyError(e.message))
      return false
    } finally {
      setSaving(false)
    }
  }

  // ── STEP 3 — Insurance + payment (مش مربوطة بصفحة التسجيل الحالية) ──
  async function saveStep3(data: any) {
    if (!patientId) return
    setSaving(true); setError(null)
    try {
      const r1 = await supabase.from('insurance_policies')
        .insert({ patient_id: patientId, ...data.insurance })
      if (r1.error) throw r1.error
      const r2 = await supabase.from('payment_plans')
        .insert({ patient_id: patientId, ...data.payment })
      if (r2.error) throw r2.error
      setStep(4)
    } catch (e: any) {
      console.error('[registration] saveStep3', e)
      setError(friendlyError(e.message))
    } finally {
      setSaving(false)
    }
  }

  // ── STEP 4 — Sign consent ─────────────────────────────────
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
    if (err) setError(friendlyError(err.message))
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
    step1InitialData, socialHabitsInitialData, loadingPatientData,
    goBackToStep1,
    saveStep1, saveStep2, saveStep3, signConsent, completeRegistration,
  }
}


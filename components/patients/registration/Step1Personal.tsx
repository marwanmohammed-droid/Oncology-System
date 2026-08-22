'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { schema, type Step1Data } from '@/lib/hooks/useRegistration'
import { GOVERNORATES, COUNTRIES } from '@/lib/constants/medicalLists'


type Props = {
  onSave: (data: Step1Data) => Promise<void>
  saving: boolean
  error: string | null
}

export function Step1Personal({ onSave, saving, error }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name_ar: '',
      last_name_ar: '',
      first_name_en: '',
      last_name_en: '',
      date_of_birth: '',
      nationality: 'Egyptian',
      mobile_primary: '',
      referral_source: 'physician',
      first_visit_date: '',
      mrn_sequence: '',
    },
  })

  const firstVisitDate = watch('first_visit_date')
  const mrnSequence = watch('mrn_sequence')
  const mrnYear = firstVisitDate ? new Date(firstVisitDate).getFullYear() : new Date().getFullYear()
  const mrnPreview = `${mrnYear}-${(mrnSequence || '').padStart(4, '0')}`

  const maritalStatus = watch('marital_status')
  const referralSource = watch('referral_source')
  const weight = watch('weight_kg')
  const height = watch('height_cm')
  const sex = watch('sex')

  // ── Social Habits (moved here from Step2Medical) ──
  const [smokingStatus, setSmokingStatus] = useState<'never' | 'cigarettes' | 'former' | 'other'>('never')
  const [cigarettesPackPerDay, setCigarettesPackPerDay] = useState('')
  const [cigarettesDurationYears, setCigarettesDurationYears] = useState('')
  const [smokingStopped, setSmokingStopped] = useState(false)
  const [otherHabitDetails, setOtherHabitDetails] = useState('')
  const [menstrualStatus, setMenstrualStatus] = useState('')

  const referralNameLabel =
    referralSource === 'physician' ? 'اسم الطبيب المحوّل' :
      referralSource === 'social_worker' ? 'اسم الأخصائي الاجتماعي' :
        referralSource === 'other_patient' ? 'اسم المريض' : 'الاسم'

  function handleAnthro(w: string, h: string) {
    const wNum = parseFloat(w)
    const hNum = parseFloat(h)
    if (wNum && hNum) {
      const bsaVal = Math.sqrt((wNum * hNum) / 3600)
      const bmiVal = wNum / Math.pow(hNum / 100, 2)
      setValue('bsa', bsaVal.toFixed(2))
      setValue('bmi', bmiVal.toFixed(1))
    }
  }

  const onSubmit = (data: Step1Data) => onSave({
    ...data,
    social_habits: {
      smoking_status: smokingStatus,
      cigarettes_pack_per_day: (smokingStatus === 'cigarettes' || smokingStatus === 'former') ? cigarettesPackPerDay : '',
      cigarettes_duration_years: (smokingStatus === 'cigarettes' || smokingStatus === 'former') ? cigarettesDurationYears : '',
      smoking_stopped: (smokingStatus === 'cigarettes' || smokingStatus === 'former') ? smokingStopped : false,
      other_habit_details: smokingStatus === 'other' ? otherHabitDetails : '',
      menstrual_status: sex === 'F' ? menstrualStatus : '',
    },
  } as any)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" dir="rtl">

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── FULL NAME ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon teal">👤</span>
          <div><p className="card-title">البيانات الشخصية</p><p className="card-subtitle">Personal Information</p></div>
        </div>
        <div className="card-body">
          <p className="section-label">الاسم الكامل / Full Name</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <div>
                <label className="field-label">
                  <span className="lang-tag ar">AR</span>
                  الاسم الأول <span className="req">*</span>
                </label>
                <input {...register('first_name_ar')} placeholder="مثال: محمد" className="input-ar" />
                {errors.first_name_ar && <p className="field-error">{errors.first_name_ar.message}</p>}
              </div>
              <div>
                <label className="field-label">
                  <span className="lang-tag ar">AR</span>
                  اسم الأب / اللقب <span className="req">*</span>
                </label>
                <input {...register('last_name_ar')} placeholder="مثال: أحمد السيد" className="input-ar" />
                {errors.last_name_ar && <p className="field-error">{errors.last_name_ar.message}</p>}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="field-label">
                  <span className="lang-tag en">EN</span>
                  First name <span className="req">*</span>
                </label>
                <input {...register('first_name_en')} placeholder="Mohamed" className="input-en" />
                {errors.first_name_en && <p className="field-error">{errors.first_name_en.message}</p>}
              </div>
              <div>
                <label className="field-label">
                  <span className="lang-tag en">EN</span>
                  Last name <span className="req">*</span>
                </label>
                <input {...register('last_name_en')} placeholder="Ahmed El-Sayed" className="input-en" />
                {errors.last_name_en && <p className="field-error">{errors.last_name_en.message}</p>}
              </div>
            </div>
          </div>

          <p className="section-label">Demographics</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="field-label">تاريخ الميلاد <span className="req">*</span><span className="el">Date of birth</span></label>
              <input type="date" {...register('date_of_birth')} className="input-en" />
              {errors.date_of_birth && <p className="field-error">{errors.date_of_birth.message}</p>}
            </div>
            <div>
              <label className="field-label">الجنس <span className="req">*</span><span className="el">Sex</span></label>
              <select {...register('sex')} className="input-select">
                <option value="">— اختر —</option>
                <option value="M">ذكر · Male</option>
                <option value="F">أنثى · Female</option>
              </select>
              {errors.sex && <p className="field-error">{errors.sex.message}</p>}
            </div>
            <div>
              <label className="field-label">الجنسية<span className="el">Nationality</span></label>
              <select {...register('nationality')} className="input-select">
                <option value="">— اختر الجنسية —</option>

                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label">الحالة الاجتماعية<span className="el">Marital status</span></label>
              <select {...register('marital_status')} className="input-select">
                <option value="">—</option>
                <option value="single">أعزب · Single</option>
                <option value="married">متزوج · Married</option>
                <option value="divorced">مطلق · Divorced</option>
                <option value="widowed">أرمل · Widowed</option>
              </select>
            </div>
            {maritalStatus === 'married' && (
              <div>
                <label className="field-label">عدد الأطفال<span className="el">No. of children</span></label>
                <input type="number" min="0" {...register('num_children')} placeholder="0" className="input-en" />
              </div>
            )}

            {maritalStatus === 'divorced' && (
              <div>
                <label className="field-label">عدد الأطفال<span className="el">No. of children</span></label>
                <input type="number" min="0" {...register('num_children')} placeholder="0" className="input-en" />
              </div>
            )}

            {maritalStatus === 'widowed' && (
              <div>
                <label className="field-label">عدد الأطفال<span className="el">No. of children</span></label>
                <input type="number" min="0" {...register('num_children')} placeholder="0" className="input-en" />
              </div>
            )}
            <div>
              <label className="field-label">المهنة<span className="el">Occupation</span></label>
              <input {...register('occupation')} placeholder="e.g. Teacher, Engineer" className="input-en" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ANTHROPOMETRICS ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon teal">📏</span>
          <div><p className="card-title">القياسات الجسدية والتغذية</p><p className="card-subtitle">Anthropometrics &amp; Nutrition</p></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="field-label">الوزن (kg)<span className="el">Weight</span></label>
              <input type="number" step="0.1" {...register('weight_kg')}
                onBlur={() => handleAnthro(weight || '', height || '')}
                placeholder="70.0" className="input-en" />
            </div>
            <div>
              <label className="field-label">الطول (cm)<span className="el">Height</span></label>
              <input type="number" step="0.5" {...register('height_cm')}
                onBlur={() => handleAnthro(weight || '', height || '')}
                placeholder="170" className="input-en" />
            </div>
            <div>
              <label className="field-label">BSA (m²) — تلقائي</label>
              <input {...register('bsa')} readOnly className="input-en bg-teal-50 text-teal-700 font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">BMI — تلقائي</label>
              <input {...register('bmi')} readOnly className="input-en bg-teal-50 text-teal-700 font-bold" />
            </div>
            <div>
              <label className="field-label">Nutri Score</label>
              <input type="number" step="0.1" {...register('nutri_score')} placeholder="e.g. 3" className="input-en" />
            </div>
          </div>
        </div>
      </div>

      {/* ── SOCIAL HABITS (moved from Step2Medical) ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon amber">🚬</span>
          <div><p className="card-title">العادات الاجتماعية</p><p className="card-subtitle">Social Habits</p></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">التدخين / العادات<span className="el">Smoking / habits</span></label>
              <select value={smokingStatus} onChange={e => setSmokingStatus(e.target.value as any)} className="input-select">
                <option value="never">لا يوجد · Never</option>
                <option value="cigarettes">سجائر · Cigarettes</option>
                <option value="former">مدخن سابق · Former smoker</option>
                <option value="other">أخرى · Other</option>
              </select>
            </div>
            {sex === 'F' && (
              <div>
                <label className="field-label">الحالة الطمثية<span className="el">Menstrual status</span></label>
                <select value={menstrualStatus} onChange={e => setMenstrualStatus(e.target.value)} className="input-select">
                  <option value="">—</option>
                  <option value="menstrual">طمث منتظم · Menstrual</option>
                  <option value="postmenopausal">بعد سن اليأس · Postmenopausal</option>
                  <option value="1st_amenorrhea">انقطاع أولي · 1st Amenorrhea</option>
                  <option value="2nd_amenorrhea">انقطاع ثانوي · 2nd Amenorrhea</option>
                  <option value="irregular_menses">طمث غير منتظم · Irregular Menses</option>
                </select>
              </div>
            )}
          </div>

          {(smokingStatus === 'cigarettes' || smokingStatus === 'former') && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label">عدد العلب / يوم<span className="el">Packs / day</span></label>
                <input type="number" step="0.1" value={cigarettesPackPerDay} onChange={e => setCigarettesPackPerDay(e.target.value)}
                  placeholder="e.g. 1" className="input-en" />
              </div>
              <div>
                <label className="field-label">المدة (سنوات)<span className="el">Duration (years)</span></label>
                <input type="number" value={cigarettesDurationYears} onChange={e => setCigarettesDurationYears(e.target.value)}
                  placeholder="e.g. 15" className="input-en" />
              </div>
            </div>
          )}

          {(smokingStatus === 'cigarettes' || smokingStatus === 'former') && (
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
              <input type="checkbox" checked={smokingStopped} onChange={e => setSmokingStopped(e.target.checked)} />
              متوقف <span className="el">Stopped</span>
            </label>
          )}

          {smokingStatus === 'other' && (
            <div>
              <label className="field-label">حدد العادة<span className="el">Specify habit</span></label>
              <input value={otherHabitDetails} onChange={e => setOtherHabitDetails(e.target.value)}
                placeholder="e.g. Shisha, Chewing tobacco" className="input-en" />
            </div>
          )}
        </div>
      </div>

      {/* ── FILE NUMBER (MRN) ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon navy">🔢</span>
          <div><p className="card-title">رقم ملف المريض</p><p className="card-subtitle">Patient File Number (MRN)</p></div>
        </div>
        <div className="card-body">
          <p className="hint" style={{ marginBottom: 10 }}>
            السنة تُحسب تلقائيًا من تاريخ أول زيارة، وانت بتحدد الرقم التسلسلي بعدها يدويًا.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">تاريخ أول زيارة <span className="req">*</span><span className="el">First visit date</span></label>
              <input type="date" {...register('first_visit_date')} className="input-en" />
              {errors.first_visit_date && <p className="field-error">{errors.first_visit_date.message}</p>}
            </div>
            <div>
              <label className="field-label">الرقم التسلسلي <span className="req">*</span><span className="el">Sequence number</span></label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-400 whitespace-nowrap">{mrnYear}-</span>
                <input {...register('mrn_sequence')} placeholder="0001" maxLength={6} className="input-id flex-1" />
              </div>
              {errors.mrn_sequence && <p className="field-error">{errors.mrn_sequence.message}</p>}
            </div>
          </div>
          <div className="id-card mt-3">
            <p className="id-label">المعاينة <span className="id-tag">MRN</span></p>
            <p className="font-mono text-lg font-bold text-teal-600 m-0">{mrnPreview}</p>
          </div>
        </div>
      </div>

      {/* ── IDENTITIES ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon navy">🪪</span>
          <div><p className="card-title">وثائق الهوية</p><p className="card-subtitle">Identification Documents (اختياري)</p></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3">
            <div className="id-card">
              <p className="id-label">الرقم القومي <span className="id-tag">NID</span></p>
              <input {...register('nid')} placeholder="30XXXXXXXXXXX" maxLength={14} className="input-id" />
              {errors.nid && <p className="field-error">{errors.nid.message}</p>}
              <p className="hint">14 رقم · 14 digits</p>
            </div>
            <div className="id-card">
              <p className="id-label">رقم التأمين الصحي <span className="id-tag">INS</span></p>
              <input {...register('insurance_id')} placeholder="HI-XXXXXXXXX" className="input-id" />
            </div>
            <div className="id-card">
              <p className="id-label">جواز السفر <span className="id-tag">PASS</span></p>
              <input {...register('passport')} placeholder="A12345678" className="input-id" />
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTACT ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon teal">📬</span>
          <div><p className="card-title">بيانات التواصل والعنوان</p><p className="card-subtitle">Contact &amp; Address</p></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">رقم الموبايل <span className="req">*</span><span className="el">Mobile</span></label>
              <input {...register('mobile_primary')} placeholder="+20 1XX XXX XXXX" className="input-en" />
              {errors.mobile_primary && <p className="field-error">{errors.mobile_primary.message}</p>}
            </div>
            <div>
              <label className="field-label">البريد الإلكتروني<span className="el">Email</span></label>
              <input type="email" {...register('email')} placeholder="patient@email.com" className="input-en" />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="field-label">المحافظة<span className="el">Governorate</span></label>
              <select {...register('governorate')} className="input-select">
                <option value="">— اختر المحافظة —</option>

                {GOVERNORATES.map((governorate) => (
                  <option key={governorate} value={governorate}>
                    {governorate}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">المدينة / الحي<span className="el">District</span></label>
              <input {...register('district')} placeholder="مثال: مدينة نصر" className="input-ar" />
            </div>
            <div>
              <label className="field-label">الرمز البريدي<span className="el">Postal code</span></label>
              <input {...register('postal_code')} placeholder="XXXXX" className="input-en" />
            </div>
          </div>
        </div>
      </div>

      {/* ── REFERRAL ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon amber">🔗</span>
          <div><p className="card-title">مصدر الإحالة</p><p className="card-subtitle">Referral Source (اختياري)</p></div>
        </div>
        <div className="card-body">
          <div className="flex gap-2 flex-wrap mb-3">
            {[
              { v: 'physician', l: 'طبيب · Physician' },
              { v: 'social_worker', l: 'تواصل اجتماعي · Social media' },
              { v: 'other_patient', l: 'مريض آخر · Other patient' },
            ].map(({ v, l }) => (
              <label key={v} className="radio-opt">
                <input type="radio" value={v} {...register('referral_source')} />
                <span className="rdot" />
                {l}
              </label>
            ))}
          </div>
          {referralSource && (
            <div>
              <label className="field-label">{referralNameLabel}</label>
              <input {...register('referring_person_name')} placeholder={referralNameLabel} className="input-en" />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-slate-400 font-mono">* الحقول الأساسية فقط إلزامية</p>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'جارٍ الحفظ...' : 'حفظ والمتابعة للبيانات الطبية'}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
    </form>
  )
}

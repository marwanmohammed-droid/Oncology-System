'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Step1Data } from '@/lib/hooks/useRegistration'

const schema = z.object({
  first_name_ar: z.string().min(2, 'الاسم الأول مطلوب'),
  last_name_ar: z.string().min(2, 'اسم الأب مطلوب'),
  first_name_en: z.string().min(2, 'First name required').regex(/^[a-zA-Z\s]+$/, 'English only'),
  last_name_en: z.string().min(2, 'Last name required').regex(/^[a-zA-Z\s]+$/, 'English only'),
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  sex: z.enum(['M', 'F'] as const, {
    message: 'الجنس مطلوب',
  }),
  // تم إزالة .default() لأن useForm بيعتمد على defaultValues المكتوبة تحت
  nationality: z.string().min(1, 'الجنسية مطلوبة'),
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
  referral_source: z.string().optional().or(z.literal('')),
  referring_provider: z.string().optional().or(z.literal('')),
  first_visit_date: z.string().optional().or(z.literal('')),
  nid: z.string().length(14, 'الرقم القومي 14 رقم').optional().or(z.literal('')),
  insurance_id: z.string().optional().or(z.literal('')),
  passport: z.string().optional().or(z.literal('')),
})

// اشتقاق نوع البيانات بدقة (Zod Local Form Type)
type LocalFormData = z.infer<typeof schema>

type Props = {
  onSave: (data: Step1Data) => Promise<void>
  saving: boolean
  error: string | null
}

export function Step1Personal({ onSave, saving, error }: Props) {
  // الآن سيعمل الـ resolver بسلاسة لأن التيبس متطابقة 100%
  const { register, handleSubmit, watch, formState: { errors } } = useForm<LocalFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name_ar: '',
      last_name_ar: '',
      first_name_en: '',
      last_name_en: '',
      date_of_birth: '',
      sex: undefined,
      nationality: 'Egyptian', // القيمة الافتراضية هنا تغني عن .default() في زوود
      mobile_primary: '',
      emergency_name: '',
      emergency_phone: '',
      referral_source: 'physician',
    } as any
  })

  const nameAr = watch('first_name_ar')
  const nameEn = watch('first_name_en')

  const onSubmit = (data: LocalFormData) => {
    return onSave(data as unknown as Step1Data)
  }

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
            {/* Arabic */}
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
            {/* English */}
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

          {/* Demographics */}
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
                <option value="Egyptian">مصري · Egyptian</option>
                <option value="Saudi">سعودي · Saudi</option>
                <option value="Other">أخرى · Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="field-label">المهنة<span className="el">Occupation</span></label>
              <input {...register('occupation')} placeholder="e.g. Teacher, Engineer" className="input-en" />
            </div>
          </div>
        </div>
      </div>

      {/* ── IDENTITIES ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon navy">🪪</span>
          <div><p className="card-title">وثائق الهوية</p><p className="card-subtitle">Identification Documents</p></div>
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
            <div className="id-card bg-slate-50">
              <p className="id-label">رقم ملف المريض <span className="id-tag">MRN</span></p>
              <input value="PT-2024-####" readOnly className="input-id opacity-50 cursor-not-allowed" />
              <p className="hint">يُنشأ تلقائياً · Auto-assigned</p>
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
                <option value="">—</option>
                <option>القاهرة · Cairo</option>
                <option>الإسكندرية · Alexandria</option>
                <option>الجيزة · Giza</option>
                <option>أخرى · Other</option>
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

          <p className="section-label">Emergency Contact / جهة الاتصال في الطوارئ</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label">الاسم <span className="req">*</span><span className="el">Name</span></label>
              <input {...register('emergency_name')} placeholder="اسم قريب المريض" className="input-ar" />
              {errors.emergency_name && <p className="field-error">{errors.emergency_name.message}</p>}
            </div>
            <div>
              <label className="field-label">صلة القرابة<span className="el">Relationship</span></label>
              <select {...register('emergency_relation')} className="input-select">
                <option value="">—</option>
                <option value="spouse">زوج/زوجة · Spouse</option>
                <option value="child">ابن/ابنة · Child</option>
                <option value="sibling">أخ/أخت · Sibling</option>
                <option value="parent">والد/والدة · Parent</option>
              </select>
            </div>
            <div>
              <label className="field-label">رقم الهاتف <span className="req">*</span><span className="el">Phone</span></label>
              <input {...register('emergency_phone')} placeholder="+20 1XX XXX XXXX" className="input-en" />
              {errors.emergency_phone && <p className="field-error">{errors.emergency_phone.message}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── REFERRAL ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon amber">🔗</span>
          <div><p className="card-title">مصدر الإحالة</p><p className="card-subtitle">Referral Source</p></div>
        </div>
        <div className="card-body">
          <div className="flex gap-2 flex-wrap mb-3">
            {['physician', 'hospital', 'self', 'trial'].map(src => (
              <label key={src} className="radio-opt">
                <input type="radio" value={src} {...register('referral_source')} />
                <span className="rdot" />
                {{ physician: 'طبيب محول · Physician', hospital: 'إحالة مستشفى · Hospital', self: 'ذاتي · Self', trial: 'دراسة سريرية · Trial' }[src as 'physician' | 'hospital' | 'self' | 'trial']}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">اسم الطبيب / الجهة المحيلة<span className="el">Referring provider</span></label>
              <input {...register('referring_provider')} placeholder="Dr. / Hospital name" className="input-en" />
            </div>
            <div>
              <label className="field-label">تاريخ أول زيارة<span className="el">First visit date</span></label>
              <input type="date" {...register('first_visit_date')} className="input-en" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-slate-400 font-mono">* Required fields · الحقول الإلزامية</p>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'جارٍ الحفظ...' : 'حفظ والمتابعة للبيانات الطبية'}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
    </form>
  )
}
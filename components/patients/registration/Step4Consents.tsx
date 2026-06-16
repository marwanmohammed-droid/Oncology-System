'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CONSENTS = [
  {
    type: 'general_treatment',
    required: true,
    titleAr: 'الموافقة العامة على العلاج',
    titleEn: 'General Treatment Consent',
    descAr: 'الموافقة على تلقي الرعاية الطبية والإجراءات التشخيصية والعلاجية في المركز وفق المعايير المهنية المعتمدة.',
    descEn: 'Consent to receive medical care, diagnostic procedures, and treatment at this facility under accepted professional standards.',
  },
  {
    type: 'chemotherapy',
    required: true,
    titleAr: 'الموافقة على العلاج الكيماوي',
    titleEn: 'Chemotherapy Informed Consent',
    descAr: 'إقرار تفصيلي بالاطلاع على طبيعة العلاج الكيماوي وفوائده ومخاطره والآثار الجانبية قصيرة وطويلة الأمد والبدائل العلاجية.',
    descEn: 'Detailed acknowledgment of chemotherapy benefits, risks, short/long-term side effects, and available alternatives.',
  },
  {
    type: 'data_privacy',
    required: true,
    titleAr: 'الموافقة على حفظ واستخدام البيانات الطبية',
    titleEn: 'Data Privacy & HIPAA Consent',
    descAr: 'الموافقة على جمع وتخزين ومعالجة ومشاركة البيانات الطبية والشخصية وفق سياسة الخصوصية وقوانين حماية البيانات.',
    descEn: 'Consent to collection, storage, processing and appropriate sharing of PHI per privacy policy and applicable data protection law.',
  },
  {
    type: 'photography',
    required: false,
    titleAr: 'التصوير والتوثيق للأغراض التعليمية',
    titleEn: 'Photography & Medical Documentation',
    descAr: 'الموافقة الطوعية على التصوير الطبي لأغراض التعليم والتدريب مع ضمان إخفاء الهوية.',
    descEn: 'Voluntary consent to medical photography for teaching/training purposes with full anonymization.',
  },
  {
    type: 'research_trials',
    required: false,
    titleAr: 'المشاركة في الدراسات السريرية البحثية',
    titleEn: 'Clinical Research & Trials Consent',
    descAr: 'موافقة طوعية قابلة للسحب على المشاركة في الدراسات السريرية المعتمدة من لجنة الأخلاقيات. السحب لا يؤثر على العلاج.',
    descEn: 'Voluntary and revocable consent to IRB-approved clinical research. Withdrawal will not affect standard care.',
  },
  {
    type: 'telemedicine',
    required: false,
    titleAr: 'الموافقة على الاستشارة عن بُعد',
    titleEn: 'Telemedicine & Remote Consultation',
    descAr: 'الموافقة على إجراء جلسات متابعة واستشارات طبية عبر الوسائل الرقمية عند الاقتضاء.',
    descEn: 'Consent to follow-up visits and consultations via digital platforms when clinically appropriate.',
  },
]

type ConsentState = {
  signed: boolean
  signedAt: string | null
}

type Props = {
  patientId: string
  onSignConsent: (consentType: string) => Promise<void>
  onComplete: () => Promise<boolean>
  saving: boolean
  error: string | null
}

export function Step4Consents({ patientId, onSignConsent, onComplete, saving, error }: Props) {
  const [consentStates, setConsentStates] = useState<Record<string, ConsentState>>(
    Object.fromEntries(CONSENTS.map(c => [c.type, { signed: false, signedAt: null }]))
  )
  const [witnessName, setWitnessName] = useState('')
  const [witnessRole, setWitnessRole] = useState('')
  const [repName, setRepName] = useState('')
  const [repRelation, setRepRelation] = useState('')
  const [completing, setCompleting] = useState(false)

  const requiredSigned = CONSENTS.filter(c => c.required).every(c => consentStates[c.type]?.signed)
  const requiredCount  = CONSENTS.filter(c => c.required && consentStates[c.type]?.signed).length

  async function handleSign(consentType: string) {
    await onSignConsent(consentType)
    setConsentStates(prev => ({
      ...prev,
      [consentType]: { signed: true, signedAt: new Date().toLocaleString('en-GB') }
    }))
  }

  async function handleComplete() {
    setCompleting(true)
    const ok = await onComplete()
    setCompleting(false)
    if (ok) {
      alert(`✅ Patient file created successfully!\nملف المريض ${patientId} تم إنشاؤه بنجاح`)
    }
  }

  return (
    <div className="space-y-5" dir="rtl">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

      {/* Progress indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-navy-900">الموافقات الإلزامية الموقعة</p>
          <p className="text-xs text-slate-400 font-mono">Required consents signed</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-navy-900">{requiredCount}</span>
          <span className="text-sm text-slate-400 mr-1">/ 3 مطلوب</span>
          {requiredSigned && (
            <div className="text-xs text-green-600 font-bold mt-1">✅ جاهز للإنشاء · Ready to create file</div>
          )}
        </div>
      </div>

      {/* Required consents */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon teal">📄</span>
          <div><p className="card-title">الموافقات الإلزامية</p><p className="card-subtitle">Required Consents</p></div>
        </div>
        <div className="card-body space-y-3">
          {CONSENTS.filter(c => c.required).map(consent => {
            const state = consentStates[consent.type]
            return (
              <div key={consent.type}
                className={`consent-item ${state.signed ? 'consent-signed' : ''}`}>
                <div className="consent-header">
                  <div>
                    <p className="consent-title-ar">{consent.titleAr}</p>
                    <p className="consent-title-en">{consent.titleEn}</p>
                  </div>
                  <span className={`sb-badge ${state.signed ? 'sb-done' : 'sb-req'}`}>
                    {state.signed ? '✓ Signed' : 'Required'}
                  </span>
                </div>
                <p className="consent-desc">{consent.descAr}</p>
                <p className="consent-desc-en">{consent.descEn}</p>
                <div className="consent-footer">
                  {!state.signed ? (
                    <button onClick={() => handleSign(consent.type)}
                      className="sign-btn">
                      توقيع إلكتروني · e-Sign
                    </button>
                  ) : (
                    <button disabled className="sign-btn sign-btn-done">
                      ✓ Signed
                    </button>
                  )}
                  {state.signedAt && (
                    <span className="consent-date font-mono text-xs text-slate-400">
                      {state.signedAt}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Optional consents */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon navy">📝</span>
          <div><p className="card-title">الموافقات الاختيارية</p><p className="card-subtitle">Optional Consents</p></div>
        </div>
        <div className="card-body space-y-3">
          {CONSENTS.filter(c => !c.required).map(consent => {
            const state = consentStates[consent.type]
            return (
              <div key={consent.type}
                className={`consent-item ${state.signed ? 'consent-signed' : 'consent-optional'}`}>
                <div className="consent-header">
                  <div>
                    <p className="consent-title-ar">{consent.titleAr}</p>
                    <p className="consent-title-en">{consent.titleEn}</p>
                  </div>
                  <span className={`sb-badge ${state.signed ? 'sb-done' : 'sb-opt'}`}>
                    {state.signed ? '✓ Signed' : 'Optional'}
                  </span>
                </div>
                <p className="consent-desc">{consent.descAr}</p>
                <div className="consent-footer">
                  {!state.signed ? (
                    <button onClick={() => handleSign(consent.type)} className="sign-btn">
                      توقيع إلكتروني · e-Sign
                    </button>
                  ) : (
                    <button disabled className="sign-btn sign-btn-done">✓ Signed</button>
                  )}
                  {state.signedAt && (
                    <span className="font-mono text-xs text-slate-400">{state.signedAt}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Witness */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon navy">👥</span>
          <div><p className="card-title">توقيع الشاهد والمفوض</p><p className="card-subtitle">Witness &amp; Representative</p></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label">اسم الشاهد<span className="el">Witness name</span></label>
              <input value={witnessName} onChange={e => setWitnessName(e.target.value)}
                placeholder="اسم الممرض / منسق الدراسات" className="input-ar" />
            </div>
            <div>
              <label className="field-label">الصفة الوظيفية<span className="el">Job title</span></label>
              <input value={witnessRole} onChange={e => setWitnessRole(e.target.value)}
                placeholder="e.g. Oncology Nurse" className="input-en" />
            </div>
          </div>
          <p className="section-label">المفوض (إذا كان المريض غير قادر على التوقيع)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">اسم المفوض<span className="el">Representative</span></label>
              <input value={repName} onChange={e => setRepName(e.target.value)}
                placeholder="الاسم وصلة القرابة" className="input-ar" />
            </div>
            <div>
              <label className="field-label">صلة القرابة<span className="el">Relationship</span></label>
              <select value={repRelation} onChange={e => setRepRelation(e.target.value)} className="input-select">
                <option value="">—</option>
                <option value="spouse">زوج/زوجة · Spouse</option>
                <option value="child">ابن/ابنة · Child</option>
                <option value="parent">والد/والدة · Parent</option>
                <option value="legal_guardian">وكيل قانوني · Legal guardian</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Legal notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
        <p className="font-bold">🔒 Digital Audit Trail — Joint Commission &amp; JCI Compliant</p>
        <p>All e-signatures are timestamped and stored with staff ID, IP address, and session token.</p>
        <p>سجل التوقيعات الرقمية محفوظ مع الوقت ومعرف الموظف وعنوان IP وفق معايير JCI.</p>
      </div>

      {/* Action */}
      <div className="flex justify-between items-center pt-2">
        {!requiredSigned ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            ⚠️ يرجى توقيع الموافقات الإلزامية الثلاث قبل إنشاء الملف
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
            ✅ جميع الموافقات الإلزامية موقعة — يمكن إنشاء الملف الآن
          </div>
        )}
        <button
          onClick={handleComplete}
          disabled={!requiredSigned || completing}
          className={`btn-primary ${!requiredSigned ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {completing ? 'جارٍ الإنشاء...' : 'إنشاء ملف المريض ✓'}
        </button>
      </div>
    </div>
  )
}

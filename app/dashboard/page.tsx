'use client'

// PatientDashboard.tsx
// Full patient dashboard — Oncology Center Management System
// Combines: overview, diagnosis summary, chemo tracker, upcoming sessions,
//           biomarkers, recent labs, consents, insurance, quick actions

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'medical' | 'chemo' | 'labs' | 'consents' | 'financial'

// ─── Mock data (replace with Supabase queries) ────────────────────────────────
const PATIENT = {
  mrn: 'PT-2024-0847',
  nameAr: 'سارة محمد العمري',
  nameEn: 'Sara Mohamed El-Omary',
  dob: '1978-04-15',
  sex: 'F',
  mobile: '+20 100 234 5678',
  email: 'sara.elomary@email.com',
  governorate: 'القاهرة · Cairo',
  emergency: { name: 'أحمد العمري', relation: 'Spouse', phone: '+20 111 567 8901' },
  photoUrl: null,
  registeredAt: '2024-11-12',
  referral: 'Dr. Karim Hossam — Cairo University Hospital',
}

const DIAGNOSIS = {
  primarySite: 'Breast',
  icd10: 'C50.412',
  histology: 'Invasive Ductal Carcinoma',
  stage: 'Stage IIB',
  grade: 'G2 — Moderately differentiated',
  tnm: 'T2 N1 M0',
  diagnosisDate: '2024-10-28',
  intent: 'Curative — Neoadjuvant',
  laterality: 'Left',
  metastatic: false,
  ecog: 'PS 1',
  bsa: '1.72 m²',
  weight: 68,
  height: 163,
  allergies: 'NKDA',
}

const BIOMARKERS = {
  er: 'Positive (+)',
  pr: 'Positive (+)',
  her2: 'Negative (−)',
  pdl1: 22,
  kras: 'Wild-type',
  egfr: 'Not applicable',
  msi: 'MSS',
  tmb: 8,
}

const CHEMO_PROTOCOL = {
  name: 'AC-T (Dose-dense)',
  currentCycle: 3,
  totalCycles: 8,
  phase: 'Phase 1 · AC (Doxorubicin + Cyclophosphamide)',
  startDate: '2024-11-20',
  nextSession: '2025-01-08',
  nextSessionTime: '09:00',
  drugs: [
    { name: 'Doxorubicin', dose: '60 mg/m²', calculated: '103.2 mg', route: 'IV', day: 'D1' },
    { name: 'Cyclophosphamide', dose: '600 mg/m²', calculated: '1,032 mg', route: 'IV', day: 'D1' },
  ],
  sessions: [
    { cycle: 1, date: '2024-11-20', status: 'completed', dose_mod: null },
    { cycle: 2, date: '2024-12-04', status: 'completed', dose_mod: null },
    { cycle: 3, date: '2024-12-18', status: 'completed', dose_mod: '10% reduction — G2 neuropathy' },
    { cycle: 4, date: '2025-01-08', status: 'upcoming', dose_mod: null },
    { cycle: 5, date: '2025-01-22', status: 'scheduled', dose_mod: null },
    { cycle: 6, date: '2025-02-05', status: 'scheduled', dose_mod: null },
    { cycle: 7, date: '2025-02-19', status: 'scheduled', dose_mod: null },
    { cycle: 8, date: '2025-03-05', status: 'scheduled', dose_mod: null },
  ]
}

const RECENT_LABS = [
  { name: 'WBC', value: '3.8', unit: '× 10³/µL', ref: '4.5–11.0', flag: 'low', date: '2024-12-17' },
  { name: 'Hgb', value: '10.2', unit: 'g/dL', ref: '12.0–16.0', flag: 'low', date: '2024-12-17' },
  { name: 'Platelets', value: '189', unit: '× 10³/µL', ref: '150–400', flag: 'normal', date: '2024-12-17' },
  { name: 'ANC', value: '1.8', unit: '× 10³/µL', ref: '>1.5', flag: 'normal', date: '2024-12-17' },
  { name: 'ALT', value: '32', unit: 'U/L', ref: '7–56', flag: 'normal', date: '2024-12-17' },
  { name: 'Creatinine', value: '0.9', unit: 'mg/dL', ref: '0.5–1.1', flag: 'normal', date: '2024-12-17' },
  { name: 'CA 15-3', value: '42.1', unit: 'U/mL', ref: '<25', flag: 'high', date: '2024-12-15' },
]

const CONSENTS = [
  { type: 'General Treatment', required: true, signed: true, date: '2024-11-12' },
  { type: 'Chemotherapy', required: true, signed: true, date: '2024-11-12' },
  { type: 'Data Privacy (HIPAA)', required: true, signed: true, date: '2024-11-12' },
  { type: 'Photography (Teaching)', required: false, signed: false, date: null },
  { type: 'Clinical Research', required: false, signed: true, date: '2024-11-14' },
  { type: 'Telemedicine', required: false, signed: false, date: null },
]

const INSURANCE = {
  type: 'Government Insurance · تأمين حكومي',
  provider: 'HIO — Health Insurance Organization',
  policyNo: 'GOV-2024-441892',
  expiry: '2025-12-31',
  chemoCovarege: '80%',
  copay: 'EGP 500 / cycle',
  preAuthStatus: 'Approved — Cycle 4',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showAllLabs, setShowAllLabs] = useState(false)

  const age = new Date().getFullYear() - new Date(PATIENT.dob).getFullYear()
  const progress = Math.round((CHEMO_PROTOCOL.currentCycle / CHEMO_PROTOCOL.totalCycles) * 100)

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl', color: '#1e2540', minHeight: '100vh', background: '#f7f8fc' }}>

      {/* ── PATIENT HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1f3a 0%, #132d52 60%, #1e4580 100%)',
        padding: '28px 32px 0',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* background pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: .04, backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2ab8a0, #1a8a78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: 'white',
            flexShrink: 0, border: '3px solid rgba(255,255,255,.2)',
            boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          }}>
            {PATIENT.nameAr[0]}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>{PATIENT.nameAr}</h1>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', fontFamily: 'DM Mono', letterSpacing: '.02em' }}>{PATIENT.nameEn}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { icon: '🪪', val: PATIENT.mrn, mono: true },
                { icon: '📅', val: `${age} سنة · ${PATIENT.sex === 'F' ? 'أنثى' : 'ذكر'}` },
                { icon: '🏥', val: DIAGNOSIS.primarySite + ' · ' + DIAGNOSIS.stage },
                { icon: '💊', val: CHEMO_PROTOCOL.name },
              ].map(({ icon, val, mono }) => (
                <span key={val} style={{
                  background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.85)',
                  padding: '3px 10px', borderRadius: 20, fontSize: 11,
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: mono ? 'DM Mono, monospace' : 'inherit',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,.1)',
                }}>
                  {icon} {val}
                </span>
              ))}
            </div>
          </div>

          {/* Quick action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {[
              { icon: '📅', label: 'حجز موعد' },
              { icon: '💊', label: 'جدولة جلسة' },
              { icon: '✏️', label: 'تعديل الملف' },
            ].map(({ icon, label }) => (
              <button key={label} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.25)',
                background: 'rgba(255,255,255,.1)', color: 'white', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'Cairo, sans-serif', transition: 'all .15s',
              }}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, marginTop: 20 }}>
          {([
            { id: 'overview', icon: '⊞', ar: 'نظرة عامة', en: 'Overview' },
            { id: 'medical', icon: '🔬', ar: 'السجل الطبي', en: 'Medical' },
            { id: 'chemo', icon: '💊', ar: 'جلسات الكيماوي', en: 'Chemo' },
            { id: 'labs', icon: '🧪', ar: 'التحاليل', en: 'Labs' },
            { id: 'consents', icon: '📄', ar: 'الموافقات', en: 'Consents' },
            { id: 'financial', icon: '💳', ar: 'المالية والتأمين', en: 'Finance' },
          ] as { id: Tab, icon: string, ar: string, en: string }[]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(255,255,255,.12)' : 'transparent',
              color: activeTab === tab.id ? '#2ab8a0' : 'rgba(255,255,255,.55)',
              fontSize: 12, fontWeight: 600, fontFamily: 'Cairo, sans-serif',
              borderBottom: activeTab === tab.id ? '2px solid #2ab8a0' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
            }}>
              {tab.icon} {tab.ar}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: '24px 32px' }}>

        {/* ════════════════════════════ OVERVIEW ══════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

            {/* Chemo progress */}
            <div style={{ ...card, gridColumn: '1 / 3' }}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#fff3cd' }}>💊</span>
                <div><p style={cardTitle}>تقدم العلاج الكيماوي</p><p style={cardSub}>Chemotherapy Progress · {CHEMO_PROTOCOL.name}</p></div>
                <span style={{ marginRight: 'auto', ...badge('amber') }}>Cycle {CHEMO_PROTOCOL.currentCycle} / {CHEMO_PROTOCOL.totalCycles}</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {/* Progress bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#4a5580' }}>الدورات المكتملة</span>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#1a8a78', fontWeight: 600 }}>{progress}%</span>
                </div>
                <div style={{ height: 8, background: '#eef0f6', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{
                    height: '100%', width: `${progress}%`,
                    background: 'linear-gradient(90deg, #2ab8a0, #1a8a78)',
                    borderRadius: 20, transition: 'width .5s ease',
                  }} />
                </div>
                {/* Session dots */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CHEMO_PROTOCOL.sessions.map(s => (
                    <div key={s.cycle} style={{
                      flex: '1 1 auto', minWidth: 60, padding: '8px 10px',
                      borderRadius: 8, border: '1.5px solid',
                      borderColor: s.status === 'completed' ? '#2ab8a0' : s.status === 'upcoming' ? '#b45309' : '#dde2ee',
                      background: s.status === 'completed' ? '#e6f7f4' : s.status === 'upcoming' ? '#fff3cd' : '#f7f8fc',
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: s.status === 'completed' ? '#1a8a78' : s.status === 'upcoming' ? '#b45309' : '#8e97b5', margin: 0 }}>
                        {s.status === 'completed' ? '✓' : s.status === 'upcoming' ? '▶' : '○'} C{s.cycle}
                      </p>
                      <p style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#8e97b5', margin: '2px 0 0' }}>
                        {s.date.slice(5)}
                      </p>
                      {s.dose_mod && <p style={{ fontSize: 8, color: '#e53e3e', margin: '2px 0 0' }}>⚠ mod</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Next session */}
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#e6f7f4' }}>📅</span>
                <div><p style={cardTitle}>الجلسة القادمة</p><p style={cardSub}>Next Session</p></div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#1a8a78', margin: '0 0 4px', fontFamily: 'DM Mono' }}>
                  {CHEMO_PROTOCOL.nextSession}
                </p>
                <p style={{ fontSize: 12, color: '#4a5580', margin: '0 0 12px' }}>
                  الساعة {CHEMO_PROTOCOL.nextSessionTime} — وحدة الكيماوي
                </p>
                <div style={{ padding: '8px 12px', background: '#fff3cd', borderRadius: 8, fontSize: 11, color: '#b45309' }}>
                  ⚠️ تحاليل CBC مطلوبة قبل الجلسة بـ 48 ساعة
                </div>
              </div>
            </div>

            {/* Key vitals row */}
            {[
              { icon: '🩺', titleAr: 'ECOG PS', val: DIAGNOSIS.ecog, sub: 'Performance Status', color: '#2ab8a0' },
              { icon: '⚖️', titleAr: 'BSA', val: DIAGNOSIS.bsa, sub: 'Body Surface Area', color: '#9333ea' },
              { icon: '🧬', titleAr: 'ER/PR', val: '+/+', sub: 'Receptor status', color: '#16a34a' },
              { icon: '🔬', titleAr: 'CA 15-3', val: '42.1 U/mL', sub: 'Tumor marker ⬆', color: '#e53e3e' },
              { icon: '📋', titleAr: 'ICD-10', val: DIAGNOSIS.icd10, sub: DIAGNOSIS.primarySite, color: '#0b1f3a' },
              { icon: '💊', titleAr: 'Allergies', val: DIAGNOSIS.allergies, sub: 'Drug allergies', color: '#16a34a' },
            ].map(({ icon, titleAr, val, sub, color }) => (
              <div key={titleAr} style={{ ...card, padding: 0 }}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono', letterSpacing: '.04em' }}>{titleAr}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color, margin: '2px 0', fontFamily: 'DM Mono' }}>{val}</p>
                    <p style={{ fontSize: 10, color: '#8e97b5', margin: 0 }}>{sub}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Recent labs mini */}
            <div style={{ ...card, gridColumn: '1 / 3' }}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#faf5ff' }}>🧪</span>
                <div><p style={cardTitle}>آخر نتائج التحاليل</p><p style={cardSub}>Latest Lab Results — 2024-12-17</p></div>
                <button onClick={() => setActiveTab('labs')} style={{ marginRight: 'auto', fontSize: 11, color: '#1a8a78', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo' }}>
                  عرض الكل ←
                </button>
              </div>
              <div style={{ padding: '0 20px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {RECENT_LABS.slice(0, 4).map(lab => (
                    <div key={lab.name} style={{
                      padding: '8px 10px', borderRadius: 8,
                      background: lab.flag === 'normal' ? '#f7f8fc' : lab.flag === 'low' ? '#eff6ff' : '#fde8e8',
                      border: '1px solid',
                      borderColor: lab.flag === 'normal' ? '#dde2ee' : lab.flag === 'low' ? 'rgba(59,130,246,.3)' : 'rgba(229,62,62,.3)',
                    }}>
                      <p style={{ fontSize: 9, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono', letterSpacing: '.04em' }}>{lab.name}</p>
                      <p style={{ fontSize: 16, fontWeight: 700, margin: '2px 0', color: lab.flag === 'normal' ? '#1e2540' : lab.flag === 'low' ? '#1e40af' : '#e53e3e', fontFamily: 'DM Mono' }}>
                        {lab.value}
                      </p>
                      <p style={{ fontSize: 9, color: '#8e97b5', margin: 0 }}>{lab.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#fde8e8' }}>⚠️</span>
                <div><p style={cardTitle}>تنبيهات سريرية</p><p style={cardSub}>Clinical Alerts</p></div>
              </div>
              <div style={{ padding: '0 16px 14px' }}>
                {[
                  { msg: 'WBC منخفض — 3.8 × 10³/µL', color: '#1e40af', bg: '#eff6ff', border: 'rgba(59,130,246,.2)' },
                  { msg: 'CA 15-3 مرتفع — 42.1 U/mL', color: '#e53e3e', bg: '#fde8e8', border: 'rgba(229,62,62,.2)' },
                  { msg: 'CBC مطلوب قبل Cycle 4', color: '#b45309', bg: '#fff3cd', border: 'rgba(180,83,9,.2)' },
                ].map(a => (
                  <div key={a.msg} style={{ marginBottom: 6, padding: '8px 10px', background: a.bg, border: `1px solid ${a.border}`, borderRadius: 7, fontSize: 11, color: a.color, fontWeight: 500 }}>
                    {a.msg}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════ MEDICAL ═══════════════════════════ */}
        {activeTab === 'medical' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Diagnosis */}
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#fde8e8' }}>🔬</span>
                <div><p style={cardTitle}>Primary Diagnosis</p><p style={cardSub}>التشخيص الرئيسي</p></div>
              </div>
              <div style={{ padding: '14px 20px' }}>
                {[
                  ['Primary site', DIAGNOSIS.primarySite],
                  ['ICD-10 Code', DIAGNOSIS.icd10],
                  ['Histology', DIAGNOSIS.histology],
                  ['Stage', DIAGNOSIS.stage],
                  ['Grade', DIAGNOSIS.grade],
                  ['TNM', DIAGNOSIS.tnm],
                  ['Laterality', DIAGNOSIS.laterality],
                  ['Diagnosis date', DIAGNOSIS.diagnosisDate],
                  ['Treatment intent', DIAGNOSIS.intent],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540', textAlign: 'left' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Biomarkers */}
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#faf5ff' }}>🧬</span>
                <div><p style={cardTitle}>Molecular Profile</p><p style={cardSub}>البروفايل الجزيئي</p></div>
              </div>
              <div style={{ padding: '14px 20px' }}>
                <p style={{ fontSize: 9, fontFamily: 'DM Mono', letterSpacing: '.08em', textTransform: 'uppercase', color: '#8e97b5', marginBottom: 10 }}>Receptor Status</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[['ER', BIOMARKERS.er, '#16a34a'], ['PR', BIOMARKERS.pr, '#16a34a'], ['HER2', BIOMARKERS.her2, '#8e97b5']].map(([k, v, c]) => (
                    <div key={k} style={{ padding: '6px 12px', borderRadius: 20, background: c === '#16a34a' ? '#f0fdf4' : '#f7f8fc', border: `1.5px solid ${c === '#16a34a' ? 'rgba(22,163,74,.3)' : '#dde2ee'}` }}>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono', color: c }}>{k}</span>
                      <span style={{ fontSize: 10, color: '#4a5580', marginRight: 4 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 9, fontFamily: 'DM Mono', letterSpacing: '.08em', textTransform: 'uppercase', color: '#8e97b5', marginBottom: 10 }}>Tumor Microenvironment</p>
                {[
                  ['PD-L1', `${BIOMARKERS.pdl1}%`, BIOMARKERS.pdl1 > 50 ? '#16a34a' : '#4a5580'],
                  ['MSI Status', BIOMARKERS.msi, '#4a5580'],
                  ['TMB', `${BIOMARKERS.tmb} mut/Mb`, '#4a5580'],
                  ['KRAS', BIOMARKERS.kras, '#16a34a'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c as string, fontFamily: 'DM Mono' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance + Anthropo */}
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#fff3cd' }}>📊</span>
                <div><p style={cardTitle}>Performance &amp; Anthropometrics</p><p style={cardSub}>الحالة الوظيفية والقياسات</p></div>
              </div>
              <div style={{ padding: '14px 20px' }}>
                {[
                  ['ECOG PS', DIAGNOSIS.ecog],
                  ['Weight', `${DIAGNOSIS.weight} kg`],
                  ['Height', `${DIAGNOSIS.height} cm`],
                  ['BSA', DIAGNOSIS.bsa],
                  ['Allergies', DIAGNOSIS.allergies],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540', fontFamily: 'DM Mono' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Personal info */}
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#e6f7f4' }}>👤</span>
                <div><p style={cardTitle}>البيانات الشخصية</p><p style={cardSub}>Personal Information</p></div>
              </div>
              <div style={{ padding: '14px 20px' }}>
                {[
                  ['MRN', PATIENT.mrn],
                  ['DOB', PATIENT.dob],
                  ['Mobile', PATIENT.mobile],
                  ['Email', PATIENT.email],
                  ['Governorate', PATIENT.governorate],
                  ['Referral', PATIENT.referral],
                  ['Emergency', `${PATIENT.emergency.name} · ${PATIENT.emergency.relation}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540', textAlign: 'left', fontFamily: 'DM Mono', wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════ CHEMO ══════════════════════════ */}
        {activeTab === 'chemo' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
            <div>
              {/* Protocol header */}
              <div style={{ ...card, marginBottom: 16 }}>
                <div style={cardHeader}>
                  <span style={{ ...cardIconStyle, background: '#fff3cd' }}>💊</span>
                  <div><p style={cardTitle}>{CHEMO_PROTOCOL.name}</p><p style={cardSub}>{CHEMO_PROTOCOL.phase}</p></div>
                  <span style={{ marginRight: 'auto', ...badge('teal') }}>Cycle {CHEMO_PROTOCOL.currentCycle}/{CHEMO_PROTOCOL.totalCycles}</span>
                </div>
                <div style={{ padding: '0 20px 16px' }}>
                  <div style={{ height: 10, background: '#eef0f6', borderRadius: 20, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2ab8a0, #1a8a78)', borderRadius: 20 }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#8e97b5', textAlign: 'left', fontFamily: 'DM Mono' }}>
                    {progress}% complete · {CHEMO_PROTOCOL.totalCycles - CHEMO_PROTOCOL.currentCycle} cycles remaining
                  </p>
                </div>
              </div>

              {/* Drug table */}
              <div style={{ ...card, marginBottom: 16 }}>
                <div style={cardHeader}>
                  <span style={{ ...cardIconStyle, background: '#fde8e8' }}>💉</span>
                  <div><p style={cardTitle}>Current Cycle Drugs</p><p style={cardSub}>أدوية الدورة الحالية — Doses based on BSA {DIAGNOSIS.bsa}</p></div>
                </div>
                <div style={{ padding: '0 20px 16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #dde2ee' }}>
                        {['Drug', 'Protocol dose', 'Calculated dose', 'Route', 'Day'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '7px 8px', fontSize: 9, fontFamily: 'DM Mono', color: '#8e97b5', letterSpacing: '.06em', textTransform: 'uppercase', background: '#f7f8fc' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CHEMO_PROTOCOL.drugs.map(d => (
                        <tr key={d.name} style={{ borderBottom: '1px solid #eef0f6' }}>
                          <td style={{ padding: '9px 8px', fontWeight: 600, color: '#0b1f3a' }}>{d.name}</td>
                          <td style={{ padding: '9px 8px', fontFamily: 'DM Mono', color: '#4a5580' }}>{d.dose}</td>
                          <td style={{ padding: '9px 8px', fontFamily: 'DM Mono', fontWeight: 700, color: '#1a8a78' }}>{d.calculated}</td>
                          <td style={{ padding: '9px 8px', fontFamily: 'DM Mono', color: '#4a5580' }}>{d.route}</td>
                          <td style={{ padding: '9px 8px', fontFamily: 'DM Mono', color: '#4a5580' }}>{d.day}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* All sessions */}
              <div style={card}>
                <div style={cardHeader}>
                  <span style={{ ...cardIconStyle, background: '#e6f7f4' }}>📅</span>
                  <div><p style={cardTitle}>Session History &amp; Schedule</p><p style={cardSub}>سجل الجلسات والجدول القادم</p></div>
                </div>
                <div style={{ padding: '0 20px 16px' }}>
                  {CHEMO_PROTOCOL.sessions.map(s => (
                    <div key={s.cycle} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', borderBottom: '1px solid #eef0f6',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: s.status === 'completed' ? '#e6f7f4' : s.status === 'upcoming' ? '#fff3cd' : '#eef0f6',
                        border: '2px solid',
                        borderColor: s.status === 'completed' ? '#2ab8a0' : s.status === 'upcoming' ? '#b45309' : '#dde2ee',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: s.status === 'completed' ? '#1a8a78' : s.status === 'upcoming' ? '#b45309' : '#8e97b5',
                        fontWeight: 700,
                      }}>
                        {s.status === 'completed' ? '✓' : s.cycle}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#1e2540' }}>
                          Cycle {s.cycle}
                          {s.status === 'upcoming' && <span style={{ fontSize: 10, color: '#b45309', marginRight: 8, background: '#fff3cd', padding: '1px 7px', borderRadius: 20 }}>▶ Next</span>}
                        </p>
                        {s.dose_mod && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#e53e3e' }}>⚠️ {s.dose_mod}</p>}
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#8e97b5' }}>{s.date}</span>
                      <span style={{
                        fontSize: 9, fontFamily: 'DM Mono', padding: '2px 7px', borderRadius: 20,
                        background: s.status === 'completed' ? '#e6f7f4' : s.status === 'upcoming' ? '#fff3cd' : '#f7f8fc',
                        color: s.status === 'completed' ? '#1a8a78' : s.status === 'upcoming' ? '#b45309' : '#8e97b5',
                        border: '1px solid',
                        borderColor: s.status === 'completed' ? 'rgba(42,184,160,.3)' : s.status === 'upcoming' ? 'rgba(180,83,9,.2)' : '#dde2ee',
                      }}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...card, background: 'linear-gradient(135deg, #0b1f3a, #1e4580)', color: 'white' }}>
                <div style={{ padding: '18px 18px 14px' }}>
                  <p style={{ fontSize: 10, opacity: .6, fontFamily: 'DM Mono', letterSpacing: '.06em', margin: '0 0 4px' }}>NEXT SESSION</p>
                  <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Mono', margin: 0, color: '#2ab8a0' }}>{CHEMO_PROTOCOL.nextSession}</p>
                  <p style={{ fontSize: 12, opacity: .7, margin: '4px 0 0' }}>الساعة {CHEMO_PROTOCOL.nextSessionTime} — وحدة الكيماوي</p>
                </div>
                <div style={{ padding: '10px 18px 16px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
                  <p style={{ fontSize: 10, opacity: .5, margin: '0 0 8px', fontFamily: 'DM Mono', letterSpacing: '.06em' }}>PRE-SESSION CHECKLIST</p>
                  {[
                    { item: 'CBC + differential', done: false },
                    { item: 'LFTs + KFTs', done: false },
                    { item: 'Pre-auth from insurance', done: true },
                    { item: 'Antiemetic pre-medication', done: false },
                  ].map(c => (
                    <div key={c.item} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: c.done ? '#2ab8a0' : 'rgba(255,255,255,.3)' }}>
                        {c.done ? '✓' : '○'}
                      </span>
                      <span style={{ fontSize: 11, opacity: c.done ? .9 : .55 }}>{c.item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={card}>
                <div style={cardHeader}>
                  <span style={{ ...cardIconStyle, background: '#f0fdf4' }}>📋</span>
                  <div><p style={cardTitle}>Pre-auth Status</p><p style={cardSub}>حالة الموافقة المسبقة</p></div>
                </div>
                <div style={{ padding: '0 16px 14px' }}>
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid rgba(22,163,74,.25)', marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', margin: '0 0 2px' }}>✅ Approved</p>
                    <p style={{ fontSize: 10, color: '#4a5580', margin: 0, fontFamily: 'DM Mono' }}>{INSURANCE.preAuthStatus}</p>
                  </div>
                  <p style={{ fontSize: 10, color: '#8e97b5', margin: 0 }}>Auto-generated 72hrs before session</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════ LABS ══════════════════════════ */}
        {activeTab === 'labs' && (
          <div style={card}>
            <div style={cardHeader}>
              <span style={{ ...cardIconStyle, background: '#faf5ff' }}>🧪</span>
              <div><p style={cardTitle}>Lab Results</p><p style={cardSub}>نتائج التحاليل — Latest: 2024-12-17</p></div>
            </div>
            <div style={{ padding: '0 20px 16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #dde2ee' }}>
                    {['Test', 'Value', 'Unit', 'Reference', 'Flag', 'Date'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px', fontSize: 9, fontFamily: 'DM Mono', color: '#8e97b5', letterSpacing: '.06em', textTransform: 'uppercase', background: '#f7f8fc' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECENT_LABS.map(lab => (
                    <tr key={lab.name} style={{ borderBottom: '1px solid #eef0f6' }}>
                      <td style={{ padding: '9px 8px', fontWeight: 600, color: '#1e2540' }}>{lab.name}</td>
                      <td style={{
                        padding: '9px 8px', fontFamily: 'DM Mono', fontWeight: 700, fontSize: 14,
                        color: lab.flag === 'normal' ? '#1e2540' : lab.flag === 'low' ? '#1e40af' : '#e53e3e'
                      }}>
                        {lab.value}
                      </td>
                      <td style={{ padding: '9px 8px', fontFamily: 'DM Mono', color: '#8e97b5', fontSize: 10 }}>{lab.unit}</td>
                      <td style={{ padding: '9px 8px', fontFamily: 'DM Mono', color: '#8e97b5', fontSize: 10 }}>{lab.ref}</td>
                      <td style={{ padding: '9px 8px' }}>
                        <span style={{
                          fontSize: 9, fontFamily: 'DM Mono', padding: '2px 7px', borderRadius: 20,
                          background: lab.flag === 'normal' ? '#f0fdf4' : lab.flag === 'low' ? '#eff6ff' : '#fde8e8',
                          color: lab.flag === 'normal' ? '#16a34a' : lab.flag === 'low' ? '#1e40af' : '#e53e3e',
                        }}>
                          {lab.flag === 'normal' ? '✓ Normal' : lab.flag === 'low' ? '↓ Low' : '↑ High'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 8px', fontFamily: 'DM Mono', color: '#8e97b5', fontSize: 10 }}>{lab.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════ CONSENTS ══════════════════════════ */}
        {activeTab === 'consents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONSENTS.map(c => (
              <div key={c.type} style={{
                ...card, padding: 0,
                borderColor: c.signed ? 'rgba(42,184,160,.35)' : c.required ? 'rgba(229,62,62,.25)' : '#dde2ee',
                background: c.signed ? '#e6f7f4' : 'white',
              }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 22 }}>{c.signed ? '✅' : c.required ? '⚠️' : '○'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0b1f3a' }}>{c.type}</p>
                    {c.date && <p style={{ margin: '2px 0 0', fontSize: 10, fontFamily: 'DM Mono', color: '#8e97b5' }}>Signed: {c.date}</p>}
                  </div>
                  <span style={{
                    fontSize: 9, fontFamily: 'DM Mono', padding: '3px 9px', borderRadius: 20,
                    background: c.signed ? '#f0fdf4' : c.required ? '#fde8e8' : '#f7f8fc',
                    color: c.signed ? '#16a34a' : c.required ? '#e53e3e' : '#8e97b5',
                  }}>
                    {c.signed ? '✓ Signed' : c.required ? 'Required · Pending' : 'Optional · Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════ FINANCIAL ══════════════════════════ */}
        {activeTab === 'financial' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#f0fdf4' }}>🛡️</span>
                <div><p style={cardTitle}>Insurance Coverage</p><p style={cardSub}>التغطية التأمينية</p></div>
              </div>
              <div style={{ padding: '14px 20px' }}>
                {[
                  ['Type', INSURANCE.type],
                  ['Provider', INSURANCE.provider],
                  ['Policy No.', INSURANCE.policyNo],
                  ['Valid until', INSURANCE.expiry],
                  ['Chemo coverage', INSURANCE.chemoCovarege],
                  ['Co-pay per cycle', INSURANCE.copay],
                  ['Pre-auth status', INSURANCE.preAuthStatus],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eef0f6', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540', textAlign: 'left' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#fff3cd' }}>💳</span>
                <div><p style={cardTitle}>Financial Summary</p><p style={cardSub}>الملخص المالي</p></div>
              </div>
              <div style={{ padding: '14px 20px' }}>
                {[
                  ['Payment method', 'Government Insurance'],
                  ['Billing cycle', 'Per chemo cycle'],
                  ['Cycles done', '3 × EGP 500 = EGP 1,500'],
                  ['Cycles pending', '5 × EGP 500 = EGP 2,500'],
                  ['Total co-pay', 'EGP 4,000'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540', textAlign: 'left', fontFamily: 'DM Mono' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'white', border: '1px solid #dde2ee',
  borderRadius: 16, boxShadow: '0 1px 3px rgba(11,31,58,.07)',
  overflow: 'hidden',
}
const cardHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '14px 20px 12px', borderBottom: '1px solid #eef0f6',
}
const cardIconStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16, flexShrink: 0,
}
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }
const cardSub: React.CSSProperties = { fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', letterSpacing: '.04em', margin: 0, marginTop: 2 }

function badge(color: 'teal' | 'amber' | 'red' | 'green'): React.CSSProperties {
  const map = {
    teal: { bg: '#e6f7f4', c: '#1a8a78', bc: 'rgba(42,184,160,.3)' },
    amber: { bg: '#fff3cd', c: '#b45309', bc: 'rgba(180,83,9,.2)' },
    red: { bg: '#fde8e8', c: '#e53e3e', bc: 'rgba(229,62,62,.2)' },
    green: { bg: '#f0fdf4', c: '#16a34a', bc: 'rgba(22,163,74,.3)' },
  }
  return {
    background: map[color].bg, color: map[color].c,
    border: `1px solid ${map[color].bc}`,
    padding: '2px 10px', borderRadius: 20,
    fontSize: 10, fontFamily: 'DM Mono', fontWeight: 600,
  }
}

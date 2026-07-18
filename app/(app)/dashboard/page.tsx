'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useChemoScheduler } from '@/lib/hooks/useChemoScheduler'
import { useMedicalRecord } from '@/lib/hooks/useMedicalRecord'

type Tab = 'overview' | 'medical' | 'chemo' | 'labs' | 'consents' | 'financial'

const LAST_PATIENT_KEY = 'ecoc_last_viewed_patient_id'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [patientCount, setPatientCount] = useState<number | null>(null)
  const [lastPatientId, setLastPatientId] = useState<string | null>(null)
  const supabase = createClient()

  const {
    sessions, loading: sessionsLoading, stats,
    getUpcomingSessions, getSessionsNeedingLabs,
  } = useChemoScheduler()

  useEffect(() => {
    async function loadPatientCount() {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .is('archived_at', null)
      setPatientCount(count ?? 0)
    }
    loadPatientCount()
    setLastPatientId(
      typeof window !== 'undefined' ? window.localStorage.getItem(LAST_PATIENT_KEY) : null
    )
  }, [])

  const { data: patientData, loading: patientLoading } = useMedicalRecord(lastPatientId || '')

  const upcoming = getUpcomingSessions().slice(0, 5)
  const needingLabs = getSessionsNeedingLabs().slice(0, 5)
  const loading = sessionsLoading || patientCount === null

  const patient = patientData?.patient
  const age = patient
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null
  const latestDiagnosis = patientData?.diagnoses?.[0]
  const activePlan = patientData?.treatmentPlans?.find((p: any) => p.status === 'active') || patientData?.treatmentPlans?.[0]
  const progress = activePlan
    ? Math.round((activePlan.completed_cycles / activePlan.planned_cycles) * 100)
    : 0

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#8e97b5', fontFamily: 'Cairo, sans-serif' }}>
        جارٍ التحميل...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl', minHeight: '100vh', background: '#f7f8fc' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1f3a 0%, #132d52 60%, #1e4580 100%)',
        padding: '28px 32px 0', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .04, backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>لوحة التحكم</h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontFamily: 'DM Mono, monospace', margin: '4px 0 0' }}>
              مركز الأمل للأورام · {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/patients/new" style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.25)',
              background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', backdropFilter: 'blur(8px)',
            }}>
              + مريض جديد
            </Link>
            <Link href="/chemo-sessions" style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.25)',
              background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', backdropFilter: 'blur(8px)',
            }}>
              💊 جدولة جلسة
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, marginTop: 20 }}>
          {([
            { id: 'overview', icon: '⊞', ar: 'نظرة عامة' },
            { id: 'medical', icon: '🔬', ar: 'آخر مريض · طبي' },
            { id: 'chemo', icon: '💊', ar: 'آخر مريض · كيماوي' },
            { id: 'labs', icon: '🧪', ar: 'آخر مريض · تحاليل' },
            { id: 'consents', icon: '📄', ar: 'آخر مريض · موافقات' },
            { id: 'financial', icon: '💳', ar: 'آخر مريض · مالية' },
          ] as { id: Tab, icon: string, ar: string }[]).map(tab => (
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

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

            {/* Stat cards */}
            {[
              { label: 'إجمالي المرضى', value: patientCount ?? 0, color: '#2ab8a0', bg: '#e6f7f4', icon: '👤', href: '/patients' },
              { label: 'جلسات مجدولة', value: stats.totalScheduled, color: '#1a8a78', bg: '#e6f7f4', icon: '💊', href: '/chemo-sessions' },
              { label: 'الجلسات هذا الأسبوع', value: stats.upcomingThisWeek, color: '#b45309', bg: '#fff3cd', icon: '📅', href: '/chemo-sessions' },
              { label: 'تحتاج تحاليل', value: stats.needingLabs, color: '#e53e3e', bg: '#fde8e8', icon: '🧪', href: '/chemo-sessions' },
              { label: 'موافقة تأمين معلّقة', value: stats.preAuthPending, color: '#9333ea', bg: '#faf5ff', icon: '📋', href: '/reports' },
              { label: 'مكتملة هذا الشهر', value: stats.completedThisMonth, color: '#16a34a', bg: '#f0fdf4', icon: '✅', href: '/chemo-sessions' },
            ].map(({ label, value, color, bg, icon, href }) => (
              <Link key={label} href={href} style={{ textDecoration: 'none' }}>
                <div style={{ ...card, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0, fontFamily: 'DM Mono, monospace' }}>{value}</p>
                    <p style={{ fontSize: 11, color: '#8e97b5', margin: 0 }}>{label}</p>
                  </div>
                </div>
              </Link>
            ))}

            {/* Upcoming sessions */}
            <div style={{ ...card, gridColumn: '1 / 3' }}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#e6f7f4' }}>📅</span>
                <div><p style={cardTitle}>الجلسات القادمة (30 يوم)</p><p style={cardSub}>Upcoming Sessions</p></div>
                <Link href="/chemo-sessions" style={{ marginRight: 'auto', fontSize: 11, color: '#1a8a78', textDecoration: 'none' }}>عرض الكل ←</Link>
              </div>
              <div style={{ padding: upcoming.length ? '0 0 8px' : '30px', textAlign: upcoming.length ? undefined : 'center', color: '#8e97b5' }}>
                {upcoming.length === 0 ? 'لا توجد جلسات قادمة' : upcoming.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#1a8a78', fontWeight: 700, minWidth: 80 }}>{s.session_date}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0b1f3a', flex: 1 }}>
                      {s.patient?.first_name_ar} {s.patient?.last_name_ar}
                    </span>
                    <span style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono, monospace' }}>{s.plan?.protocol_name || '—'} · دورة {s.cycle_number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Needing labs */}
            <div style={card}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#fde8e8' }}>⚠️</span>
                <div><p style={cardTitle}>تحتاج تحاليل عاجلة</p><p style={cardSub}>Needing Labs (48h)</p></div>
              </div>
              <div style={{ padding: needingLabs.length ? '0 0 8px' : '20px', textAlign: needingLabs.length ? undefined : 'center', color: '#8e97b5', fontSize: 12 }}>
                {needingLabs.length === 0 ? 'لا توجد جلسات محتاجة تحاليل' : needingLabs.map(s => (
                  <div key={s.id} style={{ padding: '8px 16px', borderBottom: '1px solid #eef0f6', fontSize: 11 }}>
                    <strong>{s.patient?.first_name_ar} {s.patient?.last_name_ar}</strong>
                    <span style={{ color: '#8e97b5', marginRight: 6, fontFamily: 'DM Mono, monospace' }}>· {s.session_date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Last viewed patient mini card */}
            <div style={{ ...card, gridColumn: '1 / 4' }}>
              <div style={cardHeader}>
                <span style={{ ...cardIconStyle, background: '#faf5ff' }}>👤</span>
                <div><p style={cardTitle}>آخر مريض تمت مشاهدته</p><p style={cardSub}>Last Viewed Patient</p></div>
                {patient && (
                  <Link href={`/patients/${lastPatientId}`} style={{ marginRight: 'auto', fontSize: 11, color: '#1a8a78', textDecoration: 'none' }}>
                    عرض الملف الكامل ←
                  </Link>
                )}
              </div>
              <div style={{ padding: '16px 20px' }}>
                {!lastPatientId || !patient ? (
                  <p style={{ color: '#8e97b5', textAlign: 'center', fontSize: 12, margin: 0 }}>
                    لم تتم مشاهدة أي مريض بعد — تصفح <Link href="/patients" style={{ color: '#1a8a78' }}>قائمة المرضى</Link>
                  </p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2ab8a0, #1a8a78)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {patient.first_name_ar?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                        {patient.first_name_ar} {patient.last_name_ar} · {age} سنة
                      </p>
                      <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono, monospace', margin: '2px 0 0' }}>
                        {patient.mrn} {latestDiagnosis ? `· ${latestDiagnosis.primary_site} · ${latestDiagnosis.stage || '—'}` : ''}
                      </p>
                    </div>
                    {activePlan && (
                      <div style={{ textAlign: 'left', minWidth: 140 }}>
                        <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono, monospace' }}>{activePlan.protocol_name}</p>
                        <div style={{ height: 6, background: '#eef0f6', borderRadius: 20, overflow: 'hidden', margin: '4px 0' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: '#2ab8a0' }} />
                        </div>
                        <p style={{ fontSize: 10, color: '#1a8a78', margin: 0, fontFamily: 'DM Mono, monospace' }}>
                          {activePlan.completed_cycles}/{activePlan.planned_cycles} دورة
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TABS FOR LAST VIEWED PATIENT ═══ */}
        {activeTab !== 'overview' && (
          !lastPatientId ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
              لم تتم مشاهدة أي مريض بعد — تصفح <Link href="/patients" style={{ color: '#1a8a78' }}>قائمة المرضى</Link> أولاً
            </div>
          ) : patientLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
          ) : (
            <>
              {activeTab === 'medical' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={card}>
                    <div style={cardHeader}>
                      <span style={{ ...cardIconStyle, background: '#fde8e8' }}>🔬</span>
                      <div><p style={cardTitle}>Primary Diagnosis</p><p style={cardSub}>التشخيص الرئيسي</p></div>
                    </div>
                    <div style={{ padding: '14px 20px' }}>
                      {latestDiagnosis ? [
                        ['Primary site', latestDiagnosis.primary_site],
                        ['ICD-10', latestDiagnosis.icd10_code],
                        ['Stage', latestDiagnosis.stage || '—'],
                        ['Grade', latestDiagnosis.grade || '—'],
                        ['Diagnosis date', latestDiagnosis.date_of_diagnosis],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                          <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono, monospace' }}>{k}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540' }}>{v}</span>
                        </div>
                      )) : <p style={{ color: '#8e97b5', fontSize: 12 }}>لا يوجد تشخيص مسجل</p>}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={cardHeader}>
                      <span style={{ ...cardIconStyle, background: '#e6f7f4' }}>👤</span>
                      <div><p style={cardTitle}>البيانات الشخصية</p><p style={cardSub}>Personal Information</p></div>
                    </div>
                    <div style={{ padding: '14px 20px' }}>
                      {[
                        ['MRN', patient?.mrn],
                        ['DOB', patient?.date_of_birth],
                        ['Mobile', patient?.mobile_primary],
                        ['Governorate', patient?.governorate],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                          <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono, monospace' }}>{k}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540' }}>{v || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'chemo' && (
                <div style={card}>
                  <div style={cardHeader}>
                    <span style={{ ...cardIconStyle, background: '#fff3cd' }}>💊</span>
                    <div><p style={cardTitle}>{activePlan?.protocol_name || 'No active protocol'}</p><p style={cardSub}>Treatment Plan</p></div>
                  </div>
                  <div style={{ padding: '0 20px 16px' }}>
                    {activePlan ? (
                      <>
                        <div style={{ height: 10, background: '#eef0f6', borderRadius: 20, overflow: 'hidden', margin: '12px 0 8px' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2ab8a0, #1a8a78)' }} />
                        </div>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono, monospace' }}>
                          {progress}% complete · {activePlan.completed_cycles}/{activePlan.planned_cycles} cycles
                        </p>
                      </>
                    ) : <p style={{ color: '#8e97b5', fontSize: 12, padding: 20 }}>لا توجد خطة علاج نشطة</p>}
                  </div>
                </div>
              )}

              {activeTab === 'labs' && (
                <div style={card}>
                  <div style={cardHeader}>
                    <span style={{ ...cardIconStyle, background: '#faf5ff' }}>🧪</span>
                    <div><p style={cardTitle}>Recent Sessions Labs</p><p style={cardSub}>آخر التحاليل المسجلة</p></div>
                  </div>
                  <div style={{ padding: '0 20px 16px' }}>
                    {(patientData?.chemoSessions || []).filter((s: any) => s.wbc_pre !== null).slice(0, 6).map((s: any) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef0f6', fontSize: 11 }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', color: '#8e97b5' }}>{s.session_date}</span>
                        <span>WBC {s.wbc_pre} · ANC {s.anc_pre} · Hgb {s.hgb_pre} · PLT {s.plt_pre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(activeTab === 'consents' || activeTab === 'financial') && (
                <div style={{ ...card, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
                  للتفاصيل الكاملة، افتح{' '}
                  <Link href={`/patients/${lastPatientId}`} style={{ color: '#1a8a78' }}>ملف المريض الكامل</Link>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  )
}

// ── shared styles ──
const card: React.CSSProperties = {
  background: 'white', border: '1px solid #dde2ee', borderRadius: 16,
  boxShadow: '0 1px 3px rgba(11,31,58,.07)', overflow: 'hidden',
}
const cardHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '14px 20px 12px', borderBottom: '1px solid #eef0f6',
}
const cardIconStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
}
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }
const cardSub: React.CSSProperties = { fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono, monospace', letterSpacing: '.04em', margin: 0, marginTop: 2 }
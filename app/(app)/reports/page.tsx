'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useReporting } from '@/lib/hooks/useReporting'
import type { SessionReport, PatientProgressReport, LabTrendReport } from '@/lib/hooks/useReporting'

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const TABS = [
  { id: 'monthly', label: '📊 تقرير شهري' },
  { id: 'progress', label: '📈 تقدم المرضى' },
  { id: 'labs', label: '🧪 اتجاهات التحاليل' },
  { id: 'preauth', label: '📋 ما قبل التفويض' },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('monthly')

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>التقارير</h1>
        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
          Reports · {new Date().toLocaleDateString('ar-EG')}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeTab === tab.id ? '#1a8a78' : '#fff',
            color: activeTab === tab.id ? '#fff' : '#4a5580',
            fontSize: 12, fontWeight: 600,
            boxShadow: activeTab === tab.id ? 'none' : 'inset 0 0 0 1.5px #dde2ee',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'monthly' && <MonthlyReportTab />}
      {activeTab === 'progress' && <PatientProgressTab />}
      {activeTab === 'labs' && <LabTrendsTab />}
      {activeTab === 'preauth' && <PreauthTab />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// TAB 1: التقرير الشهري
// ────────────────────────────────────────────────────────────
function MonthlyReportTab() {
  const { loading, getMonthlyReport, exportCsv } = useReporting()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [report, setReport] = useState<SessionReport | null>(null)
  const [exporting, setExporting] = useState(false)

  const loadReport = useCallback(async () => {
    const r = await getMonthlyReport(year, month)
    setReport(r)
  }, [year, month, getMonthlyReport])

  useEffect(() => { loadReport() }, [loadReport])

  async function handleExport() {
    setExporting(true)
    const csv = await exportCsv(year, month)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chemo_sessions_${year}_${String(month).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={selectStyle}>
          {MONTH_NAMES_AR.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={selectStyle}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={handleExport} disabled={exporting} style={{
          padding: '8px 18px', background: '#1a8a78', color: '#fff', border: 'none',
          borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: exporting ? .6 : 1,
          marginRight: 'auto',
        }}>
          {exporting ? 'جارٍ التصدير...' : '⬇️ تصدير CSV'}
        </button>
      </div>

      {loading || !report ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
      ) : (
        <>
          {/* Main stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard label="إجمالي الجلسات" value={report.totalSessions} color="#0b1f3a" bg="#f7f8fc" icon="💊" />
            <StatCard label="مكتملة" value={report.completedSessions} color="#16a34a" bg="#f0fdf4" icon="✅" />
            <StatCard label="مؤجلة" value={report.postponedSessions} color="#b45309" bg="#fff3cd" icon="⏸️" />
            <StatCard label="ملغية" value={report.cancelledSessions} color="#e53e3e" bg="#fde8e8" icon="✕" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Completion rate */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>معدل الإتمام</p>
              </div>
              <div style={{ padding: '24px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 48, fontWeight: 700, color: report.completionRate >= 70 ? '#16a34a' : '#b45309', margin: 0, fontFamily: 'DM Mono' }}>
                  {report.completionRate}%
                </p>
                <p style={{ fontSize: 11, color: '#8e97b5', margin: '8px 0 16px' }}>
                  {report.completedSessions} من {report.totalSessions} جلسة
                </p>
                <div style={{ height: 10, background: '#eef0f6', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${report.completionRate}%`,
                    background: report.completionRate >= 70 ? '#16a34a' : '#b45309',
                    borderRadius: 20,
                  }} />
                </div>
                <p style={{ fontSize: 10, color: '#8e97b5', margin: '16px 0 0', fontFamily: 'DM Mono' }}>
                  متوسط {report.avgSessionsPerDay} جلسة/يوم · {report.uniquePatients} مريض
                </p>
              </div>
            </div>

            {/* Protocol breakdown */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>حسب البروتوكول</p>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {Object.keys(report.protocolBreakdown).length === 0 ? (
                  <p style={{ fontSize: 11, color: '#8e97b5', textAlign: 'center', padding: 20 }}>لا توجد بيانات</p>
                ) : Object.entries(report.protocolBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([protocol, count]) => (
                    <div key={protocol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eef0f6' }}>
                      <span style={{ fontSize: 12, color: '#4a5580' }}>{protocol}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: '#1a8a78', fontFamily: 'DM Mono',
                        background: '#e6f7f4', padding: '2px 10px', borderRadius: 20,
                      }}>
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// TAB 2: تقدم المرضى
// ────────────────────────────────────────────────────────────
function PatientProgressTab() {
  const { loading, getPatientProgressReport } = useReporting()
  const [reports, setReports] = useState<PatientProgressReport[]>([])

  useEffect(() => {
    async function load() {
      const data = await getPatientProgressReport()
      setReports(data)
    }
    load()
  }, [getPatientProgressReport])

  const statusAr: Record<string, string> = { active: 'نشطة', on_hold: 'متوقفة مؤقتًا' }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
  if (reports.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
        لا توجد خطط علاج نشطة حاليًا
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f7f8fc', borderBottom: '1.5px solid #dde2ee' }}>
            {['المريض', 'البروتوكول', 'التقدم', 'آخر جلسة', 'الجلسة القادمة', 'الحالة', 'تعديلات جرعة'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((r, i) => (
            <tr key={r.patientId} style={{ borderBottom: '1px solid #eef0f6', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
              <td style={tdStyle}>
                <p style={{ margin: 0, fontWeight: 700, color: '#0b1f3a' }}>{r.patientName}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{r.mrn}</p>
              </td>
              <td style={tdStyle}>{r.protocol}</td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 60, height: 6, background: '#eef0f6', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.progressPct}%`, background: '#1a8a78' }} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#4a5580' }}>
                    {r.completedCycles}/{r.plannedCycles}
                  </span>
                </div>
              </td>
              <td style={{ ...tdStyle, fontFamily: 'DM Mono', fontSize: 10 }}>{r.lastSessionDate || '—'}</td>
              <td style={{ ...tdStyle, fontFamily: 'DM Mono', fontSize: 10 }}>{r.nextSessionDate || '—'}</td>
              <td style={tdStyle}>
                <span style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 20,
                  background: r.status === 'active' ? '#e6f7f4' : '#fff3cd',
                  color: r.status === 'active' ? '#1a8a78' : '#b45309',
                  fontWeight: 600,
                }}>
                  {statusAr[r.status] || r.status}
                </span>
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {r.doseModifications > 0 ? (
                  <span style={{ color: '#b45309', fontWeight: 700 }}>{r.doseModifications}</span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// TAB 3: اتجاهات التحاليل
// ────────────────────────────────────────────────────────────
function LabTrendsTab() {
  const { loading, getLabTrends } = useReporting()
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [trends, setTrends] = useState<LabTrendReport[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function loadPatients() {
      const { data } = await supabase
        .from('patients')
        .select('id, mrn, first_name_ar, last_name_ar')
        .is('archived_at', null)
        .order('first_name_ar')
      setPatients(data || [])
    }
    loadPatients()
  }, [])

  useEffect(() => {
    async function loadTrends() {
      if (!selectedPatient) { setTrends([]); return }
      const data = await getLabTrends(selectedPatient)
      setTrends(data)
    }
    loadTrends()
  }, [selectedPatient, getLabTrends])

  function labColor(value: number | null, low: number, veryLow: number) {
    if (value === null) return '#8e97b5'
    if (value < veryLow) return '#e53e3e'
    if (value < low) return '#b45309'
    return '#16a34a'
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} style={{ ...selectStyle, minWidth: 280 }}>
          <option value="">— اختر مريضًا —</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.first_name_ar} {p.last_name_ar} · {p.mrn}</option>
          ))}
        </select>
      </div>

      {!selectedPatient ? (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
          اختر مريضًا لعرض اتجاهات التحاليل عبر الدورات
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
      ) : trends.length === 0 ? (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
          لا توجد جلسات مكتملة لهذا المريض بعد
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f7f8fc', borderBottom: '1.5px solid #dde2ee' }}>
                {['الدورة', 'التاريخ', 'WBC', 'ANC', 'Hgb', 'PLT', 'الحالة'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trends.map((t, i) => (
                <tr key={t.sessionId} style={{ borderBottom: '1px solid #eef0f6', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                  <td style={{ ...tdStyle, fontFamily: 'DM Mono', fontWeight: 700 }}>{t.cycleNumber}</td>
                  <td style={{ ...tdStyle, fontFamily: 'DM Mono', fontSize: 10 }}>{t.sessionDate}</td>
                  <td style={{ ...tdStyle, fontFamily: 'DM Mono', color: labColor(t.wbc, 3.5, 2.0), fontWeight: 700 }}>{t.wbc ?? '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'DM Mono', color: labColor(t.anc, 1.5, 1.0), fontWeight: 700 }}>{t.anc ?? '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'DM Mono', color: labColor(t.hgb, 9.0, 7.0), fontWeight: 700 }}>{t.hgb ?? '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'DM Mono', color: labColor(t.plt, 100, 50), fontWeight: 700 }}>{t.plt ?? '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 20,
                      background: t.labsCleared ? '#f0fdf4' : '#fde8e8',
                      color: t.labsCleared ? '#16a34a' : '#e53e3e',
                      fontWeight: 600,
                    }}>
                      {t.labsCleared ? '✅ معتمدة' : '⚠️ غير معتمدة'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// TAB 4: ما قبل التفويض
// ────────────────────────────────────────────────────────────
function PreauthTab() {
  const { getPreauthReport } = useReporting()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getPreauthReport()
      setItems(data)
      setLoading(false)
    }
    load()
  }, [getPreauthReport])

  const preauthStatusAr: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'قيد الانتظار', color: '#b45309', bg: '#fff3cd' },
    approved: { label: 'معتمد', color: '#16a34a', bg: '#f0fdf4' },
    rejected: { label: 'مرفوض', color: '#e53e3e', bg: '#fde8e8' },
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>

  return (
    <div>
      <p style={{ fontSize: 11, color: '#8e97b5', marginBottom: 16 }}>
        الجلسات المجدولة خلال 7 أيام القادمة والمحتاجة موافقة تأمين مسبقة
      </p>
      {items.length === 0 ? (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8e97b5' }}>
          لا توجد جلسات محتاجة تفويض حاليًا
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it: any) => {
            const cfg = preauthStatusAr[it.preauth_status] || preauthStatusAr.pending
            const insurance = it.patient?.insurance?.[0]
            return (
              <div key={it.id} style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'center', minWidth: 60, paddingLeft: 16, borderLeft: '1px solid #eef0f6' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#0b1f3a', margin: 0, fontFamily: 'DM Mono' }}>
                    {it.session_date?.split('-')[2]}
                  </p>
                  <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono' }}>
                    {new Date(it.session_date).toLocaleString('ar-EG', { month: 'short' })}
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
                    {it.patient?.first_name_ar} {it.patient?.last_name_ar}
                  </p>
                  <p style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 6px' }}>
                    {it.patient?.mrn} · {it.plan?.protocol_name || 'بدون بروتوكول'} · دورة {it.cycle_number}
                  </p>
                  {insurance && (
                    <p style={{ fontSize: 10, color: '#4a5580', margin: 0 }}>
                      {insurance.provider_name} · {insurance.policy_number}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: 10, padding: '4px 12px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// عناصر مساعدة مشتركة
// ────────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon }: { label: string; value: number; color: string; bg: string; icon: string }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0, fontFamily: 'DM Mono' }}>{value}</p>
        <p style={{ fontSize: 10, color: '#8e97b5', margin: 0 }}>{label}</p>
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '8px 14px', border: '1.5px solid #dde2ee', borderRadius: 8,
  fontSize: 12, fontFamily: 'Cairo, sans-serif', outline: 'none', background: '#fff',
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'right', fontSize: 10, fontFamily: 'DM Mono, monospace',
  color: '#8e97b5', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700,
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
}
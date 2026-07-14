'use client'
import { useParams, useRouter } from 'next/navigation'
import { useMedicalRecord } from '@/lib/hooks/useMedicalRecord'

const STATUS_AR: Record<string, string> = {
    scheduled: 'مجدولة', completed: 'مكتملة', postponed: 'مؤجلة', cancelled: 'ملغية', upcoming: 'قادمة',
}
const PLAN_STATUS_AR: Record<string, string> = {
    planned: 'مخططة', active: 'نشطة', on_hold: 'متوقفة مؤقتًا', completed: 'مكتملة', discontinued: 'موقوفة', cancelled: 'ملغية',
}

export default function MedicalReportPage() {
    const { id } = useParams()
    const router = useRouter()
    const { data, loading, error } = useMedicalRecord(id as string)

    if (loading) {
        return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Cairo, sans-serif', color: '#8e97b5' }}>جارٍ تجهيز التقرير...</div>
    }
    if (error || !data?.patient) {
        return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Cairo, sans-serif', color: '#e53e3e' }}>تعذر تحميل بيانات المريض</div>
    }

    const { patient, diagnoses, biomarkers, medicalHistory, treatmentPlans, chemoSessions } = data
    const latestDiagnosis = diagnoses[0] || null
    const age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    const completedSessions = chemoSessions.filter(s => s.status === 'completed')

    return (
        <div style={{ fontFamily: 'Cairo, sans-serif', background: '#f7f8fc', minHeight: '100vh' }}>
            {/* شريط الأدوات — يختفي عند الطباعة */}
            <div className="no-print" style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: '#0b1f3a', padding: '14px 28px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                direction: 'rtl',
            }}>
                <button onClick={() => router.back()} style={{
                    background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
                    color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                }}>
                    ← رجوع
                </button>
                <button onClick={() => window.print()} style={{
                    background: '#1a8a78', border: 'none', color: '#fff',
                    padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    🖨️ طباعة / حفظ كـ PDF
                </button>
            </div>

            {/* محتوى التقرير */}
            <div className="report-page" style={{
                maxWidth: 820, margin: '24px auto', background: '#fff',
                padding: '40px 48px', direction: 'rtl', color: '#1e2540',
                boxShadow: '0 4px 20px rgba(0,0,0,.06)', borderRadius: 12,
            }}>

                {/* رأس التقرير */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1a8a78', paddingBottom: 16, marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>مركز الأمل للأورام</h1>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono, monospace', margin: '4px 0 0' }}>
                            Oncology Center · Medical Report
                        </p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono, monospace' }}>تاريخ الإصدار</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#4a5580', margin: '2px 0 0', fontFamily: 'DM Mono, monospace', direction: 'ltr' }}>
                            {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* بيانات المريض */}
                <SectionTitle icon="👤" ar="بيانات المريض" en="Patient Information" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <InfoBox label="الاسم" value={`${patient.first_name_ar} ${patient.last_name_ar}`} />
                    <InfoBox label="MRN" value={patient.mrn} mono />
                    <InfoBox label="العمر / الجنس" value={`${age} سنة · ${patient.sex === 'M' ? 'ذكر' : 'أنثى'}`} />
                    <InfoBox label="تاريخ الميلاد" value={patient.date_of_birth} mono />
                    <InfoBox label="الموبايل" value={patient.mobile_primary} mono />
                    <InfoBox label="الجنسية" value={patient.nationality} />
                </div>

                {/* التشخيص */}
                <SectionTitle icon="🔬" ar="التشخيص" en="Diagnosis" />
                {latestDiagnosis ? (
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 10 }}>
                            <InfoBox label="الموقع الأساسي" value={latestDiagnosis.primary_site} />
                            <InfoBox label="ICD-10" value={latestDiagnosis.icd10_code} mono />
                            <InfoBox label="النمط النسيجي" value={latestDiagnosis.histology} />
                            <InfoBox label="المرحلة" value={latestDiagnosis.stage || '—'} />
                            <InfoBox label="الدرجة" value={latestDiagnosis.grade || '—'} />
                            <InfoBox label="TNM" value={`${latestDiagnosis.tnm_t || '—'} ${latestDiagnosis.tnm_n || '—'} ${latestDiagnosis.tnm_m || '—'}`} mono />
                            <InfoBox label="القصد العلاجي" value={latestDiagnosis.treatment_intent || '—'} />
                            <InfoBox label="تاريخ التشخيص" value={latestDiagnosis.date_of_diagnosis} mono />
                            <InfoBox label="نقائل بعيدة" value={latestDiagnosis.is_metastatic ? 'نعم' : 'لا'} />
                        </div>

                        {biomarkers.length > 0 && (
                            <>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#4a5580', margin: '14px 0 8px' }}>العلامات الجزيئية / Biomarkers</p>
                                {biomarkers.map((b, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                                        {['er_status', 'pr_status', 'her2_status', 'kras_status', 'egfr_status', 'braf_status', 'alk_status', 'msi_status'].map(f => (
                                            b[f] ? <InfoBox key={f} label={f.replace('_status', '').toUpperCase()} value={b[f]} small /> : null
                                        ))}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                ) : (
                    <EmptyNote text="لا يوجد تشخيص مسجل" />
                )}

                {/* التاريخ المرضي */}
                <SectionTitle icon="📋" ar="التاريخ المرضي" en="Medical History" />
                {medicalHistory ? (
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 10 }}>
                            <InfoBox label="ECOG PS" value={medicalHistory.ecog_ps ?? '—'} />
                            <InfoBox label="BSA" value={medicalHistory.bsa ? `${medicalHistory.bsa} m²` : '—'} mono />
                            <InfoBox label="الوزن / الطول" value={`${medicalHistory.weight_kg ?? '—'} kg / ${medicalHistory.height_cm ?? '—'} cm`} mono />
                        </div>
                        <InfoBox label="الحساسية الدوائية" value={medicalHistory.drug_allergies || 'NKDA'} full />
                        {medicalHistory.previous_surgeries && <InfoBox label="جراحات سابقة" value={medicalHistory.previous_surgeries} full />}
                        {medicalHistory.family_hx_malignancy && <InfoBox label="تاريخ عائلي للأورام" value={medicalHistory.family_hx_malignancy} full />}
                    </div>
                ) : (
                    <EmptyNote text="لا يوجد تاريخ مرضي مسجل" />
                )}

                {/* خطط العلاج */}
                <SectionTitle icon="🧬" ar="خطط العلاج" en="Treatment Plans" />
                {treatmentPlans.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 24 }}>
                        <thead>
                            <tr style={{ background: '#f7f8fc' }}>
                                <Th>البروتوكول</Th><Th>القصد</Th><Th>البدء</Th><Th>الدورات</Th><Th>الحالة</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {treatmentPlans.map((p: any) => (
                                <tr key={p.id}>
                                    <Td>{p.protocol_name}</Td>
                                    <Td>{p.intent}</Td>
                                    <Td mono>{p.start_date}</Td>
                                    <Td mono>{p.completed_cycles} / {p.planned_cycles}</Td>
                                    <Td>{PLAN_STATUS_AR[p.status] || p.status}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyNote text="لا توجد خطط علاج مسجلة" />
                )}

                {/* سجل الجلسات */}
                <SectionTitle icon="💊" ar={`سجل الجلسات (${completedSessions.length} مكتملة من ${chemoSessions.length})`} en="Session History" />
                {chemoSessions.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 24 }}>
                        <thead>
                            <tr style={{ background: '#f7f8fc' }}>
                                <Th>التاريخ</Th><Th>الدورة</Th><Th>البروتوكول</Th><Th>الحالة</Th><Th>WBC</Th><Th>ANC</Th><Th>Hgb</Th><Th>PLT</Th><Th>تعديل جرعة</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {chemoSessions.map((s: any) => (
                                <tr key={s.id}>
                                    <Td mono>{s.session_date}</Td>
                                    <Td mono>{s.cycle_number}</Td>
                                    <Td>{s.plan?.protocol_name || '—'}</Td>
                                    <Td>{STATUS_AR[s.status] || s.status}</Td>
                                    <Td mono>{s.wbc_pre ?? '—'}</Td>
                                    <Td mono>{s.anc_pre ?? '—'}</Td>
                                    <Td mono>{s.hgb_pre ?? '—'}</Td>
                                    <Td mono>{s.plt_pre ?? '—'}</Td>
                                    <Td>{s.dose_modified ? `${s.dose_mod_pct ?? ''}%` : '—'}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyNote text="لا توجد جلسات مسجلة" />
                )}

                {/* الآثار الجانبية المسجلة */}
                {chemoSessions.some((s: any) => s.adverse_events) && (
                    <>
                        <SectionTitle icon="⚠️" ar="الآثار الجانبية المسجلة" en="Adverse Events" />
                        <div style={{ marginBottom: 24 }}>
                            {chemoSessions.filter((s: any) => s.adverse_events).map((s: any) => (
                                <div key={s.id} style={{ fontSize: 11, padding: '8px 0', borderBottom: '1px solid #eef0f6' }}>
                                    <span style={{ fontFamily: 'DM Mono, monospace', color: '#8e97b5', marginLeft: 10 }}>{s.session_date}</span>
                                    {s.adverse_events}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* تذييل */}
                <div style={{ borderTop: '1px solid #eef0f6', paddingTop: 16, marginTop: 32, fontSize: 9, color: '#8e97b5', textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>
                    هذا التقرير تم إنشاؤه إلكترونيًا من نظام إدارة مركز كابيتال مصر للأورام بتاريخ {new Date().toLocaleString('ar-EG')}
                </div>
            </div>

            <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-page {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
          @page {
            size: A4;
            margin: 1.5cm;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
        </div>
    )
}

// ── مكوّنات مساعدة صغيرة للتقرير ──
function SectionTitle({ icon, ar, en }: { icon: string; ar: string; en: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 }}>
            <span style={{ fontSize: 15 }}>{icon}</span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{ar}</h2>
            <span style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono, monospace' }}>{en}</span>
        </div>
    )
}

function InfoBox({ label, value, mono, full, small }: { label: string; value: any; mono?: boolean; full?: boolean; small?: boolean }) {
    return (
        <div style={{ gridColumn: full ? '1 / -1' : undefined, marginBottom: small ? 0 : undefined }}>
            <p style={{ fontSize: 9, color: '#8e97b5', margin: '0 0 2px', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
            <p style={{ fontSize: small ? 11 : 12, fontWeight: 600, color: '#1e2540', margin: 0, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>{value || '—'}</p>
        </div>
    )
}

function EmptyNote({ text }: { text: string }) {
    return <p style={{ fontSize: 11, color: '#8e97b5', fontStyle: 'italic', marginBottom: 24 }}>{text}</p>
}

function Th({ children }: { children: React.ReactNode }) {
    return <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono, monospace', borderBottom: '1.5px solid #dde2ee' }}>{children}</th>
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
    return <td style={{ padding: '6px 8px', borderBottom: '1px solid #eef0f6', fontFamily: mono ? 'DM Mono, monospace' : undefined }}>{children}</td>
}
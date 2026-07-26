'use client'
import { useMedicalRecord } from '@/lib/hooks/useMedicalRecord'

const STATUS_AR: Record<string, string> = {
    scheduled: 'مجدولة', completed: 'مكتملة', postponed: 'مؤجلة', cancelled: 'ملغية', upcoming: 'قادمة',
}
const PLAN_STATUS_AR: Record<string, string> = {
    planned: 'مخططة', active: 'نشطة', on_hold: 'متوقفة مؤقتًا', completed: 'مكتملة', discontinued: 'موقوفة', cancelled: 'ملغية',
}
const IMAGING_TYPE_LABELS: Record<string, string> = {
    xray: 'X-Ray', ct: 'CT', pet: 'PET', pet_ct: 'PET/CT', bone_scan: 'Bone Scan',
    mri: 'MRI', ultrasound: 'Ultrasound', echo: 'Echo', ecg: 'ECG', eeg: 'EEG',
    upper_endoscopy: 'Upper Endoscopy', colonoscopy: 'Colonoscopy', psma: 'PSMA', trus: 'TRUS', tvus: 'TVUS',
}
const CATEGORY_LABELS: Record<string, string> = {
    cbc: 'CBC', chemistry: 'Chemistry', tumor_markers: 'Tumor Markers',
    coagulation: 'Coagulation', liver_function: 'Liver Function', kidney_function: 'Kidney Function', other: 'Other',
}

function bmiCategory(bmi: number | null): string {
    if (bmi === null) return '—'
    if (bmi < 18.5) return 'Underweight'
    if (bmi < 25) return 'Normal'
    if (bmi < 30) return 'Overweight'
    return 'Obese'
}

export default function MedicalReportPage() {
    const { id } = require('next/navigation').useParams()
    const router = require('next/navigation').useRouter()
    const { data, loading, error } = useMedicalRecord(id as string)

    if (loading) {
        return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Cairo, sans-serif', color: '#8e97b5' }}>جارٍ تجهيز التقرير...</div>
    }
    if (error || !data?.patient) {
        return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Cairo, sans-serif', color: '#e53e3e' }}>تعذر تحميل بيانات المريض</div>
    }

    const {
        patient, diagnoses, pathologyTests, priorProtocols, medicalHistory, vitalSigns,
        treatmentPlans, chemoSessions, labResults, imagingStudies,
    } = data

    const latestDiagnosis = diagnoses[0] || null
    const age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    const completedSessions = chemoSessions.filter((s: any) => s.status === 'completed')
    const ihcTests = pathologyTests.filter((t: any) => t.category === 'ihc')
    const molecularTests = pathologyTests.filter((t: any) => t.category === 'molecular')
    const criticalLabs = labResults.filter((l: any) => l.is_critical)

    return (
        <div style={{ fontFamily: 'Cairo, sans-serif', background: '#f7f8fc', minHeight: '100vh' }}>
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
                }}>
                    طباعة / حفظ كـ PDF
                </button>
            </div>

            <div className="report-page" style={{
                maxWidth: 900, margin: '24px auto', background: '#fff',
                padding: '40px 48px', direction: 'rtl', color: '#1e2540',
                boxShadow: '0 4px 20px rgba(0,0,0,.06)', borderRadius: 12,
            }}>

                {/* رأس التقرير */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1a8a78', paddingBottom: 16, marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>مركز الأمل للأورام</h1>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono, monospace', margin: '4px 0 0' }}>Oncology Center · Comprehensive Medical Report</p>
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
                    <InfoBox label="الجنسية" value={patient.nationality || '—'} />
                    {patient.marital_status && <InfoBox label="الحالة الاجتماعية" value={patient.marital_status} />}
                    {patient.num_children != null && <InfoBox label="عدد الأطفال" value={patient.num_children} />}
                </div>

                {/* القياسات الجسدية والتغذية */}
                {medicalHistory && (medicalHistory.weight_kg || medicalHistory.bmi) && (
                    <>
                        <SectionTitle icon="📏" ar="القياسات الجسدية والتغذية" en="Anthropometrics & Nutrition" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
                            <InfoBox label="الوزن" value={medicalHistory.weight_kg ? `${medicalHistory.weight_kg} kg` : '—'} mono />
                            <InfoBox label="الطول" value={medicalHistory.height_cm ? `${medicalHistory.height_cm} cm` : '—'} mono />
                            <InfoBox label="BSA" value={medicalHistory.bsa ? `${medicalHistory.bsa} m²` : '—'} mono />
                            <InfoBox label="BMI" value={medicalHistory.bmi ? `${medicalHistory.bmi} (${bmiCategory(medicalHistory.bmi)})` : '—'} mono />
                            <InfoBox label="Nutri Score" value={medicalHistory.nutri_score ?? '—'} mono />
                        </div>
                    </>
                )}

                {/* العلامات الحيوية */}
                {vitalSigns.length > 0 && (
                    <>
                        <SectionTitle icon="❤️" ar={`العلامات الحيوية (${vitalSigns.length} قراءة)`} en="Vital Signs" />
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 24 }}>
                            <thead>
                                <tr style={{ background: '#f7f8fc' }}>
                                    <Th>التاريخ</Th><Th>Temp</Th><Th>BP</Th><Th>Pulse</Th><Th>RR</Th><Th>SpO2</Th><Th>Pain</Th><Th>Pallor</Th><Th>Jaundice</Th><Th>HBV</Th><Th>HCV</Th><Th>HIV</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {vitalSigns.slice(0, 10).map((v: any) => (
                                    <tr key={v.id}>
                                        <Td mono>{new Date(v.recorded_at).toLocaleDateString('ar-EG')}</Td>
                                        <Td mono>{v.temperature_c ?? '—'}</Td>
                                        <Td mono>{v.bp_systolic ? `${v.bp_systolic}/${v.bp_diastolic}` : '—'}</Td>
                                        <Td mono>{v.pulse_bpm ?? '—'}</Td>
                                        <Td mono>{v.respiratory_rate ?? '—'}</Td>
                                        <Td mono>{v.spo2_pct ?? '—'}</Td>
                                        <Td mono>{v.pain_score ?? '—'}</Td>
                                        <Td>{v.pallor == null ? '—' : v.pallor ? 'Yes' : 'No'}</Td>
                                        <Td>{v.jaundice == null ? '—' : v.jaundice ? 'Yes' : 'No'}</Td>
                                        <Td>{v.hbv_status ?? '—'}</Td>
                                        <Td>{v.hcv_status ?? '—'}</Td>
                                        <Td>{v.hiv_status ?? '—'}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* التشخيص */}
                <SectionTitle icon="🔬" ar="التشخيص" en="Diagnosis" />
                {latestDiagnosis ? (
                    <div style={{ marginBottom: 24 }}>
                        {latestDiagnosis.confirmed_cancer_patient && (
                            <div style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                                ✓ Confirmed Cancer Patient
                            </div>
                        )}
                        {latestDiagnosis.chief_complaint && (
                            <div style={{ marginBottom: 12 }}>
                                <InfoBox label="Chief Complaint" value={latestDiagnosis.chief_complaint} full />
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 10 }}>
                            <InfoBox label="الموقع الأساسي" value={latestDiagnosis.primary_site} />
                            <InfoBox label="ICD-10" value={latestDiagnosis.icd10_code} mono />
                            <InfoBox label="النمط النسيجي" value={latestDiagnosis.histology} />
                            {latestDiagnosis.double_primary && (
                                <>
                                    <InfoBox label="الموقع الثاني" value={latestDiagnosis.primary_site_2} />
                                    <InfoBox label="ICD-10 (2)" value={latestDiagnosis.icd10_code_2} mono />
                                    <InfoBox label="النمط النسيجي (2)" value={latestDiagnosis.histology_2} />
                                </>
                            )}
                            <InfoBox label="المرحلة" value={latestDiagnosis.stage || '—'} />
                            <InfoBox label="الدرجة" value={latestDiagnosis.grade || '—'} />
                            <InfoBox label="TNM" value={`${latestDiagnosis.tnm_t || '—'} ${latestDiagnosis.tnm_n || '—'} ${latestDiagnosis.tnm_m || '—'}`} mono />
                            <InfoBox label="القصد العلاجي" value={latestDiagnosis.treatment_intent || '—'} />
                            <InfoBox label="تاريخ التشخيص" value={latestDiagnosis.date_of_diagnosis} mono />
                            <InfoBox label="نقائل بعيدة" value={latestDiagnosis.is_metastatic ? `نعم (${latestDiagnosis.metastatic_sites || '—'})` : 'لا'} />
                        </div>

                        {latestDiagnosis.final_pathology_report && (
                            <div style={{ background: '#f7f8fc', borderRadius: 8, padding: 12, marginTop: 8 }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', margin: '0 0 6px' }}>Final Pathology Report</p>
                                <p style={{ fontSize: 11, color: '#4a5580', margin: 0, lineHeight: 1.6 }}>{latestDiagnosis.final_pathology_report}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <EmptyNote text="لا يوجد تشخيص مسجل" />
                )}

                {/* IHC & Molecular */}
                {(ihcTests.length > 0 || molecularTests.length > 0) && (
                    <>
                        <SectionTitle icon="🧬" ar="العلامات الجزيئية" en="Pathology Biomarkers" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>IHC</p>
                                {ihcTests.length === 0 ? <p style={{ fontSize: 11, color: '#8e97b5' }}>—</p> : ihcTests.map((t: any) => (
                                    <div key={t.id} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid #eef0f6' }}>
                                        <strong>{t.test_name}</strong>: {t.result_numeric ?? t.result_text ?? '—'} {t.test_date ? `(${t.test_date})` : ''}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>Molecular</p>
                                {molecularTests.length === 0 ? <p style={{ fontSize: 11, color: '#8e97b5' }}>—</p> : molecularTests.map((t: any) => (
                                    <div key={t.id} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid #eef0f6' }}>
                                        <strong>{t.test_name}</strong>: {t.result_numeric ?? t.result_text ?? '—'} {t.test_date ? `(${t.test_date})` : ''}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* بروتوكولات علاج سابقة */}
                {priorProtocols.length > 0 && (
                    <>
                        <SectionTitle icon="📜" ar="بروتوكولات علاج سابقة" en="Prior Treatment Protocols" />
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 24 }}>
                            <thead>
                                <tr style={{ background: '#f7f8fc' }}>
                                    <Th>البروتوكول</Th><Th>عدد الدورات</Th><Th>المدة (أشهر)</Th><Th>ملاحظات</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {priorProtocols.map((p: any) => (
                                    <tr key={p.id}>
                                        <Td>{p.protocol_name}</Td>
                                        <Td mono>{p.num_cycles ?? '—'}</Td>
                                        <Td mono>{p.duration_months ?? '—'}</Td>
                                        <Td>{p.notes ?? '—'}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* التاريخ المرضي */}
                <SectionTitle icon="📋" ar="التاريخ المرضي" en="Medical History" />
                {medicalHistory ? (
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 10 }}>
                            <InfoBox label="ECOG PS" value={medicalHistory.ecog_ps ?? '—'} />
                            <InfoBox label="Smoking" value={medicalHistory.smoking_status ?? '—'} />
                            {medicalHistory.smoking_status === 'cigarettes' && (
                                <InfoBox label="Pack/day · Years" value={`${medicalHistory.cigarettes_pack_per_day ?? '—'} / ${medicalHistory.cigarettes_duration_years ?? '—'}`} />
                            )}
                            {medicalHistory.menstrual_status && <InfoBox label="Menstrual Status" value={medicalHistory.menstrual_status} />}
                            <InfoBox label="الحساسية الدوائية" value={medicalHistory.drug_allergies || 'NKDA'} />
                            {medicalHistory.oncology_fh && (
                                <InfoBox label="Oncology FH" value={`${medicalHistory.oncology_fh_person || '—'} · ${medicalHistory.oncology_fh_type || '—'}`} />
                            )}
                        </div>
                        {medicalHistory.previous_surgeries && <InfoBox label="جراحات سابقة" value={medicalHistory.previous_surgeries} full />}
                        {medicalHistory.family_history_conditions?.length > 0 && (
                            <InfoBox label="تاريخ عائلي" value={medicalHistory.family_history_conditions.join(', ')} full />
                        )}
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
                <SectionTitle icon="💊" ar={`سجل جلسات الكيماوي (${completedSessions.length} مكتملة من ${chemoSessions.length})`} en="Chemotherapy Session History" />
                {chemoSessions.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 24 }}>
                        <thead>
                            <tr style={{ background: '#f7f8fc' }}>
                                <Th>التاريخ</Th><Th>الدورة</Th><Th>البروتوكول</Th><Th>الحالة</Th><Th>WBC</Th><Th>ANC</Th><Th>Hgb</Th><Th>PLT</Th><Th>تعديل جرعة</Th><Th>آثار جانبية</Th>
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
                                    <Td>{s.adverse_events ? 'نعم' : '—'}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyNote text="لا توجد جلسات مسجلة" />
                )}

                {/* نتائج المختبر */}
                <SectionTitle icon="🧪" ar={`نتائج المختبر (${labResults.length}${criticalLabs.length > 0 ? ` · ${criticalLabs.length} حرجة` : ''})`} en="Laboratory Results" />
                {labResults.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 24 }}>
                        <thead>
                            <tr style={{ background: '#f7f8fc' }}>
                                <Th>التاريخ</Th><Th>القسم</Th><Th>التحليل</Th><Th>النتيجة</Th><Th>المعدل الطبيعي</Th><Th>الحالة</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {labResults.map((l: any) => (
                                <tr key={l.id} style={{ background: l.is_critical ? '#fef5f5' : undefined }}>
                                    <Td mono>{l.test_date}</Td>
                                    <Td>{CATEGORY_LABELS[l.test_category] || l.test_category}</Td>
                                    <Td>{l.test_name}</Td>
                                    <Td mono>{l.result_value ?? l.result_text ?? '—'} {l.unit || ''}</Td>
                                    <Td mono>{l.reference_range || '—'}</Td>
                                    <Td>{l.is_critical ? '🚨 حرج' : l.is_abnormal ? '⚠️ غير طبيعي' : '✅ طبيعي'}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyNote text="لا توجد نتائج مختبر مسجلة" />
                )}

                {/* دراسات الأشعة */}
                <SectionTitle icon="📷" ar={`دراسات الأشعة والتصوير (${imagingStudies.length})`} en="Imaging Studies" />
                {imagingStudies.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 24 }}>
                        <thead>
                            <tr style={{ background: '#f7f8fc' }}>
                                <Th>التاريخ</Th><Th>النوع</Th><Th>المنطقة</Th><Th>الحالة</Th><Th>تقييم الاستجابة</Th><Th>الانطباع</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {imagingStudies.map((im: any) => (
                                <tr key={im.id}>
                                    <Td mono>{im.study_date}</Td>
                                    <Td>{IMAGING_TYPE_LABELS[im.imaging_type] || im.imaging_type}</Td>
                                    <Td>{im.body_region || '—'}</Td>
                                    <Td>{im.status}</Td>
                                    <Td>{im.response_assessment || '—'}</Td>
                                    <Td>{im.impression ? (im.impression.length > 60 ? im.impression.slice(0, 60) + '…' : im.impression) : '—'}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyNote text="لا توجد دراسات أشعة مسجلة" />
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

                <div style={{ borderTop: '1px solid #eef0f6', paddingTop: 16, marginTop: 32, fontSize: 9, color: '#8e97b5', textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>
                    هذا التقرير تم إنشاؤه إلكترونيًا من نظام إدارة مركز الأمل للأورام بتاريخ {new Date().toLocaleString('ar-EG')}
                </div>
            </div>

            <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; }
          @page { size: A4; margin: 1.5cm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
        </div>
    )
}

function SectionTitle({ icon, ar, en }: { icon: string; ar: string; en: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 }}>
            <span style={{ fontSize: 15 }}>{icon}</span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{ar}</h2>
            <span style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono, monospace' }}>{en}</span>
        </div>
    )
}

function InfoBox({ label, value, mono, full }: { label: string; value: any; mono?: boolean; full?: boolean }) {
    return (
        <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
            <p style={{ fontSize: 9, color: '#8e97b5', margin: '0 0 2px', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1e2540', margin: 0, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>{value || '—'}</p>
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
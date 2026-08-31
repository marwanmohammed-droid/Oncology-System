'use client'
import { useParams, useRouter } from 'next/navigation'
import { useMedicalRecord } from '@/lib/hooks/useMedicalRecord'
import { JSX } from 'react/jsx-runtime'

const IMAGING_TYPE_LABELS: Record<string, string> = {
    xray: 'X-Ray', ct: 'CT', ct_chest: 'CT Chest', ct_abdomen_pelvis: 'CT Abdomen/Pelvis',
    pet: 'PET', pet_ct: 'PET-CT', bone_scan: 'Bone Scan', mri: 'MRI', mri_brain: 'MRI Brain',
    mri_spine: 'MRI Spine', ultrasound: 'Ultrasound', mammogram: 'Mammogram',
    echo: 'Echo', ecg: 'ECG', eeg: 'EEG', upper_endoscopy: 'Upper Endoscopy',
    colonoscopy: 'Colonoscopy', psma: 'PSMA PET-CT', dexa: 'DEXA', biopsy_guided_imaging: 'Biopsy-guided Imaging',
    other: 'Imaging',
}

type TimelineEvent = {
    date: string
    type: 'diagnosis' | 'imaging' | 'lab_group' | 'pathology' | 'plan_start' | 'session' | 'note'
    sortKey: number
    render: () => JSX.Element
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

    const {
        patient, diagnoses, pathologyTests, priorProtocols, medicalHistory, vitalSigns,
        treatmentPlans, chemoSessions, labResults, imagingStudies, progressNotes,
    } = data as any

    const latestDiagnosis = diagnoses[0] || null
    const age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))

    // ── بناء الـ Brief ── (ملخص سردي مختصر زي بداية الحالة)
    const briefParts: string[] = []
    briefParts.push(
        `${patient.first_name_en} ${patient.last_name_en}, ${age} yrs old ${patient.nationality || ''} ${patient.sex === 'M' ? 'male' : 'female'} patient` +
        (medicalHistory?.comorbidities?.length ? `, with history of ${medicalHistory.comorbidities.join(', ')}` : '')
    )
    if (latestDiagnosis?.chief_complaint) {
        briefParts.push(`presented complaining of ${latestDiagnosis.chief_complaint}`)
    }
    if (latestDiagnosis) {
        briefParts.push(
            `Diagnosed with ${latestDiagnosis.primary_site || 'malignancy'}` +
            (latestDiagnosis.histology ? ` (${latestDiagnosis.histology})` : '') +
            (latestDiagnosis.stage ? `, ${latestDiagnosis.stage}` : '') +
            (latestDiagnosis.is_metastatic ? `, metastatic to ${latestDiagnosis.metastatic_sites || 'distant sites'}` : '') +
            (latestDiagnosis.date_of_diagnosis ? ` on ${formatDateEn(latestDiagnosis.date_of_diagnosis)}` : '')
        )
    }
    if (priorProtocols?.length) {
        briefParts.push(`Prior treatment: ${priorProtocols.map((p: any) => `${p.protocol_name}${p.num_cycles ? ` (${p.num_cycles} cycles)` : ''}`).join(', ')}`)
    }
    const briefText = briefParts.join('. ') + '.'

    // ── بناء التايم لاين الموحّد ──
    const events: TimelineEvent[] = []

    // التشخيص
    diagnoses.forEach((d: any) => {
        if (!d.date_of_diagnosis) return
        events.push({
            date: d.date_of_diagnosis, type: 'diagnosis', sortKey: new Date(d.date_of_diagnosis).getTime(),
            render: () => (
                <EventCard icon="🔬" title={`Diagnosis: ${d.primary_site || '—'}`} date={d.date_of_diagnosis}>
                    <p>{d.histology || ''}{d.stage ? `, ${d.stage}` : ''}{d.grade ? `, ${d.grade}` : ''}</p>
                    {(d.tnm_t || d.tnm_n || d.tnm_m) && <p>TNM: {d.tnm_t || '—'} {d.tnm_n || '—'} {d.tnm_m || '—'}</p>}
                    {d.is_metastatic && <p>Metastatic to: {d.metastatic_sites || '—'}</p>}
                    {d.final_pathology_report && <p style={{ fontStyle: 'italic' }}>{d.final_pathology_report}</p>}
                </EventCard>
            ),
        })
    })

    // اختبارات الباثولوجي (IHC + Molecular) — مجمّعة حسب التاريخ
    const pathByDate: Record<string, any[]> = {}
        ; (pathologyTests || []).forEach((t: any) => {
            if (!t.test_date) return
            if (!pathByDate[t.test_date]) pathByDate[t.test_date] = []
            pathByDate[t.test_date].push(t)
        })
    Object.entries(pathByDate).forEach(([date, tests]) => {
        events.push({
            date, type: 'pathology', sortKey: new Date(date).getTime(),
            render: () => (
                <EventCard icon="🧬" title="Pathology / Biomarkers" date={date}>
                    {tests.map((t: any) => (
                        <p key={t.id}>{t.test_name} ({t.category === 'ihc' ? 'IHC' : 'Molecular'}): {t.result_numeric ?? t.result_text ?? '—'}{t.modality ? ` — ${t.modality}` : ''}</p>
                    ))}
                </EventCard>
            ),
        })
    })

        // الأشعة
        ; (imagingStudies || []).forEach((im: any) => {
            events.push({
                date: im.study_date, type: 'imaging', sortKey: new Date(im.study_date).getTime(),
                render: () => (
                    <EventCard
                        icon="📷"
                        title={`${im.imaging_type === 'other' && im.custom_type_label ? im.custom_type_label : IMAGING_TYPE_LABELS[im.imaging_type] || im.imaging_type}${im.body_region ? ` — ${im.body_region}` : ''}`}
                        date={im.study_date}
                    >
                        {im.findings && <p>{im.findings}</p>}
                        {im.impression && <p><strong>Impression:</strong> {im.impression}</p>}
                        {im.response_assessment && <p><strong>Response:</strong> {im.response_assessment.replace(/_/g, ' ')}</p>}
                        {!im.findings && !im.impression && <p style={{ color: '#8e97b5' }}>Pending report</p>}
                    </EventCard>
                ),
            })
        })

    // التحاليل — مجمّعة حسب التاريخ في كتلة واحدة
    const labsByDate: Record<string, any[]> = {}
        ; (labResults || []).forEach((l: any) => {
            if (!labsByDate[l.test_date]) labsByDate[l.test_date] = []
            labsByDate[l.test_date].push(l)
        })
    Object.entries(labsByDate).forEach(([date, labs]) => {
        events.push({
            date, type: 'lab_group', sortKey: new Date(date).getTime(),
            render: () => (
                <EventCard icon="🧪" title="Labs" date={date}>
                    <p>{labs.map((l: any) => `${l.test_name}: ${l.result_value ?? l.result_text ?? '—'}${l.unit ? ` ${l.unit}` : ''}`).join('   ')}</p>
                </EventCard>
            ),
        })
    })

        // خطط العلاج (بداية كل خطة)
        ; (treatmentPlans || []).forEach((p: any) => {
            events.push({
                date: p.start_date, type: 'plan_start', sortKey: new Date(p.start_date).getTime(),
                render: () => (
                    <EventCard icon="🧬" title={`Treatment plan started: ${p.protocol_name}`} date={p.start_date}>
                        <p>Intent: {p.intent} · Planned cycles: {p.planned_cycles}</p>
                    </EventCard>
                ),
            })
        })

        // جلسات الكيماوي (المكتملة فقط، عشان التايم لاين يعكس اللي حصل فعليًا)
        ; (chemoSessions || []).filter((s: any) => s.status === 'completed').forEach((s: any) => {
            const drugsText = (s.session_drugs || []).map((d: any) => `${d.drug_name}${d.actual_dose_mg ? ` ${d.actual_dose_mg}mg` : ''}`).join(', ')
            events.push({
                date: s.actual_date || s.session_date, type: 'session', sortKey: new Date(s.actual_date || s.session_date).getTime(),
                render: () => (
                    <EventCard icon="💊" title={`Cycle ${s.cycle_number} — ${s.plan?.protocol_name || 'Chemotherapy'}`} date={s.actual_date || s.session_date}>
                        {drugsText && <p>{drugsText}</p>}
                        {s.dose_modified && <p>Dose modified {s.dose_mod_pct}% — {s.dose_mod_reason || ''}</p>}
                        {s.adverse_events && <p><strong>Adverse events:</strong> {s.adverse_events}</p>}
                    </EventCard>
                ),
            })
        })

        // ملاحظات المتابعة (Progress Notes)
        ; (progressNotes || []).forEach((n: any) => {
            events.push({
                date: n.note_date, type: 'note', sortKey: new Date(n.note_date).getTime(),
                render: () => (
                    <EventCard icon="📝" title="Progress Note" date={n.note_date}>
                        {n.free_text ? <p>{n.free_text}</p> : (
                            <>
                                {n.subjective && <p><strong>S:</strong> {n.subjective}</p>}
                                {n.objective && <p><strong>O:</strong> {n.objective}</p>}
                                {n.assessment && <p><strong>A:</strong> {n.assessment}</p>}
                                {n.plan && <p><strong>P:</strong> {n.plan}</p>}
                            </>
                        )}
                    </EventCard>
                ),
            })
        })

    events.sort((a, b) => a.sortKey - b.sortKey)

    return (
        <div style={{ fontFamily: 'Cairo, sans-serif', background: '#f7f8fc', minHeight: '100vh' }}>
            <div className="no-print" style={{
                position: 'sticky', top: 0, zIndex: 50, background: '#0b1f3a', padding: '14px 28px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
            }}>
                <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    ← رجوع
                </button>
                <button onClick={() => window.print()} style={{ background: '#1a8a78', border: 'none', color: '#fff', padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    طباعة / حفظ كـ PDF
                </button>
            </div>

            <div className="report-page" style={{
                maxWidth: 820, margin: '24px auto', background: '#fff', padding: '40px 48px',
                color: '#1e2540', boxShadow: '0 4px 20px rgba(0,0,0,.06)', borderRadius: 12,
            }}>
                {/* رأس التقرير */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1a8a78', paddingBottom: 16, marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Oncology Center</h1>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono, monospace', margin: '4px 0 0' }}>Medical Report · {patient.mrn}</p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: 10, color: '#8e97b5', margin: 0, fontFamily: 'DM Mono, monospace' }}>Report Date</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#4a5580', margin: '2px 0 0', fontFamily: 'DM Mono, monospace' }}>
                            {new Date().toLocaleDateString('en-GB')}
                        </p>
                    </div>
                </div>

                {/* Brief */}
                <div style={{ marginBottom: 28 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 8px' }}>
                        Brief
                    </p>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: '#1e2540', margin: 0 }}>{briefText}</p>
                </div>

                {/* Timeline */}
                <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#8e97b5', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 14px' }}>
                        Clinical Timeline
                    </p>
                    {events.length === 0 ? (
                        <p style={{ fontSize: 12, color: '#8e97b5', fontStyle: 'italic' }}>No investigations or treatments recorded yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {events.map((e, i) => <div key={i}>{e.render()}</div>)}
                        </div>
                    )}
                </div>

                {/* توصيات (لو فيه آخر ملاحظة متابعة فيها خطة) */}
                <div style={{ borderTop: '1px solid #eef0f6', paddingTop: 16, marginTop: 32, fontSize: 9, color: '#8e97b5', textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>
                    Report generated electronically · {new Date().toLocaleString('en-GB')}
                </div>
            </div>

            <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; }
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>
        </div>
    )
}

function EventCard({ icon, title, date, children }: { icon: string; title: string; date: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid #eef0f6' }}>
            <div style={{ minWidth: 90, textAlign: 'left', flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#1a8a78', fontFamily: 'DM Mono, monospace', margin: 0 }}>
                    {formatDateEn(date)}
                </p>
            </div>
            <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0b1f3a', margin: '0 0 4px' }}>
                    <span style={{ marginLeft: 6 }}>{icon}</span>{title}
                </p>
                <div style={{ fontSize: 11, color: '#4a5580', lineHeight: 1.6 }}>{children}</div>
            </div>
        </div>
    )
}

function formatDateEn(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
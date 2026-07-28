'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { PRIMARY_SITES, HISTOLOGY_TYPES } from '@/lib/constants/medicalLists'

const schema = z.object({
  diagnosis: z.object({
    confirmed_cancer_patient: z.enum(['yes', 'no']).optional(),
    chief_complaint: z.string().optional().or(z.literal('')),
    double_primary: z.enum(['yes', 'no']).optional(),
    primary_site: z.string().optional().or(z.literal('')),
    icd10_code: z.string().optional().or(z.literal('')),
    histology: z.string().optional().or(z.literal('')),
    primary_site_2: z.string().optional().or(z.literal('')),
    icd10_code_2: z.string().optional().or(z.literal('')),
    histology_2: z.string().optional().or(z.literal('')),
    stage: z.string().optional().or(z.literal('')),
    grade: z.string().optional().or(z.literal('')),
    laterality: z.string().optional().or(z.literal('')),
    tnm_t: z.string().optional().or(z.literal('')),
    tnm_n: z.string().optional().or(z.literal('')),
    tnm_m: z.string().optional().or(z.literal('')),
    metastasis_flag: z.enum(['yes', 'no']).optional(),
    metastatic_sites: z.string().optional().or(z.literal('')),
    treatment_intent: z.string().optional().or(z.literal('')),
    date_of_diagnosis: z.string().optional().or(z.literal('')),
    sample_type: z.enum(['tissue', 'liquid']).optional(),
    liquid_type: z.string().optional().or(z.literal('')),
    final_pathology_report: z.string().optional().or(z.literal('')),
  }),
  history: z.object({
    previous_surgeries: z.string().optional().or(z.literal('')),
    previous_chemo: z.string().optional().or(z.literal('')),
    previous_radiation: z.string().optional().or(z.literal('')),
    drug_allergies: z.string().optional().or(z.literal('')),
    ecog_ps: z.string().optional().or(z.literal('')),
    oncology_fh: z.enum(['yes', 'no']).optional(),
    oncology_fh_person: z.string().optional().or(z.literal('')),
    oncology_fh_type: z.string().optional().or(z.literal('')),
    smoking_status: z.enum(['never', 'cigarettes', 'other', 'former']).optional(),
    cigarettes_pack_per_day: z.string().optional().or(z.literal('')),
    cigarettes_duration_years: z.string().optional().or(z.literal('')),
    other_habit_details: z.string().optional().or(z.literal('')),
    menstrual_status: z.enum(['menstrual', 'postmenopausal']).optional(),
  }),
  vitals: z.object({
    temperature_c: z.string().optional().or(z.literal('')),
    bp_systolic: z.string().optional().or(z.literal('')),
    bp_diastolic: z.string().optional().or(z.literal('')),
    pulse_bpm: z.string().optional().or(z.literal('')),
    respiratory_rate: z.string().optional().or(z.literal('')),
    spo2_pct: z.string().optional().or(z.literal('')),
    pain_score: z.string().optional().or(z.literal('')),
    pallor: z.enum(['yes', 'no']).optional(),
    jaundice: z.enum(['yes', 'no']).optional(),
    hbv_status: z.enum(['positive', 'negative']).optional(),
    hcv_status: z.enum(['positive', 'negative']).optional(),
    hiv_status: z.enum(['positive', 'negative']).optional(),
  }).optional(),
})

type FormData = z.infer<typeof schema>
type PathologyTest = { id: string; test_name: string; modality: string; result_numeric: string; result_text: string; test_date: string }
type PriorProtocol = { id: string; protocol_name: string; num_cycles: string; duration_months: string; notes: string }

const COMORBIDITIES = ['DM type 1', 'DM Type 2', 'HTN', 'IHD / CAD', 'CKD', 'Hepatic disease', 'Autoimmune', 'Neuropathy', 'Previous malignancy']
const FAMILY_HISTORY_CONDITIONS = ['DM1', 'DM2', 'HTN', 'Cardiac Disease', 'Autoimmune Disease', 'Other']

const PRIMARY_SITE_TESTS: Record<string, { ihc: string[]; molecular: string[] }> = {
  Breast: { ihc: ['ER', 'PR', 'HER2', 'Ki-67'], molecular: ['BRCA1', 'BRCA2', 'Oncotype DX', 'PIK3CA'] },
  Lung: { ihc: ['PD-L1 (TPS)', 'TTF-1', 'Napsin A', 'p40'], molecular: ['EGFR', 'ALK', 'ROS1', 'KRAS', 'BRAF', 'MET Exon14', 'RET', 'NTRK'] },
  Colorectal: { ihc: ['MSI/MMR (MLH1)', 'MSI/MMR (MSH2)', 'MSI/MMR (MSH6)', 'MSI/MMR (PMS2)', 'CDX2'], molecular: ['KRAS', 'NRAS', 'BRAF', 'MSI-H/dMMR'] },
  'Lymphoma (Non-Hodgkin)': { ihc: ['CD20', 'CD3', 'CD30', 'CD15', 'Ki-67'], molecular: ['BCL2', 'BCL6', 'MYC', 'IGH rearrangement'] },
  'Leukemia (AML)': { ihc: ['MPO', 'CD34', 'CD117'], molecular: ['FLT3', 'NPM1', 'BCR-ABL', 'JAK2'] },
  Prostate: { ihc: ['PSA', 'PSAP', 'AMACR'], molecular: ['BRCA1/2', 'AR-V7'] },
  Ovary: { ihc: ['CA-125', 'WT1', 'PAX8'], molecular: ['BRCA1', 'BRCA2', 'HRD status'] },
  default: { ihc: ['Ki-67', 'p53'], molecular: ['NGS panel'] },
}

type Props = {
  onSave: (data: any) => Promise<void>
  saving: boolean
  error: string | null
  patientSex?: 'M' | 'F'
}

export function Step2Medical({ onSave, saving, error, patientSex }: Props) {
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([])
  const [selectedFamilyConditions, setSelectedFamilyConditions] = useState<string[]>([])
  const [familyHistoryOther, setFamilyHistoryOther] = useState('')
  const [ihcTests, setIhcTests] = useState<PathologyTest[]>([])
  const [molecularTests, setMolecularTests] = useState<PathologyTest[]>([])
  const [priorProtocols, setPriorProtocols] = useState<PriorProtocol[]>([])

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      diagnosis: { confirmed_cancer_patient: 'no', double_primary: 'no', metastasis_flag: 'no', sample_type: 'tissue' },
      history: { ecog_ps: '0', previous_chemo: 'none', previous_radiation: 'none', oncology_fh: 'no', smoking_status: 'never' },
    },
  })

  const confirmedCancer = watch('diagnosis.confirmed_cancer_patient')
  const doublePrimary = watch('diagnosis.double_primary')
  const metastasisFlag = watch('diagnosis.metastasis_flag')
  const sampleType = watch('diagnosis.sample_type')
  const oncologyFh = watch('history.oncology_fh')
  const smokingStatus = watch('history.smoking_status')
  const primarySiteForSuggestions = watch('diagnosis.primary_site')

  const suggestions = PRIMARY_SITE_TESTS[primarySiteForSuggestions || ''] || PRIMARY_SITE_TESTS.default

  function toggleComorbidity(item: string) {
    setSelectedComorbidities(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item])
  }
  function toggleFamilyCondition(item: string) {
    setSelectedFamilyConditions(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item])
  }

  function addTest(category: 'ihc' | 'molecular') {
    const newTest: PathologyTest = { id: Math.random().toString(36).slice(2), test_name: '', modality: '', result_numeric: '', result_text: '', test_date: '' }
    if (category === 'ihc') setIhcTests(prev => [...prev, newTest])
    else setMolecularTests(prev => [...prev, newTest])
  }
  function updateTest(category: 'ihc' | 'molecular', id: string, field: keyof PathologyTest, value: string) {
    const updater = (prev: PathologyTest[]) => prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    if (category === 'ihc') setIhcTests(updater)
    else setMolecularTests(updater)
  }
  function removeTest(category: 'ihc' | 'molecular', id: string) {
    if (category === 'ihc') setIhcTests(prev => prev.filter(t => t.id !== id))
    else setMolecularTests(prev => prev.filter(t => t.id !== id))
  }

  function addProtocol() {
    setPriorProtocols(prev => [...prev, { id: Math.random().toString(36).slice(2), protocol_name: '', num_cycles: '', duration_months: '', notes: '' }])
  }
  function updateProtocol(id: string, field: keyof PriorProtocol, value: string) {
    setPriorProtocols(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }
  function removeProtocol(id: string) {
    setPriorProtocols(prev => prev.filter(p => p.id !== id))
  }

  const onSubmit = (data: FormData) => {
    return onSave({
      diagnosis: {
        ...data.diagnosis,
        confirmed_cancer_patient: data.diagnosis.confirmed_cancer_patient === 'yes',
      },
      history: {
        ...data.history,
        comorbidities: selectedComorbidities,
        family_history_conditions: selectedFamilyConditions,
        family_history_other: selectedFamilyConditions.includes('Other') ? familyHistoryOther : '',
      },
      ihcTests,
      molecularTests,
      priorProtocols: confirmedCancer === 'yes' ? priorProtocols : [],
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" dir="ltr">

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-sm text-amber-700">
        <span>⚠️</span>
        <span>All clinical data must be entered in English only — ICD-10, SNOMED, HL7 compliance required.</span>
      </div>

      {/* ── CONFIRMED CANCER PATIENT ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon navy">✅</span>
          <div><p className="card-title">Confirmed Cancer Patient?</p><p className="card-subtitle">مريض مؤكد الإصابة؟</p></div>
        </div>
        <div className="card-body">
          <select {...register('diagnosis.confirmed_cancer_patient')} className="input-en-full">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>

          {confirmedCancer === 'yes' && (
            <div className="mt-4 border border-slate-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="section-label-en m-0">Prior Treatment Protocols</p>
                <button type="button" onClick={addProtocol} className="tag-pill tag-pill-on">+ Add protocol</button>
              </div>
              {priorProtocols.length === 0 && <p className="text-xs text-slate-400">No prior protocols added yet</p>}
              <div className="space-y-2">
                {priorProtocols.map(p => (
                  <div key={p.id} className="grid grid-cols-5 gap-2 items-center border border-slate-200 rounded-lg p-2">
                    <input value={p.protocol_name} onChange={e => updateProtocol(p.id, 'protocol_name', e.target.value)} placeholder="Protocol name" className="input-en-full col-span-2" />
                    <input type="number" value={p.num_cycles} onChange={e => updateProtocol(p.id, 'num_cycles', e.target.value)} placeholder="No. of cycles" className="input-en-full" />
                    <input type="number" step="0.5" value={p.duration_months} onChange={e => updateProtocol(p.id, 'duration_months', e.target.value)} placeholder="Duration (months)" className="input-en-full" />
                    <div className="flex gap-1">
                      <input value={p.notes} onChange={e => updateProtocol(p.id, 'notes', e.target.value)} placeholder="Notes" className="input-en-full" />
                      <button type="button" onClick={() => removeProtocol(p.id)} className="text-red-500 text-xs px-2">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CHIEF COMPLAINT ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon teal">💬</span>
          <div><p className="card-title">Chief Complaint</p><p className="card-subtitle">الشكوى الرئيسية</p></div>
        </div>
        <div className="card-body">
          <textarea {...register('diagnosis.chief_complaint')} rows={2}
            placeholder="e.g. Left breast lump for 3 months, progressive dyspnea..."
            className="input-en-full" />
        </div>
      </div>

      {/* ── PRIMARY DIAGNOSIS ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon red">🔬</span>
          <div><p className="card-title">Primary Diagnosis</p><p className="card-subtitle">التشخيص الرئيسي</p></div>
        </div>
        <div className="card-body">

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label-en">Double primary?</label>
              <select {...register('diagnosis.double_primary')} className="input-en-full">
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>

          {doublePrimary !== 'yes' ? (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label-en">Primary site</label>
                <select {...register('diagnosis.primary_site')} className="input-en-full">
                  <option value="">— Select site —</option>
                  {PRIMARY_SITES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label-en">ICD-10 Code</label>
                <input {...register('diagnosis.icd10_code')} placeholder="e.g. C50.1" className="input-en-full font-mono" />
              </div>
              <div className="col-span-2">
                <label className="field-label-en">Histology</label>
                <select {...register('diagnosis.histology')} className="input-en-full">
                  <option value="">— Select —</option>
                  {HISTOLOGY_TYPES.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="section-label-en">Primary Site 1</p>
                <div className="space-y-2">
                  <select {...register('diagnosis.primary_site')} className="input-en-full">
                    <option value="">— Select site —</option>
                    {PRIMARY_SITES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input {...register('diagnosis.icd10_code')} placeholder="ICD-10" className="input-en-full font-mono" />
                  <select {...register('diagnosis.histology')} className="input-en-full">
                    <option value="">— Histology —</option>
                    {HISTOLOGY_TYPES.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="section-label-en">Primary Site 2</p>
                <div className="space-y-2">
                  <select {...register('diagnosis.primary_site_2')} className="input-en-full">
                    <option value="">— Select site —</option>
                    {PRIMARY_SITES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input {...register('diagnosis.icd10_code_2')} placeholder="ICD-10" className="input-en-full font-mono" />
                  <select {...register('diagnosis.histology_2')} className="input-en-full">
                    <option value="">— Histology —</option>
                    {HISTOLOGY_TYPES.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label-en">2ry site (metastasis)?</label>
              <select {...register('diagnosis.metastasis_flag')} className="input-en-full">
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            {metastasisFlag === 'yes' && (
              <div>
                <label className="field-label-en">Metastatic sites</label>
                <input {...register('diagnosis.metastatic_sites')} placeholder="e.g. Liver, Bone, Lung" className="input-en-full" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="field-label-en">Stage</label>
              <select {...register('diagnosis.stage')} className="input-en-full">
                <option value="">—</option>
                {['I', 'IA', 'IB', 'II', 'IIA', 'IIB', 'III', 'IIIA', 'IIIB', 'IIIC', 'IV'].map(s => <option key={s}>Stage {s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label-en">Grade</label>
              <select {...register('diagnosis.grade')} className="input-en-full">
                <option value="">—</option>
                <option value="G1">G1 — Well differentiated</option>
                <option value="G2">G2 — Moderately diff.</option>
                <option value="G3">G3 — Poorly diff.</option>
                <option value="G4">G4 — Undifferentiated</option>
                <option value="GX">GX — Unknown</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">Laterality</label>
              <select {...register('diagnosis.laterality')} className="input-en-full">
                <option value="N/A">N/A</option>
                <option value="Left">Left</option>
                <option value="Right">Right</option>
                <option value="Bilateral">Bilateral</option>
                <option value="Midline">Midline</option>
              </select>
            </div>
          </div>

          <p className="section-label-en">TNM Classification</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="field-label-en">T</label>
              <select {...register('diagnosis.tnm_t')} className="input-en-full font-mono">
                <option value="">—</option>
                {['T0', 'Tis', 'T1', 'T1a', 'T1b', 'T1c', 'T2', 'T2a', 'T2b', 'T3', 'T4', 'T4a', 'T4b', 'TX'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label-en">N</label>
              <select {...register('diagnosis.tnm_n')} className="input-en-full font-mono">
                <option value="">—</option>
                {['N0', 'N1', 'N1a', 'N1b', 'N2', 'N2a', 'N2b', 'N3', 'NX'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label-en">M</label>
              <select {...register('diagnosis.tnm_m')} className="input-en-full font-mono">
                <option value="">—</option>
                {['M0', 'M1', 'M1a', 'M1b', 'M1c', 'MX'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label-en">Date of diagnosis</label>
              <input type="date" {...register('diagnosis.date_of_diagnosis')} className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">Treatment intent</label>
              <select {...register('diagnosis.treatment_intent')} className="input-en-full">
                <option value="curative">Curative</option>
                <option value="neoadjuvant">Neoadjuvant</option>
                <option value="adjuvant">Adjuvant</option>
                <option value="palliative">Palliative</option>
                <option value="supportive">Supportive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── PATHOLOGY & BIOMARKERS ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon purple">🧬</span>
          <div><p className="card-title">Pathology &amp; Biomarkers</p><p className="card-subtitle">التشريح المرضي والعلامات الجزيئية</p></div>
        </div>
        <div className="card-body">

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label-en">Sample type</label>
              <select {...register('diagnosis.sample_type')} className="input-en-full">
                <option value="tissue">Tissue</option>
                <option value="liquid">Liquid</option>
              </select>
            </div>
            {sampleType === 'liquid' && (
              <div>
                <label className="field-label-en">Type of liquid</label>
                <select {...register('diagnosis.liquid_type')} className="input-en-full">
                  <option value="">— Select —</option>
                  <option value="blood">Blood / Plasma (ctDNA)</option>
                  <option value="pleural_fluid">Pleural fluid</option>
                  <option value="ascites">Ascites</option>
                  <option value="csf">CSF</option>
                  <option value="urine">Urine</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mb-2">
            <p className="section-label-en m-0">IHC (Immunohistochemistry)</p>
            <button type="button" onClick={() => addTest('ihc')} className="tag-pill tag-pill-on">+ Add IHC test</button>
          </div>
          <datalist id="ihc-suggestions">
            {suggestions.ihc.map(name => <option key={name} value={name} />)}
          </datalist>
          <div className="space-y-2 mb-4">
            {ihcTests.length === 0 && <p className="text-xs text-slate-400">No IHC tests added yet</p>}
            {ihcTests.map(t => (
              <div key={t.id} className="grid grid-cols-6 gap-2 items-center border border-slate-200 rounded-lg p-2">
                <input list="ihc-suggestions" value={t.test_name} onChange={e => updateTest('ihc', t.id, 'test_name', e.target.value)} placeholder="Test name" className="input-en-full col-span-2" />
                <input value={t.modality} onChange={e => updateTest('ihc', t.id, 'modality', e.target.value)} placeholder="Modality" className="input-en-full" />
                <input type="number" step="0.01" value={t.result_numeric} onChange={e => updateTest('ihc', t.id, 'result_numeric', e.target.value)} placeholder="Numeric" className="input-en-full" />
                <input value={t.result_text} onChange={e => updateTest('ihc', t.id, 'result_text', e.target.value)} placeholder="Result (text)" className="input-en-full" />
                <div className="flex gap-1">
                  <input type="date" value={t.test_date} onChange={e => updateTest('ihc', t.id, 'test_date', e.target.value)} className="input-en-full" />
                  <button type="button" onClick={() => removeTest('ihc', t.id)} className="text-red-500 text-xs px-2">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mb-2">
            <p className="section-label-en m-0">Molecular Testing</p>
            <button type="button" onClick={() => addTest('molecular')} className="tag-pill tag-pill-on">+ Add molecular test</button>
          </div>
          <datalist id="molecular-suggestions">
            {suggestions.molecular.map(name => <option key={name} value={name} />)}
          </datalist>
          <div className="space-y-2 mb-4">
            {molecularTests.length === 0 && <p className="text-xs text-slate-400">No molecular tests added yet</p>}
            {molecularTests.map(t => (
              <div key={t.id} className="grid grid-cols-6 gap-2 items-center border border-slate-200 rounded-lg p-2">
                <input list="molecular-suggestions" value={t.test_name} onChange={e => updateTest('molecular', t.id, 'test_name', e.target.value)} placeholder="Test name" className="input-en-full col-span-2" />
                <input value={t.modality} onChange={e => updateTest('molecular', t.id, 'modality', e.target.value)} placeholder="Modality (NGS/PCR/FISH)" className="input-en-full" />
                <input type="number" step="0.01" value={t.result_numeric} onChange={e => updateTest('molecular', t.id, 'result_numeric', e.target.value)} placeholder="Numeric" className="input-en-full" />
                <input value={t.result_text} onChange={e => updateTest('molecular', t.id, 'result_text', e.target.value)} placeholder="Result (text)" className="input-en-full" />
                <div className="flex gap-1">
                  <input type="date" value={t.test_date} onChange={e => updateTest('molecular', t.id, 'test_date', e.target.value)} className="input-en-full" />
                  <button type="button" onClick={() => removeTest('molecular', t.id)} className="text-red-500 text-xs px-2">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="field-label-en">Final Pathology Report</label>
            <textarea {...register('diagnosis.final_pathology_report')} rows={3}
              placeholder="Full narrative pathology report..." className="input-en-full" />
          </div>
        </div>
      </div>

      {/* ── VITAL SIGNS ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon red">❤️</span>
          <div><p className="card-title">Vital Signs</p><p className="card-subtitle">العلامات الحيوية</p></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="field-label-en">Temperature (°C)</label>
              <input type="number" step="0.1" {...register('vitals.temperature_c')} placeholder="37.0" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">BP Systolic</label>
              <input type="number" {...register('vitals.bp_systolic')} placeholder="120" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">BP Diastolic</label>
              <input type="number" {...register('vitals.bp_diastolic')} placeholder="80" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">Pulse (bpm)</label>
              <input type="number" {...register('vitals.pulse_bpm')} placeholder="72" className="input-en-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="field-label-en">Respiratory Rate</label>
              <input type="number" {...register('vitals.respiratory_rate')} placeholder="16" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">SpO2 (%)</label>
              <input type="number" {...register('vitals.spo2_pct')} placeholder="98" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">Pain Score (0-10)</label>
              <input type="number" min="0" max="10" {...register('vitals.pain_score')} placeholder="0" className="input-en-full" />
            </div>
          </div>

          <p className="section-label-en">Physical Examination</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label-en">Pallor</label>
              <select {...register('vitals.pallor')} className="input-en-full">
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">Jaundice</label>
              <select {...register('vitals.jaundice')} className="input-en-full">
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <p className="section-label-en">Virology</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label-en">HBV</label>
              <select {...register('vitals.hbv_status')} className="input-en-full">
                <option value="">—</option>
                <option value="positive">+ve</option>
                <option value="negative">-ve</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">HCV</label>
              <select {...register('vitals.hcv_status')} className="input-en-full">
                <option value="">—</option>
                <option value="positive">+ve</option>
                <option value="negative">-ve</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">HIV</label>
              <select {...register('vitals.hiv_status')} className="input-en-full">
                <option value="">—</option>
                <option value="positive">+ve</option>
                <option value="negative">-ve</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── SOCIAL HABITS & MENSTRUAL STATUS ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon amber">🚬</span>
          <div><p className="card-title">Social Habits</p><p className="card-subtitle">العادات الاجتماعية</p></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label-en">Smoking / habits</label>
              <select {...register('history.smoking_status')} className="input-en-full">
                <option value="never">Never</option>
                <option value="cigarettes">Cigarettes</option>
                <option value="former">Former smoker</option>
                <option value="other">Other</option>
              </select>
            </div>
            {patientSex === 'F' && (
              <div>
                <label className="field-label-en">Menstrual status</label>
                <select {...register('history.menstrual_status')} className="input-en-full">
                  <option value="">—</option>
                  <option value="menstrual">Menstrual</option>
                  <option value="postmenopausal">Postmenopausal</option>
                </select>
              </div>
            )}
          </div>

          {smokingStatus === 'cigarettes' && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label-en">Packs / day</label>
                <input type="number" step="0.1" {...register('history.cigarettes_pack_per_day')} placeholder="e.g. 1" className="input-en-full" />
              </div>
              <div>
                <label className="field-label-en">Duration (years)</label>
                <input type="number" {...register('history.cigarettes_duration_years')} placeholder="e.g. 15" className="input-en-full" />
              </div>
            </div>
          )}

          {smokingStatus === 'former' && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label-en">Packs / day</label>
                <input type="number" step="0.1" {...register('history.cigarettes_pack_per_day')} placeholder="e.g. 1" className="input-en-full" />
              </div>
              <div>
                <label className="field-label-en">Duration (years)</label>
                <input type="number" {...register('history.cigarettes_duration_years')} placeholder="e.g. 15" className="input-en-full" />
              </div>
            </div>
          )}

          {smokingStatus === 'other' && (
            <div>
              <label className="field-label-en">Specify habit</label>
              <input {...register('history.other_habit_details')} placeholder="e.g. Shisha, Chewing tobacco" className="input-en-full" />
            </div>
          )}
        </div>
      </div>

      {/* ── MEDICAL HISTORY ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon navy">📋</span>
          <div><p className="card-title">Past Medical &amp; Family History</p><p className="card-subtitle">التاريخ المرضي والعائلي</p></div>
        </div>
        <div className="card-body">
          <p className="section-label-en">Comorbidities</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {COMORBIDITIES.map(item => (
              <button type="button" key={item} onClick={() => toggleComorbidity(item)}
                className={`tag-pill ${selectedComorbidities.includes(item) ? 'tag-pill-on' : 'tag-pill-off'}`}>
                {item}
              </button>
            ))}
          </div>

          <p className="section-label-en">Family History</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {FAMILY_HISTORY_CONDITIONS.map(item => (
              <button type="button" key={item} onClick={() => toggleFamilyCondition(item)}
                className={`tag-pill ${selectedFamilyConditions.includes(item) ? 'tag-pill-on' : 'tag-pill-off'}`}>
                {item}
              </button>
            ))}
          </div>
          {selectedFamilyConditions.includes('Other') && (
            <input value={familyHistoryOther} onChange={e => setFamilyHistoryOther(e.target.value)}
              placeholder="Specify other family history..." className="input-en-full mb-4" />
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label-en">Oncology FH (family history of cancer)?</label>
              <select {...register('history.oncology_fh')} className="input-en-full">
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            {oncologyFh === 'yes' && (
              <>
                <div>
                  <label className="field-label-en">Which person</label>
                  <select {...register('history.oncology_fh_person')} className="input-en-full">
                    <option value="">—</option>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="sibling">Sibling</option>
                    <option value="grandparent">Grandparent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="field-label-en">Type of cancer</label>
                  <input {...register('history.oncology_fh_type')} placeholder="e.g. Breast cancer" className="input-en-full" />
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="field-label-en">Previous surgeries</label>
              <textarea {...register('history.previous_surgeries')} rows={2}
                placeholder="e.g. Left mastectomy 2021 — None if not applicable" className="input-en-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-en">Previous chemotherapy</label>
                <select {...register('history.previous_chemo')} className="input-en-full">
                  <option value="none">None</option>
                  <option value="adjuvant">Yes — adjuvant</option>
                  <option value="neoadjuvant">Yes — neoadjuvant</option>
                  <option value="palliative">Yes — palliative</option>
                  <option value="multiple_lines">Yes — multiple lines</option>
                </select>
              </div>
              <div>
                <label className="field-label-en">Radiation history</label>
                <select {...register('history.previous_radiation')} className="input-en-full">
                  <option value="none">None</option>
                  <option value="same_site">Yes — same site</option>
                  <option value="different_site">Yes — different site</option>
                  <option value="wbrt">Yes — whole brain (WBRT)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="field-label-en">Known drug allergies</label>
              <input {...register('history.drug_allergies')} placeholder="NKDA if none" className="input-en-full" />
            </div>
          </div>

          <p className="section-label-en">ECOG Performance Status</p>
          <div className="flex gap-2 flex-wrap">
            {['0', '1', '2', '3', '4'].map(ps => (
              <label key={ps} className="radio-opt-en">
                <input type="radio" value={ps} {...register('history.ecog_ps')} />
                <span className="rdot" />
                PS {ps}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-slate-400 font-mono">All fields in English · No mandatory fields</p>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save & Continue to Insurance'}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
    </form>
  )
}
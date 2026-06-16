'use client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'

const schema = z.object({
  diagnosis: z.object({
    primary_site:      z.string().min(1, 'Required'),
    icd10_code:        z.string().min(3, 'Valid ICD-10 code required'),
    histology:         z.string().min(1, 'Required'),
    stage:             z.string().optional(),
    grade:             z.string().optional(),
    laterality:        z.string().optional(),
    tnm_t:             z.string().optional(),
    tnm_n:             z.string().optional(),
    tnm_m:             z.string().optional(),
    is_metastatic:     z.boolean().default(false),
    metastatic_sites:  z.string().optional(),
    treatment_intent:  z.string().optional(),
    date_of_diagnosis: z.string().min(1, 'Required'),
  }),
  biomarkers: z.object({
    er_status:    z.string().optional(),
    pr_status:    z.string().optional(),
    her2_status:  z.string().optional(),
    kras_status:  z.string().optional(),
    egfr_status:  z.string().optional(),
    braf_status:  z.string().optional(),
    alk_status:   z.string().optional(),
    pdl1_percent: z.number().min(0).max(100).optional(),
    msi_status:   z.string().optional(),
    tmb_score:    z.number().optional(),
    ngs_panel:    z.string().optional(),
    test_date:    z.string().optional(),
  }),
  history: z.object({
    comorbidities:       z.array(z.string()).optional(),
    previous_surgeries:  z.string().optional(),
    previous_chemo:      z.string().optional(),
    previous_radiation:  z.string().optional(),
    family_hx_malignancy:z.string().optional(),
    drug_allergies:      z.string().optional(),
    ecog_ps:             z.string().optional(),
    weight_kg:           z.number().positive().optional(),
    height_cm:           z.number().positive().optional(),
  }),
})

type FormData = z.infer<typeof schema>

const COMORBIDITIES = ['DM Type 2','HTN','IHD / CAD','CKD','Hepatic disease','Autoimmune','Neuropathy','Previous malignancy']

type Props = { onSave: (data: FormData) => Promise<void>; saving: boolean; error: string | null }

export function Step2Medical({ onSave, saving, error }: Props) {
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([])
  const [bsa, setBsa] = useState<string>('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      biomarkers: { er_status: 'unknown', pr_status: 'unknown', her2_status: 'unknown' },
      history: { ecog_ps: '0', previous_chemo: 'none', previous_radiation: 'none' }
    }
  })

  const wt = watch('history.weight_kg')
  const ht = watch('history.height_cm')

  // Auto-calculate BSA (Mosteller)
  function handleAnthro() {
    if (wt && ht) {
      const calc = Math.sqrt((wt * ht) / 3600).toFixed(2)
      setBsa(calc + ' m²')
    }
  }

  function toggleComorbidity(item: string) {
    const updated = selectedComorbidities.includes(item)
      ? selectedComorbidities.filter(c => c !== item)
      : [...selectedComorbidities, item]
    setSelectedComorbidities(updated)
    setValue('history.comorbidities', updated)
  }

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-5" dir="ltr">

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

      {/* NOTE: All medical data in English */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-sm text-amber-700">
        <span>⚠️</span>
        <span>All clinical data must be entered in English only — ICD-10, SNOMED, HL7 compliance required.</span>
      </div>

      {/* ── PRIMARY DIAGNOSIS ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon red">🔬</span>
          <div><p className="card-title">Primary Diagnosis</p><p className="card-subtitle">التشخيص الرئيسي</p></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label-en">Primary site <span className="req">*</span></label>
              <select {...register('diagnosis.primary_site')} className="input-en-full">
                <option value="">— Select site —</option>
                {['Breast','Lung','Colorectal','Lymphoma','Leukemia','Liver','Cervix','Prostate','Bladder','Thyroid','Brain','Pancreas','Ovary','Stomach','Kidney','Other'].map(s => <option key={s}>{s}</option>)}
              </select>
              {errors.diagnosis?.primary_site && <p className="field-error">{errors.diagnosis.primary_site.message}</p>}
            </div>
            <div>
              <label className="field-label-en">ICD-10 Code <span className="req">*</span></label>
              <input {...register('diagnosis.icd10_code')} placeholder="e.g. C50.1, C34.1, C18.9" className="input-en-full font-mono" />
              {errors.diagnosis?.icd10_code && <p className="field-error">{errors.diagnosis.icd10_code.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="field-label-en">Histology <span className="req">*</span></label>
              <select {...register('diagnosis.histology')} className="input-en-full">
                <option value="">— Select —</option>
                {['Adenocarcinoma','Squamous cell','Small cell','Large B-cell lymphoma','Ductal carcinoma','Lobular carcinoma','Mucinous','Sarcoma','Melanoma','Other'].map(h => <option key={h}>{h}</option>)}
              </select>
              {errors.diagnosis?.histology && <p className="field-error">{errors.diagnosis.histology.message}</p>}
            </div>
            <div>
              <label className="field-label-en">Stage <span className="req">*</span></label>
              <select {...register('diagnosis.stage')} className="input-en-full">
                <option value="">—</option>
                {['I','IA','IB','II','IIA','IIB','III','IIIA','IIIB','IIIC','IV'].map(s => <option key={s}>Stage {s}</option>)}
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
          </div>

          {/* TNM */}
          <p className="section-label-en">TNM Classification</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="field-label-en">T — Primary Tumor</label>
              <select {...register('diagnosis.tnm_t')} className="input-en-full font-mono">
                <option value="">—</option>
                {['T0','Tis','T1','T1a','T1b','T1c','T2','T2a','T2b','T3','T4','T4a','T4b','TX'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label-en">N — Regional Nodes</label>
              <select {...register('diagnosis.tnm_n')} className="input-en-full font-mono">
                <option value="">—</option>
                {['N0','N1','N1a','N1b','N2','N2a','N2b','N3','NX'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label-en">M — Distant Metastasis</label>
              <select {...register('diagnosis.tnm_m')} className="input-en-full font-mono">
                <option value="">—</option>
                {['M0','M1','M1a','M1b','M1c','MX'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label-en">Date of diagnosis <span className="req">*</span></label>
              <input type="date" {...register('diagnosis.date_of_diagnosis')} className="input-en-full" />
              {errors.diagnosis?.date_of_diagnosis && <p className="field-error">{errors.diagnosis.date_of_diagnosis.message}</p>}
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
        </div>
      </div>

      {/* ── BIOMARKERS ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon purple">🧬</span>
          <div><p className="card-title">Biomarkers &amp; Molecular Profile</p><p className="card-subtitle">علامات الورم الجزيئية</p></div>
        </div>
        <div className="card-body">
          <p className="section-label-en">Receptor Status</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[{field:'er_status',label:'ER'},
              {field:'pr_status',label:'PR'},
              {field:'her2_status',label:'HER2'},
            ].map(({field,label}) => (
              <div key={field}>
                <label className="field-label-en">{label} Status</label>
                <select {...register(`biomarkers.${field}` as any)} className="input-en-full">
                  <option value="unknown">Unknown</option>
                  <option value="positive">Positive (+)</option>
                  <option value="negative">Negative (−)</option>
                  {label === 'HER2' && <option value="low">Low</option>}
                </select>
              </div>
            ))}
          </div>
          <p className="section-label-en">Key Mutations</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="field-label-en">KRAS</label>
              <select {...register('biomarkers.kras_status')} className="input-en-full">
                <option value="unknown">Unknown</option>
                <option value="wild_type">Wild-type</option>
                <option value="G12C">G12C</option>
                <option value="G12D">G12D</option>
                <option value="G12V">G12V</option>
                <option value="mutated">Other mutation</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">EGFR</label>
              <select {...register('biomarkers.egfr_status')} className="input-en-full">
                <option value="unknown">Unknown</option>
                <option value="wild_type">Wild-type</option>
                <option value="exon19_del">Exon 19 deletion</option>
                <option value="L858R">L858R</option>
                <option value="T790M">T790M</option>
                <option value="exon20_ins">Exon 20 insertion</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">BRAF</label>
              <select {...register('biomarkers.braf_status')} className="input-en-full">
                <option value="unknown">Unknown</option>
                <option value="wild_type">Wild-type</option>
                <option value="V600E">V600E</option>
                <option value="mutated">Other mutation</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="field-label-en">ALK</label>
              <select {...register('biomarkers.alk_status')} className="input-en-full">
                <option value="unknown">Unknown</option>
                <option value="negative">Negative</option>
                <option value="positive">Positive (rearranged)</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">PD-L1 (%)</label>
              <input type="number" {...register('biomarkers.pdl1_percent', { valueAsNumber: true })} min="0" max="100" placeholder="0–100" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">MSI Status</label>
              <select {...register('biomarkers.msi_status')} className="input-en-full">
                <option value="unknown">Unknown</option>
                <option value="MSS">MSS</option>
                <option value="MSI_Low">MSI-Low</option>
                <option value="MSI_High">MSI-High</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">TMB (mut/Mb)</label>
              <input type="number" {...register('biomarkers.tmb_score', { valueAsNumber: true })} placeholder="e.g. 12" className="input-en-full" />
            </div>
          </div>
        </div>
      </div>

      {/* ── MEDICAL HISTORY ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon navy">📋</span>
          <div><p className="card-title">Past Medical &amp; Surgical History</p><p className="card-subtitle">التاريخ المرضي والجراحي</p></div>
        </div>
        <div className="card-body">
          <p className="section-label-en">Comorbidities</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {COMORBIDITIES.map(item => (
              <button type="button" key={item}
                onClick={() => toggleComorbidity(item)}
                className={`tag-pill ${selectedComorbidities.includes(item) ? 'tag-pill-on' : 'tag-pill-off'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="space-y-3 mb-4">
            <div>
              <label className="field-label-en">Previous surgeries</label>
              <textarea {...register('history.previous_surgeries')} rows={2}
                placeholder="e.g. Left mastectomy 2021, Appendectomy 2015 — None if not applicable"
                className="input-en-full" />
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
              <label className="field-label-en">Family history of malignancy</label>
              <input {...register('history.family_hx_malignancy')} placeholder="e.g. Mother: breast cancer, Father: colorectal — None known" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">Known drug allergies</label>
              <input {...register('history.drug_allergies')} placeholder="e.g. Penicillin (rash), Aspirin (GI bleed) — NKDA if none" className="input-en-full" />
            </div>
          </div>

          {/* ECOG + Anthropometrics */}
          <p className="section-label-en">ECOG Performance Status</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {['0','1','2','3','4'].map(ps => (
              <label key={ps} className="radio-opt-en">
                <input type="radio" value={ps} {...register('history.ecog_ps')} />
                <span className="rdot" />
                PS {ps}
              </label>
            ))}
          </div>

          <p className="section-label-en">Anthropometrics — BSA auto-calculated (Mosteller)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label-en">Weight (kg)</label>
              <input type="number" step="0.1" {...register('history.weight_kg', { valueAsNumber: true })}
                onBlur={handleAnthro} placeholder="70.0" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">Height (cm)</label>
              <input type="number" step="0.5" {...register('history.height_cm', { valueAsNumber: true })}
                onBlur={handleAnthro} placeholder="170" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">BSA (m²) — auto</label>
              <input value={bsa} readOnly placeholder="Auto"
                className="input-en-full bg-teal-50 text-teal-700 font-bold cursor-not-allowed" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-slate-400 font-mono">All fields in English · ICD-10 compliant</p>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save & Continue to Insurance'}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </form>
  )
}

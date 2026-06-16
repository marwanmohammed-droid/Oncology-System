'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProtocolsPage() {
  const [regimens, setRegimens] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [drugs, setDrugs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [showNewDrug, setShowNewDrug] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', full_name: '', cancer_type: '',
    cycle_frequency: 'q3w', standard_cycles: '',
    cycle_length_days: '21', regimen_class: 'chemotherapy',
    requires_gcsf: false, requires_premedication: false,
    premedication_details: '', nccn_category: '',
  })

  const [drugForm, setDrugForm] = useState({
    drug_name: '', drug_class: '',
    dose_mg_m2: '', dose_mg_flat: '',
    dose_unit: 'mg/m2', route: 'IV',
    day_number: '1', infusion_duration_min: '',
    sequence_order: '1',
  })

  const supabase = createClient()

  useEffect(() => { loadRegimens() }, [])

  async function loadRegimens() {
    const { data } = await supabase
      .from('chemo_regimens')
      .select('*')
      .order('name')
    setRegimens(data || [])
    setLoading(false)
  }

  async function loadDrugs(regimenId: string) {
    const { data } = await supabase
      .from('regimen_drugs')
      .select('*')
      .eq('regimen_id', regimenId)
      .order('sequence_order')
    setDrugs(data || [])
  }

  async function handleSelectRegimen(r: any) {
    setSelected(r)
    await loadDrugs(r.id)
  }

  async function handleSaveRegimen() {
    if (!form.name) { setError('Protocol name required'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('chemo_regimens')
      .insert({
        name: form.name,
        full_name: form.full_name || null,
        cancer_type: form.cancer_type ? form.cancer_type.split(',').map(s => s.trim()) : [],
        cycle_frequency: form.cycle_frequency,
        standard_cycles: form.standard_cycles ? parseInt(form.standard_cycles) : null,
        cycle_length_days: parseInt(form.cycle_length_days) || 21,
        regimen_class: form.regimen_class,
        requires_gcsf: form.requires_gcsf,
        requires_premedication: form.requires_premedication,
        premedication_details: form.premedication_details || null,
        nccn_category: form.nccn_category || null,
        is_active: true,
      })
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    setRegimens(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setShowNew(false)
    setForm({ name: '', full_name: '', cancer_type: '', cycle_frequency: 'q3w', standard_cycles: '', cycle_length_days: '21', regimen_class: 'chemotherapy', requires_gcsf: false, requires_premedication: false, premedication_details: '', nccn_category: '' })
    setSaving(false)
  }

  async function handleSaveDrug() {
    if (!drugForm.drug_name || !selected) { setError('Drug name required'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('regimen_drugs')
      .insert({
        regimen_id: selected.id,
        drug_name: drugForm.drug_name,
        drug_class: drugForm.drug_class || null,
        dose_mg_m2: drugForm.dose_mg_m2 ? parseFloat(drugForm.dose_mg_m2) : null,
        dose_mg_flat: drugForm.dose_mg_flat ? parseFloat(drugForm.dose_mg_flat) : null,
        dose_unit: drugForm.dose_unit,
        route: drugForm.route,
        day_number: drugForm.day_number.split(',').map(d => parseInt(d.trim())),
        infusion_duration_min: drugForm.infusion_duration_min ? parseInt(drugForm.infusion_duration_min) : null,
        sequence_order: parseInt(drugForm.sequence_order) || 1,
      })
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    setDrugs(prev => [...prev, data])
    setShowNewDrug(false)
    setDrugForm({ drug_name: '', drug_class: '', dose_mg_m2: '', dose_mg_flat: '', dose_unit: 'mg/m2', route: 'IV', day_number: '1', infusion_duration_min: '', sequence_order: '1' })
    setSaving(false)
  }

  async function toggleActive(r: any) {
    await supabase.from('chemo_regimens').update({ is_active: !r.is_active }).eq('id', r.id)
    setRegimens(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x))
    if (selected?.id === r.id) setSelected({ ...r, is_active: !r.is_active })
  }

  const classColor: Record<string, { bg: string; color: string }> = {
    chemotherapy:  { bg: '#fff3cd', color: '#b45309' },
    immunotherapy: { bg: '#eff6ff', color: '#1e40af' },
    targeted:      { bg: '#faf5ff', color: '#9333ea' },
    hormonal:      { bg: '#fdf2f8', color: '#be185d' },
    combined:      { bg: '#e6f7f4', color: '#1a8a78' },
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Chemo Protocols</h1>
          <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
            {regimens.length} protocols · {regimens.filter(r => r.is_active).length} active
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          padding: '9px 20px', background: '#1a8a78', color: '#fff',
          borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          + New Protocol
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>

        {/* Protocols List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8e97b5' }}>Loading...</div>
          ) : regimens.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8e97b5' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💊</div>
              <p>No protocols yet</p>
            </div>
          ) : regimens.map(r => {
            const cfg = classColor[r.regimen_class] || classColor.chemotherapy
            return (
              <div key={r.id}
                onClick={() => handleSelectRegimen(r)}
                style={{
                  background: selected?.id === r.id ? '#e6f7f4' : '#fff',
                  border: `1.5px solid ${selected?.id === r.id ? '#2ab8a0' : '#dde2ee'}`,
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                  opacity: r.is_active ? 1 : 0.5,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{r.name}</p>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontFamily: 'DM Mono', fontWeight: 600 }}>
                    {r.regimen_class}
                  </span>
                </div>
                <p style={{ fontSize: 10, color: '#8e97b5', margin: '3px 0 0', fontFamily: 'DM Mono' }}>
                  {r.cycle_frequency} · {r.standard_cycles ? `${r.standard_cycles} cycles` : 'ongoing'}
                </p>
                {r.cancer_type?.length > 0 && (
                  <p style={{ fontSize: 10, color: '#4a5580', margin: '4px 0 0' }}>
                    {r.cancer_type.join(', ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Protocol Details */}
        {selected ? (
          <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0b1f3a, #1e4580)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{selected.name}</h2>
                  {selected.full_name && <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', margin: '4px 0 0' }}>{selected.full_name}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleActive(selected)} style={{
                    padding: '5px 12px', borderRadius: 6,
                    border: '1px solid rgba(255,255,255,.3)',
                    background: 'rgba(255,255,255,.1)', color: '#fff',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {selected.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'FREQUENCY', value: selected.cycle_frequency },
                  { label: 'CYCLES', value: selected.standard_cycles || 'Ongoing' },
                  { label: 'CYCLE LENGTH', value: `${selected.cycle_length_days} days` },
                  { label: 'NCCN', value: selected.nccn_category || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', fontFamily: 'DM Mono', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#2ab8a0', margin: 0, fontFamily: 'DM Mono' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #eef0f6', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {selected.requires_gcsf && (
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#fde8e8', color: '#e53e3e', fontWeight: 600 }}>
                  G-CSF Required
                </span>
              )}
              {selected.requires_premedication && (
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#fff3cd', color: '#b45309', fontWeight: 600 }}>
                  Pre-medication Required
                </span>
              )}
              {selected.cancer_type?.map((c: string) => (
                <span key={c} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#f7f8fc', color: '#4a5580', border: '1px solid #dde2ee' }}>
                  {c}
                </span>
              ))}
            </div>

            {selected.premedication_details && (
              <div style={{ padding: '12px 24px', borderBottom: '1px solid #eef0f6', background: '#fff3cd' }}>
                <p style={{ fontSize: 11, color: '#b45309', margin: 0 }}>
                  Pre-med: {selected.premedication_details}
                </p>
              </div>
            )}

            {/* Drugs */}
            <div style={{ padding: '16px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Drugs ({drugs.length})</p>
                <button onClick={() => setShowNewDrug(true)} style={{
                  padding: '5px 12px', borderRadius: 6,
                  border: '1.5px solid #2ab8a0', background: '#e6f7f4',
                  color: '#1a8a78', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                  + Add Drug
                </button>
              </div>

              {drugs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#8e97b5' }}>
                  <p>No drugs added yet</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f7f8fc', borderBottom: '1.5px solid #dde2ee' }}>
                      {['Drug', 'Class', 'Dose', 'Route', 'Days', 'Duration'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9, fontFamily: 'DM Mono', color: '#8e97b5', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drugs.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #eef0f6' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#0b1f3a' }}>{d.drug_name}</td>
                        <td style={{ padding: '10px', color: '#4a5580', fontSize: 11 }}>{d.drug_class || '—'}</td>
                        <td style={{ padding: '10px', fontFamily: 'DM Mono', fontWeight: 700, color: '#1a8a78' }}>
                          {d.dose_mg_m2 ? `${d.dose_mg_m2} mg/m²` : d.dose_mg_flat ? `${d.dose_mg_flat} mg flat` : '—'}
                        </td>
                        <td style={{ padding: '10px', fontFamily: 'DM Mono', color: '#4a5580' }}>{d.route}</td>
                        <td style={{ padding: '10px', fontFamily: 'DM Mono', color: '#4a5580' }}>D{d.day_number?.join(',')}</td>
                        <td style={{ padding: '10px', fontFamily: 'DM Mono', color: '#8e97b5' }}>
                          {d.infusion_duration_min ? `${d.infusion_duration_min} min` : 'bolus'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center', color: '#8e97b5' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💊</div>
              <p>Select a protocol to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* New Protocol Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div style={{ background: '#fff', borderRadius: 18, width: 540, maxHeight: '90vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>New Protocol</p>
              <button onClick={() => setShowNew(false)} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>x</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Protocol Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. R-CHOP"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Class</label>
                  <select value={form.regimen_class} onChange={e => setForm(f => ({ ...f, regimen_class: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none' }}>
                    <option value="chemotherapy">Chemotherapy</option>
                    <option value="immunotherapy">Immunotherapy</option>
                    <option value="targeted">Targeted</option>
                    <option value="hormonal">Hormonal</option>
                    <option value="combined">Combined</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Full Name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="e.g. Rituximab + Cyclophosphamide + ..."
                  style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Cancer Types (comma separated)</label>
                <input value={form.cancer_type} onChange={e => setForm(f => ({ ...f, cancer_type: e.target.value }))}
                  placeholder="e.g. Breast, TNBC, HER2+"
                  style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Frequency</label>
                  <select value={form.cycle_frequency} onChange={e => setForm(f => ({ ...f, cycle_frequency: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none' }}>
                    <option value="weekly">Weekly</option>
                    <option value="q2w">Q2W</option>
                    <option value="q3w">Q3W</option>
                    <option value="q4w">Q4W</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Standard Cycles</label>
                  <input type="number" value={form.standard_cycles} onChange={e => setForm(f => ({ ...f, standard_cycles: e.target.value }))}
                    placeholder="e.g. 6"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Cycle Length (days)</label>
                  <input type="number" value={form.cycle_length_days} onChange={e => setForm(f => ({ ...f, cycle_length_days: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>NCCN Category</label>
                <input value={form.nccn_category} onChange={e => setForm(f => ({ ...f, nccn_category: e.target.value }))}
                  placeholder="e.g. Category 1"
                  style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.requires_gcsf} onChange={e => setForm(f => ({ ...f, requires_gcsf: e.target.checked }))} />
                  G-CSF Required
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.requires_premedication} onChange={e => setForm(f => ({ ...f, requires_premedication: e.target.checked }))} />
                  Pre-medication Required
                </label>
              </div>

              {form.requires_premedication && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Pre-medication Details</label>
                  <input value={form.premedication_details} onChange={e => setForm(f => ({ ...f, premedication_details: e.target.value }))}
                    placeholder="e.g. Ondansetron 8mg IV + Dexamethasone 8mg IV"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>Cancel</button>
              <button onClick={handleSaveRegimen} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Saving...' : 'Save Protocol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Drug Modal */}
      {showNewDrug && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowNewDrug(false)}>
          <div style={{ background: '#fff', borderRadius: 18, width: 480, direction: 'rtl', fontFamily: 'Cairo' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Add Drug to {selected?.name}</p>
              <button onClick={() => setShowNewDrug(false)} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>x</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Drug Name *</label>
                  <input value={drugForm.drug_name} onChange={e => setDrugForm(f => ({ ...f, drug_name: e.target.value }))}
                    placeholder="e.g. Doxorubicin"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Drug Class</label>
                  <input value={drugForm.drug_class} onChange={e => setDrugForm(f => ({ ...f, drug_class: e.target.value }))}
                    placeholder="e.g. Anthracycline"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Dose mg/m²</label>
                  <input type="number" value={drugForm.dose_mg_m2} onChange={e => setDrugForm(f => ({ ...f, dose_mg_m2: e.target.value }))}
                    placeholder="e.g. 60"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Flat Dose (mg)</label>
                  <input type="number" value={drugForm.dose_mg_flat} onChange={e => setDrugForm(f => ({ ...f, dose_mg_flat: e.target.value }))}
                    placeholder="e.g. 200"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Route</label>
                  <select value={drugForm.route} onChange={e => setDrugForm(f => ({ ...f, route: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none' }}>
                    <option value="IV">IV</option>
                    <option value="PO">PO</option>
                    <option value="SC">SC</option>
                    <option value="IM">IM</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Day Numbers</label>
                  <input value={drugForm.day_number} onChange={e => setDrugForm(f => ({ ...f, day_number: e.target.value }))}
                    placeholder="e.g. 1 or 1,8,15"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Duration (min)</label>
                  <input type="number" value={drugForm.infusion_duration_min} onChange={e => setDrugForm(f => ({ ...f, infusion_duration_min: e.target.value }))}
                    placeholder="e.g. 60"
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>Order</label>
                  <input type="number" value={drugForm.sequence_order} onChange={e => setDrugForm(f => ({ ...f, sequence_order: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewDrug(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>Cancel</button>
              <button onClick={handleSaveDrug} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Saving...' : 'Add Drug'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
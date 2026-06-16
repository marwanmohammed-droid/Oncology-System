'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  insurance: z.object({
    insurance_type:   z.enum(['government','private','comprehensive','self_pay']),
    provider_name:    z.string().optional(),
    policy_number:    z.string().optional(),
    member_id:        z.string().optional(),
    effective_date:   z.string().optional(),
    expiry_date:      z.string().optional(),
    coverage: z.object({
      consultation: z.object({ pct: z.number(), copay: z.number(), preauth: z.boolean(), annual_max: z.number().nullable() }),
      chemo_drugs:  z.object({ pct: z.number(), copay: z.number(), preauth: z.boolean(), annual_max: z.number().nullable() }),
      imaging:      z.object({ pct: z.number(), copay: z.number(), preauth: z.boolean(), annual_max: z.number().nullable() }),
      lab_tests:    z.object({ pct: z.number(), copay: z.number(), preauth: z.boolean(), annual_max: z.number().nullable() }),
      radiation:    z.object({ pct: z.number(), copay: z.number(), preauth: z.boolean(), annual_max: z.number().nullable() }),
      surgery:      z.object({ pct: z.number(), copay: z.number(), preauth: z.boolean(), annual_max: z.number().nullable() }),
    }),
    insurance_coordinator: z.string().optional(),
    notes: z.string().optional(),
  }),
  payment: z.object({
    payment_method:    z.enum(['cash','installment','ngo','clinical_trial','exemption']),
    initial_deposit:   z.number().optional(),
    billing_cycle:     z.string().optional(),
    discount_code:     z.string().optional(),
    down_payment:      z.number().optional(),
    num_installments:  z.number().optional(),
    ngo_name:          z.string().optional(),
    financial_notes:   z.string().optional(),
  }),
})

type FormData = z.infer<typeof schema>

type Props = { onSave: (data: FormData) => Promise<void>; saving: boolean; error: string | null }

const SERVICES = [
  { key: 'consultation', label: 'Consultation · كشف',         defaultPct: 100, defaultCopay: 0,    defaultPreauth: false, defaultMax: null },
  { key: 'chemo_drugs',  label: 'Chemo drugs · أدوية',        defaultPct: 80,  defaultCopay: 500,  defaultPreauth: true,  defaultMax: 150000 },
  { key: 'imaging',      label: 'Imaging · أشعة',              defaultPct: 90,  defaultCopay: 200,  defaultPreauth: true,  defaultMax: 30000 },
  { key: 'lab_tests',    label: 'Lab tests · تحاليل',          defaultPct: 100, defaultCopay: 0,    defaultPreauth: false, defaultMax: null },
  { key: 'radiation',    label: 'Radiation · إشعاع علاجي',    defaultPct: 75,  defaultCopay: 1000, defaultPreauth: true,  defaultMax: 80000 },
  { key: 'surgery',      label: 'Surgery · جراحة',             defaultPct: 90,  defaultCopay: 2000, defaultPreauth: true,  defaultMax: 200000 },
]

export function Step3Insurance({ onSave, saving, error }: Props) {
  const defaultCoverage = Object.fromEntries(
    SERVICES.map(s => [s.key, { pct: s.defaultPct, copay: s.defaultCopay, preauth: s.defaultPreauth, annual_max: s.defaultMax }])
  )

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      insurance: { insurance_type: 'government', coverage: defaultCoverage as any },
      payment:   { payment_method: 'cash', billing_cycle: 'per_visit', initial_deposit: 0 },
    }
  })

  const payMethod = watch('payment.payment_method')
  const insType   = watch('insurance.insurance_type')

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-5" dir="ltr">

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

      {/* ── INSURANCE ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon green">🛡️</span>
          <div><p className="card-title">Insurance Coverage</p><p className="card-subtitle">التغطية التأمينية</p></div>
        </div>
        <div className="card-body">
          <p className="section-label-en">Insurance Type</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              {v:'government',l:'Gov. Insurance · حكومي'},
              {v:'private',l:'Private · خاص'},
              {v:'comprehensive',l:'Comprehensive · شامل'},
              {v:'self_pay',l:'Self-pay · بدون تأمين'},
            ].map(({v,l}) => (
              <label key={v} className={`radio-opt-en ${insType === v ? 'sel' : ''}`}>
                <input type="radio" value={v} {...register('insurance.insurance_type')} />
                <span className="rdot" />{l}
              </label>
            ))}
          </div>

          {insType !== 'self_pay' && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="field-label-en">Insurance provider</label>
                  <input {...register('insurance.provider_name')} placeholder="e.g. Allianz, Bupa, MetLife, Gov. HIO" className="input-en-full" />
                </div>
                <div>
                  <label className="field-label-en">Policy number</label>
                  <input {...register('insurance.policy_number')} placeholder="POL-XXXXXXXXX" className="input-en-full font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="field-label-en">Member ID</label>
                  <input {...register('insurance.member_id')} placeholder="MBR-XXXXX" className="input-en-full font-mono" />
                </div>
                <div>
                  <label className="field-label-en">Effective date</label>
                  <input type="date" {...register('insurance.effective_date')} className="input-en-full" />
                </div>
                <div>
                  <label className="field-label-en">Expiry date</label>
                  <input type="date" {...register('insurance.expiry_date')} className="input-en-full" />
                </div>
              </div>

              {/* Coverage table */}
              <p className="section-label-en">Coverage Details</p>
              <div className="overflow-x-auto">
                <table className="ins-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Coverage %</th>
                      <th>Co-pay (EGP)</th>
                      <th>Pre-auth</th>
                      <th>Annual max (EGP)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SERVICES.map(s => (
                      <tr key={s.key}>
                        <td className="font-medium text-xs">{s.label}</td>
                        <td>
                          <input type="number" {...register(`insurance.coverage.${s.key}.pct` as any, { valueAsNumber: true })}
                            min="0" max="100" className="ins-cell" />
                        </td>
                        <td>
                          <input type="number" {...register(`insurance.coverage.${s.key}.copay` as any, { valueAsNumber: true })}
                            min="0" className="ins-cell" />
                        </td>
                        <td>
                          <select {...register(`insurance.coverage.${s.key}.preauth` as any)} className="ins-cell">
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        </td>
                        <td>
                          <input type="number" {...register(`insurance.coverage.${s.key}.annual_max` as any, { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                            placeholder="Unlimited" className="ins-cell" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 mt-3">
                <div>
                  <label className="field-label-en">Insurance coordinator contact</label>
                  <input {...register('insurance.insurance_coordinator')} placeholder="Name / Phone / Email" className="input-en-full" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── PAYMENT ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon amber">💳</span>
          <div><p className="card-title">Payment &amp; Financial Plan</p><p className="card-subtitle">خطة السداد</p></div>
        </div>
        <div className="card-body">
          <p className="section-label-en">Payment Method</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              {v:'cash',l:'Cash · نقدي'},
              {v:'installment',l:'Installments · تقسيط'},
              {v:'ngo',l:'NGO / Charity · خيري'},
              {v:'clinical_trial',l:'Clinical Trial · دراسة'},
              {v:'exemption',l:'Exemption · إعفاء'},
            ].map(({v,l}) => (
              <label key={v} className={`radio-opt-en ${payMethod === v ? 'sel' : ''}`}>
                <input type="radio" value={v} {...register('payment.payment_method')} />
                <span className="rdot" />{l}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="field-label-en">Initial deposit (EGP)</label>
              <input type="number" {...register('payment.initial_deposit', { valueAsNumber: true })} placeholder="0" className="input-en-full" />
            </div>
            <div>
              <label className="field-label-en">Billing cycle</label>
              <select {...register('payment.billing_cycle')} className="input-en-full">
                <option value="per_visit">Per visit</option>
                <option value="per_cycle">Per chemo cycle</option>
                <option value="monthly">Monthly</option>
                <option value="per_episode">Per episode</option>
              </select>
            </div>
            <div>
              <label className="field-label-en">Discount / Sponsor code</label>
              <input {...register('payment.discount_code')} placeholder="DISC-XXX" className="input-en-full font-mono" />
            </div>
          </div>

          {payMethod === 'installment' && (
            <>
              <p className="section-label-en">Installment Plan</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="field-label-en">Down payment (EGP)</label>
                  <input type="number" {...register('payment.down_payment', { valueAsNumber: true })} placeholder="5,000" className="input-en-full" />
                </div>
                <div>
                  <label className="field-label-en">No. of installments</label>
                  <input type="number" {...register('payment.num_installments', { valueAsNumber: true })} placeholder="6" className="input-en-full" />
                </div>
                <div>
                  <label className="field-label-en">Monthly amount (EGP)</label>
                  <input readOnly placeholder="Auto-calculated" className="input-en-full bg-teal-50 text-teal-700 font-mono cursor-not-allowed" />
                </div>
              </div>
            </>
          )}

          {payMethod === 'ngo' && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label-en">NGO / Charity name</label>
                <input {...register('payment.ngo_name')} placeholder="e.g. Baheya Foundation, 57357, Misr El Kheir" className="input-en-full" />
              </div>
              <div>
                <label className="field-label-en">Reference number</label>
                <input placeholder="NGO-XXXXXX" className="input-en-full font-mono" />
              </div>
            </div>
          )}

          <div>
            <label className="field-label-en">Financial notes</label>
            <textarea {...register('payment.financial_notes')} rows={2}
              placeholder="Special arrangements, exemption reason, sponsor details..."
              className="input-en-full" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          ✅ Auto pre-auth requests generated 72hrs before each chemo cycle &amp; imaging study
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save & Continue to Consents'}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </form>
  )
}

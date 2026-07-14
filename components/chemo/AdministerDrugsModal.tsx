'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDrugInventory } from '@/lib/hooks/useDrugInventory'

type SessionDrugRow = {
    id: string
    drug_name: string
    planned_dose_mg: number | null
    actual_dose_mg: number | null
    administered: boolean
}

type Props = {
    sessionId: string
    patientId: string
    patientName: string
    onClose: () => void
    onDone: () => void
}

export function AdministerDrugsModal({ sessionId, patientId, patientName, onClose, onDone }: Props) {
    const supabase = createClient()
    const { items: inventory, saving, error: invError, deductForSession } = useDrugInventory()

    const [drugs, setDrugs] = useState<SessionDrugRow[]>([])
    const [vials, setVials] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [localError, setLocalError] = useState('')
    const [results, setResults] = useState<{ drugName: string; success: boolean; message?: string }[] | null>(null)

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from('session_drugs')
                .select('id, drug_name, planned_dose_mg, actual_dose_mg, administered')
                .eq('session_id', sessionId)
            setDrugs(data || [])
            setLoading(false)
        }
        load()
    }, [sessionId])

    // اقتراح عدد الفيالات تلقائيًا بناءً على الجرعة المخططة وحجم الفيال (لو الدواء متسجل في المخزون)
    function suggestedVials(drugName: string, plannedDose: number | null): number {
        const inv = inventory.find(i => i.drug_name.trim().toLowerCase() === drugName.trim().toLowerCase())
        if (!inv?.vial_size_mg || !plannedDose) return 1
        return Math.ceil(plannedDose / inv.vial_size_mg)
    }

    function getStock(drugName: string): number | null {
        const inv = inventory.find(i => i.drug_name.trim().toLowerCase() === drugName.trim().toLowerCase())
        return inv ? inv.quantity_in_stock : null
    }

    function isRegistered(drugName: string): boolean {
        return inventory.some(i => i.drug_name.trim().toLowerCase() === drugName.trim().toLowerCase())
    }

    async function handleConfirm() {
        setLocalError('')
        const deductions = drugs.map(d => ({
            drugName: d.drug_name,
            vialsUsed: vials[d.id] ?? suggestedVials(d.drug_name, d.planned_dose_mg),
        }))

        // فحص مبدئي: هل أي دواء كميته المطلوبة أكبر من المتاح؟
        const insufficient = deductions.find(d => {
            const stock = getStock(d.drugName)
            return stock !== null && d.vialsUsed > stock
        })
        if (insufficient) {
            setLocalError(`الكمية المطلوبة من "${insufficient.drugName}" أكبر من المتاح بالمخزون`)
            return
        }

        const res = await deductForSession(sessionId, patientId, deductions)
        setResults(res)

        // علّم الأدوية اللي نجح خصمها كـ "مُعطاة" في session_drugs
        const successfulDrugNames = new Set(res.filter(r => r.success).map(r => r.drugName))
        for (const d of drugs) {
            if (successfulDrugNames.has(d.drug_name)) {
                await supabase
                    .from('session_drugs')
                    .update({
                        administered: true,
                        actual_dose_mg: d.planned_dose_mg,
                        infusion_start: new Date().toISOString(),
                    })
                    .eq('id', d.id)
            }
        }

        if (res.every(r => r.success)) {
            onDone()
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 560, maxHeight: '85vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>💊 صرف أدوية الجلسة</p>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>{patientName}</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {(localError || invError) && (
                        <div style={{ background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>
                            {localError || invError}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 30, color: '#8e97b5' }}>جارٍ التحميل...</div>
                    ) : drugs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: '#8e97b5' }}>لا توجد أدوية مسجلة لهذه الجلسة</div>
                    ) : (
                        drugs.map(d => {
                            const stock = getStock(d.drug_name)
                            const registered = isRegistered(d.drug_name)
                            const suggested = suggestedVials(d.drug_name, d.planned_dose_mg)
                            const currentVal = vials[d.id] ?? suggested
                            const insufficientStock = stock !== null && currentVal > stock

                            return (
                                <div key={d.id} style={{
                                    border: `1.5px solid ${insufficientStock ? '#e53e3e' : '#dde2ee'}`,
                                    borderRadius: 10, padding: '12px 14px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{d.drug_name}</p>
                                        {d.planned_dose_mg && (
                                            <span style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>
                                                جرعة مخططة: {d.planned_dose_mg} mg
                                            </span>
                                        )}
                                    </div>

                                    {!registered ? (
                                        <p style={{ fontSize: 11, color: '#b45309', background: '#fff3cd', padding: '6px 10px', borderRadius: 6, margin: 0 }}>
                                            ⚠️ الدواء غير مسجّل في المخزون — سجّله في صفحة المخزون أولاً حتى يتم الخصم
                                        </p>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div>
                                                <label style={{ fontSize: 10, color: '#8e97b5', display: 'block', marginBottom: 4 }}>عدد الفيالات المستخدمة</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={currentVal}
                                                    onChange={e => setVials(v => ({ ...v, [d.id]: parseInt(e.target.value) || 0 }))}
                                                    style={{
                                                        width: 90, padding: '6px 10px', borderRadius: 7,
                                                        border: `1.5px solid ${insufficientStock ? '#e53e3e' : '#dde2ee'}`,
                                                        fontSize: 13, fontFamily: 'DM Mono', direction: 'ltr', outline: 'none',
                                                    }}
                                                />
                                            </div>
                                            <span style={{ fontSize: 11, color: insufficientStock ? '#e53e3e' : '#8e97b5', fontFamily: 'DM Mono' }}>
                                                المتاح بالمخزون: {stock} فيال
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}

                    {results && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {results.map((r, i) => (
                                <div key={i} style={{
                                    fontSize: 11, padding: '6px 10px', borderRadius: 6,
                                    background: r.success ? '#f0fdf4' : '#fde8e8',
                                    color: r.success ? '#16a34a' : '#e53e3e',
                                }}>
                                    {r.success ? `✅ تم خصم ${r.drugName} من المخزون` : `❌ ${r.drugName}: ${r.message}`}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleConfirm} disabled={saving || loading || drugs.length === 0} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الخصم...' : '✅ تأكيد الصرف والخصم'}
                    </button>
                </div>
            </div>
        </div>
    )
}
'use client'
import { useState } from 'react'
import { useDrugInventory } from '@/lib/hooks/useDrugInventory'

export default function InventoryPage() {
    const { items, loading, saving, error, addDrug, restock, getTransactions } = useDrugInventory()
    const [showNew, setShowNew] = useState(false)
    const [restockTarget, setRestockTarget] = useState<any>(null)
    const [restockQty, setRestockQty] = useState('')
    const [logDrug, setLogDrug] = useState<any>(null)
    const [logData, setLogData] = useState<any[]>([])

    const [form, setForm] = useState({
        drug_name: '', vial_size_mg: '', vial_unit: 'mg',
        quantity_in_stock: '', reorder_threshold: '10', unit_cost: '',
    })

    async function handleAdd() {
        if (!form.drug_name || !form.quantity_in_stock) return
        await addDrug({
            drug_name: form.drug_name,
            vial_size_mg: form.vial_size_mg ? parseFloat(form.vial_size_mg) : null,
            vial_unit: form.vial_unit,
            quantity_in_stock: parseInt(form.quantity_in_stock),
            reorder_threshold: parseInt(form.reorder_threshold) || 10,
            unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
        })
        setShowNew(false)
        setForm({ drug_name: '', vial_size_mg: '', vial_unit: 'mg', quantity_in_stock: '', reorder_threshold: '10', unit_cost: '' })
    }

    async function handleRestock() {
        if (!restockTarget || !restockQty) return
        await restock(restockTarget.id, parseInt(restockQty))
        setRestockTarget(null)
        setRestockQty('')
    }

    async function openLog(item: any) {
        setLogDrug(item)
        const tx = await getTransactions(item.id)
        setLogData(tx)
    }

    const lowStock = items.filter(i => i.quantity_in_stock <= i.reorder_threshold)

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>مخزون الأدوية</h1>
                    <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                        {items.length} صنف · {lowStock.length} تحت حد إعادة الطلب
                    </p>
                </div>
                <button onClick={() => setShowNew(true)} style={{
                    padding: '9px 20px', background: '#1a8a78', color: '#fff',
                    borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                    + إضافة دواء جديد
                </button>
            </div>

            {lowStock.length > 0 && (
                <div style={{ background: '#fff3cd', border: '1px solid rgba(180,83,9,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#b45309' }}>
                    ⚠️ {lowStock.length} صنف وصل لحد إعادة الطلب: {lowStock.map(i => i.drug_name).join('، ')}
                </div>
            )}

            {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e', marginBottom: 16 }}>{error}</div>}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
            ) : (
                <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f7f8fc', borderBottom: '1.5px solid #dde2ee' }}>
                                {['الدواء', 'حجم الفيال', 'الكمية المتاحة', 'حد إعادة الطلب', 'آخر توريد', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 10, fontFamily: 'DM Mono', color: '#8e97b5', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => {
                                const isLow = item.quantity_in_stock <= item.reorder_threshold
                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #eef0f6', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0b1f3a' }}>{item.drug_name}</td>
                                        <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', color: '#4a5580' }}>
                                            {item.vial_size_mg ? `${item.vial_size_mg} ${item.vial_unit}` : '—'}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{
                                                fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13,
                                                color: isLow ? '#e53e3e' : '#16a34a',
                                                background: isLow ? '#fde8e8' : '#f0fdf4',
                                                padding: '2px 10px', borderRadius: 20,
                                            }}>
                                                {item.quantity_in_stock} فيال
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', color: '#8e97b5' }}>{item.reorder_threshold}</td>
                                        <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', fontSize: 10, color: '#8e97b5' }}>
                                            {item.last_restocked_at ? new Date(item.last_restocked_at).toLocaleDateString('ar-EG') : '—'}
                                        </td>
                                        <td style={{ padding: '12px 14px', display: 'flex', gap: 6 }}>
                                            <button onClick={() => setRestockTarget(item)} style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid rgba(42,184,160,.3)', background: '#e6f7f4', color: '#1a8a78', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                                + توريد
                                            </button>
                                            <button onClick={() => openLog(item)} style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid #dde2ee', background: '#fff', color: '#4a5580', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                                السجل
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Drug Modal */}
            {showNew && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowNew(false)}>
                    <div style={{ background: '#fff', borderRadius: 18, width: 460, direction: 'rtl', fontFamily: 'Cairo' }}>
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>إضافة دواء للمخزون</p>
                            <button onClick={() => setShowNew(false)} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                        </div>
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>اسم الدواء *</label>
                                <input value={form.drug_name} onChange={e => setForm(f => ({ ...f, drug_name: e.target.value }))}
                                    placeholder="مطابق تمامًا لاسم الدواء في البروتوكول"
                                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>حجم الفيال</label>
                                    <input type="number" value={form.vial_size_mg} onChange={e => setForm(f => ({ ...f, vial_size_mg: e.target.value }))}
                                        placeholder="e.g. 100" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الوحدة</label>
                                    <select value={form.vial_unit} onChange={e => setForm(f => ({ ...f, vial_unit: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none' }}>
                                        <option value="mg">mg</option>
                                        <option value="ml">ml</option>
                                        <option value="unit">unit</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الكمية الحالية *</label>
                                    <input type="number" value={form.quantity_in_stock} onChange={e => setForm(f => ({ ...f, quantity_in_stock: e.target.value }))}
                                        placeholder="0" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>حد إعادة الطلب</label>
                                    <input type="number" value={form.reorder_threshold} onChange={e => setForm(f => ({ ...f, reorder_threshold: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr' }} />
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                            <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restock Modal */}
            {restockTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setRestockTarget(null)}>
                    <div style={{ background: '#fff', borderRadius: 18, width: 380, direction: 'rtl', fontFamily: 'Cairo', padding: 24 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#0b1f3a', margin: '0 0 4px' }}>توريد: {restockTarget.drug_name}</p>
                        <p style={{ fontSize: 11, color: '#8e97b5', margin: '0 0 16px' }}>الكمية الحالية: {restockTarget.quantity_in_stock} فيال</p>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الكمية المُورَّدة</label>
                        <input type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)}
                            placeholder="e.g. 50" style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 13, outline: 'none', direction: 'ltr', marginBottom: 16 }} />
                        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                            <button onClick={() => setRestockTarget(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                            <button onClick={handleRestock} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                                تأكيد التوريد
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Log Modal */}
            {logDrug && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setLogDrug(null)}>
                    <div style={{ background: '#fff', borderRadius: 18, width: 520, maxHeight: '75vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>سجل حركات: {logDrug.drug_name}</p>
                            <button onClick={() => setLogDrug(null)} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                        </div>
                        <div style={{ padding: '16px 24px' }}>
                            {logData.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#8e97b5', padding: 20 }}>لا توجد حركات مسجلة</p>
                            ) : logData.map(tx => (
                                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef0f6', fontSize: 12 }}>
                                    <div>
                                        <span style={{
                                            fontWeight: 700,
                                            color: tx.vials_changed < 0 ? '#e53e3e' : '#16a34a',
                                        }}>
                                            {tx.vials_changed > 0 ? '+' : ''}{tx.vials_changed}
                                        </span>
                                        <span style={{ color: '#8e97b5', marginRight: 8 }}>
                                            {tx.transaction_type === 'deduction' ? 'صرف' : tx.transaction_type === 'restock' ? 'توريد' : tx.transaction_type}
                                        </span>
                                        {tx.patient && <span style={{ color: '#4a5580', marginRight: 8 }}>· {tx.patient.first_name_ar} {tx.patient.last_name_ar}</span>}
                                    </div>
                                    <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#8e97b5' }}>
                                        {new Date(tx.created_at).toLocaleString('ar-EG')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
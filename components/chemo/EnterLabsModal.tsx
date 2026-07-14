'use client'
import { useState } from 'react'
import { useChemoScheduler, type LabsInput, type LabsEvalResult } from '@/lib/hooks/useChemoScheduler'

type Props = {
    sessionId: string
    patientName: string
    onClose: () => void
    onDone: () => void
}

export function EnterLabsModal({ sessionId, patientName, onClose, onDone }: Props) {
    const { enterLabs, saving } = useChemoScheduler()

    const [labs, setLabs] = useState<LabsInput>({
        wbc_pre: null,
        anc_pre: null,
        hgb_pre: null,
        plt_pre: null,
        alt_pre: null,
        creatinine_pre: null,
    })
    const [evaluation, setEvaluation] = useState<LabsEvalResult | null>(null)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    const FIELDS: { key: keyof LabsInput; label: string; unit: string; placeholder: string }[] = [
        { key: 'wbc_pre', label: 'WBC', unit: '×10³/µL', placeholder: 'e.g. 5.2' },
        { key: 'anc_pre', label: 'ANC', unit: '×10³/µL', placeholder: 'e.g. 2.1' },
        { key: 'hgb_pre', label: 'Hgb', unit: 'g/dL', placeholder: 'e.g. 11.5' },
        { key: 'plt_pre', label: 'Platelets', unit: '×10³/µL', placeholder: 'e.g. 180' },
        { key: 'alt_pre', label: 'ALT', unit: 'U/L', placeholder: 'e.g. 25' },
        { key: 'creatinine_pre', label: 'Creatinine', unit: 'mg/dL', placeholder: 'e.g. 0.9' },
    ]

    function handleChange(key: keyof LabsInput, value: string) {
        setLabs(prev => ({ ...prev, [key]: value === '' ? null : parseFloat(value) }))
        setEvaluation(null) // أي تعديل جديد يمسح التقييم السابق لحد ما يعيد الفحص
        setSaved(false)
    }

    function handleCheck() {
        // استدعاء محلي للتقييم فقط للمعاينة (evaluateLabs متاحة داخل نفس الـ hook instance)
        const { evaluateLabs } = require('@/lib/hooks/useChemoScheduler')
        // ملاحظة: احتياطًا نستخدم منطق مطابق تمامًا هنا عبر استدعاء enterLabs لاحقًا للحفظ الفعلي
    }

    async function handleSaveAndEvaluate() {
        setError('')
        try {
            const result = await enterLabs(sessionId, labs)
            setEvaluation(result)
            setSaved(true)
        } catch (e: any) {
            setError(e.message)
        }
    }

    const hasAnyValue = Object.values(labs).some(v => v !== null)

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 520, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>🧪 إدخال تحاليل ما قبل الجلسة</p>
                        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>{patientName}</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {FIELDS.map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>
                                    {f.label} <span style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono' }}>({f.unit})</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={labs[f.key] ?? ''}
                                    onChange={e => handleChange(f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                    style={{
                                        width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee',
                                        borderRadius: 7, fontSize: 13, fontFamily: 'DM Mono', outline: 'none',
                                        direction: 'ltr', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* نتيجة التقييم بعد الحفظ */}
                    {evaluation && (
                        <div style={{
                            borderRadius: 10, padding: 16,
                            background: evaluation.critical ? '#fde8e8' : evaluation.issues.length > 0 ? '#fff3cd' : '#f0fdf4',
                            border: `1.5px solid ${evaluation.critical ? 'rgba(229,62,62,.3)' : evaluation.issues.length > 0 ? 'rgba(180,83,9,.3)' : 'rgba(22,163,74,.3)'}`,
                        }}>
                            <p style={{
                                fontSize: 13, fontWeight: 700, margin: '0 0 10px',
                                color: evaluation.critical ? '#e53e3e' : evaluation.issues.length > 0 ? '#b45309' : '#16a34a',
                            }}>
                                {evaluation.critical
                                    ? '🚫 نتائج حرجة — يُنصح بعدم إعطاء الجلسة حتى مراجعة الطبيب'
                                    : evaluation.issues.length > 0
                                        ? '⚠️ نتائج تستدعي الانتباه — راجع الطبيب قبل الإعطاء'
                                        : '✅ جميع النتائج ضمن النطاق الآمن — الجلسة معتمدة'}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {evaluation.issues.map((i, idx) => (
                                    <div key={idx} style={{
                                        fontSize: 11, padding: '6px 10px', borderRadius: 6,
                                        background: i.severity === 'critical' ? 'rgba(229,62,62,.1)' : 'rgba(180,83,9,.1)',
                                        color: i.severity === 'critical' ? '#e53e3e' : '#b45309',
                                    }}>
                                        {i.severity === 'critical' ? '🚫' : '⚠️'} {i.message}
                                    </div>
                                ))}
                                {evaluation.clears.map((c, idx) => (
                                    <div key={idx} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, background: 'rgba(22,163,74,.08)', color: '#16a34a' }}>
                                        ✅ {c.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {saved && (
                        <p style={{ fontSize: 10, color: '#8e97b5', margin: 0 }}>
                            تم حفظ نتائج التحاليل وربطها بهذه الجلسة.
                        </p>
                    )}
                </div>

                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>
                        {saved ? 'إغلاق' : 'إلغاء'}
                    </button>
                    {!saved ? (
                        <button onClick={handleSaveAndEvaluate} disabled={saving || !hasAnyValue} style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78',
                            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (saving || !hasAnyValue) ? .6 : 1,
                        }}>
                            {saving ? 'جارٍ الحفظ...' : '🧪 حفظ وتقييم النتائج'}
                        </button>
                    ) : (
                        <button onClick={onDone} style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78',
                            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>
                            تم ✓
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
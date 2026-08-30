'use client'
import { useRef, useState, useEffect, type CSSProperties, type ChangeEvent } from 'react'

type Props = {
    value: string
    onChange: (value: string) => void
    className?: string
    style?: CSSProperties
    placeholder?: string
}

export function DateInputHybrid({ value, onChange, className, style, placeholder }: Props) {
    // تحويل من yyyy-mm-dd لعرض dd/mm/yyyy (أسهل للكتابة اليدوية بالعربي)
    function toDisplayFormat(isoDate: string): string {
        if (!isoDate) return ''
        const [y, m, d] = isoDate.split('-')
        if (!y || !m || !d) return ''
        return `${d}/${m}/${y}`
    }

    // تحويل من dd/mm/yyyy أو d/m/yyyy لـ yyyy-mm-dd
    function toIsoFormat(display: string): string | null {
        const cleaned = display.trim().replace(/[.\-]/g, '/')
        const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        if (!match) return null

        const [, d, m, y] = match
        const day = d.padStart(2, '0')
        const month = m.padStart(2, '0')
        const dayNum = parseInt(d, 10)
        const monthNum = parseInt(m, 10)
        const yearNum = parseInt(y, 10)

        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || yearNum < 1900 || yearNum > 2100) return null

        return `${y}-${month}-${day}`
    }

    const [displayValue, setDisplayValue] = useState(toDisplayFormat(value))
    const [error, setError] = useState(false)
    const hiddenDateRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setDisplayValue(toDisplayFormat(value))
        setError(false)
    }, [value])

    function handleTextChange(e: ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value
        setDisplayValue(raw)

        if (raw === '') {
            setError(false)
            onChange('')
            return
        }

        const iso = toIsoFormat(raw)
        if (iso) {
            setError(false)
            onChange(iso)
        } else {
            // مش مكتمل لسه أو غلط — منعرضش خطأ إلا لو المستخدم خلص كتابة (طول كافي)
            setError(raw.length >= 8)
        }
    }

    function handleBlur() {
        // لو المستخدم سايب حقل غير مكتمل أو غلط، رجّع آخر قيمة صحيحة معروفة
        if (displayValue && !toIsoFormat(displayValue)) {
            setDisplayValue(toDisplayFormat(value))
            setError(false)
        }
    }

    function openCalendar() {
        hiddenDateRef.current?.showPicker?.() ?? hiddenDateRef.current?.focus()
    }

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleTextChange}
                onBlur={handleBlur}
                placeholder={placeholder || 'dd/mm/yyyy'}
                className={className}
                style={{
                    direction: 'ltr',
                    fontFamily: 'DM Mono, monospace',
                    paddingLeft: 34,
                    borderColor: error ? '#e53e3e' : undefined,
                    width: '100%',
                    boxSizing: 'border-box',
                    ...style,
                }}
            />
            <button
                type="button"
                onClick={openCalendar}
                tabIndex={-1}
                style={{
                    position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 15,
                    color: '#8e97b5', padding: 4, lineHeight: 1,
                }}
                aria-label="اختيار من التقويم"
            >
                📅
            </button>
            {/* حقل التاريخ الأصلي مخفي، بيتفتح بس لما تدوس على أيقونة التقويم */}
            <input
                ref={hiddenDateRef}
                type="date"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                style={{
                    position: 'absolute', opacity: 0, width: 1, height: 1,
                    pointerEvents: 'none', left: 0, top: 0,
                }}
                tabIndex={-1}
            />
            {error && (
                <p style={{ position: 'absolute', top: '100%', right: 0, fontSize: 9, color: '#e53e3e', marginTop: 2 }}>
                    صيغة غير صحيحة — استخدم dd/mm/yyyy
                </p>
            )}
        </div>
    )
}

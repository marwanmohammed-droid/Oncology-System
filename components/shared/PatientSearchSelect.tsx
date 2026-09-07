'use client'
import { useState, useMemo, useRef, useEffect } from 'react'

type Patient = { id: string; mrn: string; first_name_ar: string; last_name_ar: string }

type Props = {
    patients: Patient[]
    value: string
    onChange: (id: string) => void
    placeholder?: string
}

export function PatientSearchSelect({ patients, value, onChange, placeholder = 'ابحث بالاسم أو الرقم التسلسلي (MRN)...' }: Props) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    const selectedPatient = patients.find(p => p.id === value)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const results = useMemo(() => {
        if (!query) return patients.slice(0, 8)
        const q = query.toLowerCase()
        return patients.filter(p => {
            const name = `${p.first_name_ar} ${p.last_name_ar}`.toLowerCase()
            return name.includes(q) || (p.mrn || '').toLowerCase().includes(q)
        }).slice(0, 8)
    }, [query, patients])

    function handleSelect(p: Patient) {
        onChange(p.id)
        setQuery('')
        setOpen(false)
    }

    if (selectedPatient && !open) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 11px', border: '1.5px solid #e6f7f4', background: '#f0fdf4',
                borderRadius: 7, fontSize: 12,
            }}>
                <span style={{ color: '#1a8a78', fontWeight: 700 }}>
                    ✓ {selectedPatient.first_name_ar} {selectedPatient.last_name_ar}
                    <span style={{ fontFamily: 'DM Mono', color: '#8e97b5', fontWeight: 400, marginRight: 8 }}>
                        · {selectedPatient.mrn}
                    </span>
                </span>
                <button type="button" onClick={() => setOpen(true)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#8e97b5', fontSize: 11, fontWeight: 600,
                }}>
                    تغيير
                </button>
            </div>
        )
    }

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <input
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7,
                    fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box', direction: 'rtl',
                }}
            />
            {open && (
                <div style={{
                    border: '1.5px solid #dde2ee', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto',
                    background: '#fff', position: 'absolute', width: '100%', zIndex: 20, boxShadow: '0 8px 20px rgba(11,31,58,.12)',
                }}>
                    {results.length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: 12, color: '#8e97b5' }}>لا توجد نتائج مطابقة</div>
                    ) : (
                        results.map(p => (
                            <div key={p.id} onClick={() => handleSelect(p)}
                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eef0f6', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700, color: '#0b1f3a' }}>{p.first_name_ar} {p.last_name_ar}</span>
                                <span style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{p.mrn}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
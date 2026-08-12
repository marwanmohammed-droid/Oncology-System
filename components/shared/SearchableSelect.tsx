'use client'
import { useState, useRef, useEffect } from 'react'

type Props = {
    value: string
    onChange: (value: string) => void
    options: string[]
    onAddNew?: (newValue: string) => Promise<void> | void
    placeholder?: string
    addNewLabel?: string
}

export function SearchableSelect({ value, onChange, options, onAddNew, placeholder, addNewLabel }: Props) {
    const [query, setQuery] = useState(value || '')
    const [isOpen, setIsOpen] = useState(false)
    const [adding, setAdding] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setQuery(value || '') }, [value])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filtered = query
        ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
        : options.slice(0, 8)

    const exactMatch = options.some(o => o.toLowerCase() === query.toLowerCase())

    function handleSelect(option: string) {
        onChange(option)
        setQuery(option)
        setIsOpen(false)
    }

    async function handleAddNew() {
        if (!query || !onAddNew) return
        setAdding(true)
        try {
            await onAddNew(query)
            onChange(query)
            setIsOpen(false)
        } finally {
            setAdding(false)
        }
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <input
                value={query}
                onChange={e => { setQuery(e.target.value); onChange(''); setIsOpen(true) }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="input-en-full"
            />
            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 30,
                    background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 8,
                    marginTop: 4, maxHeight: 220, overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,.08)',
                }}>
                    {filtered.map(option => (
                        <div key={option} onClick={() => handleSelect(option)}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #eef0f6', color: '#0b1f3a' }}
                            onMouseDown={e => e.preventDefault()}>
                            {option}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: 11, color: '#8e97b5' }}>لا توجد نتائج</div>
                    )}
                    {query && !exactMatch && onAddNew && (
                        <div
                            onClick={handleAddNew}
                            onMouseDown={e => e.preventDefault()}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#1a8a78', fontWeight: 700, background: '#f0fdf4' }}
                        >
                            {adding ? 'جارٍ الإضافة...' : `+ ${addNewLabel || 'إضافة'} "${query}"`}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
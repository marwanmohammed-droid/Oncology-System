'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePatientRegistry, type RegistryEntry } from '@/lib/hooks/usePatientRegistry'

const PLAN_STATUS_AR: Record<string, string> = {
    planned: 'مخططة', active: 'نشطة', on_hold: 'متوقفة مؤقتًا', completed: 'مكتملة', discontinued: 'موقوفة', cancelled: 'ملغية',
}
const PROTOCOL_CLASS_AR: Record<string, string> = {
    chemotherapy: 'كيماوي', hormonal: 'هرموني', immunotherapy: 'مناعي', targeted: 'موجّه', combined: 'مركّب',
}

export default function RegistryPage() {
    const { loading, getRegistry, getFilterOptions, exportCsv } = usePatientRegistry()
    const [entries, setEntries] = useState<RegistryEntry[]>([])
    const [options, setOptions] = useState<{ sites: string[]; protocols: string[]; stages: string[] }>({ sites: [], protocols: [], stages: [] })
    const [filters, setFilters] = useState({ primarySite: '', protocolName: '', stage: '', planStatus: '' })
    const [search, setSearch] = useState('')
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        async function loadOptions() {
            const opts = await getFilterOptions()
            setOptions(opts)
        }
        loadOptions()
    }, [getFilterOptions])

    const loadEntries = useCallback(async () => {
        const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as any
        const data = await getRegistry(cleanFilters)
        setEntries(data)
    }, [filters, getRegistry])

    useEffect(() => { loadEntries() }, [loadEntries])

    const filtered = entries.filter(e => {
        if (!search) return true
        return e.patientName.includes(search) || e.mrn.toLowerCase().includes(search.toLowerCase())
    })

    // إحصائيات سريعة
    const bySite: Record<string, number> = {}
    const byProtocol: Record<string, number> = {}
    const byProtocolClass: Record<string, number> = {}
    entries.forEach(e => {
        if (e.primarySite) bySite[e.primarySite] = (bySite[e.primarySite] || 0) + 1
        if (e.activeProtocol) byProtocol[e.activeProtocol] = (byProtocol[e.activeProtocol] || 0) + 1
        if (e.protocolClass) byProtocolClass[e.protocolClass] = (byProtocolClass[e.protocolClass] || 0) + 1
    })
    const topSites = Object.entries(bySite).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const topProtocols = Object.entries(byProtocol).sort((a, b) => b[1] - a[1]).slice(0, 8)

    function resetFilters() {
        setFilters({ primarySite: '', protocolName: '', stage: '', planStatus: '' })
        setSearch('')
    }

    const hasActiveFilters = Object.values(filters).some(v => v) || search

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>فهرس المرضى والإحصائيات</h1>
                    <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                        Patient Registry · {filtered.length} من {entries.length} مريض
                    </p>
                </div>
                <button onClick={async () => { setExporting(true); exportCsv(filtered); setExporting(false) }} disabled={exporting || filtered.length === 0} style={{
                    padding: '9px 20px', background: '#1a8a78', color: '#fff', border: 'none',
                    borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (exporting || filtered.length === 0) ? .6 : 1,
                }}>
                    ⬇️ تصدير CSV
                </button>
            </div>

            {/* إحصائيات سريعة */}
            {!hasActiveFilters && entries.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>الأكثر شيوعًا حسب نوع الورم</p>
                        </div>
                        <div style={{ padding: '10px 18px' }}>
                            {topSites.map(([site, count]) => (
                                <StatBar key={site} label={site} count={count} max={topSites[0][1]} onClick={() => setFilters(f => ({ ...f, primarySite: site }))} />
                            ))}
                        </div>
                    </div>
                    <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>الأكثر شيوعًا حسب البروتوكول</p>
                        </div>
                        <div style={{ padding: '10px 18px' }}>
                            {topProtocols.map(([protocol, count]) => (
                                <StatBar key={protocol} label={protocol} count={count} max={topProtocols[0][1]} color="#9333ea" onClick={() => setFilters(f => ({ ...f, protocolName: protocol }))} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid #dde2ee', borderRadius: 8 }}>
                        <span style={{ color: '#8e97b5', fontSize: 12 }}>🔍</span>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو MRN"
                            style={{ border: 'none', outline: 'none', fontSize: 12, fontFamily: 'Cairo', flex: 1, direction: 'rtl' }} />
                    </div>
                    <select value={filters.primarySite} onChange={e => setFilters(f => ({ ...f, primarySite: e.target.value }))} style={selectStyle}>
                        <option value="">كل الأورام</option>
                        {options.sites.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filters.protocolName} onChange={e => setFilters(f => ({ ...f, protocolName: e.target.value }))} style={selectStyle}>
                        <option value="">كل البروتوكولات</option>
                        {options.protocols.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={filters.stage} onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))} style={selectStyle}>
                        <option value="">كل المراحل</option>
                        {options.stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filters.planStatus} onChange={e => setFilters(f => ({ ...f, planStatus: e.target.value }))} style={selectStyle}>
                        <option value="">كل حالات الخطة</option>
                        {Object.entries(PLAN_STATUS_AR).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
                {hasActiveFilters && (
                    <button onClick={resetFilters} style={{ fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}>
                        ✕ إزالة كل الفلاتر
                    </button>
                )}
            </div>

            {/* Results table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                    <p style={{ fontWeight: 600, color: '#4a5580' }}>لا توجد نتائج مطابقة</p>
                </div>
            ) : (
                <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f7f8fc', borderBottom: '1.5px solid #dde2ee' }}>
                                {['المريض', 'العمر/الجنس', 'الورم', 'المرحلة', 'البروتوكول', 'التصنيف', 'حالة الخطة', 'التقدم', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 10, fontFamily: 'DM Mono', color: '#8e97b5', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((e, i) => (
                                <tr key={e.patientId} style={{ borderBottom: '1px solid #eef0f6', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                                    <td style={{ padding: '12px 14px' }}>
                                        <p style={{ margin: 0, fontWeight: 700, color: '#0b1f3a' }}>{e.patientName}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{e.mrn}</p>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontFamily: 'DM Mono' }}>{e.age} / {e.sex}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {e.primarySite ?? '—'}
                                        {e.isMetastatic && (
                                            <span style={{ marginRight: 6, fontSize: 8, padding: '1px 6px', borderRadius: 20, background: '#fde8e8', color: '#e53e3e', fontWeight: 700 }}>Meta</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>{e.stage ?? '—'}</td>
                                    <td style={{ padding: '12px 14px' }}>{e.activeProtocol ?? '—'}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 10, color: '#8e97b5' }}>{e.protocolClass ? PROTOCOL_CLASS_AR[e.protocolClass] || e.protocolClass : '—'}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {e.planStatus ? (
                                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#e6f7f4', color: '#1a8a78', fontWeight: 600 }}>
                                                {PLAN_STATUS_AR[e.planStatus] || e.planStatus}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', fontSize: 11 }}>
                                        {e.completedCycles != null ? `${e.completedCycles}/${e.plannedCycles}` : '—'}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <Link href={`/patients/${e.patientId}`} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #dde2ee', color: '#4a5580', textDecoration: 'none', fontSize: 11, fontWeight: 600 }}>
                                            عرض الملف
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

function StatBar({ label, count, max, color = '#1a8a78', onClick }: { label: string; count: number; max: number; color?: string; onClick: () => void }) {
    const pct = Math.round((count / max) * 100)
    return (
        <div onClick={onClick} style={{ padding: '6px 0', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#4a5580' }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'DM Mono' }}>{count}</span>
            </div>
            <div style={{ height: 6, background: '#eef0f6', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10 }} />
            </div>
        </div>
    )
}

const selectStyle: React.CSSProperties = {
    padding: '8px 12px', border: '1.5px solid #dde2ee', borderRadius: 8,
    fontSize: 12, fontFamily: 'Cairo, sans-serif', outline: 'none', background: '#fff',
}
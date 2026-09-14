'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useFullDataExport } from '@/lib/hooks/useFullDataExport'
import { usePatientRegistry, type RegistryEntry, type RegistryStats } from '@/lib/hooks/usePatientRegistry'

const PLAN_STATUS_LABELS: Record<string, string> = {
    planned: 'Planned', active: 'Active', on_hold: 'On Hold', completed: 'Completed', discontinued: 'Discontinued', cancelled: 'Cancelled',
}
const PROTOCOL_CLASS_LABELS: Record<string, string> = {
    chemotherapy: 'Chemotherapy', hormonal: 'Hormonal', immunotherapy: 'Immunotherapy', targeted: 'Targeted', combined: 'Combined',
}
const AGE_GROUP_LABELS: Record<string, string> = {
    Pediatric: 'Pediatric (< 18)', Adult: 'Adult (18-64)', Geriatric: 'Geriatric (65+)',
}

export default function RegistryPage() {
    const { loading, getRegistry, computeStats, getFilterOptions, exportCsv } = usePatientRegistry()
    const [entries, setEntries] = useState<RegistryEntry[]>([])
    const [stats, setStats] = useState<RegistryStats | null>(null)
    const [options, setOptions] = useState<{ sites: string[]; protocols: string[]; stages: string[]; nationalities: string[] }>({ sites: [], protocols: [], stages: [], nationalities: [] })
    const [filters, setFilters] = useState({ primarySite: '', protocolName: '', stage: '', planStatus: '', sex: '', ageGroup: '', metastatic: '', nationality: '' })
    const [search, setSearch] = useState('')
    const [exporting, setExporting] = useState(false)
    const [view, setView] = useState<'dashboard' | 'table'>('dashboard')
    const { exportAllData, exporting: fullExporting, progress: fullExportProgress } = useFullDataExport()

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
        setStats(computeStats(data))
    }, [filters, getRegistry, computeStats])

    useEffect(() => { loadEntries() }, [loadEntries])

    const filtered = entries.filter(e => {
        if (!search) return true
        return e.patientName.includes(search) || e.mrn.toLowerCase().includes(search.toLowerCase())
    })

    function resetFilters() {
        setFilters({ primarySite: '', protocolName: '', stage: '', planStatus: '', sex: '', ageGroup: '', metastatic: '', nationality: '' })
        setSearch('')
    }
    const hasActiveFilters = Object.values(filters).some(v => v) || search

    return (
        <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'ltr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Research & Statistics Dashboard</h1>
                    <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
                        Research Dashboard · {filtered.length} of {entries.length} patients
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setView(view === 'dashboard' ? 'table' : 'dashboard')} style={{
                        padding: '9px 18px', background: '#fff', color: '#4a5580', border: '1.5px solid #dde2ee',
                        borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                        {view === 'dashboard' ? '📋 Table View' : '📊 Dashboard View'}
                    </button>
                    <button onClick={async () => { setExporting(true); exportCsv(filtered); setExporting(false) }} disabled={exporting || filtered.length === 0} style={{
                        padding: '9px 20px', background: '#1a8a78', color: '#fff', border: 'none',
                        borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (exporting || filtered.length === 0) ? .6 : 1,
                    }}>
                        ⬇️ Export Research Data (CSV)
                    </button>

                    <button onClick={exportAllData} disabled={fullExporting} style={{
                        padding: '9px 18px', background: '#0b1f3a', color: '#fff', border: 'none',
                        borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: fullExporting ? .6 : 1,
                    }}>
                        {fullExporting ? (fullExportProgress || 'Exporting...') : '📊 Export All Data (Full Excel)'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid #dde2ee', borderRadius: 8 }}>
                        <span style={{ color: '#8e97b5', fontSize: 12 }}>🔍</span>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or MRN"
                            style={{ border: 'none', outline: 'none', fontSize: 12, fontFamily: 'Cairo', flex: 1, direction: 'ltr' }} />
                    </div>
                    <select value={filters.sex} onChange={e => setFilters(f => ({ ...f, sex: e.target.value }))} style={selectStyle}>
                        <option value="">All Sexes</option>
                        {/* NOTE: values kept as-is to match data returned by usePatientRegistry (likely 'ذكر'/'أنثى') */}
                        <option value="ذكر">Male</option>
                        <option value="أنثى">Female</option>
                    </select>
                    <select value={filters.ageGroup} onChange={e => setFilters(f => ({ ...f, ageGroup: e.target.value }))} style={selectStyle}>
                        <option value="">All Age Groups</option>
                        {Object.entries(AGE_GROUP_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <select value={filters.metastatic} onChange={e => setFilters(f => ({ ...f, metastatic: e.target.value }))} style={selectStyle}>
                        <option value="">All (Metastatic)</option>
                        <option value="yes">Metastatic only</option>
                        <option value="no">Non-metastatic</option>
                    </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <select value={filters.primarySite} onChange={e => setFilters(f => ({ ...f, primarySite: e.target.value }))} style={selectStyle}>
                        <option value="">All Tumor Types</option>
                        {options.sites.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filters.protocolName} onChange={e => setFilters(f => ({ ...f, protocolName: e.target.value }))} style={selectStyle}>
                        <option value="">All Protocols</option>
                        {options.protocols.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={filters.stage} onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))} style={selectStyle}>
                        <option value="">All Stages</option>
                        {options.stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filters.nationality} onChange={e => setFilters(f => ({ ...f, nationality: e.target.value }))} style={selectStyle}>
                        <option value="">All Nationalities</option>
                        {options.nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                {hasActiveFilters && (
                    <button onClick={resetFilters} style={{ fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', marginTop: 10 }}>
                        ✕ Clear all filters
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>Loading...</div>
            ) : view === 'dashboard' ? (
                stats && entries.length > 0 ? (
                    <DashboardView stats={stats} onFilterClick={(key, value) => setFilters(f => ({ ...f, [key]: value }))} />
                ) : (
                    <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>No matching data</div>
                )
            ) : (
                <RegistryTable entries={filtered} />
            )}
        </div>
    )
}

function DashboardView({ stats, onFilterClick }: { stats: RegistryStats; onFilterClick: (key: string, value: string) => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                <SummaryCard label="Total Patients" value={stats.total} color="#0b1f3a" bg="#f7f8fc" />
                <SummaryCard label="Average Age" value={`${stats.avgAge} yrs`} color="#1a8a78" bg="#e6f7f4" />
                <SummaryCard label="Metastatic Cases" value={stats.metastaticCount} color="#e53e3e" bg="#fde8e8" />
                {/* NOTE: keys kept as 'ذكر'/'أنثى' to match stats.bySex keys returned by the hook */}
                <SummaryCard label="Male" value={stats.bySex['ذكر'] || 0} color="#4a5580" bg="#f7f8fc" />
                <SummaryCard label="Female" value={stats.bySex['أنثى'] || 0} color="#9333ea" bg="#faf5ff" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <DistributionCard title="Distribution by Age Group" subtitle="Age Group Distribution"
                    data={Object.entries(stats.byAgeGroup).map(([k, v]) => [AGE_GROUP_LABELS[k] || k, v] as [string, number])}
                    total={stats.total} color="#1a8a78" onClick={(label) => {
                        const key = Object.entries(AGE_GROUP_LABELS).find(([, l]) => l === label)?.[0]
                        if (key) onFilterClick('ageGroup', key)
                    }} />
                <DistributionCard title="Distribution by Nationality" subtitle="Nationality Distribution"
                    data={Object.entries(stats.byNationality).sort((a, b) => b[1] - a[1]).slice(0, 8)}
                    total={stats.total} color="#9333ea" onClick={(label) => onFilterClick('nationality', label)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <DistributionCard title="Distribution by Primary Site" subtitle="Primary Site Distribution"
                    data={Object.entries(stats.byPrimarySite).sort((a, b) => b[1] - a[1]).slice(0, 10)}
                    total={stats.total} color="#e53e3e" onClick={(label) => onFilterClick('primarySite', label)} />
                <DistributionCard title="Distribution by Stage" subtitle="Stage Distribution"
                    data={Object.entries(stats.byStage).sort((a, b) => a[0].localeCompare(b[0]))}
                    total={stats.total} color="#b45309" onClick={(label) => onFilterClick('stage', label)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <DistributionCard title="Distribution by Protocol" subtitle="Protocol Distribution"
                    data={Object.entries(stats.byProtocol).sort((a, b) => b[1] - a[1]).slice(0, 10)}
                    total={stats.total} color="#1a8a78" onClick={(label) => onFilterClick('protocolName', label)} />
                <DistributionCard title="Distribution by Protocol Class" subtitle="Protocol Class Distribution"
                    data={Object.entries(stats.byProtocolClass).map(([k, v]) => [PROTOCOL_CLASS_LABELS[k] || k, v] as [string, number])}
                    total={stats.total} color="#4a5580" onClick={() => { }} />
            </div>

            {/* Metastatic breakdown */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: '18px 22px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: '0 0 14px' }}>Metastatic Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ height: 24, borderRadius: 20, overflow: 'hidden', display: 'flex' }}>
                            <div style={{
                                width: `${(stats.metastaticCount / stats.total) * 100}%`,
                                background: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {stats.metastaticCount > 0 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{stats.metastaticCount}</span>}
                            </div>
                            <div style={{
                                width: `${(stats.nonMetastaticCount / stats.total) * 100}%`,
                                background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {stats.nonMetastaticCount > 0 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{stats.nonMetastaticCount}</span>}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: 11, color: '#e53e3e' }}>● Metastatic ({Math.round((stats.metastaticCount / stats.total) * 100)}%)</span>
                        <span style={{ fontSize: 11, color: '#16a34a' }}>● Non-metastatic ({Math.round((stats.nonMetastaticCount / stats.total) * 100)}%)</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
    return (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0, fontFamily: 'DM Mono' }}>{value}</p>
            <p style={{ fontSize: 10, color: '#8e97b5', margin: '4px 0 0' }}>{label}</p>
            <div style={{ height: 3, background: bg, borderRadius: 2, marginTop: 8 }} />
        </div>
    )
}

function DistributionCard({ title, subtitle, data, total, color, onClick }: {
    title: string; subtitle: string; data: [string, number][]; total: number; color: string; onClick: (label: string) => void
}) {
    const max = data.length ? Math.max(...data.map(d => d[1])) : 1
    return (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{title}</p>
                <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: '2px 0 0' }}>{subtitle}</p>
            </div>
            <div style={{ padding: '10px 18px', maxHeight: 260, overflowY: 'auto' }}>
                {data.length === 0 ? (
                    <p style={{ fontSize: 11, color: '#8e97b5', textAlign: 'center', padding: 16 }}>No data available</p>
                ) : data.map(([label, count]) => (
                    <div key={label} onClick={() => onClick(label)} style={{ padding: '6px 0', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#4a5580' }}>{label}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'DM Mono' }}>{count} ({Math.round((count / total) * 100)}%)</span>
                        </div>
                        <div style={{ height: 6, background: '#eef0f6', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: color, borderRadius: 10 }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function RegistryTable({ entries }: { entries: RegistryEntry[] }) {
    if (entries.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ fontWeight: 600, color: '#4a5580' }}>No matching results</p>
            </div>
        )
    }
    return (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                    <tr style={{ background: '#f7f8fc', borderBottom: '1.5px solid #dde2ee' }}>
                        {['Patient', 'Age / Group', 'Sex', 'Nationality', 'Tumor', 'Stage', 'Protocol', 'Plan Status', 'Metastatic', ''].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontFamily: 'DM Mono', color: '#8e97b5', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {entries.map((e, i) => (
                        <tr key={e.patientId} style={{ borderBottom: '1px solid #eef0f6', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                            <td style={{ padding: '12px 14px' }}>
                                <p style={{ margin: 0, fontWeight: 700, color: '#0b1f3a' }}>{e.patientName}</p>
                                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{e.mrn}</p>
                            </td>
                            <td style={{ padding: '12px 14px', fontFamily: 'DM Mono' }}>{e.age} · {AGE_GROUP_LABELS[e.ageGroup]}</td>
                            <td style={{ padding: '12px 14px' }}>{e.sex}</td>
                            <td style={{ padding: '12px 14px', fontSize: 10 }}>{e.nationality ?? '—'}</td>
                            <td style={{ padding: '12px 14px' }}>{e.primarySite ?? '—'}</td>
                            <td style={{ padding: '12px 14px' }}>{e.stage ?? '—'}</td>
                            <td style={{ padding: '12px 14px' }}>{e.activeProtocol ?? '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                                {e.planStatus ? (
                                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#e6f7f4', color: '#1a8a78', fontWeight: 600 }}>
                                        {PLAN_STATUS_LABELS[e.planStatus] || e.planStatus}
                                    </span>
                                ) : '—'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                                {e.isMetastatic ? (
                                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#fde8e8', color: '#e53e3e', fontWeight: 700 }}>Yes</span>
                                ) : '—'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                                <Link href={`/patients/${e.patientId}`} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #dde2ee', color: '#4a5580', textDecoration: 'none', fontSize: 11, fontWeight: 600 }}>
                                    View Record
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const selectStyle: React.CSSProperties = {
    padding: '8px 12px', border: '1.5px solid #dde2ee', borderRadius: 8,
    fontSize: 12, fontFamily: 'Cairo, sans-serif', outline: 'none', background: '#fff',
}
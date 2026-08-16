'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Patient = {
  id: string
  mrn: string
  first_name_ar: string
  last_name_ar: string
  first_name_en: string
  last_name_en: string
  mobile_primary: string
  date_of_birth: string
  sex: string
  nationality: string | null
  created_at: string
  archived_at: string | null
  diagnoses?: { double_primary: boolean; is_metastatic: boolean }[]
}

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'mrn_asc' | 'mrn_desc'

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mrnSearch, setMrnSearch] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [nationalityFilter, setNationalityFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showArchived, setShowArchived] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('patients')
        .select('id, mrn, first_name_ar, last_name_ar, first_name_en, last_name_en, mobile_primary, date_of_birth, sex, nationality, created_at, archived_at, diagnoses(double_primary, is_metastatic)')
        .order('created_at', { ascending: false })
      setPatients((data as any) || [])
      setLoading(false)
    }
    load()
  }, [])

  const visiblePatients = patients.filter(p => showArchived ? !!p.archived_at : !p.archived_at)
  const archivedCount = patients.filter(p => !!p.archived_at).length

  const nationalityOptions = Array.from(
    new Set(visiblePatients.map(p => p.nationality).filter(Boolean))
  ).sort() as string[]

  function getAge(dob: string) {
    const diff = Date.now() - new Date(dob).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }

  function getFlags(p: Patient) {
    const diag = p.diagnoses?.[0]
    return {
      doublePrimary: !!diag?.double_primary,
      metastatic: !!diag?.is_metastatic,
    }
  }

  let filtered = visiblePatients.filter(p => {
    if (search) {
      const matchesName = p.first_name_ar.includes(search) || p.last_name_ar.includes(search) || p.first_name_en.toLowerCase().includes(search.toLowerCase())
      if (!matchesName) return false
    }
    if (mrnSearch && !p.mrn.toLowerCase().includes(mrnSearch.toLowerCase())) return false
    if (nationalityFilter && p.nationality !== nationalityFilter) return false
    const age = getAge(p.date_of_birth)
    if (ageMin && age < parseInt(ageMin)) return false
    if (ageMax && age > parseInt(ageMax)) return false
    return true
  })

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return `${a.first_name_ar}${a.last_name_ar}`.localeCompare(`${b.first_name_ar}${b.last_name_ar}`, 'ar')
      case 'name_desc':
        return `${b.first_name_ar}${b.last_name_ar}`.localeCompare(`${a.first_name_ar}${a.last_name_ar}`, 'ar')
      case 'mrn_asc':
        return a.mrn.localeCompare(b.mrn, undefined, { numeric: true })
      case 'mrn_desc':
        return b.mrn.localeCompare(a.mrn, undefined, { numeric: true })
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const hasActiveFilters = mrnSearch || ageMin || ageMax || nationalityFilter

  function resetFilters() {
    setMrnSearch(''); setAgeMin(''); setAgeMax(''); setNationalityFilter(''); setSortBy('newest')
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>المرضى</h1>
          <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
            Patient List · {filtered.length} من {visiblePatients.length} مريض
          </p>
        </div>
        <Link href="/patients/new" style={{
          padding: '9px 20px', background: '#1a8a78', color: '#fff',
          borderRadius: 8, textDecoration: 'none', fontSize: 13,
          fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          + تسجيل مريض جديد
        </Link>
      </div>

      {/* Tabs: نشط / مؤرشف */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setShowArchived(false)} style={{
          padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: !showArchived ? '#1a8a78' : '#fff',
          color: !showArchived ? '#fff' : '#4a5580',
          fontSize: 12, fontWeight: 600,
          boxShadow: !showArchived ? 'none' : 'inset 0 0 0 1.5px #dde2ee',
        }}>
          نشط
        </button>
        <button onClick={() => setShowArchived(true)} style={{
          padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: showArchived ? '#b45309' : '#fff',
          color: showArchived ? '#fff' : '#4a5580',
          fontSize: 12, fontWeight: 600,
          boxShadow: showArchived ? 'none' : 'inset 0 0 0 1.5px #dde2ee',
        }}>
          📦 مؤرشف {archivedCount > 0 && `(${archivedCount})`}
        </button>
      </div>

      {/* Search + Sort + Filters toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: '#fff',
          border: '1.5px solid #dde2ee', borderRadius: 9, maxWidth: 300, flex: 1,
        }}>
          <span style={{ color: '#8e97b5' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Cairo', flex: 1, direction: 'rtl' }}
          />
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} style={{
          padding: '8px 12px', border: '1.5px solid #dde2ee', borderRadius: 9, fontSize: 12, fontFamily: 'Cairo', outline: 'none', background: '#fff',
        }}>
          <option value="newest">الأحدث تسجيلاً</option>
          <option value="oldest">الأقدم تسجيلاً</option>
          <option value="name_asc">أبجديًا (أ - ي)</option>
          <option value="name_desc">أبجديًا (ي - أ)</option>
          <option value="mrn_asc">رقم الملف (تصاعدي)</option>
          <option value="mrn_desc">رقم الملف (تنازلي)</option>
        </select>

        <button onClick={() => setShowFilters(!showFilters)} style={{
          padding: '8px 16px', borderRadius: 9, border: '1.5px solid #dde2ee',
          background: showFilters ? '#e6f7f4' : '#fff', color: showFilters ? '#1a8a78' : '#4a5580',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ⚙️ فلاتر متقدمة {hasActiveFilters && <span style={{ background: '#1a8a78', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{[mrnSearch, ageMin || ageMax, nationalityFilter].filter(Boolean).length}</span>}
        </button>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#8e97b5', display: 'block', marginBottom: 5, fontFamily: 'DM Mono' }}>رقم الملف (MRN)</label>
              <input value={mrnSearch} onChange={e => setMrnSearch(e.target.value)} placeholder="مثال: 2024-0007"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#8e97b5', display: 'block', marginBottom: 5, fontFamily: 'DM Mono' }}>السن من</label>
              <input type="number" min="0" value={ageMin} onChange={e => setAgeMin(e.target.value)} placeholder="0"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#8e97b5', display: 'block', marginBottom: 5, fontFamily: 'DM Mono' }}>السن إلى</label>
              <input type="number" min="0" value={ageMax} onChange={e => setAgeMax(e.target.value)} placeholder="120"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', fontFamily: 'DM Mono', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#8e97b5', display: 'block', marginBottom: 5, fontFamily: 'DM Mono' }}>الجنسية</label>
              <select value={nationalityFilter} onChange={e => setNationalityFilter(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                <option value="">الكل</option>
                {nationalityOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters} style={{ fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', marginTop: 10 }}>
              ✕ إزالة الفلاتر المتقدمة
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{showArchived ? '📦' : '📭'}</div>
          <p style={{ fontWeight: 600, color: '#4a5580' }}>
            {search || hasActiveFilters ? 'لا توجد نتائج مطابقة' : showArchived ? 'لا يوجد مرضى مؤرشفون' : 'لا يوجد مرضى بعد'}
          </p>
          {!search && !hasActiveFilters && !showArchived && (
            <Link href="/patients/new" style={{ color: '#1a8a78', fontSize: 13 }}>
              سجّل أول مريض →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f7f8fc', borderBottom: '1.5px solid #dde2ee' }}>
                {['MRN', 'الاسم', 'العمر / الجنس', 'الجنسية', 'الموبايل', 'تاريخ التسجيل', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'right',
                    fontSize: 10, fontFamily: 'DM Mono', color: '#8e97b5',
                    letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const flags = getFlags(p)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eef0f6', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', fontSize: 11, color: '#2ab8a0', fontWeight: 600 }}>
                      {p.mrn}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: '#0b1f3a' }}>
                            {p.first_name_ar} {p.last_name_ar}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>
                            {p.first_name_en} {p.last_name_en}
                          </p>
                        </div>
                        {flags.doublePrimary && (
                          <span title="Double Primary" style={{ fontSize: 8, padding: '2px 6px', borderRadius: 20, background: '#faf5ff', color: '#9333ea', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            2× Primary
                          </span>
                        )}
                        {flags.metastatic && (
                          <span title="Metastatic" style={{ fontSize: 8, padding: '2px 6px', borderRadius: 20, background: '#fde8e8', color: '#e53e3e', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            Metastatic
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#4a5580' }}>
                      {getAge(p.date_of_birth)} سنة · {p.sex === 'M' ? 'ذكر' : 'أنثى'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#4a5580' }}>
                      {p.nationality || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', fontSize: 11, color: '#4a5580' }}>
                      {p.mobile_primary}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', fontSize: 10, color: '#8e97b5' }}>
                      {new Date(p.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/patients/${p.id}`} style={{
                        padding: '5px 12px', borderRadius: 6,
                        border: '1.5px solid #dde2ee', color: '#4a5580',
                        textDecoration: 'none', fontSize: 11, fontWeight: 600,
                      }}>
                        عرض الملف
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
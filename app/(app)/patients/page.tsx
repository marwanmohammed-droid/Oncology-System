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
  created_at: string
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('patients')
        .select('id, mrn, first_name_ar, last_name_ar, first_name_en, last_name_en, mobile_primary, date_of_birth, sex, created_at')
        .order('created_at', { ascending: false })
      setPatients(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = patients.filter(p =>
    p.first_name_ar.includes(search) ||
    p.last_name_ar.includes(search) ||
    p.mrn.toLowerCase().includes(search.toLowerCase()) ||
    p.first_name_en.toLowerCase().includes(search.toLowerCase())
  )

  const age = (dob: string) => {
    const diff = Date.now() - new Date(dob).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>المرضى</h1>
          <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
            Patient List · {patients.length} مريض
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

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', background: '#fff',
        border: '1.5px solid #dde2ee', borderRadius: 9,
        marginBottom: 20, maxWidth: 360,
      }}>
        <span style={{ color: '#8e97b5' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو MRN..."
          style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Cairo', flex: 1, direction: 'rtl' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ fontWeight: 600, color: '#4a5580' }}>
            {search ? 'لا توجد نتائج' : 'لا يوجد مرضى بعد'}
          </p>
          {!search && (
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
                {['MRN', 'الاسم', 'العمر / الجنس', 'الموبايل', 'تاريخ التسجيل', ''].map(h => (
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
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eef0f6', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'DM Mono', fontSize: 11, color: '#2ab8a0', fontWeight: 600 }}>
                    {p.mrn}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0b1f3a' }}>
                      {p.first_name_ar} {p.last_name_ar}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>
                      {p.first_name_en} {p.last_name_en}
                    </p>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#4a5580' }}>
                    {age(p.date_of_birth)} سنة · {p.sex === 'M' ? 'ذكر' : 'أنثى'}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
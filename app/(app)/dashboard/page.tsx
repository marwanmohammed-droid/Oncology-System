'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({ patients: 0, sessions: 0, upcoming: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ count: p }, { count: s }, { count: u }] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled')
          .gte('session_date', new Date().toISOString().split('T')[0]),
      ])
      setStats({ patients: p || 0, sessions: s || 0, upcoming: u || 0 })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#8e97b5', fontFamily: 'Cairo' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
          Oncology Center · {new Date().toLocaleDateString('en-EG')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Patients', value: stats.patients, color: '#2ab8a0', bg: '#e6f7f4', icon: '👤', href: '/patients' },
          { label: 'Chemo Sessions', value: stats.sessions, color: '#9333ea', bg: '#faf5ff', icon: '💊', href: '/chemo-sessions' },
          { label: 'Upcoming Sessions', value: stats.upcoming, color: '#b45309', bg: '#fff3cd', icon: '📅', href: '/chemo-sessions' },
        ].map(({ label, value, color, bg, icon, href }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14,
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, color, margin: 0, fontFamily: 'DM Mono' }}>{value}</p>
                <p style={{ fontSize: 12, color: '#8e97b5', margin: 0 }}>{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: '18px 22px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: '0 0 14px' }}>Quick Actions</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/patients/new" style={{ padding: '9px 18px', borderRadius: 8, background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            + New Patient
          </Link>
          <Link href="/chemo-sessions" style={{ padding: '9px 18px', borderRadius: 8, background: '#fff', color: '#1a8a78', border: '1.5px solid #2ab8a0', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            Schedule Session
          </Link>
          <Link href="/patients" style={{ padding: '9px 18px', borderRadius: 8, background: '#fff', color: '#4a5580', border: '1.5px solid #dde2ee', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            Patient List
          </Link>
        </div>
      </div>
    </div>
  )
}
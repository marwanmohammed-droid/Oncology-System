'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalSessions: 0,
    completedSessions: 0,
    postponedSessions: 0,
    totalAppointments: 0,
    sessionsByStatus: {} as Record<string, number>,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [
        { count: totalPatients },
        { count: totalSessions },
        { count: completedSessions },
        { count: postponedSessions },
        { count: totalAppointments },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('chemo_sessions').select('*', { count: 'exact', head: true }).eq('status', 'postponed'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        totalPatients: totalPatients || 0,
        totalSessions: totalSessions || 0,
        completedSessions: completedSessions || 0,
        postponedSessions: postponedSessions || 0,
        totalAppointments: totalAppointments || 0,
        sessionsByStatus: {},
      })
      setLoading(false)
    }
    load()
  }, [])

  const completionRate = stats.totalSessions > 0
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Reports</h1>
        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
          System Statistics · {new Date().toLocaleDateString('en-EG')}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e97b5' }}>Loading...</div>
      ) : (
        <>
          {/* Main Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Patients', value: stats.totalPatients, color: '#2ab8a0', bg: '#e6f7f4', icon: '👤' },
              { label: 'Total Sessions', value: stats.totalSessions, color: '#9333ea', bg: '#faf5ff', icon: '💊' },
              { label: 'Total Appointments', value: stats.totalAppointments, color: '#1e40af', bg: '#eff6ff', icon: '📅' },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontSize: 28, fontWeight: 700, color, margin: 0, fontFamily: 'DM Mono' }}>{value}</p>
                  <p style={{ fontSize: 12, color: '#8e97b5', margin: 0 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sessions Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Session Status</p>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  { label: 'Completed', value: stats.completedSessions, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Scheduled', value: stats.totalSessions - stats.completedSessions - stats.postponedSessions, color: '#1a8a78', bg: '#e6f7f4' },
                  { label: 'Postponed', value: stats.postponedSessions, color: '#b45309', bg: '#fff3cd' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eef0f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 12, color: '#4a5580' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'DM Mono', background: bg, padding: '2px 10px', borderRadius: 20 }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion Rate */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Completion Rate</p>
              </div>
              <div style={{ padding: '24px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 56, fontWeight: 700, color: completionRate >= 70 ? '#16a34a' : '#b45309', margin: 0, fontFamily: 'DM Mono' }}>
                  {completionRate}%
                </p>
                <p style={{ fontSize: 12, color: '#8e97b5', margin: '8px 0 20px' }}>
                  {stats.completedSessions} of {stats.totalSessions} sessions completed
                </p>
                <div style={{ height: 12, background: '#eef0f6', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${completionRate}%`,
                    background: completionRate >= 70 ? '#16a34a' : '#b45309',
                    borderRadius: 20,
                    transition: 'width .5s ease',
                  }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
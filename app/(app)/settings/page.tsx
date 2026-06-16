'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono', margin: '4px 0 0' }}>
          System Settings
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>

        {/* Account */}
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>Account</p>
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={handleLogout}
              disabled={loading}
              style={{
                padding: '10px 20px', borderRadius: 8,
                border: '1.5px solid rgba(229,62,62,.3)',
                background: '#fde8e8', color: '#e53e3e',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                width: 'fit-content', opacity: loading ? .6 : 1,
              }}
            >
              {loading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>

        {/* System Info */}
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>System Info</p>
          </div>
          <div style={{ padding: '14px 18px' }}>
            {[
              ['System', 'Oncology Center Management System'],
              ['Version', 'v1.0.0'],
              ['Database', 'Supabase PostgreSQL'],
              ['Framework', 'Next.js 15'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                <span style={{ fontSize: 11, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
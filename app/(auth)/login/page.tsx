'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('حدث خطأ غير متوقع، يرجى التحقق من الاتصال.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0b1f3a', fontFamily: 'Cairo,sans-serif'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, background: '#2ab8a0', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5" />
              <path d="M7 10h6M10 7v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>
            مركز كابيتال مصر للأورام
          </h1>
          <p style={{ fontSize: 12, color: '#8e97b5', marginTop: 4, fontFamily: 'DM Mono,monospace' }}>
            Egypt Capital Oncology Center ECOC
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fde8e8', border: '1px solid rgba(229,62,62,.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            fontSize: 12, color: '#e53e3e'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>
              البريد الإلكتروني · Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="doctor@oncology.com" required
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #dde2ee',
                borderRadius: 6, fontSize: 13, fontFamily: 'DM Mono,monospace',
                direction: 'ltr', outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>
              كلمة المرور · Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #dde2ee',
                borderRadius: 6, fontSize: 13, fontFamily: 'DM Mono,monospace',
                direction: 'ltr', outline: 'none'
              }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              padding: '11px', background: loading ? '#8e97b5' : '#1a8a78',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'Cairo,sans-serif', marginTop: 4,
              transition: 'background .15s'
            }}
          >
            {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول · Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

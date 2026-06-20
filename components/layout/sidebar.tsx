// components/layout/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/lib/hooks/useRole'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type NavItem = {
  href: string
  icon: string
  labelAr: string
  labelEn: string
  badge?: string
  doctorOnly?: boolean
  adminOnly?: boolean
}

type NavGroup = {
  group: string
  items: NavItem[]
}
const NAV: NavGroup[] = [
  { group: 'Main', items: [
    { href: '/dashboard',         icon: '⊞', labelAr: 'لوحة التحكم',       labelEn: 'Dashboard' },
    { href: '/patients',          icon: '👤', labelAr: 'المرضى',            labelEn: 'Patients',    badge: '+' },
    { href: '/appointments',      icon: '📅', labelAr: 'الحجوزات',          labelEn: 'Appointments' },
    { href: '/chemo-sessions',    icon: '💊', labelAr: 'جلسات الكيماوي',   labelEn: 'Chemo Sessions' },
    { href: '/protocols', icon: '🧬', labelAr: 'البروتوكولات', labelEn: 'Protocols' },
  ]},
  { group: 'Clinical', items: [
    { href: '/clinical-trials',   icon: '🔬', labelAr: 'الدراسات السريرية', labelEn: 'Clinical Trials', doctorOnly: true },
    { href: '/patient-portal',    icon: '🏠', labelAr: 'بوابة المريض',      labelEn: 'Patient Portal' },
    { href: '/lab-results',       icon: '🧪', labelAr: 'نتائج المختبر',     labelEn: 'Lab Results',    doctorOnly: true },
  ]},
  { group: 'Finance', items: [
    { href: '/billing',           icon: '💳', labelAr: 'الفواتير',          labelEn: 'Billing' },
    { href: '/insurance',         icon: '🛡️', labelAr: 'التأمين',           labelEn: 'Insurance' },
  ]},
  { group: 'Admin', items: [
    { href: '/reports',           icon: '📊', labelAr: 'التقارير',          labelEn: 'Reports',        adminOnly: true },
    { href: '/settings',          icon: '⚙️', labelAr: 'الإعدادات',         labelEn: 'Settings',       adminOnly: true },
  ]},
]

export function Sidebar() {
  const pathname = usePathname()
  const { role, isDoctor, isAdmin } = useRole()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{
      position: 'fixed', top: 0, right: 0,
      width: 226, height: '100vh',
      background: '#0b1f3a',
      display: 'flex', flexDirection: 'column',
      zIndex: 100,
      borderLeft: '1px solid rgba(255,255,255,.06)',
      fontFamily: 'Cairo, sans-serif',
    }}>

      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{
          width: 34, height: 34, background: '#2ab8a0', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9,
        }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
            <path d="M7 10h6M10 7v6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
          مركز الأمل للأورام
          <span style={{
            display: 'block', fontSize: 9, fontWeight: 400,
            color: '#2ab8a0', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2,
            fontFamily: 'DM Mono, monospace',
          }}>
            Oncology Center · v1.0
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 9px', flex: 1, overflowY: 'auto' }}>
        {NAV.map(group => {
          const visibleItems = group.items.filter(item => {
            if (item.doctorOnly && !isDoctor && !isAdmin) return false
            if (item.adminOnly && !isAdmin) return false
            return true
          })
          if (!visibleItems.length) return null
          return (
            <div key={group.group}>
              <p style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '.12em',
                color: '#8e97b5', textTransform: 'uppercase',
                padding: '8px 8px 3px', fontFamily: 'DM Mono, monospace',
              }}>
                {group.group}
              </p>
              {visibleItems.map(item => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 9px', borderRadius: 6, marginBottom: 1,
                    color: isActive ? '#2ab8a0' : 'rgba(255,255,255,.5)',
                    background: isActive ? 'rgba(42,184,160,.15)' : 'transparent',
                    fontSize: 12, fontWeight: 500, textDecoration: 'none',
                    transition: 'all .15s',
                  }}>
                    <span style={{ width: 16, textAlign: 'center' }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.labelAr}</span>
                    {item.badge && (
                      <span style={{
                        background: '#2ab8a0', color: '#0b1f3a',
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 20,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer: role chip + logout */}
      <div style={{ padding: '12px 9px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px',
          marginBottom: 6,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#1e4580',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#2ab8a0', flexShrink: 0,
          }}>
            {role?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', margin: 0 }}>
              {role === 'doctor' ? 'الطبيب المعالج' : role === 'receptionist' ? 'موظف الاستقبال' : role ?? 'User'}
            </p>
            <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {role}
            </p>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '7px 9px', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 6, background: 'transparent', color: 'rgba(255,255,255,.5)',
          fontSize: 11, cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all .15s',
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          تسجيل الخروج · Logout
        </button>
      </div>
    </aside>
  )
}

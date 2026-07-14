import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'pharmacist'

const ROLE_ROUTES: Record<UserRole, string[]> = {
  admin: ['*'],
  doctor: ['/dashboard', '/patients', '/chemo-sessions', '/protocols', '/clinical-trials', '/lab-results', '/appointments', '/billing', '/insurance', '/inventory', '/treatment-plans', '/medical-report', '/reports'],
  nurse: ['/dashboard', '/patients', '/chemo-sessions', '/appointments', '/inventory', '/medical-report'],
  receptionist: ['/dashboard', '/patients', '/appointments'],
  pharmacist: ['/dashboard', '/patients', '/chemo-sessions', '/protocols', '/inventory'],
}

function isAllowed(role: UserRole | null, pathname: string): boolean {
  if (!role) return false
  const allowed = ROLE_ROUTES[role]
  if (!allowed) return false
  if (allowed.includes('*')) return true
  return allowed.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  function redirectTo(path: string, extraParams?: Record<string, string>) {
    const url = new URL(path, request.url)
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v))
    }
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  if (!user) {
    if (pathname === '/login') return response
    return redirectTo('/login')
  }

  if (pathname === '/login') {
    return redirectTo('/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = (profile?.role ?? null) as UserRole | null

  if (!role) {
    if (pathname !== '/dashboard') return redirectTo('/dashboard')
    return response
  }

  if (!isAllowed(role, pathname)) {
    if (pathname === '/dashboard') return response
    return redirectTo('/dashboard', { denied: pathname })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
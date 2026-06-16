// ============================================================
// lib/hooks/useRole.ts — RBAC hook
// ============================================================
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'pharmacist'

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setRole(data?.role ?? null)
      setLoading(false)
    }
    fetchRole()
  }, [])

  return {
    role,
    loading,
    isDoctor:       role === 'doctor',
    isReceptionist: role === 'receptionist',
    isAdmin:        role === 'admin',
    isNurse:        role === 'nurse',
    canEditMedical: role === 'doctor' || role === 'admin',
    canEditPersonal: ['doctor','admin','receptionist'].includes(role ?? ''),
  }
}
import { supabase } from './supabase'
import type { UserProfile } from '@/types/database'

export interface AuthUser {
  id: string
  email: string
  profile: UserProfile | null
  karyawan: {
    nama: string
    nip: string
    jabatan: string | null
    foto_url: string | null
    instansi: { nama: string; singkatan: string | null } | null
  } | null
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  if (error) throw error
}

export async function getFullUser(userId: string): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) return null

  const { data: karyawan } = await supabase
    .from('karyawan')
    .select('nama, nip, jabatan, foto_url, instansi:id_instansi(nama, singkatan)')
    .eq('nip', profile.nip ?? '')
    .single()

  return {
    id: user.id,
    email: user.email ?? '',
    profile,
    karyawan: karyawan as AuthUser['karyawan'],
  }
}

export function hasRole(profile: UserProfile | null, roles: UserProfile['hak'][]): boolean {
  if (!profile) return false
  return roles.includes(profile.hak)
}

export function isAdmin(profile: UserProfile | null): boolean {
  return hasRole(profile, ['superadmin', 'admin'])
}

export function isSuperAdmin(profile: UserProfile | null): boolean {
  return hasRole(profile, ['superadmin'])
}

export function isPimpinan(profile: UserProfile | null): boolean {
  return hasRole(profile, ['superadmin', 'admin', 'pimpinan'])
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { UserProfile, Karyawan, Instansi } from '@/types/database'

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  karyawan: (Karyawan & { instansi: Pick<Instansi, 'nama' | 'singkatan'> | null }) | null
  isLoading: boolean
  isInitialized: boolean

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: UserProfile | null) => void
  setKaryawan: (k: AuthState['karyawan']) => void
  setLoading: (v: boolean) => void
  setInitialized: (v: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profile: null,
      karyawan: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setKaryawan: (karyawan) => set({ karyawan }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      reset: () => set({ user: null, session: null, profile: null, karyawan: null }),
    }),
    {
      name: 'earsip-auth',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
        karyawan: state.karyawan,
      }),
    }
  )
)

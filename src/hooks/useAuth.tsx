import { useEffect, createContext, useContext, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const AuthContext = createContext<null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setSession, setProfile, setKaryawan, setLoading, setInitialized, reset } = useAuthStore()

  useEffect(() => {
    let active = true

    const finishAuthCheck = () => {
      if (!active) return
      setLoading(false)
      setInitialized(true)
    }

    // Initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          void loadProfile(session.user.id)
        } else {
          reset()
        }
      })
      .finally(finishAuthCheck)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        setProfile(null)
        setKaryawan(null)
        window.setTimeout(() => {
          if (active) void loadProfile(session.user.id)
        }, 0)
      } else {
        reset()
      }
      finishAuthCheck()
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId: string) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) throw profileError

      setProfile(profile)

      if (profile?.nip) {
        const { data: karyawan, error: karyawanError } = await supabase
          .from('karyawan')
          .select('*, instansi:id_instansi(nama, singkatan)')
          .eq('nip', profile.nip)
          .maybeSingle()

        if (karyawanError) throw karyawanError

        setKaryawan(karyawan as Parameters<typeof setKaryawan>[0])
      } else {
        setKaryawan(null)
      }
    } catch {
      // Profile not yet created — that's ok for new signups
      setProfile(null)
      setKaryawan(null)
    }
  }

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  return useContext(AuthContext)
}

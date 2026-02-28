'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getSupabaseBrowserClient,
  resetSupabaseClient,
} from '../../lib/supabase/client'

import type { User, Session, AuthError } from '@supabase/supabase-js'

type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = getSupabaseBrowserClient()

  // Fetch profile from database
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          // Profile might not exist yet (trigger hasn't run), that's okay
          if (error.code === 'PGRST116') {
            console.log('Profile not found, will be created on next login')
            return null
          }
          console.error('Error fetching profile:', error)
          return null
        }

        return data as Profile
      } catch (err) {
        console.error('Exception fetching profile:', err)
        return null
      }
    },
    [supabase],
  )

  // Fetch profile when user changes (separate from auth to avoid lock deadlock)
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    let cancelled = false
    fetchProfile(user.id).then((userProfile) => {
      if (!cancelled) {
        setProfile(userProfile)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      // Safety timeout - ensure loading is set to false after 5 seconds max
      const timeout = setTimeout(() => {
        if (isMounted) {
          console.warn('Auth initialization timed out')
          setLoading(false)
        }
      }, 5000)

      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        setSession(initialSession)
        setUser(initialSession?.user ?? null)
      } catch (error) {
        // Supabase not configured or network error - continue without auth
        console.warn('Auth initialization failed:', error)
      } finally {
        clearTimeout(timeout)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth state changes
    // IMPORTANT: Do NOT make Supabase REST calls inside this callback.
    // The callback runs while the auth lock is held, so REST calls
    // (which need the lock to get the token) will deadlock.
    let subscription: { unsubscribe: () => void } | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setLoading(false)
      })
      subscription = data.subscription
    } catch (error) {
      console.warn('Auth state change listener failed:', error)
    }

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [supabase])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    },
    [supabase],
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { error }
    },
    [supabase],
  )

  const signOut = useCallback(async () => {
    // Clear React state
    setUser(null)
    setSession(null)
    setProfile(null)

    // Call Supabase signOut - this handles localStorage/cookies cleanup
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('SignOut error:', err)
    }

    // Reset the Supabase client singleton for clean state
    resetSupabaseClient()
  }, [supabase])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }, [supabase])

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) {
        return { error: new Error('Not authenticated') }
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              display_name:
                updates.display_name ?? profile?.display_name ?? null,
              avatar_url: updates.avatar_url ?? profile?.avatar_url ?? null,
              updated_at: new Date().toISOString(),
            } as any,
            {
              onConflict: 'id',
            },
          )
          .select()
          .single()

        if (error) {
          return { error: new Error(error.message) }
        }

        setProfile((prev) =>
          prev
            ? { ...prev, ...updates }
            : {
                id: user.id,
                display_name: updates.display_name ?? null,
                avatar_url: updates.avatar_url ?? null,
              },
        )
        return { error: null }
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('Unknown error'),
        }
      }
    },
    [supabase, user, profile],
  )

  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      return { error }
    },
    [supabase],
  )

  const contextValue = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      updateProfile,
      updatePassword,
    }),
    [
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      updateProfile,
      updatePassword,
    ],
  )

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

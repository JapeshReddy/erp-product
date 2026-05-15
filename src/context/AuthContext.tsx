import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getStoredSession, storeSession, clearSession, clearUserData } from '@/services/authService'
import { supabase } from '@/lib/supabase'
import { registerUnauthorizedHandler, clearAllAuthData } from '@/lib/authGuard'

export interface SessionUser {
  user_id:     string
  client_id:   string
  client_name: string
  role:        string
  email?:      string
  full_name?:  string
}

interface AuthContextValue {
  user:            SessionUser | null
  setUser:         (user: SessionUser | null) => void
  isAuthenticated: boolean
  isLoading:       boolean
  logout:          () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'erp_user'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<SessionUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  // true while we're validating the stored session on first mount
  const [isLoading, setIsLoading] = useState(true)

  const setUser = (u: SessionUser | null) => {
    setUserState(u)
    try {
      if (u) sessionStorage.setItem(USER_KEY, JSON.stringify(u))
      else    sessionStorage.removeItem(USER_KEY)
    } catch {}
  }

  /** Full logout: clear all auth data and redirect to /signin. */
  const logout = useCallback(() => {
    console.log('[Auth] 🚪 logout() called — clearing session and redirecting')
    clearSession()
    clearUserData()
    setUserState(null)
    // Sign out from Supabase (fire-and-forget — don't block the redirect)
    supabase.auth.signOut().catch(() => {})
    window.location.replace('/signin')
  }, [])

  /**
   * Attempt to silently refresh the access token using the stored refresh token.
   * Returns true on success (interceptedFetch will retry the original request),
   * false on failure (forceLogout is handled by authGuard after this returns false).
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    console.log('[Auth] 🔄 refreshToken() called')
    const stored = getStoredSession()
    if (!stored?.refresh_token) {
      console.error('[Auth] No refresh token in sessionStorage — cannot refresh')
      clearAllAuthData()
      setUserState(null)
      return false
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: stored.refresh_token,
    })

    if (error || !data.session) {
      console.error('[Auth] Supabase refreshSession failed:', error?.message)
      clearAllAuthData()
      setUserState(null)
      return false
    }

    console.log('[Auth] ✅ refreshSession succeeded — persisting new tokens')
    storeSession({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    // Re-arm Supabase client with the new session
    await supabase.auth.setSession({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    return true
  }, [])

  // On mount: validate stored session and register the refresh callback with authGuard
  useEffect(() => {
    registerUnauthorizedHandler(refreshToken)

    const session = getStoredSession()
    if (!session) {
      console.log('[Auth] No stored session found — unauthenticated')
      setUserState(null)
      setIsLoading(false)
      return
    }

    // Restore session into the Supabase client so future queries carry a valid JWT
    supabase.auth
      .setSession({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[Auth] setSession failed on mount:', error.message)
          clearAllAuthData()
          setUserState(null)
        } else {
          console.log('[Auth] Session restored on mount')
        }
      })
      .finally(() => setIsLoading(false))
  }, [refreshToken])

  // Subscribe to Supabase auth state changes for the lifetime of the app
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[Auth] onAuthStateChange: ${event}`)

      switch (event) {
        case 'INITIAL_SESSION':
          // Already handled by the mount useEffect above — ignore
          break

        case 'TOKEN_REFRESHED':
          if (session) {
            console.log('[Auth] 🔁 TOKEN_REFRESHED — updating stored tokens')
            storeSession({
              access_token:  session.access_token,
              refresh_token: session.refresh_token,
            })
          }
          break

        case 'SIGNED_OUT':
          console.log('[Auth] SIGNED_OUT event — clearing local state')
          clearAllAuthData()
          setUserState(null)
          window.location.replace('/signin')
          break

        case 'USER_UPDATED':
          console.log('[Auth] USER_UPDATED event')
          break

        default:
          break
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, setUser, isAuthenticated: !!user, isLoading, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

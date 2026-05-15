import { createClient } from '@supabase/supabase-js'
import { handleUnauthorized } from './authGuard'

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing env vars. Copy .env.example to .env and fill in your keys.'
  )
}

// Flag to prevent the retry logic from triggering again on the already-retried request
let _isRetryRequest = false

/**
 * Drop-in fetch replacement for the Supabase client.
 * Intercepts 401 responses, attempts a single token refresh, then retries.
 * Auth endpoints are bypassed to avoid infinite loops during the refresh call itself.
 */
async function interceptedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init)

  if (response.status === 401 && !_isRetryRequest) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
        ? input.url
        : input.toString()

    // Let Supabase's own auth machinery handle errors on auth endpoints —
    // intercepting /token or /logout would cause an infinite refresh loop.
    const isAuthEndpoint =
      url.includes('/auth/v1/token') ||
      url.includes('/auth/v1/logout') ||
      url.includes('/auth/v1/otp') ||
      url.includes('/auth/v1/recover')

    if (isAuthEndpoint) {
      console.warn(`[Auth] 401 on auth endpoint ${url} — not intercepting`)
      return response
    }

    console.warn(`[Auth] ⚠️ 401 on ${url} — attempting token refresh`)

    const refreshed = await handleUnauthorized()
    if (!refreshed) {
      // handleUnauthorized already called forceLogout; just return the 401
      return response
    }

    console.log('[Auth] 🔄 Retrying original request with refreshed token')
    _isRetryRequest = true
    try {
      const retry = await fetch(input, init)
      return retry
    } finally {
      _isRetryRequest = false
    }
  }

  return response
}

export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      flowType:          'pkce',
      detectSessionInUrl: true,
      // Sessions stored in sessionStorage via our own authService — disable Supabase's
      // built-in persistence so it doesn't write tokens to localStorage.
      persistSession:    false,
      autoRefreshToken:  true,
    },
    global: {
      fetch: interceptedFetch,
    },
  }
)

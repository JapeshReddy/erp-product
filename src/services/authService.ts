import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginSuccessData {
  user_id: string
  client_id: string
  client_name: string
  role: string
}

export interface LoginSession {
  access_token: string
  refresh_token: string
}

export interface LoginResponse {
  success: boolean
  code: string
  message: string
  data?: LoginSuccessData
  session?: LoginSession
}

// ─── Call auth-login edge function ───────────────────────────────────────────
// The UI never touches DB tables, auth state, or roles directly.
// All validation lives in the Edge Function.

export async function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  const { data, error } = await supabase.functions.invoke<LoginResponse>(
    'auth-login',
    { body: payload }
  )

  if (error) {
    // supabase.functions.invoke puts non-2xx body inside error.context
    try {
      const errBody = await error.context?.json()
      return errBody as LoginResponse
    } catch {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        message: error.message ?? 'Network error. Please try again.',
      }
    }
  }

  return data as LoginResponse
}

// ─── Store session in memory / sessionStorage (no localStorage) ──────────────
// Per the security requirement: never store sensitive data in localStorage.
// sessionStorage is cleared when the tab closes.
// For HttpOnly cookies the server would set them — this handles the JS fallback.

const SESSION_KEY = 'erp_session'

export function storeSession(session: LoginSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getStoredSession(): LoginSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as LoginSession) : null
  } catch {
    return null
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
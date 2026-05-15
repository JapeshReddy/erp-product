// Singleton auth guard — no imports from our own modules to avoid circular dependencies.
// Coordinates token refresh across all concurrent requests and forces logout on failure.

const SESSION_KEY = 'erp_session'
const USER_KEY    = 'erp_user'

let _isRefreshing   = false
let _refreshPromise: Promise<boolean> | null = null
let _onUnauthorized: (() => Promise<boolean>) | null = null

/** Remove all auth data from sessionStorage and any residual Supabase localStorage keys. */
export function clearAllAuthData(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(USER_KEY)
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k))
  } catch {
    // localStorage may be blocked in certain browser contexts
  }
}

/**
 * Register the refresh callback from AuthContext.
 * Must be called once during app initialisation before any protected requests fire.
 */
export function registerUnauthorizedHandler(fn: () => Promise<boolean>): void {
  _onUnauthorized = fn
}

/**
 * Called by interceptedFetch whenever a 401 is received on a non-auth endpoint.
 * Returns true if the token was successfully refreshed (caller should retry),
 * false if refresh failed and the user has been redirected to /signin.
 */
export async function handleUnauthorized(): Promise<boolean> {
  // Coalesce concurrent 401 responses onto the same in-flight refresh
  if (_isRefreshing && _refreshPromise) {
    console.log('[AuthGuard] Refresh already in progress — awaiting existing promise')
    return _refreshPromise
  }

  if (!_onUnauthorized) {
    console.error('[Auth] No unauthorized handler registered — forcing logout')
    forceLogout('no_handler')
    return false
  }

  console.warn('[Auth] ⚠️ Access token expired — starting refresh')
  _isRefreshing = true
  _refreshPromise = _onUnauthorized()
    .then(success => {
      if (success) {
        console.log('[Auth] ✅ Token refresh succeeded')
      } else {
        console.error('[Auth] ❌ Token refresh failed — logging out')
        forceLogout('refresh_failed')
      }
      return success
    })
    .catch(() => {
      console.error('[Auth] ❌ Token refresh threw — logging out')
      forceLogout('refresh_error')
      return false
    })
    .finally(() => {
      _isRefreshing    = false
      _refreshPromise  = null
    })

  return _refreshPromise
}

/** Hard logout: wipe all auth state and navigate to /signin without pushing history. */
export function forceLogout(reason: string): void {
  console.error(`[Auth] 🚪 Force logout triggered: ${reason}`)
  clearAllAuthData()
  window.location.replace('/signin')
}

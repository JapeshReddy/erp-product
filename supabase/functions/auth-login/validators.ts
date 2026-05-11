import type { LoginPayload } from './types.ts'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateLoginPayload(body: unknown): {
  valid: boolean
  error?: string
  data?: LoginPayload
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body.' }
  }

  const b = body as Record<string, unknown>

  if (!b.email || typeof b.email !== 'string' || !b.email.trim()) {
    return { valid: false, error: 'Email is required.' }
  }

  const email = b.email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(email) || email.length > 320) {
    return { valid: false, error: 'Invalid email address.' }
  }

  if (!b.password || typeof b.password !== 'string' || !b.password) {
    return { valid: false, error: 'Password is required.' }
  }

  return {
    valid: true,
    data: { email, password: b.password as string },
  }
}

// ─── Rate limiting: max N failed attempts per window ─────────────────────────

export const LOCK_THRESHOLD = 5       // failed attempts before lock
export const LOCK_WINDOW_MINUTES = 15 // rolling window
export const LOCK_DURATION_MINUTES = 15
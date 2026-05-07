// ─── Password Strength ────────────────────────────────────────────────────────
export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong'

export function measurePasswordStrength(password: string): PasswordStrength {
  if (!password) return 'empty'
  let score = 0
  if (password.length >= 8)            score++
  if (password.length >= 12)           score++
  if (/[A-Z]/.test(password))          score++
  if (/[0-9]/.test(password))          score++
  if (/[^A-Za-z0-9]/.test(password))  score++
  if (score <= 1) return 'weak'
  if (score <= 3) return 'fair'
  return 'strong'
}

// ─── String Helpers ───────────────────────────────────────────────────────────
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

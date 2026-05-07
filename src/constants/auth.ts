// ─── Route Names ─────────────────────────────────────────────────────────────
export const ROUTES = {
  SIGN_IN: '/signin',
  SIGN_UP: '/signup',
  DASHBOARD: '/dashboard',
  FORGOT_PASSWORD: '/forgot-password',
} as const

// ─── Validation Rules ─────────────────────────────────────────────────────────
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  REMEMBER_ME_DAYS: 30,
} as const

// ─── Form Defaults ────────────────────────────────────────────────────────────
export const SIGN_IN_DEFAULTS = {
  email: '',
  password: '',
  rememberMe: false,
}

export const SIGN_UP_DEFAULTS = {
  fullName: '',
  companyName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
}

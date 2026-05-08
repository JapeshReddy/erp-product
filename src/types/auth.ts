export interface SignInFormData {
  email: string
  password: string
  rememberMe: boolean
}

export interface SignUpFormData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  organizationId: string
  acceptTerms: boolean
}

export interface Organization {
  id: string
  name: string
  allowed_email_domains: string[]
}

export interface FormFieldError {
  message: string
}

export interface FormErrors {
  [key: string]: FormFieldError | undefined
}

export interface AuthUser {
  id: string
  email: string
  fullName?: string
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

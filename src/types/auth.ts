export interface SignInFormData {
  email: string
  password: string
  rememberMe: boolean
}

export interface SignUpFormData {
  fullName: string
  companyName: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
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

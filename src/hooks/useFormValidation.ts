import { useState, useCallback } from 'react'
import { isValidEmail } from '@/utils/helpers'
import { VALIDATION } from '@/constants/auth'
import type { FormErrors } from '@/types/auth'

// ─── Individual Validators ────────────────────────────────────────────────────
export const validators = {
  required: (value: string, label = 'This field') =>
    !value.trim() ? `${label} is required.` : null,

  email: (value: string) => {
    if (!value.trim()) return 'Email address is required.'
    return isValidEmail(value) ? null : 'Please enter a valid email address.'
  },

  minLength: (value: string, min: number, label = 'This field') =>
    value.length < min ? `${label} must be at least ${min} characters.` : null,

  passwordMatch: (password: string, confirm: string) =>
    password !== confirm ? 'Passwords do not match.' : null,

  fullName: (value: string) => {
    if (!value.trim()) return 'Full name is required.'
    return value.trim().length < VALIDATION.NAME_MIN_LENGTH
      ? 'Please enter your full name.'
      : null
  },
}

export function useFormValidation() {
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const setFieldError = useCallback((field: string, message: string | null) => {
    setErrors((prev) => {
      if (message === null) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: { message } }
    })
  }, [])

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  const markSubmitted = useCallback(() => setHasSubmitted(true), [])

  const isFieldInvalid = (field: string) =>
    hasSubmitted && !!errors[field]

  const getFieldError = (field: string) =>
    hasSubmitted ? errors[field]?.message ?? null : null

  return {
    errors, touched,
    hasErrors: Object.keys(errors).length > 0,
    setFieldError, markTouched, clearErrors,
    isFieldInvalid, getFieldError,
    hasSubmitted, markSubmitted
  }
}

// ─── Sign In Validation ───────────────────────────────────────────────────────
export function validateSignIn(data: { email: string; password: string }) {
  const errors: FormErrors = {}
  const emailErr = validators.email(data.email)
  if (emailErr) errors.email = { message: emailErr }
  const passErr = validators.minLength(data.password, VALIDATION.PASSWORD_MIN_LENGTH, 'Password')
  if (passErr) errors.password = { message: passErr }
  return errors
}

// ─── Sign Up Validation ───────────────────────────────────────────────────────
export function validateSignUp(data: {
  fullName: string; email: string
  password: string; confirmPassword: string
  organizationId: string; acceptTerms: boolean
}) {
  const errors: FormErrors = {}
  const nameErr = validators.fullName(data.fullName)
  if (nameErr) errors.fullName = { message: nameErr }
  const emailErr = validators.email(data.email)
  if (emailErr) errors.email = { message: emailErr }
  const passErr = validators.minLength(data.password, VALIDATION.PASSWORD_MIN_LENGTH, 'Password')
  if (passErr) errors.password = { message: passErr }
  const matchErr = validators.passwordMatch(data.password, data.confirmPassword)
  if (matchErr) errors.confirmPassword = { message: matchErr }
  if (!data.organizationId) errors.organizationId = { message: 'Please select an organization.' }
  if (!data.acceptTerms) errors.acceptTerms = { message: 'You must accept the terms to continue.' }
  return errors
}

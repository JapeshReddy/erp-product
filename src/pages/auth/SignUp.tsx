import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard, FormField, OrganizationSelect } from '@/components/ui'
import PasswordInput from '@/components/ui/PasswordInput'
import { useOrganizationLookup } from '@/hooks/useOrganizationLookup'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/constants/auth'

// ─── Schema ───────────────────────────────────────────────────────────────────

const signUpSchema = z.object({
  fullName:       z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email:          z.string().email('Please enter a valid email address'),
  password:       z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be fewer than 128 characters')
    .regex(/[A-Za-z]/, 'Must contain at least one letter')
    .regex(/[0-9]/,    'Must contain at least one number'),
  confirmPassword: z.string(),
  organizationId:  z.string().optional(),
  acceptTerms:     z.boolean(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
})

type SignUpValues = z.infer<typeof signUpSchema>

// ─── Component ────────────────────────────────────────────────────────────────

const SignUp: React.FC = () => {
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver:      zodResolver(signUpSchema),
    defaultValues: {
      fullName: '', email: '', password: '', confirmPassword: '',
      organizationId: '', acceptTerms: false,
    },
  })

  const watchedEmail    = watch('email')
  const watchedPassword = watch('password')
  const watchedConfirm  = watch('confirmPassword')

  // Show org dropdown only after passwords match and are ≥ 8 chars
  const showOrgDropdown = useMemo(
    () =>
      watchedPassword.length >= 8 &&
      watchedConfirm.length >= 1 &&
      watchedPassword === watchedConfirm,
    [watchedPassword, watchedConfirm]
  )

  const {
    organizations,
    isLoading: orgLoading,
    error:     orgError,
    hasFetched,
  } = useOrganizationLookup(watchedEmail, showOrgDropdown)

  const watchedOrgId = watch('organizationId')

  const onSubmit = async (values: SignUpValues) => {
    // Extra validation for org field (conditionally required)
    if (showOrgDropdown && !values.organizationId) {
      setError('organizationId', { message: 'Please select an organisation' })
      return
    }

    setSubmitError(null)
    try {
      const { data, error } = await supabase.functions.invoke('signup-user', {
        body: {
          full_name:  values.fullName,
          email:      values.email,
          password:   values.password,
          client_id:  values.organizationId,
        },
      })

      if (error) {
        try {
          const errBody = await error.context?.json()
          setSubmitError(errBody?.message ?? 'Signup failed. Please try again.')
        } catch {
          setSubmitError(error.message ?? 'Signup failed. Please try again.')
        }
        return
      }

      if (!data?.success) {
        setSubmitError(data?.message ?? 'Signup failed. Please try again.')
        return
      }

      setSubmitSuccess(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error. Please try again.')
    }
  }

  const isSubmitDisabled =
    isSubmitting ||
    orgLoading ||
    (showOrgDropdown && !watchedOrgId) ||
    (showOrgDropdown && hasFetched && organizations.length === 0 && !orgError)

  // ─── Success screen ────────────────────────────────────────────────────────

  if (submitSuccess) {
    return (
      <AuthCard title="Check your email" subtitle="Verification email sent. Please check your inbox.">
        <div className="text-center py-3">
          <div
            style={{
              width: 56, height: 56,
              background: 'rgba(34,197,94,0.1)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
            Verification email sent to <strong>{watchedEmail}</strong>.
          </p>
          <Link to={ROUTES.SIGN_IN} className="btn btn-primary btn-auth-primary">
            Back to Sign In
          </Link>
        </div>
      </AuthCard>
    )
  }

  // ─── Form ──────────────────────────────────────────────────────────────────

  return (
    <AuthCard title="Create your account" subtitle="Start managing your ERP in minutes.">
      {submitError && (
        <div className="auth-alert alert alert-danger" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>

        <FormField id="fullName" label="Full name" error={errors.fullName?.message} required>
          <input
            type="text"
            {...register('fullName')}
            placeholder="Jane Doe"
            autoComplete="name"
            autoFocus
          />
        </FormField>

        <FormField id="email" label="Work email" error={errors.email?.message} required>
          <input
            type="email"
            {...register('email')}
            placeholder="name@company.com"
            autoComplete="email"
          />
        </FormField>

        <FormField id="password" label="Password" error={errors.password?.message} required>
          <PasswordInput
            {...register('password')}
            placeholder="Create a strong password"
            autoComplete="new-password"
            showStrength
          />
        </FormField>

        <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message} required>
          <PasswordInput
            {...register('confirmPassword')}
            placeholder="Repeat your password"
            autoComplete="new-password"
          />
        </FormField>

        {/* Organisation — appears after passwords match */}
        {showOrgDropdown && (
          <div className="form-group org-field-animate">
            <label className="form-label">
              Organization <span className="text-danger ms-1">*</span>
            </label>
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <OrganizationSelect
                  organizations={organizations}
                  value={field.value ?? ''}
                  onChange={(id) => { field.onChange(id); setValue('organizationId', id) }}
                  isLoading={orgLoading}
                  error={orgError}
                  hasFetched={hasFetched}
                />
              )}
            />
            {errors.organizationId && (
              <div className="invalid-feedback d-flex" role="alert">
                {errors.organizationId.message}
              </div>
            )}
          </div>
        )}

        {/* Terms */}
        <div className="form-group mb-4">
          <div className="form-check">
            <input
              id="acceptTerms"
              className={`form-check-input ${errors.acceptTerms ? 'is-invalid' : ''}`}
              type="checkbox"
              {...register('acceptTerms')}
            />
            <label className="form-check-label" htmlFor="acceptTerms">
              I agree to the{' '}
              <a href="#" className="terms-link" onClick={e => e.preventDefault()}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="terms-link" onClick={e => e.preventDefault()}>Privacy Policy</a>
            </label>
            {errors.acceptTerms && (
              <div className="invalid-feedback d-block" role="alert">
                {errors.acceptTerms.message ?? 'You must accept the terms'}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-auth-primary"
          disabled={isSubmitDisabled}
        >
          {isSubmitting ? (
            <span className="btn-spinner">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              Creating account…
            </span>
          ) : 'Create account'}
        </button>
      </form>

      <p className="auth-footer-text">
        Already have an account? <Link to={ROUTES.SIGN_IN}>Sign in</Link>
      </p>
    </AuthCard>
  )
}

export default SignUp

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard, FormField } from '@/components/ui'
import PasswordInput from '@/components/ui/PasswordInput'
import AlertBanner from '@/components/ui/AlertBanner'
import { useAuth } from '@/context/AuthContext'
import { loginUser, storeSession } from '@/services/authService'
import { supabase } from '@/lib/supabase'
import { ROUTES, VALIDATION } from '@/constants/auth'

// ─── Schema ───────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email:      z.string().email('Please enter a valid email address'),
  password:   z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
})

type SignInValues = z.infer<typeof signInSchema>

// ─── Component ────────────────────────────────────────────────────────────────

const SignIn: React.FC = () => {
  const { setUser }  = useAuth()
  const navigate     = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver:      zodResolver(signInSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const onSubmit = async (values: SignInValues) => {
    setSubmitError(null)
    try {
      const response = await loginUser({ email: values.email, password: values.password })

      if (!response.success) {
        setSubmitError(response.message ?? 'Login failed. Please try again.')
        return
      }

      if (response.session) {
        storeSession(response.session)
        await supabase.auth.setSession({
          access_token:  response.session.access_token,
          refresh_token: response.session.refresh_token,
        })
      }
      if (response.data) {
        setUser({
          user_id:     response.data.user_id,
          client_id:   response.data.client_id,
          client_name: response.data.client_name,
          role:        response.data.role,
        })
      }
      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error. Please try again.')
    }
  }

  return (
    <AuthCard
      title="Sign in to your account"
      subtitle={`Welcome back! Remember me for ${VALIDATION.REMEMBER_ME_DAYS} days.`}
    >
      {submitError && <AlertBanner message={submitError} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="email" label="Email address" error={errors.email?.message} required>
          <input
            type="email"
            {...register('email')}
            placeholder="name@company.com"
            autoComplete="email"
            autoFocus
          />
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          required
          labelAction={
            <Link to={ROUTES.FORGOT_PASSWORD} className="link-auth" tabIndex={-1}>
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            {...register('password')}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </FormField>

        <div className="form-group d-flex align-items-center">
          <div className="form-check mb-0">
            <input
              id="rememberMe"
              className="form-check-input"
              type="checkbox"
              {...register('rememberMe')}
            />
            <label className="form-check-label" htmlFor="rememberMe">
              Remember me for {VALIDATION.REMEMBER_ME_DAYS} days
            </label>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            className="btn btn-primary btn-auth-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-spinner">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </div>
      </form>

      <p className="auth-footer-text">
        Don't have an account?{' '}
        <Link to={ROUTES.SIGN_UP}>Create a free account</Link>
      </p>
    </AuthCard>
  )
}

export default SignIn

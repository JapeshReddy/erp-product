import React from 'react'
import { Link } from 'react-router-dom'
import { AuthCard, FormField, PasswordInput } from '@/components/ui'
import { useSignIn } from '@/hooks/useSignIn'
import { ROUTES, VALIDATION } from '@/constants/auth'
import AlertBanner from '@/components/ui/AlertBanner'

const SignIn: React.FC = () => {
  const {
    formData,
    submitError,
    isLoading,
    handleChange,
    handleBlur,
    handleSubmit,
    getError,
  } = useSignIn()

  return (
    <AuthCard
      title="Sign in to your account"
      subtitle={`Welcome back! Remember me for ${VALIDATION.REMEMBER_ME_DAYS} days.`}
    >
      {submitError && <AlertBanner message={submitError} />}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          label="Email address"
          error={getError('email')}
          required
        >
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => handleBlur('email')}
            placeholder="name@company.com"
            autoComplete="email"
            autoFocus
          />
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={getError('password')}
          required
          labelAction={
            <Link to={ROUTES.FORGOT_PASSWORD} className="link-auth" tabIndex={-1}>
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
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
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
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
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-spinner">
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
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
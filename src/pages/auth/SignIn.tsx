import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AuthCard, FormField, PasswordInput } from "@/components/ui";
import { useFormValidation, validateSignIn } from "@/hooks/useFormValidation";
import { ROUTES, SIGN_IN_DEFAULTS, VALIDATION } from "@/constants/auth";
import type { SignInFormData } from "@/types/auth";

const SignIn: React.FC = () => {
  const [formData, setFormData] = useState<SignInFormData>(SIGN_IN_DEFAULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<
    ReturnType<typeof validateSignIn>
  >({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { markTouched, markSubmitted } = useFormValidation()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSubmitError(null);
  }, []);

  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      markTouched(field);
      setFormErrors(validateSignIn(formData));
    },
    [formData, markTouched],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      markSubmitted()
      setTouched({ email: true, password: true });
      const errors = validateSignIn(formData);
      setFormErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setIsLoading(true);
      setSubmitError(null);
      try {
        // TODO: Uncomment when Supabase is connected
        // const { error } = await supabase.auth.signInWithPassword({
        //   email: formData.email,
        //   password: formData.password,
        // })
        // if (error) throw error
        // navigate(ROUTES.DASHBOARD)
        await new Promise((r) => setTimeout(r, 1000));
        console.log("Sign in:", formData.email);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Invalid email or password.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [formData],
  );

  const getError = (field: keyof typeof formErrors) =>
    touched[field] ? (formErrors[field]?.message ?? null) : null;

  return (
    <AuthCard
      title="Sign in to your account"
      subtitle={`Welcome back! Remember me for ${VALIDATION.REMEMBER_ME_DAYS} days.`}
    >
      {submitError && (
        <div className="auth-alert alert alert-danger" role="alert">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {submitError}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          label="Email address"
          error={getError("email")}
          required
        >
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@company.com"
            autoComplete="email"
            autoFocus
          />
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={getError("password")}
          required
          labelAction={
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="link-auth"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
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
              "Sign in"
            )}
          </button>
        </div>
      </form>
      <p className="auth-footer-text">
        Don't have an account?{" "}
        <Link to={ROUTES.SIGN_UP}>Create a free account</Link>
      </p>
    </AuthCard>
  );
};

export default SignIn;

import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AuthCard,
  FormField,
  PasswordInput,
  OrganizationSelect,
} from "@/components/ui";
import { useFormValidation, validateSignUp } from "@/hooks/useFormValidation";
import { useOrganizationLookup } from "@/hooks/useOrganizationLookup";
import { supabase } from "@/lib/supabase";
import { ROUTES, SIGN_UP_DEFAULTS } from "@/constants/auth";
import type { SignUpFormData } from "@/types/auth";

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState<SignUpFormData>(SIGN_UP_DEFAULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<
    ReturnType<typeof validateSignUp>
  >({});
  const { markTouched, markSubmitted } = useFormValidation();

  const showOrgDropdown = useMemo(
    () =>
      formData.password.length >= 8 &&
      formData.confirmPassword.length >= 1 &&
      formData.password === formData.confirmPassword,
    [formData.password, formData.confirmPassword],
  );

  const {
    organizations,
    isLoading: orgLoading,
    error: orgError,
    hasFetched,
  } = useOrganizationLookup(formData.email, showOrgDropdown);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "email") updated.organizationId = "";
      return updated;
    });
    setSubmitError(null);
  }, []);

  const handleOrgChange = useCallback((id: string) => {
    setFormData((prev) => ({ ...prev, organizationId: id }));
  }, []);

  // AFTER
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      markSubmitted();
      const errors = validateSignUp(formData);
      setFormErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setIsLoading(true);
      setSubmitError(null);

      try {
        const { data, error } = await supabase.functions.invoke("signup-user", {
          body: {
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password,
            client_id: formData.organizationId,
          },
        });

        // supabase.functions.invoke puts non-2xx body inside error.context
        if (error) {
          // Try to extract the structured message from the edge function response
          try {
            const errBody = await error.context?.json();
            setSubmitError(
              errBody?.message ?? "Signup failed. Please try again.",
            );
          } catch {
            setSubmitError(error.message ?? "Signup failed. Please try again.");
          }
          return;
        }

        if (!data?.success) {
          setSubmitError(data?.message ?? "Signup failed. Please try again.");
          return;
        }

        setSubmitSuccess(true);
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Network error. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [formData, markSubmitted],
  );

  const getError = (field: keyof typeof formErrors) =>
    formErrors[field]?.message ?? null;

  const isSubmitDisabled =
    isLoading ||
    orgLoading ||
    (showOrgDropdown && !formData.organizationId) ||
    (showOrgDropdown && hasFetched && organizations.length === 0 && !orgError);

  if (submitSuccess) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="Verification email sent. Please check your inbox."
      >
        <div className="text-center py-3">
          <div
            style={{
              width: 56,
              height: 56,
              background: "rgba(34,197,94,0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-muted mb-4" style={{ fontSize: "0.875rem" }}>
            Verification email sent to <strong>{formData.email}</strong>.
          </p>
          <Link
            to={ROUTES.SIGN_IN}
            className="btn btn-primary btn-auth-primary"
          >
            Back to Sign In
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start managing your ERP in minutes."
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
        {/* Full Name */}
        <FormField
          id="fullName"
          label="Full name"
          error={getError("fullName")}
          required
        >
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Jane Doe"
            autoComplete="name"
            autoFocus
          />
        </FormField>

        {/* Email */}
        <FormField
          id="email"
          label="Work email"
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
          />
        </FormField>

        {/* Password */}
        <FormField
          id="password"
          label="Password"
          error={getError("password")}
          required
        >
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            autoComplete="new-password"
            showStrength
          />
        </FormField>

        {/* Confirm Password */}
        <FormField
          id="confirmPassword"
          label="Confirm password"
          error={getError("confirmPassword")}
          required
        >
          <PasswordInput
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Repeat your password"
            autoComplete="new-password"
          />
        </FormField>

        {/* Organization — appears only after passwords match */}
        {showOrgDropdown && (
          <div className="form-group org-field-animate">
            <label className="form-label">
              Organization <span className="text-danger ms-1">*</span>
            </label>
            <OrganizationSelect
              organizations={organizations}
              value={formData.organizationId}
              onChange={handleOrgChange}
              isLoading={orgLoading}
              error={orgError}
              hasFetched={hasFetched}
            />
            {getError("organizationId") && (
              <div className="invalid-feedback d-flex" role="alert">
                {getError("organizationId")}
              </div>
            )}
          </div>
        )}

        {/* Terms */}
        <div className="form-group mb-4">
          <div className="form-check">
            <input
              id="acceptTerms"
              className={`form-check-input ${formErrors.acceptTerms ? "is-invalid" : ""}`}
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="acceptTerms">
              I agree to the{" "}
              <a
                href="#"
                className="terms-link"
                onClick={(e) => e.preventDefault()}
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="terms-link"
                onClick={(e) => e.preventDefault()}
              >
                Privacy Policy
              </a>
            </label>
            {formErrors.acceptTerms && (
              <div className="invalid-feedback d-block" role="alert">
                {formErrors.acceptTerms.message}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary btn-auth-primary"
          disabled={isSubmitDisabled}
        >
          {isLoading ? (
            <span className="btn-spinner">
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              />
              Creating account…
            </span>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="auth-footer-text">
        Already have an account? <Link to={ROUTES.SIGN_IN}>Sign in</Link>
      </p>
    </AuthCard>
  );
};

export default SignUp;

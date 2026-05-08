import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/constants/auth";
import logoImg from "@/assets/branding/logo.png";

// ─── Types ────────────────────────────────────────────────────────────────────

type VerifyStatus =
  | "verifying"
  | "success"
  | "pending"
  | "error"
  | "expired"
  | "already_verified";

interface StateConfig {
  title: string;
  description: string;
  subdescription?: string;
}

// ─── State Content Map ────────────────────────────────────────────────────────

const STATE_CONTENT: Record<VerifyStatus, StateConfig> = {
  verifying: {
    title: "Verifying your email",
    description: "Please wait while we securely verify your account.",
  },
  success: {
    title: "Email verified successfully",
    description:
      "Your email has been verified and your request has been submitted for administrator approval.",
    subdescription:
      "The organization administrator has been notified and will review your access request shortly.",
  },
  pending: {
    title: "Pending administrator approval",
    description:
      "Your account has been verified successfully. An organization administrator will review your access request shortly.",
    subdescription: "You will be notified once your access has been approved.",
  },
  error: {
    title: "Verification processing failed",
    description:
      "We could not complete your verification request at this time.",
    subdescription:
      "This may be due to an expired session, invalid request, or a temporary system error.",
  },
  expired: {
    title: "Verification link expired",
    description:
      "Your verification link is no longer valid. Verification links expire after 24 hours.",
  },
  already_verified: {
    title: "Email already verified",
    description: "Your email address has already been verified.",
    subdescription: "You can proceed to sign in with your credentials.",
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const SuccessIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22C55E"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#EF4444"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const PendingIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F59E0B"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ExpiredIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F59E0B"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#3B82F6"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

const ConfirmSignup: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  // ── Process edge function call ──
  const processVerification = useCallback(async (userId: string) => {
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "confirm-signup",
      {
        body: { user_id: userId },
      },
    );

    await supabase.auth.signOut();

    if (fnError) {
      try {
        const errBody = await fnError.context?.json();
        const code = errBody?.code ?? "";
        if (code === "ALREADY_PROCESSED") {
          setStatus("already_verified");
        } else if (code === "PRIMARY_ADMIN_NOT_FOUND") {
          setStatus("pending");
        } else {
          setErrorMessage(errBody?.message ?? null);
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
      return;
    }

    if (!fnData?.success) {
      const code = fnData?.code ?? "";
      if (code === "ALREADY_PROCESSED") {
        setStatus("already_verified");
      } else if (code === "PRIMARY_ADMIN_NOT_FOUND") {
        setStatus("pending");
      } else {
        setErrorMessage(fnData?.message ?? null);
        setStatus("error");
      }
      return;
    }

    setStatus("success");
  }, []);

  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const handleConfirm = async () => {
      try {
        // Step 1 — check for error in URL hash first
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.replace("#", ""));
        const urlError = hashParams.get("error");
        const urlErrorCode = hashParams.get("error_code");

        if (urlError) {
          if (urlErrorCode === "otp_expired") {
            setStatus("expired");
          } else {
            setStatus("error");
          }
          return;
        }

        // Step 2 — extract token directly from URL hash
        // (clock skew causes getSession() to reject the token)
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          // Set session manually — bypasses clock skew validation
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError || !sessionData.session) {
            console.error("setSession error:", sessionError);
            setStatus("expired");
            return;
          }

          await processVerification(sessionData.session.user.id);
          return;
        }

        // Step 3 — fallback to getSession
        const { data, error } = await supabase.auth.getSession();

        if (!error && data.session) {
          await processVerification(data.session.user.id);
          return;
        }

        // Step 4 — fallback to PKCE code exchange
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError || !exchangeData.session) {
            setStatus("expired");
            return;
          }

          await processVerification(exchangeData.session.user.id);
          return;
        }

        setStatus("expired");
      } catch {
        setStatus("error");
      }
    };

    handleConfirm();
  }, [processVerification]);

  const content = STATE_CONTENT[status];
  const handleGoToLogin = () => navigate(ROUTES.SIGN_IN);

  // ── Render ──
  return (
    <div className="confirm-wrapper" role="main">
      {/* Card */}
      <div
        className="confirm-card"
        role="status"
        aria-live="polite"
        aria-label={content.title}
      >
        {/* Logo inside card */}
        <div className="confirm-card-logo">
          <img src={logoImg} alt="Varun ERP Solutions" />
        </div>
        {/* Icon */}
        <div className={`confirm-icon-wrap ${status}`}>
          {status === "verifying" && (
            <div
              className="confirm-spinner"
              role="progressbar"
              aria-label="Loading"
            />
          )}
          {status === "success" && <SuccessIcon />}
          {status === "pending" && <PendingIcon />}
          {status === "error" && <ErrorIcon />}
          {status === "expired" && <ExpiredIcon />}
          {status === "already_verified" && <InfoIcon />}
        </div>

        {/* Title */}
        <h1 className="confirm-title">{content.title}</h1>

        {/* Description */}
        <p className="confirm-description">{content.description}</p>

        {/* Subdescription */}
        {content.subdescription && (
          <p className="confirm-subdescription">{content.subdescription}</p>
        )}

        {/* Progress bar — verifying only */}
        {status === "verifying" && (
          <div className="confirm-progress" aria-hidden="true">
            <div className="confirm-progress-bar" />
          </div>
        )}

        {/* Success info box */}
        {status === "success" && (
          <div className="confirm-info-box">
            <p>
              <strong>What happens next?</strong>
            </p>
            <ul className="confirm-steps">
              <li>
                <span className="step-dot" aria-hidden="true" />
                The organization administrator has been notified by email.
              </li>
              <li>
                <span className="step-dot" aria-hidden="true" />
                Your access request is under review.
              </li>
              <li>
                <span className="step-dot" aria-hidden="true" />
                You will be able to sign in once your request is approved.
              </li>
            </ul>
          </div>
        )}

        {/* Pending info box */}
        {status === "pending" && (
          <div className="confirm-info-box warning">
            <p>
              No primary administrator is currently configured for your
              organization. Please contact{" "}
              <strong>support@varunerpsolutions.com</strong> for assistance.
            </p>
          </div>
        )}

        {/* Error info box */}
        {status === "error" && errorMessage && (
          <div className="confirm-info-box warning">
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Expired info box */}
        {status === "expired" && (
          <div className="confirm-info-box warning">
            <p>
              Verification links expire after <strong>24 hours</strong>. Please
              sign up again to receive a new verification email.
            </p>
          </div>
        )}

        {/* Divider */}
        {status !== "verifying" && (
          <div className="confirm-divider" aria-hidden="true" />
        )}

        {/* Actions */}
        {status === "success" && (
          <div className="confirm-actions">
            <button
              className="confirm-btn-primary"
              onClick={handleGoToLogin}
              autoFocus
            >
              Go to Sign In
            </button>
          </div>
        )}

        {status === "pending" && (
          <div className="confirm-actions">
            <button className="confirm-btn-primary" onClick={handleGoToLogin}>
              Back to Sign In
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="confirm-actions">
            <button
              className="confirm-btn-primary"
              onClick={() => navigate(ROUTES.SIGN_UP)}
            >
              Try Again
            </button>
            <button className="confirm-btn-secondary" onClick={handleGoToLogin}>
              Back to Sign In
            </button>
          </div>
        )}

        {status === "expired" && (
          <div className="confirm-actions">
            <button
              className="confirm-btn-primary"
              onClick={() => navigate(ROUTES.SIGN_UP)}
            >
              Sign Up Again
            </button>
            <button className="confirm-btn-secondary" onClick={handleGoToLogin}>
              Back to Sign In
            </button>
          </div>
        )}

        {status === "already_verified" && (
          <div className="confirm-actions">
            <button className="confirm-btn-primary" onClick={handleGoToLogin}>
              Go to Sign In
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="confirm-footer">
          Need help?{" "}
          <a href="mailto:support@varunerpsolutions.com">
            support@varunerpsolutions.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSignup;

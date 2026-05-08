import React, { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAccessRequest, submitReview } from "@/hooks/useAccessRequest";
import RequestSummaryCard from "@/components/admin/RequestSummaryCard";
import RoleSelector from "@/components/admin/RoleSelector";
import RejectModal from "@/components/admin/RejectModal";
import type { UserRole } from "@/types/admin";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ReviewSkeleton: React.FC = () => (
  <>
    <div className="skeleton-card">
      <div className="skeleton-text w-half" style={{ marginBottom: 16 }} />
      <div className="skeleton-text w-full" />
      <div className="skeleton-text w-three" />
      <div className="skeleton-text w-half" />
    </div>
    <div className="skeleton-card">
      <div className="skeleton-text w-half" style={{ marginBottom: 16 }} />
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{ width: 80, height: 36, borderRadius: 6 }}
          />
        ))}
      </div>
    </div>
  </>
);

// ─── Component ────────────────────────────────────────────────────────────────

const AccessRequestReview: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const { request, userProfile, orgName, isLoading, error } =
    useAccessRequest(requestId);

  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000,
    );
  }, []);

  const handleApprove = useCallback(async () => {
    if (selectedRoles.length === 0) {
      setRoleError("Please select at least one role before approving.");
      return;
    }
    setRoleError(null);
    setIsSubmitting(true);

    try {
      const result = await submitReview({
        requestId: requestId!,
        action: "APPROVE",
        roles: selectedRoles,
      });

      if (result.success) {
        addToast({
          type: "success",
          title: "Request Approved",
          message: "The user has been notified and access has been granted.",
        });
        setTimeout(() => navigate("/admin/access-requests"), 2000);
      } else {
        addToast({
          type: "error",
          title: "Approval Failed",
          message: result.message,
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [requestId, selectedRoles, addToast, navigate]);

  const handleReject = useCallback(
    async (reason: string) => {
      setIsSubmitting(true);

      try {
        const result = await submitReview({
          requestId: requestId!,
          action: "REJECT",
          reason,
        });

        if (result.success) {
          setRejectModalOpen(false);
          addToast({
            type: "info",
            title: "Request Rejected",
            message: "The user has been notified of the rejection.",
          });
          setTimeout(() => navigate("/admin/access-requests"), 2000);
        } else {
          addToast({
            type: "error",
            title: "Rejection Failed",
            message: result.message,
          });
        }
      } catch {
        addToast({
          type: "error",
          title: "Error",
          message: "Something went wrong. Please try again.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [requestId, addToast, navigate],
  );

  const isAlreadyProcessed =
    request?.status === "APPROVED" || request?.status === "REJECTED";

  // ── Render ──
  return (
    <div className="admin-wrapper">
      {/* Toasts */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`} role="alert">
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-container">
        {/* Page header */}
        <div className="admin-page-header">
          <div className="admin-breadcrumb">
            <Link to="/admin/access-requests">Access Requests</Link>
            <span>/</span>
            <span>Review</span>
          </div>
          <h1>Access Approval Review</h1>
          <p>
            Identity &amp; Access Management — Review and action this access
            request.
          </p>
        </div>

        {/* Loading */}
        {isLoading && <ReviewSkeleton />}

        {/* Error */}
        {!isLoading && error && (
          <div className="admin-card">
            <div className="admin-card-body">
              <div className="processed-state">
                <div className="processed-icon rejected">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3>Request Not Found</h3>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Request loaded */}
        {!isLoading && request && (
          <>
            {/* Summary */}
            <RequestSummaryCard
              request={request}
              userName={userProfile?.full_name ?? request.requested_email}
              organizationName={orgName || request.client_id}
            />

            {/* Already processed */}
            {isAlreadyProcessed ? (
              <div className="admin-card">
                <div className="admin-card-body">
                  <div className="processed-state">
                    <div
                      className={`processed-icon ${
                        request.status === "APPROVED" ? "approved" : "rejected"
                      }`}
                    >
                      {request.status === "APPROVED" ? (
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </div>
                    <h3>
                      {request.status === "APPROVED"
                        ? "Request Already Approved"
                        : "Request Already Rejected"}
                    </h3>
                    <p>This access request has already been processed.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Role selector */}
                <RoleSelector
                  selected={selectedRoles}
                  onChange={(roles) => {
                    setSelectedRoles(roles);
                    if (roles.length > 0) setRoleError(null);
                  }}
                  error={roleError}
                  disabled={isSubmitting}
                />

                {/* Actions */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2>Actions</h2>
                  </div>
                  <div className="admin-card-body">
                    <p
                      style={{
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "0.8125rem",
                        color: "#6b7280",
                        margin: "0 0 1.25rem",
                      }}
                    >
                      All actions are logged and audited. The user will be
                      notified by email after your decision.
                    </p>
                    <div className="admin-actions">
                      <button
                        className="btn-approve"
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        type="button"
                      >
                        {isSubmitting ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                              aria-hidden="true"
                            />
                            Processing…
                          </>
                        ) : (
                          <>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Approve Request
                          </>
                        )}
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => setRejectModalOpen(true)}
                        disabled={isSubmitting}
                        type="button"
                      >
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
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Reject Request
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Reject modal */}
      <RejectModal
        isOpen={rejectModalOpen}
        isLoading={isSubmitting}
        onClose={() => !isSubmitting && setRejectModalOpen(false)}
        onSubmit={handleReject}
      />
    </div>
  );
};

export default AccessRequestReview;

import React from 'react'
import type { AccessRequest } from '@/types/admin'

interface Props {
  request: AccessRequest
  userName: string
  organizationName: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC'
}

function getStatusClass(status: string): string {
  if (status === 'APPROVED') return 'approved'
  if (status === 'REJECTED') return 'rejected'
  if (status === 'EXPIRED')  return 'expired'
  return 'pending'
}

const RequestSummaryCard: React.FC<Props> = ({ request, userName, organizationName }) => (
  <div className="admin-card">
    <div className="admin-card-header">
      <h2>Request Details</h2>
      <span className={`status-badge ${getStatusClass(request.status)}`}>
        {request.status.replace(/_/g, ' ')}
      </span>
    </div>
    <div className="admin-card-body">
      <div className="request-detail-grid">
        <div className="request-detail-item">
          <div className="detail-label">Full Name</div>
          <div className="detail-value">{userName}</div>
        </div>
        <div className="request-detail-item">
          <div className="detail-label">Email Address</div>
          <div className="detail-value">{request.requested_email}</div>
        </div>
        <div className="request-detail-item">
          <div className="detail-label">Organization</div>
          <div className="detail-value highlight">{organizationName}</div>
        </div>
        <div className="request-detail-item">
          <div className="detail-label">Requested At</div>
          <div className="detail-value">{formatDate(request.created_at)}</div>
        </div>
        <div className="request-detail-item" style={{ gridColumn: '1 / -1' }}>
          <div className="detail-label">Request ID</div>
          <div className="detail-value mono">{request.id}</div>
        </div>
        {request.rejected_reason && (
          <div className="request-detail-item" style={{ gridColumn: '1 / -1' }}>
            <div className="detail-label">Rejection Reason</div>
            <div className="detail-value">{request.rejected_reason}</div>
          </div>
        )}
      </div>
    </div>
  </div>
)

export default RequestSummaryCard
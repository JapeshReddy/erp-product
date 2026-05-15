import React from 'react'

interface InvoiceStatusBadgeProps {
  status: string | null
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  APPROVED:          { label: 'Approved',         className: 'inv-badge inv-badge-approved' },
  PENDING:           { label: 'Pending',           className: 'inv-badge inv-badge-pending' },
  REJECTED:          { label: 'Rejected',          className: 'inv-badge inv-badge-rejected' },
  SENT_FOR_APPROVAL: { label: 'Sent for Approval', className: 'inv-badge inv-badge-sent' },
}

const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ status }) => {
  const cfg = STATUS_CONFIG[status ?? ''] ?? { label: status ?? 'Unknown', className: 'inv-badge inv-badge-neutral' }
  return <span className={cfg.className}>{cfg.label}</span>
}

export default InvoiceStatusBadge
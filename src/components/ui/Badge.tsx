import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  dot?: boolean
}

const variantClass: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  info:    'badge-info',
  neutral: 'badge-neutral',
}

export function statusToBadge(status: string | null): BadgeVariant {
  const s = (status ?? '').toUpperCase()
  if (['APPROVED', 'ACTIVE', 'SENT', 'SUCCESS'].includes(s)) return 'success'
  if (['PENDING', 'PENDING_ADMIN_APPROVAL', 'PENDING_EMAIL_VERIFICATION'].includes(s)) return 'warning'
  if (['REJECTED', 'FAILED', 'BLOCKED', 'LOCKED'].includes(s)) return 'danger'
  if (['INFO', 'MFA_REQUIRED'].includes(s)) return 'info'
  return 'neutral'
}

const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', dot = false }) => (
  <span className={`erp-badge ${variantClass[variant]}`}>
    {dot && <span className="badge-dot" />}
    {label}
  </span>
)

export default Badge
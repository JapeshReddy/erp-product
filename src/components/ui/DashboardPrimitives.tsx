import React from 'react'

// ─── Spinner ──────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <div className={`erp-spinner erp-spinner-${size} ${className}`} role="status" aria-label="Loading" />
)

// ─── SectionCard ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title, subtitle, action, children, className = '', noPadding = false,
}) => (
  <div className={`erp-section-card ${className}`}>
    {(title || action) && (
      <div className="section-card-header">
        <div>
          {title && <h3 className="section-card-title">{title}</h3>}
          {subtitle && <p className="section-card-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="section-card-action">{action}</div>}
      </div>
    )}
    <div className={noPadding ? '' : 'section-card-body'}>
      {children}
    </div>
  </div>
)

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title?: string
  message?: string
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data',
  message = 'Nothing to display yet.',
  icon,
}) => (
  <div className="erp-empty-state">
    {icon && <div className="empty-state-icon">{icon}</div>}
    <p className="empty-state-title">{title}</p>
    <p className="empty-state-message">{message}</p>
  </div>
)
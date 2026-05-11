import React from 'react'

interface AlertBannerProps {
  message: string
  type?: 'danger' | 'success' | 'warning'
}

const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  type = 'danger',
}) => (
  <div className={`auth-alert alert alert-${type}`} role="alert">
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
    {message}
  </div>
)

export default AlertBanner
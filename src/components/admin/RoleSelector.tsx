import React from 'react'
import { USER_ROLES, type UserRole } from '@/types/admin'

interface Props {
  selected: UserRole[]
  onChange: (roles: UserRole[]) => void
  error?: string | null
  disabled?: boolean
}

const RoleSelector: React.FC<Props> = ({ selected, onChange, error, disabled }) => {

  const toggle = (role: UserRole) => {
    if (disabled) return
    if (selected.includes(role)) {
      onChange(selected.filter(r => r !== role))
    } else {
      onChange([...selected, role])
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2>Assign Roles</h2>
      </div>
      <div className="admin-card-body">
        <p style={{
          fontFamily: 'Poppins, sans-serif',
          fontSize: '0.8125rem',
          color: '#6b7280',
          margin: '0 0 1rem',
        }}>
          Select one or more roles to assign upon approval.
          Role assignment will be applied immediately.
        </p>
        <div className="role-selector" role="group" aria-label="Select roles">
          {USER_ROLES.map(role => {
            const isSelected = selected.includes(role)
            return (
              <button
                key={role}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                className={`role-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => toggle(role)}
                disabled={disabled}
              >
                <span className="role-check" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {role}
              </button>
            )
          })}
        </div>
        {error && (
          <div className="role-error" role="alert">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default RoleSelector
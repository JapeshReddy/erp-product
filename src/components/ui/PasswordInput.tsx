import React, { useState, useMemo } from 'react'
import { measurePasswordStrength } from '@/utils/helpers'

const strengthConfig = {
  empty:  { label: '',       bars: 0, color: '' },
  weak:   { label: 'Weak',   bars: 1, color: 'active-weak' },
  fair:   { label: 'Fair',   bars: 2, color: 'active-fair' },
  strong: { label: 'Strong', bars: 3, color: 'active-strong' },
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, className = 'form-control', value, onChange, ...rest }, ref) => {
    const [visible, setVisible] = useState(false)
    const strength = useMemo(() => measurePasswordStrength(String(value ?? '')), [value])
    const { label, bars, color } = strengthConfig[strength]

    return (
      <>
        <div className="input-group-auth">
          <input ref={ref} type={visible ? 'text' : 'password'}
            className={className} value={value} onChange={onChange}
            autoComplete={rest.autoComplete ?? 'current-password'} {...rest} />
          <button type="button" className="input-icon-right"
            onClick={() => setVisible(v => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'} tabIndex={-1}>
            {visible ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {showStrength && strength !== 'empty' && (
          <div className="password-strength">
            <div className="strength-bars" aria-hidden="true">
              {[1, 2, 3].map(i => (
                <div key={i} className={`bar ${i <= bars ? color : ''}`} />
              ))}
            </div>
            <span className="strength-label">Password strength: <strong>{label}</strong></span>
          </div>
        )}
      </>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
export default PasswordInput

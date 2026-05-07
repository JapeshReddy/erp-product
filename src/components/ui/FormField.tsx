import React from 'react'

interface FormFieldProps {
  id: string
  label: string
  error?: string | null
  required?: boolean
  labelAction?: React.ReactNode
  children: React.ReactElement
}

const FormField: React.FC<FormFieldProps> = ({ id, label, error, required, labelAction, children }) => (
  <div className="form-group">
    <label htmlFor={id} className={`form-label ${labelAction ? 'label-with-link' : ''}`}>
      <span>
        {label}
        {required && <span className="text-danger ms-1" aria-hidden="true">*</span>}
      </span>
      {labelAction}
    </label>
    {React.cloneElement(children, {
      id,
      className: [children.props.className ?? 'form-control', error ? 'is-invalid' : '']
        .filter(Boolean).join(' '),
      'aria-describedby': error ? `${id}-error` : undefined,
      'aria-invalid': error ? 'true' : undefined,
    } as React.HTMLAttributes<HTMLElement>)}
    {error && (
      <div id={`${id}-error`} className="invalid-feedback" role="alert">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {error}
      </div>
    )}
  </div>
)

export default FormField

import React, { useState, useEffect, useRef } from 'react'

interface Props {
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}

const MIN_LENGTH = 10
const MAX_LENGTH = 500

const RejectModal: React.FC<Props> = ({ isOpen, isLoading, onClose, onSubmit }) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError(null)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isLoading, onClose])

  const handleSubmit = () => {
    const trimmed = reason.trim()
    if (trimmed.length < MIN_LENGTH) {
      setError(`Reason must be at least ${MIN_LENGTH} characters.`)
      return
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Reason must not exceed ${MAX_LENGTH} characters.`)
      return
    }
    setError(null)
    onSubmit(trimmed)
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      onClick={e => { if (e.target === e.currentTarget && !isLoading) onClose() }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <h3 id="reject-modal-title">Reject Access Request</h3>
          <p>Please provide a reason for rejecting this request. The user will be notified.</p>
        </div>
        <div className="modal-body">
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={e => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Provide a clear reason for rejection (e.g. user does not meet access criteria)..."
            className={error ? 'error' : ''}
            maxLength={MAX_LENGTH}
            disabled={isLoading}
            aria-describedby={error ? 'reject-error' : undefined}
          />
          <div className="char-count">{reason.length}/{MAX_LENGTH}</div>
          {error && (
            <div id="reject-error" className="field-error" role="alert">{error}</div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="btn-cancel"
            onClick={onClose}
            disabled={isLoading}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn-submit-reject"
            onClick={handleSubmit}
            disabled={isLoading || reason.trim().length < MIN_LENGTH}
            type="button"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm"
                  role="status" aria-hidden="true" />
                Submitting…
              </>
            ) : 'Submit Rejection'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RejectModal
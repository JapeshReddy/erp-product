import React, { useState, useRef, useEffect, useId } from 'react'
import type { Organization } from '@/types/auth'

interface OrganizationSelectProps {
  organizations: Organization[]
  value: string
  onChange: (id: string) => void
  isLoading: boolean
  error: string | null
  hasFetched: boolean
  disabled?: boolean
}

const OrganizationSelect: React.FC<OrganizationSelectProps> = ({
  organizations,
  value,
  onChange,
  isLoading,
  error,
  hasFetched,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const triggerId = useId()
  const listId = useId()

  const selected = organizations.find(o => o.id === value)
  const isEmpty = hasFetched && !isLoading && organizations.length === 0 && !error

  // Auto-select if only one org
  useEffect(() => {
    if (organizations.length === 1 && !value) {
      onChange(organizations[0].id)
    }
  }, [organizations, value, onChange])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isLoading) return
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && focusedIndex >= 0) {
          onChange(organizations[focusedIndex].id)
          setIsOpen(false)
        } else {
          setIsOpen(o => !o)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(i => Math.min(i + 1, organizations.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(i => Math.max(i - 1, 0))
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleSelect = (id: string) => {
    onChange(id)
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  return (
    <div className="org-select-wrapper" ref={containerRef}>
      {/* Trigger */}
      <button
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label="Select organization"
        className={`org-select-trigger ${isOpen ? 'open' : ''} ${disabled || isLoading ? 'disabled' : ''}`}
        onClick={() => !disabled && !isLoading && setIsOpen(o => !o)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
      >
        <span className={`org-select-value ${!selected ? 'placeholder' : ''}`}>
          {isLoading ? (
            <span className="org-loading">
              <span className="org-spinner" />
              Loading organizations…
            </span>
          ) : selected ? selected.name : 'Select Organization'}
        </span>
        <span className={`org-select-arrow ${isOpen ? 'rotated' : ''}`} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && organizations.length > 0 && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-labelledby={triggerId}
          className="org-select-menu"
        >
          {organizations.map((org, index) => (
            <li
              key={org.id}
              role="option"
              aria-selected={org.id === value}
              className={`org-select-option ${org.id === value ? 'selected' : ''} ${index === focusedIndex ? 'focused' : ''}`}
              onClick={() => handleSelect(org.id)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <span>{org.name}</span>
              {org.id === value && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* No match message */}
      {isEmpty && (
        <p className="org-no-match" role="alert">
          No organization found for this email domain.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="org-error" role="alert">{error}</p>
      )}
    </div>
  )
}

export default OrganizationSelect
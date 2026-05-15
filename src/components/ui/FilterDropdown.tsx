import React, { useRef, useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  value:       string
  options:     DropdownOption[]
  onChange:    (value: string) => void
  placeholder?: string
  className?:  string
}

const PANEL_MARGIN     = 6
const PANEL_MAX_HEIGHT = 300

const dropdownVariants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0, scale: 0.97,
    transition: { duration: 0.1, ease: 'easeIn' },
  },
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  value, options, onChange, placeholder = 'Select…', className = '',
}) => {
  const [open,       setOpen]       = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  const selected     = options.find(o => o.value === value)
  const displayLabel = selected?.label ?? placeholder
  // Blue accent on trigger when a non-default option is selected (not empty and not the first option)
  const isNonDefault = value !== '' && value !== options[0]?.value
  const showDivider  = options.length > 5

  const close = useCallback(() => {
    setOpen(false)
    setFocusedIdx(-1)
  }, [])

  // Click-outside: manually check both trigger and panel refs so portal clicks don't close it
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      close()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open, close])

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return
    const r      = triggerRef.current.getBoundingClientRect()
    const mobile = window.innerWidth < 768

    if (mobile) {
      setPanelStyle({
        position:        'fixed',
        top:             r.bottom + PANEL_MARGIN,
        left:            0,
        right:           0,
        transformOrigin: 'top center',
      })
      return
    }

    const spaceBelow = window.innerHeight - r.bottom - PANEL_MARGIN
    const spaceAbove = r.top - PANEL_MARGIN
    const flip       = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow

    if (flip) {
      setPanelStyle({
        position:        'fixed',
        bottom:          window.innerHeight - r.top + PANEL_MARGIN,
        left:            r.left,
        minWidth:        r.width,
        transformOrigin: 'bottom center',
      })
    } else {
      setPanelStyle({
        position:        'fixed',
        top:             r.bottom + PANEL_MARGIN,
        left:            r.left,
        minWidth:        r.width,
        transformOrigin: 'top center',
      })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    calcPosition()
    const onDismiss = () => close()
    window.addEventListener('scroll', onDismiss, { passive: true, capture: true })
    window.addEventListener('resize', onDismiss, { passive: true })
    return () => {
      window.removeEventListener('scroll', onDismiss, { capture: true })
      window.removeEventListener('resize', onDismiss)
    }
  }, [open, calcPosition, close])

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); setFocusedIdx(0) }
      else if (e.key === 'ArrowDown') {
        setFocusedIdx(i => Math.min(i + 1, options.length - 1))
        panelRef.current?.focus()
      }
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault()
      setFocusedIdx(i => Math.max(i - 1, 0))
      panelRef.current?.focus()
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      close()
    }
  }

  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIdx(i => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        if (focusedIdx >= 0) {
          e.preventDefault()
          onChange(options[focusedIdx].value)
          close()
          triggerRef.current?.focus()
        }
        break
      case 'Escape':
        close()
        triggerRef.current?.focus()
        break
      case 'Tab':
        close()
        break
    }
  }

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className="flt-panel"
          style={panelStyle}
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="listbox"
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
          aria-label={placeholder}
        >
          {options.map((opt, i) => (
            <React.Fragment key={opt.value}>
              {showDivider && i === 1 && (
                <div className="flt-panel-divider" aria-hidden="true" />
              )}
              <button
                className={[
                  'flt-panel-item',
                  opt.value === value ? 'selected'  : '',
                  i === focusedIdx    ? 'focused'   : '',
                ].filter(Boolean).join(' ')}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onMouseEnter={() => setFocusedIdx(i)}
                onMouseLeave={() => setFocusedIdx(-1)}
                onClick={() => {
                  onChange(opt.value)
                  close()
                  triggerRef.current?.focus()
                }}
              >
                <span className="flt-panel-item-label">{opt.label}</span>
                {opt.value === value && (
                  <Check size={13} className="flt-panel-item-check" aria-hidden="true" />
                )}
              </button>
            </React.Fragment>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={[
          'flt-trigger',
          open         ? 'open'      : '',
          isNonDefault ? 'has-value' : '',
          className,
        ].filter(Boolean).join(' ')}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flt-trigger-label">{displayLabel}</span>
        <motion.span
          className="flt-trigger-chevron"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          aria-hidden="true"
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>
      {ReactDOM.createPortal(panel, document.body)}
    </>
  )
}

export default FilterDropdown

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, FileText, FileX2, Upload, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import InvoiceStatusBadge from './InvoiceStatusBadge'
import { fetchInvoiceItems } from '@/services/invoiceService'
import { Skeleton } from '@/components/ui/SkeletonLoader'
import type { InvoiceRow, InvoiceItem } from '@/types/invoice'

interface InvoiceDetailModalProps {
  invoice: InvoiceRow
  onClose: () => void
}

function fmt(val: number | null, currency?: string | null): string {
  if (val == null) return '—'
  const sym = currency === 'INR' ? '₹' : (currency ?? '')
  return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Focus Trap ───────────────────────────────────────────────────────────────

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current
    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    // Auto-focus the close button on open
    first?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (focusable.length === 0) { e.preventDefault(); return }

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [active, containerRef])
}

// ─── Body Scroll Lock ─────────────────────────────────────────────────────────

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const scrollY = window.scrollY
    const body    = document.body
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top      = `-${scrollY}px`
    body.style.width    = '100%'

    return () => {
      body.style.overflow  = ''
      body.style.position  = ''
      body.style.top       = ''
      body.style.width     = ''
      window.scrollTo(0, scrollY)
    }
  }, [active])
}

// ─── Financial Summary ────────────────────────────────────────────────────────

const FinancialSummary: React.FC<{ invoice: InvoiceRow }> = ({ invoice }) => (
  <div className="inv-modal-fin-grid">
    <div className="inv-modal-fin-card">
      <div className="inv-modal-fin-label">Net Value</div>
      <div className="inv-modal-fin-value">{fmt(invoice.net_value, invoice.currency)}</div>
    </div>
    <div className="inv-modal-fin-card">
      <div className="inv-modal-fin-label">Tax Amount</div>
      <div className="inv-modal-fin-value inv-modal-fin-warn">{fmt(invoice.tax_amount, invoice.currency)}</div>
    </div>
    <div className="inv-modal-fin-card">
      <div className="inv-modal-fin-label">Shipping</div>
      <div className="inv-modal-fin-value">{fmt(invoice.shipping_charges, invoice.currency)}</div>
    </div>
    <div className="inv-modal-fin-card inv-modal-fin-total">
      <div className="inv-modal-fin-label">Total Amount</div>
      <div className="inv-modal-fin-value inv-modal-fin-primary">{fmt(invoice.total_amount, invoice.currency)}</div>
    </div>
  </div>
)

// ─── Items Table ──────────────────────────────────────────────────────────────

const ItemsTable: React.FC<{ invoiceId: string }> = ({ invoiceId }) => {
  const [items,     setItems]     = useState<InvoiceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchInvoiceItems(invoiceId).then(data => {
      if (!cancelled) {
        setItems(data)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [invoiceId])

  if (isLoading) return (
    <div className="inv-modal-items-loading">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} height={36} borderRadius={6} style={{ marginBottom: 6 }} />
      ))}
    </div>
  )

  if (!items.length) return (
    <div className="inv-modal-items-empty">No line items found for this invoice.</div>
  )

  return (
    <div className="inv-modal-items-wrap">
      <table className="inv-modal-items-table">
        <thead>
          <tr>
            <th>Item No</th>
            <th>Material ID</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Net Value</th>
            <th>Tax Amt 1</th>
            <th>Tax Amt 2</th>
            <th>Taxable</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <motion.tr
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.18 }}
            >
              <td>{item.item_no ?? '—'}</td>
              <td>{item.material_id ?? '—'}</td>
              <td>{item.material_description ?? '—'}</td>
              <td>{item.quantity ?? '—'}</td>
              <td>{fmt(item.unit_price ?? null)}</td>
              <td>{fmt(item.net_value ?? null)}</td>
              <td>{fmt(item.tax_amount1 ?? null)}</td>
              <td>{fmt(item.tax_amount2 ?? null)}</td>
              <td>{item.taxable != null ? (item.taxable ? 'Yes' : 'No') : '—'}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
}

const panelVariants = {
  hidden:  { opacity: 0, scale: 0.97, y: 12 },
  visible: { opacity: 1, scale: 1,    y: 0 },
  exit:    { opacity: 0, scale: 0.98, y: 8 },
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping:   30,
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoice, onClose }) => {
  const [sending, setSending] = useState(false)
  const navigate      = useNavigate()
  const containerRef  = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Store previously focused element to restore on close
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  useFocusTrap(containerRef, true)
  useBodyScrollLock(true)

  const handleClose = useCallback(() => onClose(), [onClose])

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleClose])

  const handleSendApproval = async () => {
    setSending(true)
    try {
      await new Promise(r => setTimeout(r, 1400))
      toast.success('Approval mail sent successfully to approvers.', {
        duration: 4000,
        position: 'bottom-center',
      })
      handleClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      className="inv-modal-overlay"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.18 }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice ${invoice.id.slice(0, 8).toUpperCase()} details`}
    >
      <motion.div
        ref={containerRef}
        className="inv-modal"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={springTransition}
        onClick={e => e.stopPropagation()}
        style={{ willChange: 'transform, opacity' }}
      >

        {/* Header */}
        <div className="inv-modal-header">
          <div className="inv-modal-header-left">
            <div className="inv-modal-id">Invoice #{invoice.id.slice(0, 8).toUpperCase()}</div>
            <InvoiceStatusBadge status={invoice.approval_status} />
          </div>
          <button
            className="inv-modal-close"
            onClick={handleClose}
            aria-label="Close invoice details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — two-panel */}
        <div className="inv-modal-body">

          {/* Left — PDF Preview */}
          <div className="inv-modal-pdf-panel">
            <div className="inv-modal-pdf-label">Invoice Document</div>
            {invoice.file_name ? (
              <div className="inv-modal-pdf-frame">
                <iframe
                  src={`/invoices/${invoice.file_name}#toolbar=0&navpanes=0&scrollbar=0`}
                  title="Invoice PDF"
                  className="inv-modal-iframe"
                />
              </div>
            ) : (
              <div className="inv-modal-pdf-placeholder">
                <div className="inv-modal-pdf-empty-icon">
                  <FileX2 size={32} />
                </div>
                <p className="inv-modal-pdf-empty-title">No document attached</p>
                <span className="inv-modal-pdf-empty-sub">
                  PDF preview will appear here once a file is uploaded.
                </span>
                <button
                  className="inv-modal-pdf-upload-btn"
                  onClick={() => { handleClose(); navigate('/invoices/upload') }}
                >
                  <Upload size={13} />
                  Upload Document
                </button>
              </div>
            )}
          </div>

          {/* Right — Details */}
          <div className="inv-modal-details-panel">

            {/* Invoice Details */}
            <div className="inv-modal-section">
              <div className="inv-modal-section-title">Invoice Details</div>
              <div className="inv-modal-details-grid">
                {[
                  ['Invoice ID',     <span className="inv-detail-mono">{invoice.id.slice(0, 8).toUpperCase()}</span>],
                  ['Vendor',         invoice.vendor ?? '—'],
                  ['Invoice Date',   fmtDate(invoice.invoice_date)],
                  ['PO Number',      invoice.po_number ?? '—'],
                  ['Currency',       invoice.currency ?? '—'],
                  ['Payment Terms',  invoice.payment_terms ?? '—'],
                  ['Created By',     invoice.created_by ?? '—'],
                  ['Created At',     fmtDate(invoice.created_at)],
                  ['Status',         <InvoiceStatusBadge status={invoice.approval_status} />],
                ].map(([label, val], i) => (
                  <div key={i} className="inv-detail-row">
                    <span className="inv-detail-label">{label as string}</span>
                    <span className="inv-detail-value">{val as React.ReactNode}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="inv-modal-section">
              <div className="inv-modal-section-title">Financial Summary</div>
              <FinancialSummary invoice={invoice} />
            </div>

            {/* Line Items */}
            <div className="inv-modal-section">
              <div className="inv-modal-section-title">Invoice Line Items</div>
              <ItemsTable invoiceId={invoice.id} />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="inv-modal-footer">
          <button className="erp-btn btn-ghost" onClick={handleClose}>
            <X size={15} /> Close
          </button>
          <button
            className="erp-btn btn-primary"
            onClick={handleSendApproval}
            disabled={sending}
            aria-busy={sending}
          >
            {sending ? (
              <><span className="inv-spinner-sm" aria-hidden="true" /> Sending…</>
            ) : (
              <><Send size={15} /> Send for Approval</>
            )}
          </button>
        </div>

      </motion.div>
    </motion.div>
  )
}

export default InvoiceDetailModal

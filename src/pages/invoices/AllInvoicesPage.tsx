import React, { useState } from 'react'
import { ChevronRight, RefreshCw, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useAllInvoices } from '@/hooks/useAllInvoices'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge'
import InvoiceFiltersBar from '@/components/invoices/InvoiceFiltersBar'
import InvoiceDetailModal from '@/components/invoices/InvoiceDetailModal'
import type { InvoiceRow } from '@/types/invoice'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | null, currency?: string | null): string {
  if (val == null) return '—'
  const sym = currency === 'INR' ? '₹' : (currency ?? '')
  return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

const SkeletonRows: React.FC = () => (
  <>
    {[1,2,3,4,5].map(i => (
      <tr key={i} className="inv-table-skeleton-row">
        {[1,2,3,4,5,6,7,8,9].map(j => (
          <td key={j}><div className="inv-skeleton-cell" /></td>
        ))}
      </tr>
    ))}
  </>
)

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <tr>
    <td colSpan={9}>
      <div className="inv-table-empty">
        <FileText size={40} />
        <p>No invoices found</p>
        <span>Try adjusting your filters or date range.</span>
      </div>
    </td>
  </tr>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

const DATE_RANGE_LABELS: Record<string, string> = {
  THIS_MONTH:     'This Month',
  LAST_3_MONTHS:  'Last 3 Months',
  LAST_6_MONTHS:  'Last 6 Months',
  CUSTOM:         'Custom Range',
}

const AllInvoicesPage: React.FC = () => {
  const { user } = useAuth()
  const {
    data, total, page, setPage, totalPages, PAGE_SIZE,
    filters, updateFilter, resetFilters,
    vendors, currencies,
    isLoading, refresh,
  } = useAllInvoices(user?.client_id)

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null)
  const [showDateDropdown, setShowDateDropdown] = useState(false)

  const from = page * PAGE_SIZE + 1
  const to   = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="inv-page">
      <div className="inv-container">

        {/* Page Header */}
        <div className="inv-page-header">
          <div className="inv-breadcrumb">
            <span>Invoices</span>
            <ChevronRight size={12} className="inv-breadcrumb-sep" />
            <span className="inv-breadcrumb-current">All Invoices</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1>All Invoices</h1>
              <p>Manage and review all invoice records across your organisation.</p>
            </div>
            {/* Date Range Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="inv-date-range-btn"
                onClick={() => setShowDateDropdown(v => !v)}
              >
                <span>📅</span>
                {DATE_RANGE_LABELS[filters.dateRange]}
                <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
              </button>
              {showDateDropdown && (
                <div className="inv-date-dropdown">
                  {Object.entries(DATE_RANGE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      className={`inv-date-dropdown-item ${filters.dateRange === key ? 'active' : ''}`}
                      onClick={() => { updateFilter('dateRange', key); setShowDateDropdown(false) }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <InvoiceFiltersBar
          filters={filters}
          vendors={vendors}
          currencies={currencies}
          onUpdate={updateFilter}
          onReset={resetFilters}
        />

        {/* Table Card */}
        <div className="inv-table-card">
          <div className="inv-table-card-header">
            <span className="inv-table-card-title">
              {isLoading ? 'Loading…' : `${total.toLocaleString()} Invoice${total !== 1 ? 's' : ''}`}
            </span>
            <button className="inv-table-refresh-btn" onClick={refresh} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'inv-spin' : ''} />
            </button>
          </div>

          <div className="inv-table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Invoice Date</th>
                  <th>Vendor</th>
                  <th>PO Number</th>
                  <th>Total Amount</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonRows />
                ) : data.length === 0 ? (
                  <EmptyState />
                ) : (
                  data.map(inv => (
                    <tr key={inv.id} className="inv-table-row">
                      <td>
                        <span className="inv-table-id">
                          #{inv.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td>{fmtDate(inv.invoice_date)}</td>
                      <td className="inv-table-vendor">{inv.vendor ?? '—'}</td>
                      <td>{inv.po_number ?? '—'}</td>
                      <td className="inv-table-amount">{fmt(inv.total_amount, inv.currency)}</td>
                      <td>{inv.currency ?? '—'}</td>
                      <td><InvoiceStatusBadge status={inv.approval_status} /></td>
                      <td className="inv-table-muted">{inv.created_by ?? '—'}</td>
                      <td>
                        <button
                          className="inv-view-btn"
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="inv-pagination">
              <span className="inv-pagination-info">
                Showing {from}–{to} of {total.toLocaleString()}
              </span>
              <div className="inv-pagination-btns">
                <button
                  className="inv-page-btn"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = Math.max(0, page - 2) + i
                  if (p >= totalPages) return null
                  return (
                    <button
                      key={p}
                      className={`inv-page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p + 1}
                    </button>
                  )
                })}
                <button
                  className="inv-page-btn"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  )
}

export default AllInvoicesPage
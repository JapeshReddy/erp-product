import React, { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type Column,
} from '@tanstack/react-table'
import { ChevronRight, RefreshCw, FileText, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useAllInvoices } from '@/hooks/useAllInvoices'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge'
import InvoiceFiltersBar from '@/components/invoices/InvoiceFiltersBar'
import InvoiceDetailModal from '@/components/invoices/InvoiceDetailModal'
import FilterDropdown, { type DropdownOption } from '@/components/ui/FilterDropdown'
import { TableRowSkeleton } from '@/components/ui/SkeletonLoader'
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

// ─── Sortable Column Header ───────────────────────────────────────────────────

function SortableHeader({ column, label }: { column: Column<InvoiceRow, unknown>; label: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      className="inv-th-sort-btn"
      onClick={column.getToggleSortingHandler()}
      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
    >
      {label}
      <span className="inv-th-sort-icon" aria-hidden="true">
        {sorted === 'asc'  ? <ChevronUp size={12} />
        : sorted === 'desc' ? <ChevronDown size={12} />
        : <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />}
      </span>
    </button>
  )
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const columnHelper = createColumnHelper<InvoiceRow>()

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <tr>
    <td colSpan={9}>
      <motion.div
        className="inv-table-empty"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <FileText size={40} />
        <p>No invoices found</p>
        <span>Try adjusting your filters or date range.</span>
      </motion.div>
    </td>
  </tr>
)

// ─── Date Range Options ───────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS: DropdownOption[] = [
  { value: 'THIS_MONTH',    label: 'This Month' },
  { value: 'LAST_3_MONTHS', label: 'Last 3 Months' },
  { value: 'LAST_6_MONTHS', label: 'Last 6 Months' },
  { value: 'CUSTOM',        label: 'Custom Range' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

const AllInvoicesPage: React.FC = () => {
  const { user } = useAuth()
  const {
    data, total, page, setPage, totalPages, PAGE_SIZE,
    filters, updateFilter, resetFilters,
    vendors, currencies,
    isLoading, refresh,
  } = useAllInvoices(user?.client_id)

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null)
  const [sorting,         setSorting]         = useState<SortingState>([])

  const columns = useMemo(() => [
    columnHelper.accessor('id', {
      header: 'Invoice ID',
      cell:   info => <span className="inv-table-id">#{info.getValue().slice(0, 8).toUpperCase()}</span>,
      enableSorting: false,
    }),
    columnHelper.accessor('invoice_date', {
      header: ({ column }) => <SortableHeader column={column} label="Invoice Date" />,
      cell:   info => fmtDate(info.getValue()),
    }),
    columnHelper.accessor('vendor', {
      header: ({ column }) => <SortableHeader column={column} label="Vendor" />,
      cell:   info => <span className="inv-table-vendor">{info.getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('po_number', {
      header:        'PO Number',
      cell:          info => info.getValue() ?? '—',
      enableSorting: false,
    }),
    columnHelper.accessor('total_amount', {
      header: ({ column }) => <SortableHeader column={column} label="Total Amount" />,
      cell:   info => <span className="inv-table-amount">{fmt(info.getValue(), info.row.original.currency)}</span>,
    }),
    columnHelper.accessor('currency', {
      header:        'Currency',
      cell:          info => info.getValue() ?? '—',
      enableSorting: false,
    }),
    columnHelper.accessor('approval_status', {
      header:        'Status',
      cell:          info => <InvoiceStatusBadge status={info.getValue()} />,
      enableSorting: false,
    }),
    columnHelper.accessor('created_by', {
      header:        'Created By',
      cell:          info => <span className="inv-table-muted">{info.getValue() ?? '—'}</span>,
      enableSorting: false,
    }),
    columnHelper.display({
      id:     'actions',
      header: 'Action',
      cell:   ({ row }) => (
        <button
          className="inv-view-btn"
          onClick={() => setSelectedInvoice(row.original)}
          aria-label={`View invoice ${row.original.id.slice(0, 8).toUpperCase()}`}
        >
          View
        </button>
      ),
    }),
  ], [])

  const table = useReactTable({
    data,
    columns,
    state:               { sorting },
    onSortingChange:     setSorting,
    getCoreRowModel:     getCoreRowModel(),
    getSortedRowModel:   getSortedRowModel(),
    manualPagination:    true,
    pageCount:           totalPages,
  })

  const from = page * PAGE_SIZE + 1
  const to   = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="inv-page">
      <div className="inv-container">

        {/* Page Header */}
        <motion.div
          className="inv-page-header"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
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
            <FilterDropdown
              value={filters.dateRange}
              options={DATE_RANGE_OPTIONS}
              onChange={v => updateFilter('dateRange', v)}
              placeholder="Date Range"
            />
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <InvoiceFiltersBar
            filters={filters}
            vendors={vendors}
            currencies={currencies}
            onUpdate={updateFilter}
            onReset={resetFilters}
          />
        </motion.div>

        {/* Table Card */}
        <motion.div
          className="inv-table-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.08 }}
        >
          <div className="inv-table-card-header">
            <span className="inv-table-card-title">
              <AnimatePresence mode="wait">
                <motion.span
                  key={isLoading ? 'loading' : total}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isLoading ? 'Loading…' : `${total.toLocaleString()} Invoice${total !== 1 ? 's' : ''}`}
                </motion.span>
              </AnimatePresence>
            </span>
            <button
              className="inv-table-refresh-btn"
              onClick={() => refresh()}
              disabled={isLoading}
              aria-label="Refresh invoices"
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'inv-spin' : ''}
                style={{ transition: 'transform 0.3s ease' }}
              />
            </button>
          </div>

          <div className="inv-table-scroll">
            <table className="inv-table" role="grid">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} role="row">
                    {hg.headers.map(header => (
                      <th key={header.id} scope="col" colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  <TableRowSkeleton rows={8} columns={9} />
                ) : table.getRowModel().rows.length === 0 ? (
                  <EmptyState />
                ) : (
                  table.getRowModel().rows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      className="inv-table-row"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.18, ease: 'easeOut' }}
                      layout
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <motion.div
              className="inv-pagination"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <span className="inv-pagination-info">
                Showing {from}–{to} of {total.toLocaleString()}
              </span>
              <div className="inv-pagination-btns" role="navigation" aria-label="Pagination">
                <button
                  className="inv-page-btn"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  aria-label="Previous page"
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
                      aria-label={`Page ${p + 1}`}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p + 1}
                    </button>
                  )
                })}
                <button
                  className="inv-page-btn"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDetailModal
            key={selectedInvoice.id}
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default AllInvoicesPage

import React, { useState, useMemo } from 'react'
import { Download, RefreshCw, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type Column,
} from '@tanstack/react-table'
import { SectionCard, EmptyState, Spinner } from '@/components/ui/DashboardPrimitives'
import Badge, { statusToBadge } from '@/components/ui/Badge'
import { useApprovalQueue } from '@/hooks/useApprovalQueue'
import { useAuth } from '@/context/AuthContext'
import type { ApprovalQueueRow } from '@/types/dashboard'

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return '—'
  const sym = currency === 'INR' ? '₹' : (currency ?? '')
  if (amount >= 100_000) return `${sym}${(amount / 100_000).toFixed(1)}L`
  return `${sym}${amount.toLocaleString('en-IN')}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function exportCSV(rows: ApprovalQueueRow[]) {
  const headers = ['Invoice ID', 'Vendor', 'Amount', 'Submitted By', 'Status', 'Invoice Date', 'Approver']
  const lines = rows.map(r => [
    r.id, r.vendor ?? '', formatAmount(r.total_amount, r.currency),
    r.created_by ?? '', r.approval_status ?? '', r.invoice_date ?? '', r.approver_email ?? '',
  ].map(v => `"${v}"`).join(','))
  const csv  = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'approval-queue.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Sortable Column Header ───────────────────────────────────────────────────

function SortableHeader({ column, label }: { column: Column<ApprovalQueueRow, unknown>; label: string }) {
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

const columnHelper = createColumnHelper<ApprovalQueueRow>()

// ─── Component ────────────────────────────────────────────────────────────────

const ApprovalQueueTable: React.FC = () => {
  const { user } = useAuth()
  const { data, total, page, setPage, pageSize, isLoading, error, refresh } = useApprovalQueue(user?.client_id)

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting,      setSorting]      = useState<SortingState>([])

  const columns = useMemo(() => [
    columnHelper.accessor('id', {
      header:        'Invoice ID',
      cell:          info => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--erp-primary)' }}>
          {info.getValue().slice(0, 8).toUpperCase()}
        </span>
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('vendor', {
      header: ({ column }) => <SortableHeader column={column} label="Vendor" />,
      cell:   info => <span style={{ fontWeight: 500 }}>{info.getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('total_amount', {
      header: ({ column }) => <SortableHeader column={column} label="Amount" />,
      cell:   info => <span style={{ fontWeight: 600 }}>{formatAmount(info.getValue(), info.row.original.currency)}</span>,
    }),
    columnHelper.accessor('created_by', {
      header:        'Submitted By',
      cell:          info => <span style={{ color: 'var(--erp-text-secondary)' }}>{info.getValue() ?? '—'}</span>,
      enableSorting: false,
    }),
    columnHelper.accessor('approval_status', {
      header:        'Status',
      cell:          info => <Badge label={info.getValue() ?? 'Unknown'} variant={statusToBadge(info.getValue())} dot />,
      enableSorting: false,
    }),
    columnHelper.accessor('invoice_date', {
      header: ({ column }) => <SortableHeader column={column} label="Invoice Date" />,
      cell:   info => <span style={{ color: 'var(--erp-text-secondary)' }}>{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('approver_email', {
      header:        'Approver',
      cell:          info => <span style={{ color: 'var(--erp-text-secondary)', fontSize: '0.75rem' }}>{info.getValue() ?? '—'}</span>,
      enableSorting: false,
    }),
    columnHelper.display({
      id:     'actions',
      header: 'Actions',
      cell:   () => (
        <div className="table-actions">
          <button className="table-action-btn">Approve</button>
          <button className="table-action-btn btn-danger">Reject</button>
          <button className="table-action-btn">View</button>
        </div>
      ),
    }),
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange:    setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel:    getCoreRowModel(),
    getSortedRowModel:  getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // pagination is server-side
    manualPagination:   true,
    pageCount:          Math.ceil(total / pageSize),
  })

  const totalPages = Math.ceil(total / pageSize)

  return (
    <SectionCard
      title="Approval Queue"
      subtitle={`${total} invoices pending review`}
      noPadding
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="search"
            placeholder="Search…"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            style={{
              background:   'var(--erp-surface-2)',
              border:       '1px solid var(--erp-border)',
              borderRadius: 'var(--erp-radius-sm)',
              padding:      '0.3125rem 0.625rem',
              fontSize:     '0.8125rem',
              color:        'var(--erp-text-primary)',
              fontFamily:   'inherit',
              outline:      'none',
            }}
          />
          <button className="erp-btn btn-ghost btn-sm" onClick={() => exportCSV(data)}>
            <Download size={14} /> CSV
          </button>
          <button className="erp-btn btn-ghost btn-sm" onClick={() => refresh()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState title="Failed to load" message={error} />
      ) : table.getRowModel().rows.length === 0 ? (
        <EmptyState title="No pending approvals" message="All invoices are up to date." />
      ) : (
        <>
          <div className="approval-table-wrap">
            <table className="erp-table">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-pagination">
            <span>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
            </span>
            <div className="pagination-btns">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  style={i === page ? { background: 'var(--erp-primary)', color: '#fff', borderColor: 'var(--erp-primary)' } : {}}
                >
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</button>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  )
}

export default ApprovalQueueTable

import React, { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { SectionCard, EmptyState, Spinner } from '@/components/ui/DashboardPrimitives'
import Badge, { statusToBadge } from '@/components/ui/Badge'
import { useApprovalQueue } from '@/hooks/useApprovalQueue'
import { useAuth } from '@/context/AuthContext'

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

function exportCSV(rows: any[]) {
  const headers = ['Invoice ID', 'Vendor', 'Amount', 'Submitted By', 'Status', 'Invoice Date', 'Approver']
  const lines = rows.map(r => [
    r.id, r.vendor ?? '', formatAmount(r.total_amount, r.currency),
    r.created_by ?? '', r.approval_status ?? '', r.invoice_date ?? '', r.approver_email ?? '',
  ].map(v => `"${v}"`).join(','))
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'approval-queue.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const ApprovalQueueTable: React.FC = () => {
  const { user } = useAuth()
  const { data, total, page, setPage, pageSize, isLoading, error, refresh } = useApprovalQueue(user?.client_id)
  const [search, setSearch] = useState('')

  const filtered = data.filter(r =>
    !search ||
    r.vendor?.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.created_by?.toLowerCase().includes(search.toLowerCase())
  )

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
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'var(--erp-surface-2)',
              border: '1px solid var(--erp-border)',
              borderRadius: 'var(--erp-radius-sm)',
              padding: '0.3125rem 0.625rem',
              fontSize: '0.8125rem',
              color: 'var(--erp-text-primary)',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button className="erp-btn btn-ghost btn-sm" onClick={() => exportCSV(data)}>
            <Download size={14} /> CSV
          </button>
          <button className="erp-btn btn-ghost btn-sm" onClick={refresh} disabled={isLoading}>
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
      ) : filtered.length === 0 ? (
        <EmptyState title="No pending approvals" message="All invoices are up to date." />
      ) : (
        <>
          <div className="approval-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Invoice Date</th>
                  <th>Approver</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--erp-primary)' }}>
                      {row.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td style={{ fontWeight: 500 }}>{row.vendor ?? '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatAmount(row.total_amount, row.currency)}</td>
                    <td style={{ color: 'var(--erp-text-secondary)' }}>{row.created_by ?? '—'}</td>
                    <td><Badge label={row.approval_status ?? 'Unknown'} variant={statusToBadge(row.approval_status)} dot /></td>
                    <td style={{ color: 'var(--erp-text-secondary)' }}>{formatDate(row.invoice_date)}</td>
                    <td style={{ color: 'var(--erp-text-secondary)', fontSize: '0.75rem' }}>{row.approver_email ?? '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="table-action-btn">Approve</button>
                        <button className="table-action-btn btn-danger">Reject</button>
                        <button className="table-action-btn">View</button>
                      </div>
                    </td>
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
import React from 'react'
import { Search, RotateCcw } from 'lucide-react'
import FilterDropdown, { type DropdownOption } from '@/components/ui/FilterDropdown'
import type { InvoiceFilters } from '@/types/invoice'

interface InvoiceFiltersBarProps {
  filters:    InvoiceFilters
  vendors:    string[]
  currencies: string[]
  onUpdate:   (key: keyof InvoiceFilters, value: string) => void
  onReset:    () => void
}

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'ALL',               label: 'All Statuses' },
  { value: 'PENDING',           label: 'Pending' },
  { value: 'APPROVED',          label: 'Approved' },
  { value: 'REJECTED',          label: 'Rejected' },
  { value: 'SENT_FOR_APPROVAL', label: 'Sent for Approval' },
]

const InvoiceFiltersBar: React.FC<InvoiceFiltersBarProps> = ({
  filters, vendors, currencies, onUpdate, onReset,
}) => {
  const hasActive = filters.search || filters.vendor || filters.approvalStatus !== 'ALL' ||
    filters.poNumber || filters.currency

  const vendorOptions: DropdownOption[] = [
    { value: '', label: 'All Vendors' },
    ...vendors.map(v => ({ value: v, label: v })),
  ]

  const currencyOptions: DropdownOption[] = [
    { value: '', label: 'All Currencies' },
    ...currencies.map(c => ({ value: c, label: c })),
  ]

  return (
    <div className="inv-filters-bar">
      {/* Search */}
      <div className="inv-filter-search">
        <Search size={14} className="inv-filter-search-icon" />
        <input
          type="search"
          className="inv-filter-input"
          placeholder="Search vendor, PO number, created by…"
          value={filters.search}
          onChange={e => onUpdate('search', e.target.value)}
        />
      </div>

      {/* Vendor */}
      <FilterDropdown
        value={filters.vendor}
        options={vendorOptions}
        onChange={v => onUpdate('vendor', v)}
        placeholder="All Vendors"
      />

      {/* Status */}
      <FilterDropdown
        value={filters.approvalStatus}
        options={STATUS_OPTIONS}
        onChange={v => onUpdate('approvalStatus', v)}
        placeholder="All Statuses"
      />

      {/* PO Number */}
      <input
        type="text"
        className="inv-filter-input inv-filter-input-sm"
        placeholder="PO Number"
        value={filters.poNumber}
        onChange={e => onUpdate('poNumber', e.target.value)}
      />

      {/* Currency */}
      <FilterDropdown
        value={filters.currency}
        options={currencyOptions}
        onChange={v => onUpdate('currency', v)}
        placeholder="All Currencies"
      />

      {/* Reset */}
      {hasActive && (
        <button className="inv-filter-reset" onClick={onReset}>
          <RotateCcw size={13} /> Reset
        </button>
      )}
    </div>
  )
}

export default InvoiceFiltersBar

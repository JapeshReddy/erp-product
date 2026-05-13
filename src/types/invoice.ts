// ─── Invoice Header ───────────────────────────────────────────────────────────

export interface InvoiceRow {
  id: string
  created_at: string
  file_name: string | null
  invoice_date: string | null
  total_amount: number | null
  net_value: number | null
  tax_amount: number | null
  shipping_charges: number | null
  currency: string | null
  vendor: string | null
  po_number: string | null
  payment_terms: string | null
  created_by: string | null
  approval_status: string | null
  client_id: string
}

// ─── Invoice Item ─────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string
  item_no: string | null
  created_at: string
  material_id?: string | null
  material_description?: string | null
  quantity?: number | null
  unit_price?: number | null
  net_value?: number | null
  tax_amount1?: number | null
  tax_amount2?: number | null
  taxable?: boolean | null
  invoice_id?: string
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT_FOR_APPROVAL'
export type DateRangeFilter = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'CUSTOM'

export interface InvoiceFilters {
  search: string
  vendor: string
  approvalStatus: ApprovalStatus
  dateRange: DateRangeFilter
  customFrom: string
  customTo: string
  poNumber: string
  currency: string
}

// ─── Paginated result ─────────────────────────────────────────────────────────

export interface PaginatedInvoices {
  data: InvoiceRow[]
  total: number
}
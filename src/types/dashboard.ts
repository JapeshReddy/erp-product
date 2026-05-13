// ─── KPI ──────────────────────────────────────────────────────────────────────

export interface KpiData {
  totalInvoices: number
  pendingApprovals: number
  overdueApprovals: number
  approvedInvoices: number
  rejectedInvoices: number
  totalInvoiceValue: number
  activeUsers: number
  failedLoginAttempts: number
  lockedUsers: number
  emailFailures: number
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface InvoiceHeader {
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

// ─── Approval Log ─────────────────────────────────────────────────────────────

export interface InvoiceApprovalLog {
  id: string
  created_at: string
  created_by: string | null
  invoice_id: string
  approver_email: string | null
  status: string | null
  client_id: string
}

// ─── Change Log ───────────────────────────────────────────────────────────────

export interface InvoiceChangeLog {
  id: string
  invoice_id: string
  field_name: string | null
  previous_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: string
  item_no: string | null
  client_id: string
}

// ─── Client User ──────────────────────────────────────────────────────────────

export interface ClientUser {
  id: string
  user_id: string
  client_id: string
  role: string | null
  is_active: boolean
  approved_at: string | null
  created_at: string
  last_login_at: string | null
  last_login_ip: string | null
  failed_login_attempts: number
  locked_until: string | null
  password_changed_at: string | null
}

// ─── Access Request ───────────────────────────────────────────────────────────

export interface AccessRequest {
  id: string
  user_id: string | null
  client_id: string
  assigned_role: string | null
  requested_email: string
  status: string
  created_at: string
  updated_at: string
}

// ─── Email Log ────────────────────────────────────────────────────────────────

export interface EmailLog {
  id: string
  client_id: string
  recipient_email: string
  email_type: string | null
  status: string | null
  error_message: string | null
  sent_at: string | null
  created_at: string
}

// ─── Approval Queue Row (joined) ──────────────────────────────────────────────

export interface ApprovalQueueRow {
  id: string
  vendor: string | null
  total_amount: number | null
  currency: string | null
  created_by: string | null
  approval_status: string | null
  invoice_date: string | null
  approver_email: string | null
  submitted_at: string | null
}

// ─── Chart Data ───────────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string
  amount: number
  count: number
}

export interface VendorSpend {
  vendor: string
  total: number
}

export interface ApprovalDistribution {
  status: string
  count: number
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string
  type: 'approval' | 'change' | 'access'
  description: string
  actor: string
  timestamp: string
}

// ─── Security ─────────────────────────────────────────────────────────────────

export interface SecurityAlert {
  user_id: string
  last_login_ip: string | null
  failed_login_attempts: number
  locked_until: string | null
  last_login_at: string | null
}

// ─── User Role Distribution ───────────────────────────────────────────────────

export interface RoleCount {
  role: string
  count: number
}
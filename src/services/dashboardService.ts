import { supabase } from '@/lib/supabase'
import type {
  KpiData,
  ApprovalQueueRow,
  TrendPoint,
  VendorSpend,
  ApprovalDistribution,
  ActivityItem,
  SecurityAlert,
  RoleCount,
  EmailLog,
} from '@/types/dashboard'

// ─── KPI Queries ──────────────────────────────────────────────────────────────

export async function fetchKpis(clientId: string): Promise<KpiData> {
  const [
    invoicesRes,
    pendingRes,
    approvedRes,
    rejectedRes,
    valueRes,
    usersRes,
    securityRes,
    emailRes,
  ] = await Promise.all([
    supabase.schema('product').from('invoice_header').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    supabase.schema('product').from('invoice_header').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('approval_status', 'PENDING'),
    supabase.schema('product').from('invoice_header').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('approval_status', 'APPROVED'),
    supabase.schema('product').from('invoice_header').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('approval_status', 'REJECTED'),
    supabase.schema('product').from('invoice_header').select('total_amount').eq('client_id', clientId),
    supabase.schema('product').from('client_users').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('is_active', true),
    supabase.schema('product').from('client_users').select('failed_login_attempts, locked_until').eq('client_id', clientId),
    supabase.schema('product').from('email_logs').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'FAILED'),
  ])

  // want to log data of securityRes to debug why it's empty

  console.log(`securityRes:`, securityRes.data);
  console.log(`securityRes count: ${securityRes.data?.length}`);
  

  console.log(`invoiceRes: ${invoicesRes.count}`);
  console.log(`pendingRes: ${pendingRes.count}`);
  console.log(`approvedRes: ${approvedRes.count}`);
  console.log(`rejectedRes: ${rejectedRes.count}`);
  console.log(`valueRes: ${valueRes.data?.length}`);
  console.log(`usersRes: ${usersRes.count}`);
  console.log(`securityRes: ${securityRes.data}`);
  console.log(`emailRes: ${emailRes.count}`);

  const totalValue = (valueRes.data ?? []).reduce((sum, r) => sum + (r.total_amount ?? 0), 0)
  const securityRows = securityRes.data ?? []
  const failedAttempts = securityRows.reduce((sum, r) => sum + (r.failed_login_attempts ?? 0), 0)
  const lockedUsers = securityRows.filter(r => r.locked_until && new Date(r.locked_until) > new Date()).length

  // Overdue: pending invoices older than 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const overdueRes = await supabase
    .schema('product')
    .from('invoice_header')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('approval_status', 'PENDING')
    .lt('created_at', threeDaysAgo)

  return {
    totalInvoices: invoicesRes.count ?? 0,
    pendingApprovals: pendingRes.count ?? 0,
    overdueApprovals: overdueRes.count ?? 0,
    approvedInvoices: approvedRes.count ?? 0,
    rejectedInvoices: rejectedRes.count ?? 0,
    totalInvoiceValue: totalValue,
    activeUsers: usersRes.count ?? 0,
    failedLoginAttempts: failedAttempts,
    lockedUsers,
    emailFailures: emailRes.count ?? 0,
  }
}

// ─── Approval Queue ───────────────────────────────────────────────────────────

export async function fetchApprovalQueue(
  clientId: string,
  page = 0,
  pageSize = 10
): Promise<{ data: ApprovalQueueRow[]; total: number }> {
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await supabase
    .schema('product')
    .from('invoice_header')
    .select('id, vendor, total_amount, currency, created_by, approval_status, invoice_date, created_at', { count: 'exact' })
    .eq('client_id', clientId)
    .eq('approval_status', 'PENDING')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], total: 0 }

  // Fetch latest approver email for each invoice
  const invoiceIds = (data ?? []).map(r => r.id)
  let approverMap: Record<string, string> = {}

  if (invoiceIds.length > 0) {
    const { data: logs } = await supabase
      .schema('product')
      .from('invoice_approval_logs')
      .select('invoice_id, approver_email, created_at')
      .in('invoice_id', invoiceIds)
      .order('created_at', { ascending: false })

    approverMap = (logs ?? []).reduce((acc, l) => {
      if (!acc[l.invoice_id]) acc[l.invoice_id] = l.approver_email
      return acc
    }, {} as Record<string, string>)
  }

  const rows: ApprovalQueueRow[] = (data ?? []).map(r => ({
    id: r.id,
    vendor: r.vendor,
    total_amount: r.total_amount,
    currency: r.currency,
    created_by: r.created_by,
    approval_status: r.approval_status,
    invoice_date: r.invoice_date,
    approver_email: approverMap[r.id] ?? null,
    submitted_at: r.created_at,
  }))

  return { data: rows, total: count ?? 0 }
}

// ─── Invoice Trend ────────────────────────────────────────────────────────────

export async function fetchInvoiceTrend(clientId: string): Promise<TrendPoint[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .schema('product')
    .from('invoice_header')
    .select('created_at, total_amount')
    .eq('client_id', clientId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const byDay: Record<string, { amount: number; count: number }> = {}
  data.forEach(r => {
    const day = r.created_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = { amount: 0, count: 0 }
    byDay[day].amount += r.total_amount ?? 0
    byDay[day].count += 1
  })

  return Object.entries(byDay).map(([date, v]) => ({ date, ...v }))
}

// ─── Vendor Spend ─────────────────────────────────────────────────────────────

export async function fetchVendorSpend(clientId: string): Promise<VendorSpend[]> {
  const { data, error } = await supabase
    .schema('product')
    .from('invoice_header')
    .select('vendor, total_amount')
    .eq('client_id', clientId)
    .not('vendor', 'is', null)

  if (error || !data) return []

  const byVendor: Record<string, number> = {}
  data.forEach(r => {
    if (r.vendor) {
      byVendor[r.vendor] = (byVendor[r.vendor] ?? 0) + (r.total_amount ?? 0)
    }
  })

  return Object.entries(byVendor)
    .map(([vendor, total]) => ({ vendor, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

// ─── Approval Distribution ────────────────────────────────────────────────────

export async function fetchApprovalDistribution(clientId: string): Promise<ApprovalDistribution[]> {
  const { data, error } = await supabase
    .schema('product')
    .from('invoice_header')
    .select('approval_status')
    .eq('client_id', clientId)

  if (error || !data) return []

  const counts: Record<string, number> = {}
  data.forEach(r => {
    const s = r.approval_status ?? 'UNKNOWN'
    counts[s] = (counts[s] ?? 0) + 1
  })

  return Object.entries(counts).map(([status, count]) => ({ status, count }))
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

export async function fetchRecentActivity(clientId: string): Promise<ActivityItem[]> {
  const [approvalRes, changeRes, accessRes] = await Promise.all([
    supabase
      .schema('product')
      .from('invoice_approval_logs')
      .select('id, created_at, invoice_id, approver_email, status')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .schema('product')
      .from('invoice_change_logs')
      .select('id, changed_at, invoice_id, field_name, previous_value, new_value, changed_by')
      .eq('client_id', clientId)
      .order('changed_at', { ascending: false })
      .limit(5),
    supabase
      .schema('product')
      .from('access_requests')
      .select('id, created_at, requested_email, status, assigned_role')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const items: ActivityItem[] = []

  ;(approvalRes.data ?? []).forEach(r => {
    items.push({
      id: r.id,
      type: 'approval',
      description: `Invoice ${r.invoice_id.slice(0, 8)} ${r.status?.toLowerCase() ?? 'updated'}`,
      actor: r.approver_email ?? 'System',
      timestamp: r.created_at,
    })
  })

  ;(changeRes.data ?? []).forEach(r => {
    items.push({
      id: r.id,
      type: 'change',
      description: `${r.field_name ?? 'Field'} changed from "${r.previous_value}" → "${r.new_value}"`,
      actor: r.changed_by ?? 'System',
      timestamp: r.changed_at,
    })
  })

  ;(accessRes.data ?? []).forEach(r => {
    items.push({
      id: r.id,
      type: 'access',
      description: `Access request ${r.status?.toLowerCase()} for ${r.requested_email}`,
      actor: r.requested_email,
      timestamp: r.created_at,
    })
  })

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12)
}

// ─── Security Data ────────────────────────────────────────────────────────────

export async function fetchSecurityAlerts(clientId: string): Promise<SecurityAlert[]> {
  const { data, error } = await supabase
    .schema('product')
    .from('client_users')
    .select('user_id, last_login_ip, failed_login_attempts, locked_until, last_login_at')
    .eq('client_id', clientId)
    .order('failed_login_attempts', { ascending: false })
    .limit(10)

    const {data: userData} = await supabase.auth.getSession()
    console.log(userData);
    

    console.log(clientId);
    console.log(`client_users ${data}`);
    

  if (error) return []
  return data as SecurityAlert[]
}

// ─── Email Logs ───────────────────────────────────────────────────────────────

export async function fetchEmailLogs(clientId: string): Promise<EmailLog[]> {
  const { data, error } = await supabase
    .schema('product')
    .from('email_logs')
    .select('id, client_id, recipient_email, email_type, status, error_message, sent_at, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return []
  return data as EmailLog[]
}

// ─── User Role Distribution ───────────────────────────────────────────────────

export async function fetchUserRoles(clientId: string): Promise<RoleCount[]> {
  const { data, error } = await supabase
    .schema('product')
    .from('client_users')
    .select('role')
    .eq('client_id', clientId)

  if (error || !data) return []

  const counts: Record<string, number> = {}
  data.forEach(r => {
    const role = r.role ?? 'UNKNOWN'
    counts[role] = (counts[role] ?? 0) + 1
  })

  return Object.entries(counts).map(([role, count]) => ({ role, count }))
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function fetchAuditLogs(clientId: string) {
  const { data, error } = await supabase
    .schema('product')
    .from('invoice_change_logs')
    .select('id, invoice_id, field_name, previous_value, new_value, changed_by, changed_at')
    .eq('client_id', clientId)
    .order('changed_at', { ascending: false })
    .limit(15)

  if (error) return []
  return data
}
import React from 'react'
import {
  FileText, Clock, CheckCircle, XCircle,
  DollarSign, Users, ShieldAlert, Mail,
} from 'lucide-react'
import KpiCard from './KpiCard'
import type { KpiData } from '@/types/dashboard'

interface KpiGridProps {
  data: KpiData | null
  isLoading: boolean
}

function formatCurrency(val: number): string {
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(1)} Cr`
  if (val >= 100_000)    return `₹${(val / 100_000).toFixed(1)} L`
  if (val >= 1_000)      return `₹${(val / 1_000).toFixed(1)}K`
  return `₹${val.toLocaleString('en-IN')}`
}

const KpiGrid: React.FC<KpiGridProps> = ({ data, isLoading }) => {
  const approvalRate = data && data.totalInvoices > 0
    ? ((data.approvedInvoices / data.totalInvoices) * 100).toFixed(1)
    : '0'

  const rejectionRate = data && data.totalInvoices > 0
    ? ((data.rejectedInvoices / data.totalInvoices) * 100).toFixed(1)
    : '0'

  return (
    <div className="kpi-grid">
      <KpiCard
        label="Total Invoices"
        value={isLoading ? '—' : (data?.totalInvoices ?? 0).toLocaleString()}
        sub="All time"
        trend="+8.2%"
        trendDir="up"
        icon={<FileText size={20} />}
        iconColor="blue"
        isLoading={isLoading}
      />
      <KpiCard
        label="Pending Approvals"
        value={isLoading ? '—' : (data?.pendingApprovals ?? 0).toLocaleString()}
        sub={`${data?.overdueApprovals ?? 0} overdue`}
        trend={data?.overdueApprovals ? `${data.overdueApprovals} overdue` : undefined}
        trendDir="warn"
        icon={<Clock size={20} />}
        iconColor="amber"
        isLoading={isLoading}
      />
      <KpiCard
        label="Approved Invoices"
        value={isLoading ? '—' : (data?.approvedInvoices ?? 0).toLocaleString()}
        sub={`${approvalRate}% approval rate`}
        trend={`${approvalRate}%`}
        trendDir="up"
        icon={<CheckCircle size={20} />}
        iconColor="green"
        isLoading={isLoading}
      />
      <KpiCard
        label="Rejected Invoices"
        value={isLoading ? '—' : (data?.rejectedInvoices ?? 0).toLocaleString()}
        sub={`${rejectionRate}% rejection rate`}
        trend={`${rejectionRate}%`}
        trendDir="down"
        icon={<XCircle size={20} />}
        iconColor="red"
        isLoading={isLoading}
      />
      <KpiCard
        label="Total Invoice Value"
        value={isLoading ? '—' : formatCurrency(data?.totalInvoiceValue ?? 0)}
        sub="Across all invoices"
        trend="+12%"
        trendDir="up"
        icon={<DollarSign size={20} />}
        iconColor="purple"
        isLoading={isLoading}
      />
      <KpiCard
        label="Active Users"
        value={isLoading ? '—' : (data?.activeUsers ?? 0).toLocaleString()}
        sub="Currently active"
        icon={<Users size={20} />}
        iconColor="teal"
        isLoading={isLoading}
      />
      <KpiCard
        label="Failed Login Attempts"
        value={isLoading ? '—' : (data?.failedLoginAttempts ?? 0).toLocaleString()}
        sub={`${data?.lockedUsers ?? 0} accounts locked`}
        trend={data?.failedLoginAttempts ? 'Alert' : undefined}
        trendDir="down"
        icon={<ShieldAlert size={20} />}
        iconColor="orange"
        isLoading={isLoading}
      />
      <KpiCard
        label="Email Failures"
        value={isLoading ? '—' : (data?.emailFailures ?? 0).toLocaleString()}
        sub="SMTP retry required"
        trend={data?.emailFailures ? 'Action needed' : undefined}
        trendDir="warn"
        icon={<Mail size={20} />}
        iconColor="pink"
        isLoading={isLoading}
      />
    </div>
  )
}

export default KpiGrid
import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { useDashboardKpis } from '@/hooks/useDashboardKpis'
import { useInvoiceCharts } from '@/hooks/useInvoiceCharts'
import {
  useRecentActivity,
  useSecurityData,
  useEmailMonitoring,
  useUserOverview,
  useAuditLogs,
} from '@/hooks/useDashboardData'
import KpiGrid from '@/components/dashboard/KpiGrid'
import ApprovalQueueTable from '@/components/dashboard/ApprovalQueueTable'
import {
  InvoiceTrendChart,
  ApprovalDonutChart,
  VendorSpendChart,
} from '@/components/dashboard/Charts'
import {
  RecentActivity,
  SecurityCenter,
  EmailMonitoring,
  UserOverview,
  AuditCompliance,
  SystemHealth,
} from '@/components/dashboard/DashboardWidgets'
import OperationsPanel from '@/components/dashboard/OperationsPanel'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const clientId = user?.client_id

  const kpis      = useDashboardKpis(clientId)
  const charts    = useInvoiceCharts(clientId)
  const activity  = useRecentActivity(clientId)
  const security  = useSecurityData(clientId)
  const email     = useEmailMonitoring(clientId)
  const userStats = useUserOverview(clientId)
  const audit     = useAuditLogs(clientId)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div>
      {/* Page Header */}
      <div className="dashboard-page-header">
        <h1>Dashboard</h1>
        <p>
          {greeting()},{' '}
          <strong>{user?.full_name ?? user?.email ?? 'User'}</strong>
          {user?.client_name ? ` · ${user.client_name}` : ''}
        </p>
      </div>

      {/* Top 70/30 layout */}
      <div className="dashboard-top-layout">
        <div className="dashboard-top-main">
          <KpiGrid data={kpis.data} isLoading={kpis.isLoading} />
        </div>
        <div className="dashboard-top-side">
          <OperationsPanel
            kpis={kpis.data}
            activity={activity.data}
            security={security.data}
          />
        </div>
      </div>

      {/* Section 2 — Approval Queue */}
      <div style={{ marginBottom: '1rem' }}>
        <ApprovalQueueTable />
      </div>

      {/* Section 3 — Charts Row */}
      <div className="dashboard-grid-3" style={{ marginBottom: '1rem' }}>
        <InvoiceTrendChart   data={charts.trend}        isLoading={charts.isLoading} />
        <ApprovalDonutChart  data={charts.distribution} isLoading={charts.isLoading} />
        <VendorSpendChart    data={charts.vendorSpend}  isLoading={charts.isLoading} />
      </div>

      {/* Section 4+5 — Activity + Security */}
      <div className="dashboard-grid-main-side" style={{ marginBottom: '1rem' }}>
        <RecentActivity data={activity.data} isLoading={activity.isLoading} />
        <SecurityCenter data={security.data} isLoading={security.isLoading} />
      </div>

      {/* Section 6+7 — Email + User Overview */}
      <div className="dashboard-grid-2" style={{ marginBottom: '1rem' }}>
        <EmailMonitoring data={email.data}     isLoading={email.isLoading} />
        <UserOverview    data={userStats.data} isLoading={userStats.isLoading} />
      </div>

      {/* Section 8 — Audit Compliance */}
      <div style={{ marginBottom: '1rem' }}>
        <AuditCompliance data={audit.data} isLoading={audit.isLoading} />
      </div>

      {/* Section 9 — System Health */}
      <SystemHealth />
    </div>
  )
}

export default DashboardPage
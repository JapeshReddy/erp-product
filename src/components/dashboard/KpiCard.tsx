import React from 'react'
import { Spinner, SectionCard, EmptyState } from '@/components/ui/DashboardPrimitives'

type IconColor = 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'teal' | 'orange' | 'pink'
type TrendDir = 'up' | 'down' | 'warn'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: string
  trendDir?: TrendDir
  icon: React.ReactNode
  iconColor?: IconColor
  isLoading?: boolean
}

const KpiCard: React.FC<KpiCardProps> = ({
  label, value, sub, trend, trendDir = 'up', icon, iconColor = 'blue', isLoading = false,
}) => (
  <div className="kpi-card">
    <div className="kpi-header">
      <div className={`kpi-icon icon-${iconColor}`}>{icon}</div>
      {trend && (
        <span className={`kpi-trend trend-${trendDir}`}>
          {trendDir === 'up' ? '↑' : trendDir === 'down' ? '↓' : '⚠'} {trend}
        </span>
      )}
    </div>
    {isLoading ? (
      <Spinner size="md" className="mt-2" />
    ) : (
      <>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </>
    )}
  </div>
)

export default KpiCard
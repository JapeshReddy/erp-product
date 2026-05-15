import React from 'react'
import { KpiCardSkeleton } from '@/components/ui/SkeletonLoader'
import { AnimatedValue } from '@/components/ui/AnimatedCounter'

type IconColor = 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'teal' | 'orange' | 'pink'
type TrendDir  = 'up' | 'down' | 'warn'

interface KpiCardProps {
  label:       string
  value:       string | number
  sub?:        string
  trend?:      string
  trendDir?:   TrendDir
  icon:        React.ReactNode
  iconColor?:  IconColor
  isLoading?:  boolean
}

const trendSymbol: Record<TrendDir, string> = {
  up:   '↑',
  down: '↓',
  warn: '⚠',
}

const KpiCard: React.FC<KpiCardProps> = ({
  label, value, sub, trend, trendDir = 'up', icon, iconColor = 'blue', isLoading = false,
}) => {
  if (isLoading) return <KpiCardSkeleton />

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <div className={`kpi-icon icon-${iconColor}`}>{icon}</div>
        {trend && (
          <span className={`kpi-trend trend-${trendDir}`}>
            {trendSymbol[trendDir]} {trend}
          </span>
        )}
      </div>
      <div
        className="kpi-value"
        style={{ animation: 'erp-count-up 0.3s ease both' }}
      >
        <AnimatedValue value={value} />
      </div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default KpiCard

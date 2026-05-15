import React from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
  style?: React.CSSProperties
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = '',
  style,
}) => (
  <div
    className={`erp-skeleton ${className}`}
    style={{ width, height, borderRadius, ...style }}
    aria-hidden="true"
  />
)

// ─── KPI Card Skeleton ────────────────────────────────────────────────────────

export const KpiCardSkeleton: React.FC = () => (
  <div className="kpi-card" aria-busy="true" aria-label="Loading metric">
    <div className="kpi-header">
      <Skeleton width={36} height={36} borderRadius={8} />
      <Skeleton width={52} height={20} borderRadius={99} />
    </div>
    <div style={{ marginTop: '0.75rem' }}>
      <Skeleton width="65%" height={28} borderRadius={6} style={{ marginBottom: '0.4rem' }} />
      <Skeleton width="50%" height={11} borderRadius={3} style={{ marginBottom: '0.25rem' }} />
      <Skeleton width="40%" height={10} borderRadius={3} />
    </div>
  </div>
)

// ─── Section Card Skeleton ────────────────────────────────────────────────────

interface SectionCardSkeletonProps {
  rows?: number
  showHeader?: boolean
}

export const SectionCardSkeleton: React.FC<SectionCardSkeletonProps> = ({
  rows = 4,
  showHeader = true,
}) => (
  <div className="erp-section-card" aria-busy="true">
    {showHeader && (
      <div className="section-card-header" style={{ paddingBottom: '1rem' }}>
        <div>
          <Skeleton width={140} height={16} borderRadius={4} style={{ marginBottom: '0.4rem' }} />
          <Skeleton width={90} height={11} borderRadius={3} />
        </div>
      </div>
    )}
    <div className="section-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <div style={{ flex: 1 }}>
            <Skeleton width="70%" height={13} borderRadius={4} style={{ marginBottom: '0.3rem' }} />
            <Skeleton width="45%" height={10} borderRadius={3} />
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ─── Table Row Skeletons ──────────────────────────────────────────────────────

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export const TableRowSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 9,
}) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} aria-hidden="true">
        {Array.from({ length: columns }).map((_, j) => (
          <td key={j} style={{ padding: '0.875rem 1rem' }}>
            <Skeleton
              height={13}
              width={j === 0 ? 70 : j === 2 ? '80%' : j === 4 ? 90 : '60%'}
              borderRadius={4}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
)

// ─── Chart Skeleton ───────────────────────────────────────────────────────────

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 220 }) => (
  <div
    className="chart-container"
    style={{ minHeight: height, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 0 0.5rem' }}
    aria-hidden="true"
  >
    {[60, 80, 45, 90, 70, 55, 85, 40, 75, 65, 88, 50].map((h, i) => (
      <Skeleton
        key={i}
        width="100%"
        height={`${h}%`}
        borderRadius="4px 4px 0 0"
        style={{ flex: 1 }}
      />
    ))}
  </div>
)

// ─── Avatar Skeleton ──────────────────────────────────────────────────────────

export const AvatarSkeleton: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Skeleton width={size} height={size} borderRadius="50%" />
)

export default Skeleton

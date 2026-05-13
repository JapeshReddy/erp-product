import React from 'react'
import { FileText, GitCommit, Key, ShieldAlert, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { SectionCard, EmptyState, Spinner } from '@/components/ui/DashboardPrimitives'
import Badge, { statusToBadge } from '@/components/ui/Badge'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { ActivityItem, SecurityAlert, EmailLog, RoleCount } from '@/types/dashboard'
import { useTheme } from '@/context/ThemeContext'

// ─── Recent Activity ──────────────────────────────────────────────────────────

interface RecentActivityProps {
  data: ActivityItem[]
  isLoading: boolean
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ data, isLoading }) => {
  const dotClass = (type: ActivityItem['type']) =>
    type === 'approval' ? 'dot-approval' : type === 'change' ? 'dot-change' : 'dot-access'

  const iconFor = (type: ActivityItem['type']) => {
    if (type === 'approval') return <FileText size={12} />
    if (type === 'change')   return <GitCommit size={12} />
    return <Key size={12} />
  }

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <SectionCard title="Recent Activity" subtitle="Live workflow updates">
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState title="No recent activity" message="Activity will appear here." />
      ) : (
        <div className="activity-feed">
          {data.map(item => (
            <div key={item.id} className="activity-item">
              <div className={`activity-dot ${dotClass(item.type)}`} />
              <div className="activity-content">
                <div className="activity-desc">{item.description}</div>
                <div className="activity-meta">
                  {item.actor} · {formatTime(item.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Security Center ──────────────────────────────────────────────────────────

interface SecurityCenterProps {
  data: SecurityAlert[]
  isLoading: boolean
}

export const SecurityCenter: React.FC<SecurityCenterProps> = ({ data, isLoading }) => {
  const locked = data.filter(d => d.locked_until && new Date(d.locked_until) > new Date())

  return (
    <SectionCard
      title="Security Center"
      subtitle={`${locked.length} accounts locked`}
      action={locked.length > 0 ? <Badge label={`${locked.length} locked`} variant="danger" dot /> : undefined}
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState title="No security alerts" message="All accounts are healthy." />
      ) : (
        <div>
          {data.slice(0, 6).map((alert, i) => (
            <div key={i} className="security-alert-row">
              <div className="security-icon"><ShieldAlert size={16} /></div>
              <div className="security-info">
                <div className="security-ip">{alert.last_login_ip ?? 'Unknown IP'}</div>
                <div className="security-attempts">
                  {alert.failed_login_attempts} failed attempt{alert.failed_login_attempts !== 1 ? 's' : ''}
                  {alert.locked_until && new Date(alert.locked_until) > new Date()
                    ? ' · Locked'
                    : ''}
                </div>
              </div>
              <Badge
                label={alert.locked_until && new Date(alert.locked_until) > new Date() ? 'Locked' : 'Alert'}
                variant={alert.locked_until ? 'danger' : 'warning'}
              />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Email Monitoring ─────────────────────────────────────────────────────────

interface EmailMonitoringProps {
  data: EmailLog[]
  isLoading: boolean
}

export const EmailMonitoring: React.FC<EmailMonitoringProps> = ({ data, isLoading }) => {
  const sent   = data.filter(d => d.status === 'SENT').length
  const failed = data.filter(d => d.status === 'FAILED').length

  return (
    <SectionCard
      title="Email Monitoring"
      subtitle={`${sent} sent · ${failed} failed`}
      action={failed > 0 ? <Badge label={`${failed} failed`} variant="danger" dot /> : undefined}
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState title="No email logs" message="Email activity will appear here." />
      ) : (
        <div>
          {data.slice(0, 6).map(log => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0', borderBottom: '1px solid var(--erp-border)',
            }}>
              <div style={{ flexShrink: 0 }}>
                {log.status === 'SENT'
                  ? <CheckCircle size={16} color="var(--erp-success)" />
                  : <XCircle size={16} color="var(--erp-danger)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--erp-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.recipient_email}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--erp-text-muted)' }}>
                  {log.email_type ?? 'Email'} · {log.sent_at ? new Date(log.sent_at).toLocaleDateString() : '—'}
                </div>
              </div>
              <Badge label={log.status ?? 'Unknown'} variant={statusToBadge(log.status)} />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── User Overview ────────────────────────────────────────────────────────────

const ROLE_COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626']

interface UserOverviewProps {
  data: RoleCount[]
  isLoading: boolean
}

export const UserOverview: React.FC<UserOverviewProps> = ({ data, isLoading }) => {
  const { isDark } = useTheme()
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <SectionCard title="User Overview" subtitle={`${total} total users`}>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState title="No user data" message="Users will appear here." />
      ) : (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="role" cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: isDark ? '#1E293B' : '#fff',
                  border: `1px solid ${isDark ? '#1F2937' : '#E2E8F0'}`,
                  borderRadius: 8, fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1 }}>
            {data.map((d, i) => (
              <div key={d.role} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[i % ROLE_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--erp-text-primary)', flex: 1 }}>{d.role}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--erp-text-primary)' }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Audit Compliance ─────────────────────────────────────────────────────────

interface AuditComplianceProps {
  data: any[]
  isLoading: boolean
}

export const AuditCompliance: React.FC<AuditComplianceProps> = ({ data, isLoading }) => (
  <SectionCard title="Audit & Compliance" subtitle="Invoice change history">
    {isLoading ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner /></div>
    ) : data.length === 0 ? (
      <EmptyState title="No audit logs" message="Changes will appear here." />
    ) : (
      <div className="activity-feed">
        {data.slice(0, 8).map((log: any) => (
          <div key={log.id} className="activity-item">
            <div className="activity-dot dot-change" />
            <div className="activity-content">
              <div className="activity-desc">
                <span style={{ fontWeight: 500 }}>{log.field_name ?? 'Field'}</span>
                {' '}changed: "{log.previous_value ?? '—'}" → "{log.new_value ?? '—'}"
              </div>
              <div className="activity-meta">
                {log.changed_by ?? 'System'} · {new Date(log.changed_at).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </SectionCard>
)

// ─── System Health ────────────────────────────────────────────────────────────

const HEALTH_ITEMS = [
  { label: 'Database',        status: 'ok',   desc: 'Healthy' },
  { label: 'SMTP',            status: 'ok',   desc: 'Healthy' },
  { label: 'Storage',         status: 'ok',   desc: 'Healthy' },
  { label: 'Approval Engine', status: 'ok',   desc: 'Healthy' },
  { label: 'Email Queue',     status: 'warn', desc: 'Delayed' },
]

export const SystemHealth: React.FC = () => (
  <SectionCard title="System Health" subtitle="Platform operational status">
    <div className="health-grid">
      {HEALTH_ITEMS.map(item => (
        <div key={item.label} className="health-card">
          <div className={`health-indicator health-${item.status}`} />
          <div className="health-label">{item.label}</div>
          <div className="health-status">{item.desc}</div>
        </div>
      ))}
    </div>
  </SectionCard>
)
import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, ShieldAlert, Lock, Upload,
  UserPlus, CheckSquare, Download, ArrowRight,
  FileText, GitCommit, Key, AlertTriangle,
} from 'lucide-react'
import type { KpiData, ActivityItem, SecurityAlert } from '@/types/dashboard'

interface OperationsPanelProps {
  kpis: KpiData | null
  activity: ActivityItem[]
  security: SecurityAlert[]
}

const OperationsPanel: React.FC<OperationsPanelProps> = ({ kpis, activity, security }) => {
    const navigate = useNavigate()
  const locked = security.filter(s => s.locked_until && new Date(s.locked_until) > new Date())

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const activityIcon = (type: ActivityItem['type']) => {
    if (type === 'approval') return <FileText size={12} />
    if (type === 'change')   return <GitCommit size={12} />
    return <Key size={12} />
  }

  const activityDot = (type: ActivityItem['type']) =>
    type === 'approval' ? '#16A34A' : type === 'change' ? '#D97706' : '#2563EB'

  return (
    <div className="ops-panel">

      {/* Pending Actions */}
      <div className="ops-section">
        <div className="ops-section-title">
          <Clock size={13} /> Pending Actions
        </div>
        <div className="ops-item ops-item-warn">
          <span className="ops-item-label">Awaiting Approval</span>
          <span className="ops-item-value">{kpis?.pendingApprovals ?? 0}</span>
        </div>
        <div className="ops-item ops-item-danger">
          <span className="ops-item-label">Overdue</span>
          <span className="ops-item-value">{kpis?.overdueApprovals ?? 0}</span>
        </div>
        <div className="ops-item">
          <span className="ops-item-label">Email Failures</span>
          <span className="ops-item-value ops-danger">{kpis?.emailFailures ?? 0}</span>
        </div>
      </div>

      {/* Security Alerts */}
      <div className="ops-section">
        <div className="ops-section-title">
          <ShieldAlert size={13} /> Security Alerts
        </div>
        {kpis?.failedLoginAttempts ? (
          <div className="ops-alert">
            <AlertTriangle size={13} />
            <span>{kpis.failedLoginAttempts} failed login attempt{kpis.failedLoginAttempts !== 1 ? 's' : ''}</span>
          </div>
        ) : null}
        {locked.length > 0 ? (
          <div className="ops-alert ops-alert-danger">
            <Lock size={13} />
            <span>{locked.length} account{locked.length !== 1 ? 's' : ''} locked</span>
          </div>
        ) : (
          <div className="ops-alert ops-alert-ok">
            <span>No active security alerts</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="ops-section">
        <div className="ops-section-title">
          <ArrowRight size={13} /> Quick Actions
        </div>
        <div className="ops-actions-grid">
          <button className="ops-action-btn" onClick={() => navigate('/invoices/upload')}>
            <Upload size={14} />
            <span>Upload Invoice</span>
          </button>
          <button className="ops-action-btn" onClick={() => navigate('/users')}>
            <UserPlus size={14} />
            <span>Add User</span>
          </button>
          <button className="ops-action-btn" onClick={() => navigate('/approvals/queue')}>
            <CheckSquare size={14} />
            <span>Approval Queue</span>
          </button>
          <button className="ops-action-btn" onClick={() => navigate('/reports/invoices')}>
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="ops-section ops-section-last">
        <div className="ops-section-title">
          <FileText size={13} /> Recent Activity
        </div>
        {activity.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--erp-text-muted)', margin: 0 }}>No recent activity</p>
        ) : (
          <div className="ops-activity">
            {activity.slice(0, 6).map(item => (
              <div key={item.id} className="ops-activity-item">
                <div className="ops-activity-dot" style={{ background: activityDot(item.type) }} />
                <div className="ops-activity-content">
                  <div className="ops-activity-desc">{item.description}</div>
                  <div className="ops-activity-meta">{item.actor} · {formatTime(item.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default OperationsPanel
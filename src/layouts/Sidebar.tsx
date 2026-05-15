import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, FileText, CheckSquare, Users, Mail,
  Shield, ClipboardList, BarChart2, Settings, ChevronRight,
  Clock, XCircle, List, Key, AlertTriangle, Activity,
  TrendingUp, Building2, Upload,
} from 'lucide-react'

interface NavItem {
  label:    string
  icon:     React.ReactNode
  path?:    string
  badge?:   number
  children?: NavItem[]
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
    ],
  },
  {
    group: 'Invoices',
    items: [
      {
        label: 'Invoices', icon: <FileText size={18} />, children: [
          { label: 'All Invoices',      icon: <List size={16} />,      path: '/invoices' },
          { label: 'Upload Invoice',    icon: <Upload size={16} />,    path: '/invoices/upload' },
          { label: 'Pending Approvals', icon: <Clock size={16} />,     path: '/invoices/pending' },
          { label: 'Rejected',          icon: <XCircle size={16} />,   path: '/invoices/rejected' },
        ],
      },
      {
        label: 'Approvals', icon: <CheckSquare size={18} />, children: [
          { label: 'Approval Queue',   icon: <List size={16} />,          path: '/approvals/queue' },
          { label: 'Approval History', icon: <ClipboardList size={16} />, path: '/approvals/history' },
        ],
      },
    ],
  },
  {
    group: 'People',
    items: [
      {
        label: 'Users', icon: <Users size={18} />, children: [
          { label: 'All Users',           icon: <Users size={16} />,  path: '/users' },
          { label: 'Access Requests',     icon: <Key size={16} />,    path: '/users/requests' },
          { label: 'Roles & Permissions', icon: <Shield size={16} />, path: '/users/roles' },
        ],
      },
    ],
  },
  {
    group: 'Communications',
    items: [
      {
        label: 'Emails', icon: <Mail size={18} />, children: [
          { label: 'SMTP Settings', icon: <Settings size={16} />, path: '/emails/smtp' },
          { label: 'Email Logs',    icon: <List size={16} />,     path: '/emails/logs' },
        ],
      },
    ],
  },
  {
    group: 'Security & Audit',
    items: [
      {
        label: 'Security', icon: <Shield size={18} />, children: [
          { label: 'Failed Logins',   icon: <AlertTriangle size={16} />, path: '/security/logins' },
          { label: 'Active Sessions', icon: <Activity size={16} />,      path: '/security/sessions' },
          { label: 'Locked Users',    icon: <XCircle size={16} />,       path: '/security/locked' },
        ],
      },
      {
        label: 'Audit', icon: <ClipboardList size={18} />, children: [
          { label: 'Audit Logs',      icon: <ClipboardList size={16} />, path: '/audit' },
          { label: 'Invoice Changes', icon: <FileText size={16} />,      path: '/audit/changes' },
        ],
      },
    ],
  },
  {
    group: 'Analytics',
    items: [
      {
        label: 'Reports', icon: <BarChart2 size={18} />, children: [
          { label: 'Invoice Analytics', icon: <TrendingUp size={16} />,  path: '/reports/invoices' },
          { label: 'Vendor Analytics',  icon: <BarChart2 size={16} />,   path: '/reports/vendors' },
          { label: 'Approval Reports',  icon: <CheckSquare size={16} />, path: '/reports/approvals' },
        ],
      },
    ],
  },
  {
    group: 'Configuration',
    items: [
      {
        label: 'Settings', icon: <Settings size={18} />, children: [
          { label: 'Client Settings', icon: <Building2 size={16} />, path: '/settings/client' },
          { label: 'Preferences',     icon: <Settings size={16} />,  path: '/settings/preferences' },
        ],
      },
    ],
  },
]

interface SidebarProps {
  collapsed:     boolean
  mobileOpen:    boolean
  onCloseMobile: () => void
  activePath:    string
  onNavigate:    (path: string) => void
  onExpand:      () => void
}

// pointer-events: none during hidden/exit so animating-out submenus don't block clicks
const subMenuVariants = {
  hidden: {
    opacity: 0,
    height: 0,
    overflow: 'hidden' as const,
    pointerEvents: 'none' as const,
  },
  visible: {
    opacity: 1,
    height: 'auto',
    overflow: 'hidden' as const,
    pointerEvents: 'auto' as const,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    height: 0,
    overflow: 'hidden' as const,
    pointerEvents: 'none' as const,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed, mobileOpen, onCloseMobile, activePath, onNavigate, onExpand,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Invoices: true,
  })

  const toggleGroup = (label: string) => {
    if (collapsed) {
      // Expand sidebar first so the group submenu becomes accessible
      onExpand()
      setOpenGroups(prev => ({ ...prev, [label]: true }))
      return
    }
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const renderItem = (item: NavItem, depth = 0): React.ReactNode => {
    const hasChildren = Boolean(item.children?.length)
    const isOpen      = openGroups[item.label]
    const isActive    = item.path === activePath

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            className={`sidebar-nav-item ${depth > 0 ? 'sidebar-sub-item' : ''}`}
            onClick={() => toggleGroup(item.label)}
            // Native tooltip shown in collapsed mode on hover (desktop) and
            // used by screen readers in both modes
            title={item.label}
            aria-expanded={collapsed ? undefined : isOpen}
            aria-haspopup="true"
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>

            {/* Conditionally render text content — avoids inline-style/CSS specificity fights */}
            {!collapsed && (
              <>
                <span className="sidebar-label">{item.label}</span>
                <motion.span
                  className="sidebar-chevron"
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  aria-hidden="true"
                >
                  <ChevronRight size={14} />
                </motion.span>
              </>
            )}
          </button>

          <AnimatePresence initial={false}>
            {isOpen && !collapsed && (
              <motion.div
                key={`${item.label}-children`}
                variants={subMenuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {item.children!.map(child => renderItem(child, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    return (
      <button
        key={item.label}
        className={`sidebar-nav-item ${depth > 0 ? 'sidebar-sub-item' : ''} ${isActive ? 'active' : ''}`}
        onClick={() => { onNavigate(item.path ?? '/'); onCloseMobile() }}
        title={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>

        {!collapsed && (
          <>
            <span className="sidebar-label">{item.label}</span>
            {item.badge != null && (
              <span className="sidebar-badge" aria-label={`${item.badge} items`}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    )
  }

  return (
    <aside
      className={`erp-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">
          <FileText size={16} />
        </div>
        {/* Conditionally render text to avoid CSS/inline-style conflicts */}
        {!collapsed && <span className="sidebar-logo-text">InvoiceERP</span>}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" aria-label="App navigation">
        {NAV_GROUPS.map(({ group, items }) => (
          <div key={group} className="sidebar-group">
            {/* Group labels only shown when expanded */}
            {!collapsed && (
              <div className="sidebar-group-label" aria-hidden="true">{group}</div>
            )}
            {items.map(item => renderItem(item))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar

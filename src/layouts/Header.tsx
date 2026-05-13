import React, { useState } from 'react'
import {
  Menu, Search, Bell, Maximize2, Minimize2,
  Sun, Moon, ChevronDown, LogOut, Settings,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { clearSession } from '@/services/authService'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  sidebarCollapsed: boolean
  sidebarHidden: boolean
  onToggleSidebar: () => void
}

const Header: React.FC<HeaderProps> = ({
  sidebarCollapsed, sidebarHidden, onToggleSidebar,
}) => {
  const { isDark, toggleTheme } = useTheme()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    setUser(null)
    navigate('/signin')
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  const headerClass = [
    'erp-header',
    sidebarCollapsed ? 'sidebar-collapsed' : '',
    sidebarHidden    ? 'sidebar-hidden'    : '',
  ].filter(Boolean).join(' ')

  return (
    <header className={headerClass}>
      {/* Sidebar toggle */}
      <button className="header-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="header-search">
        <Search size={14} className="search-icon" />
        <input type="search" placeholder="Search invoices, vendors, users…" />
      </div>

      <div className="header-spacer" />

      <div className="header-actions">
        {/* Theme toggle */}
        <button className="header-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Fullscreen */}
        <button className="header-btn" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {/* Notifications */}
        <button className="header-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notif-badge" />
        </button>

        <div className="header-divider" />

        {/* Profile */}
        <div className="header-profile" onClick={() => setShowProfile(v => !v)} style={{ position: 'relative' }}>
          <div className="profile-avatar">{initials}</div>
          <div className="profile-info">
            <div className="profile-name">{user?.full_name ?? user?.email ?? 'User'}</div>
            <div className="profile-role">{user?.role ?? 'Member'}</div>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--erp-text-muted)', marginLeft: 2 }} />

          {showProfile && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              background: 'var(--erp-surface)',
              border: '1px solid var(--erp-border)',
              borderRadius: 'var(--erp-radius)',
              boxShadow: 'var(--erp-shadow-md)',
              minWidth: 180,
              zIndex: 200,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => navigate('/settings/preferences')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '0.625rem 1rem',
                  background: 'none', border: 'none',
                  color: 'var(--erp-text-primary)', fontSize: '0.8125rem',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <Settings size={15} /> Preferences
              </button>
              <div style={{ height: 1, background: 'var(--erp-border)' }} />
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '0.625rem 1rem',
                  background: 'none', border: 'none',
                  color: 'var(--erp-danger)', fontSize: '0.8125rem',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
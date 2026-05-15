import React, { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Menu, Search, Bell, Maximize2, Minimize2,
  Sun, Moon, ChevronDown, LogOut, Settings, X,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  sidebarCollapsed: boolean
  sidebarHidden:    boolean
  onToggleSidebar:  () => void
}

const SEARCH_DEBOUNCE_MS = 300

const dropdownVariants = {
  hidden:  { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1 },
  exit:    { opacity: 0, y: -4, scale: 0.98 },
}

const dropdownTransition = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
}

const Header: React.FC<HeaderProps> = ({
  sidebarCollapsed, sidebarHidden, onToggleSidebar,
}) => {
  const { isDark, toggleTheme } = useTheme()
  const { user, logout }        = useAuth()
  const navigate                = useNavigate()

  const [isFullscreen,  setIsFullscreen]  = useState(false)
  const [showProfile,   setShowProfile]   = useState(false)
  const [searchValue,   setSearchValue]   = useState('')

  const profileRef    = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!showProfile) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProfile])

  // Close profile dropdown on ESC
  useEffect(() => {
    if (!showProfile) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowProfile(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showProfile])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleLogout = () => logout()

  // Debounced search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchValue(val)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      // Global search hook-point — emit event or call global search here
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  const clearSearch = () => {
    setSearchValue('')
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
  }

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
  }, [])

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  const headerClass = [
    'erp-header',
    sidebarCollapsed ? 'sidebar-collapsed' : '',
    sidebarHidden    ? 'sidebar-hidden'    : '',
  ].filter(Boolean).join(' ')

  return (
    <header className={headerClass} role="banner">

      {/* Sidebar toggle */}
      <button
        className="header-toggle"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        aria-expanded={!sidebarCollapsed}
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div
        className="header-search"
        style={{ position: 'relative' }}
        role="search"
      >
        <Search size={14} className="search-icon" aria-hidden="true" />
        <input
          type="search"
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search invoices, vendors, users…"
          aria-label="Global search"
          autoComplete="off"
          style={{
            paddingRight: searchValue ? '2rem' : undefined,
            transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
          }}
        />
        <AnimatePresence>
          {searchValue && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              onClick={clearSearch}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--erp-text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <X size={13} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="header-spacer" />

      <div className="header-actions">

        {/* Theme toggle */}
        <button
          className="header-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? 'sun' : 'moon'}
              initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0,   scale: 1 }}
              exit={{    opacity: 0, rotate:  30,  scale: 0.8 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex' }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Fullscreen */}
        <button
          className="header-btn"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {/* Notifications */}
        <button className="header-btn" aria-label="Notifications" title="Notifications">
          <Bell size={18} />
          <span className="notif-badge" aria-hidden="true" />
        </button>

        <div className="header-divider" aria-hidden="true" />

        {/* Profile */}
        <div
          ref={profileRef}
          className="header-profile"
          onClick={() => setShowProfile(v => !v)}
          style={{ position: 'relative' }}
          role="button"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={showProfile}
          aria-label="User menu"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfile(v => !v) } }}
        >
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div className="profile-info">
            <div className="profile-name">{user?.full_name ?? user?.email ?? 'User'}</div>
            <div className="profile-role">{user?.role ?? 'Member'}</div>
          </div>
          <motion.span
            animate={{ rotate: showProfile ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', color: 'var(--erp-text-muted)', marginLeft: 2 }}
            aria-hidden="true"
          >
            <ChevronDown size={14} />
          </motion.span>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={dropdownTransition}
                style={{
                  position:    'absolute',
                  top:         'calc(100% + 8px)',
                  right:       0,
                  background:  'var(--erp-surface)',
                  border:      '1px solid var(--erp-border)',
                  borderRadius:'var(--erp-radius)',
                  boxShadow:   'var(--erp-shadow-lg)',
                  minWidth:    186,
                  zIndex:      'var(--erp-z-dropdown, 200)' as unknown as number,
                  overflow:    'hidden',
                  transformOrigin: 'top right',
                }}
                role="menu"
                onClick={e => e.stopPropagation()}
              >
                {/* User info header */}
                <div style={{
                  padding: '0.75rem 1rem 0.625rem',
                  borderBottom: '1px solid var(--erp-border)',
                }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--erp-text-primary)', marginBottom: 2 }}>
                    {user?.full_name ?? 'User'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--erp-text-muted)' }}>
                    {user?.email}
                  </div>
                </div>

                <button
                  role="menuitem"
                  onClick={() => { navigate('/settings/preferences'); setShowProfile(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '0.5625rem 1rem',
                    background: 'none', border: 'none',
                    color: 'var(--erp-text-primary)', fontSize: '0.8125rem',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--erp-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Settings size={15} aria-hidden="true" /> Preferences
                </button>

                <div style={{ height: 1, background: 'var(--erp-border)' }} role="separator" />

                <button
                  role="menuitem"
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '0.5625rem 1rem',
                    background: 'none', border: 'none',
                    color: 'var(--erp-danger)', fontSize: '0.8125rem',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={15} aria-hidden="true" /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export default Header

import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

type SidebarState = 'expanded' | 'collapsed' | 'hidden'

const AppLayout: React.FC = () => {
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(v => !v)
    } else {
      setSidebarState(s =>
        s === 'expanded' ? 'collapsed' :
        s === 'collapsed' ? 'expanded' : 'expanded'
      )
    }
  }

  const mainClass = [
    'erp-main',
    sidebarState === 'collapsed' ? 'sidebar-collapsed' : '',
    sidebarState === 'hidden'    ? 'sidebar-hidden'    : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="erp-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        collapsed={sidebarState === 'collapsed'}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        activePath={location.pathname}
        onNavigate={navigate}
      />

      <Header
        sidebarCollapsed={sidebarState === 'collapsed'}
        sidebarHidden={sidebarState === 'hidden'}
        onToggleSidebar={toggleSidebar}
      />

      <main className={mainClass}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
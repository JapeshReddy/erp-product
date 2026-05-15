import React, { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import Sidebar from './Sidebar'
import Header from './Header'
import { useUIStore } from '@/stores/uiStore'

NProgress.configure({ showSpinner: false, speed: 250, minimum: 0.15, trickleSpeed: 180 })

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
}

const pageTransition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
}

const AppLayout: React.FC = () => {
  const { sidebarState, mobileOpen, toggleSidebar, setMobileOpen, setSidebarState } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()

  // Drive nprogress from route location changes
  useEffect(() => {
    NProgress.start()
    const timer = setTimeout(() => NProgress.done(), 200)
    return () => { clearTimeout(timer); NProgress.done() }
  }, [location.pathname])

  // Responsive sidebar: auto-collapse on tablet, reset to expanded on mobile
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      if (w <= 768) {
        // Mobile: close any open drawer and ensure sidebar is in expanded state
        // so the drawer always opens with full labels (not icon-only)
        setMobileOpen(false)
        setSidebarState('expanded')
      } else if (w <= 1024) {
        // Tablet (769–1024px): icon-only collapsed sidebar
        setSidebarState('collapsed')
        setMobileOpen(false)
      }
      // Desktop (>1024px): respect the user's stored preference — don't auto-change
    }

    handleResize() // Apply correct state on mount based on initial viewport
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [setMobileOpen, setSidebarState])

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
        aria-hidden="true"
      />

      <Sidebar
        collapsed={sidebarState === 'collapsed'}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        activePath={location.pathname}
        onNavigate={navigate}
        onExpand={() => setSidebarState('expanded')}
      />

      <Header
        sidebarCollapsed={sidebarState === 'collapsed'}
        sidebarHidden={sidebarState === 'hidden'}
        onToggleSidebar={toggleSidebar}
      />

      <main className={mainClass}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ willChange: 'opacity, transform' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default AppLayout

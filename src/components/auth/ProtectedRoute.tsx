import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * Wraps authenticated routes. Shows a full-page spinner while the session is
 * being validated on first mount; redirects to /signin if unauthenticated.
 */
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          height:          '100vh',
          background:      'var(--erp-bg, #fafafa)',
        }}
        aria-label="Loading"
        role="status"
      >
        <div
          style={{
            width:        32,
            height:       32,
            borderRadius: '50%',
            border:       '3px solid var(--erp-border, #e5e7eb)',
            borderTopColor: 'var(--erp-primary, #1E5DB8)',
            animation:    'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('[Auth] 🔒 Unauthenticated — redirecting to /signin')
    return <Navigate to="/signin" replace />
  }

  return <Outlet />
}

export default ProtectedRoute

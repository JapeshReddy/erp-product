import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'

// ─── Public pages (small — imported eagerly) ──────────────────────────────────
import SignIn from '@/pages/auth/SignIn'
import SignUp from '@/pages/auth/SignUp'
import ConfirmSignup from '@/pages/auth/ConfirmSignup'
import AccessRequestReview from '@/pages/admin/AccessRequestReview'

// ─── Protected pages (code-split per route) ───────────────────────────────────
const DashboardPage     = lazy(() => import('@/pages/dashboard/DashboardPage'))
const AllInvoicesPage   = lazy(() => import('@/pages/invoices/AllInvoicesPage'))
const UploadInvoicePage = lazy(() => import('@/pages/invoices/UploadInvoicePage'))

// ─── Suspense fallback — matches the ProtectedRoute spinner style ─────────────
const PageFallback: React.FC = () => (
  <div
    style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '60vh',
    }}
    role="status"
    aria-label="Loading page"
  >
    <div
      style={{
        width:          28,
        height:         28,
        borderRadius:   '50%',
        border:         '3px solid var(--erp-border, #e5e7eb)',
        borderTopColor: 'var(--erp-primary, #2563EB)',
        animation:      'spin 0.7s linear infinite',
      }}
    />
  </div>
)

const AppRoutes: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Public auth routes */}
      <Route path="/signin"  element={<SignIn />} />
      <Route path="/signup"  element={<SignUp />} />
      <Route path="/auth/confirm"                        element={<ConfirmSignup />} />
      <Route path="/admin/access-requests/:requestId"    element={<AccessRequestReview />} />

      {/* Protected app shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>}
          />
          <Route
            path="/invoices"
            element={<Suspense fallback={<PageFallback />}><AllInvoicesPage /></Suspense>}
          />
          <Route
            path="/invoices/upload"
            element={<Suspense fallback={<PageFallback />}><UploadInvoicePage /></Suspense>}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  </BrowserRouter>
)

export default AppRoutes

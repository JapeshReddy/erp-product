import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import ConfirmSignup from "@/pages/auth/ConfirmSignup";
import AccessRequestReview from "@/pages/admin/AccessRequestReview";
import AppLayout from "@/layouts/AppLayout";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import UploadInvoicePage from "@/pages/invoices/UploadInvoicePage";
import AllInvoicesPage from "@/pages/invoices/AllInvoicesPage";

const AppRoutes: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Auth routes */}
      <Route path="/signin"  element={<SignIn />} />
      <Route path="/signup"  element={<SignUp />} />
      <Route path="/auth/confirm" element={<ConfirmSignup />} />
      <Route path="/admin/access-requests/:requestId" element={<AccessRequestReview />} />

      {/* App shell routes */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/invoices" element={<AllInvoicesPage />} />
        <Route path="/invoices/upload" element={<UploadInvoicePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
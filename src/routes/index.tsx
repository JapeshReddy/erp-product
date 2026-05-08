import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import ConfirmSignup from "@/pages/auth/ConfirmSignup";
import AccessRequestReview from "@/pages/admin/AccessRequestReview";

const AppRoutes: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/auth/confirm" element={<ConfirmSignup />} />
      <Route
        path="/admin/access-requests/:requestId"
        element={<AccessRequestReview />}
      />
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;

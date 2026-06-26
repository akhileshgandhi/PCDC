import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "../context/AuthContext"
import Login from "../pages/auth/Login"
import Register from "../pages/auth/Register"
import CaseAttempt from "../pages/cases/CaseAttempt"
import CaseDetail from "../pages/cases/CaseDetail"
import CaseStudyDestination from "../pages/cases/CaseStudyDestination"
import MyCaseStudies from "../pages/cases/MyCaseStudies"
import Dashboard from "../pages/student/Dashboard"

export default function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/case-studies" element={<MyCaseStudies />} />
          <Route path="/dashboard/case-studies/:id" element={<CaseDetail />} />
          <Route path="/dashboard/case-studies/:id/attempt" element={<CaseAttempt />} />
          <Route
            path="/dashboard/case-studies/:caseStudyId/results"
            element={<CaseStudyDestination />}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

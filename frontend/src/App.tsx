import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import ProtectedRoute from "./components/auth/ProtectedRoute"
import { AuthProvider } from "./context/AuthContext"
import Achievements from "./pages/achievements/Achievements"
import AdminPortal from "./pages/admin/AdminPortal"
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import CapabilityProfile from "./pages/capability/CapabilityProfile"
import CareerPathway from "./pages/career/CareerPathway"
import CaseAttempt from "./pages/cases/CaseAttempt"
import CaseDetail from "./pages/cases/CaseDetail"
import CaseStudyDestination from "./pages/cases/CaseStudyDestination"
import MyCaseStudies from "./pages/cases/MyCaseStudies"
import AICoach from "./pages/coach/AICoach"
import FacultyPortal from "./pages/faculty/FacultyPortal"
import Dashboard from "./pages/student/Dashboard"
import Profile from "./pages/student/Profile"
import Unauthorized from "./pages/Unauthorized"
import { getUserRole, isAuthenticated, portalPathForRole } from "./utils/auth"

function RootRedirect() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const portalPath = portalPathForRole(getUserRole() ?? undefined)

  return <Navigate to={portalPath ?? "/login"} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRole="student">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRole="student">
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/capability-profile"
            element={
              <ProtectedRoute allowedRole="student">
                <CapabilityProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/ai-coach"
            element={
              <ProtectedRoute allowedRole="student">
                <AICoach />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/career-pathway"
            element={
              <ProtectedRoute allowedRole="student">
                <CareerPathway />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/achievements"
            element={
              <ProtectedRoute allowedRole="student">
                <Achievements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/case-studies"
            element={
              <ProtectedRoute allowedRole="student">
                <MyCaseStudies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/case-studies/:id"
            element={
              <ProtectedRoute allowedRole="student">
                <CaseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/case-studies/:id/attempt"
            element={
              <ProtectedRoute allowedRole="student">
                <CaseAttempt />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/case-studies/:caseStudyId/results"
            element={
              <ProtectedRoute allowedRole="student">
                <CaseStudyDestination />
              </ProtectedRoute>
            }
          />

          <Route
            path="/faculty/*"
            element={
              <ProtectedRoute allowedRole="faculty">
                <FacultyPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminPortal />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

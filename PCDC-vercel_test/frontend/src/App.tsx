import { Suspense, lazy } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import ProtectedRoute from "./components/auth/ProtectedRoute"
import SessionWatcher from "./components/auth/SessionWatcher"
import MouseGlow from "./components/common/MouseGlow"
import PageLoader from "./components/common/PageLoader"
import ToastHost from "./components/common/Toast"
import { AuthProvider } from "./context/AuthContext"
import Login from "./pages/auth/Login"
import { getUserRole, isAuthenticated, portalPathForRole } from "./utils/auth"

// Login stays in the main bundle (first screen); every other page loads on demand.
const Achievements = lazy(() => import("./pages/achievements/Achievements"))
const AdminPortal = lazy(() => import("./pages/admin/AdminPortal"))
const ChangePassword = lazy(() => import("./pages/auth/ChangePassword"))
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"))
const Register = lazy(() => import("./pages/auth/Register"))
const SetPassword = lazy(() => import("./pages/auth/SetPassword"))
const CapabilityProfile = lazy(() => import("./pages/capability/CapabilityProfile"))
const CareerPathway = lazy(() => import("./pages/career/CareerPathway"))
const CaseAttempt = lazy(() => import("./pages/cases/CaseAttempt"))
const CaseDetail = lazy(() => import("./pages/cases/CaseDetail"))
const CaseStudyDestination = lazy(() => import("./pages/cases/CaseStudyDestination"))
const MyCaseStudies = lazy(() => import("./pages/cases/MyCaseStudies"))
const AICoach = lazy(() => import("./pages/coach/AICoach"))
const FacultyPortal = lazy(() => import("./pages/faculty/FacultyPortal"))
const Dashboard = lazy(() => import("./pages/student/Dashboard"))
const Profile = lazy(() => import("./pages/student/Profile"))
const MySimulations = lazy(() => import("./pages/simulations/MySimulations"))
const SimulationDetail = lazy(() => import("./pages/simulations/SimulationDetail"))
const SimulationResults = lazy(() => import("./pages/simulations/SimulationResults"))
const SimulationWorkspace = lazy(() => import("./pages/simulations/SimulationWorkspace"))
const Unauthorized = lazy(() => import("./pages/Unauthorized"))

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
        <SessionWatcher />
        <ToastHost />
        <MouseGlow />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
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
              path="/student/simulations"
              element={
                <ProtectedRoute allowedRole="student">
                  <MySimulations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/simulations/:id"
              element={
                <ProtectedRoute allowedRole="student">
                  <SimulationDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/simulations/:id/results"
              element={
                <ProtectedRoute allowedRole="student">
                  <SimulationResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/simulations/:id/workspace"
              element={
                <ProtectedRoute allowedRole="student">
                  <SimulationWorkspace />
                </ProtectedRoute>
              }
            />

            <Route
              path="/faculty/*"
              element={
                <ProtectedRoute allowedRole={["faculty", "admin", "superadmin"]}>
                  <FacultyPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRole={["admin", "superadmin"]}>
                  <AdminPortal />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

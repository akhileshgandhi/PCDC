import { Suspense, lazy } from "react"
import { Navigate, Route, Routes, useParams } from "react-router-dom"

import PageLoader from "../../components/common/PageLoader"

// Pages load on demand so each portal only downloads the screens it opens.
const FacultyCaseBuilder = lazy(() => import("../faculty/FacultyCaseBuilder"))
const AdminAcademicSetup = lazy(() => import("./AdminAcademicSetup"))
const AdminAdmins = lazy(() => import("./AdminAdmins"))
const AdminCaseBank = lazy(() => import("./AdminCaseBank"))
const AdminCourses = lazy(() => import("./AdminCourses"))
const AdminDashboard = lazy(() => import("./AdminDashboard"))
const AdminFaculty = lazy(() => import("./AdminFaculty"))
const AdminTeachingApprovals = lazy(() => import("./AdminTeachingApprovals"))
const AdminModulePlaceholder = lazy(() => import("./AdminModulePlaceholder"))
const AdminPromotion = lazy(() => import("./AdminPromotion"))
const AdminSections = lazy(() => import("./AdminSections"))
const AdminSimulationView = lazy(() => import("./AdminSimulationView"))
const AdminSimulations = lazy(() => import("./AdminSimulations"))
const AdminStudents = lazy(() => import("./AdminStudents"))
const AdminUserDetail = lazy(() => import("./AdminUserDetail"))
const AdminUsers = lazy(() => import("./AdminUsers"))

// Keyed on id so switching between cases (or to a new one) remounts the
// builder instead of leaving stale state — same as FacultyPortal.
function AdminCaseBuilderRoute() {
  const { id } = useParams()
  return <FacultyCaseBuilder key={id ?? "new"} />
}

export default function AdminPortal() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/academic" element={<Navigate to="/admin/academic/institutions" replace />} />
        <Route path="/academic/:tab" element={<AdminAcademicSetup />} />
        <Route path="/people/faculty" element={<AdminFaculty />} />
        <Route path="/people/students" element={<AdminStudents />} />
        <Route path="/people/progression" element={<AdminPromotion />} />
        <Route path="/people/teaching-approvals" element={<AdminTeachingApprovals />} />
        <Route path="/case-bank" element={<AdminCaseBank />} />
        <Route path="/case-builder" element={<AdminCaseBuilderRoute />} />
        <Route path="/case-builder/:id" element={<AdminCaseBuilderRoute />} />
        <Route path="/simulations" element={<AdminSimulations />} />
        <Route path="/simulations/:id" element={<AdminSimulationView />} />
        <Route path="/admins" element={<AdminAdmins />} />
        <Route path="/users" element={<AdminUsers />} />
        <Route path="/user/:id" element={<AdminUserDetail />} />
        <Route path="/courses" element={<AdminCourses />} />
        <Route path="/sections" element={<AdminSections />} />
        <Route
          path="/settings"
          element={
            <AdminModulePlaceholder
              title="Settings"
              description="System thresholds, career tracks, notification channels, and AI configuration will land here."
            />
          }
        />
        <Route
          path="/notifications"
          element={
            <AdminModulePlaceholder
              title="Notifications"
              description="Delivery logs, retry actions, editable rules, and broadcast sending will be implemented after the notification tables are wired."
            />
          }
        />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

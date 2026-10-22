import { Navigate, Route, Routes, useParams } from "react-router-dom"

import FacultyCaseBuilder from "../faculty/FacultyCaseBuilder"

import AdminAcademicSetup from "./AdminAcademicSetup"
import AdminAdmins from "./AdminAdmins"
import AdminCaseBank from "./AdminCaseBank"
import AdminCourses from "./AdminCourses"
import AdminDashboard from "./AdminDashboard"
import AdminFaculty from "./AdminFaculty"
import AdminTeachingApprovals from "./AdminTeachingApprovals"
import AdminModulePlaceholder from "./AdminModulePlaceholder"
import AdminSections from "./AdminSections"
import AdminStudents from "./AdminStudents"
import AdminUserDetail from "./AdminUserDetail"
import AdminUsers from "./AdminUsers"

// Keyed on id so switching between cases (or to a new one) remounts the
// builder instead of leaving stale state — same as FacultyPortal.
function AdminCaseBuilderRoute() {
  const { id } = useParams()
  return <FacultyCaseBuilder key={id ?? "new"} />
}

export default function AdminPortal() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/academic" element={<Navigate to="/admin/academic/institutions" replace />} />
      <Route path="/academic/:tab" element={<AdminAcademicSetup />} />
      <Route path="/people/faculty" element={<AdminFaculty />} />
      <Route path="/people/students" element={<AdminStudents />} />
      <Route path="/people/teaching-approvals" element={<AdminTeachingApprovals />} />
      <Route path="/case-bank" element={<AdminCaseBank />} />
      <Route path="/case-builder" element={<AdminCaseBuilderRoute />} />
      <Route path="/case-builder/:id" element={<AdminCaseBuilderRoute />} />
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
  )
}

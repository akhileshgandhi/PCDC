import { Navigate, Route, Routes } from "react-router-dom"

import AdminCourses from "./AdminCourses"
import AdminDashboard from "./AdminDashboard"
import AdminModulePlaceholder from "./AdminModulePlaceholder"
import AdminSections from "./AdminSections"
import AdminUserDetail from "./AdminUserDetail"
import AdminUsers from "./AdminUsers"

export default function AdminPortal() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/users" element={<AdminUsers />} />
      <Route path="/user/:id" element={<AdminUserDetail />} />
      <Route path="/courses" element={<AdminCourses />} />
      <Route path="/sections" element={<AdminSections />} />
      <Route
        path="/case-import"
        element={
          <AdminModulePlaceholder
            title="Case Import"
            description="External case import queue, upload, mapping, approval, rejection, and draft save flows will build on the case schema."
          />
        }
      />
      <Route
        path="/settings"
        element={
          <AdminModulePlaceholder
            title="Settings"
            description="System thresholds, mentor assignment rules, career tracks, notification channels, and AI configuration will land here."
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

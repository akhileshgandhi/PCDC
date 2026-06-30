import { Navigate, Route, Routes } from "react-router-dom"

import FacultyCaseLibrary from "./FacultyCaseLibrary"
import FacultyDashboard from "./FacultyDashboard"
import FacultyModulePlaceholder from "./FacultyModulePlaceholder"

export default function FacultyPortal() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/faculty/dashboard" replace />} />
      <Route path="/dashboard" element={<FacultyDashboard />} />
      <Route path="/case-library" element={<FacultyCaseLibrary />} />
      <Route
        path="/case-builder"
        element={
          <FacultyModulePlaceholder
            title="Case Builder"
            description="The next implementation slice will add draft creation, editing, AI generation, and publish controls."
          />
        }
      />
      <Route
        path="/case-builder/:id"
        element={
          <FacultyModulePlaceholder
            title="Edit Case Study"
            description="Editing will reuse the same case-builder workflow once the create/update API is wired."
          />
        }
      />
      <Route
        path="/rubric-builder"
        element={
          <FacultyModulePlaceholder
            title="Rubric Builder"
            description="This module will manage weighted evaluation criteria and validate that weights total 100%."
          />
        }
      />
      <Route
        path="/rubric-builder/:caseId"
        element={
          <FacultyModulePlaceholder
            title="Case Rubric Builder"
            description="This module will load the selected case rubric and save weighted faculty criteria."
          />
        }
      />
      <Route
        path="/students"
        element={
          <FacultyModulePlaceholder
            title="Students"
            description="The roster view will show faculty-scoped students, filters, capability snapshots, and read-only detail."
          />
        }
      />
      <Route
        path="/analytics"
        element={
          <FacultyModulePlaceholder
            title="Analytics"
            description="Cohort capability distributions, per-case averages, weak areas, and trends will land here after case data stabilizes."
          />
        }
      />
      <Route
        path="/reports"
        element={
          <FacultyModulePlaceholder
            title="Reports"
            description="Report type, date range, and PDF or CSV export flows will be implemented after analytics."
          />
        }
      />
      <Route path="*" element={<Navigate to="/faculty/dashboard" replace />} />
    </Routes>
  )
}

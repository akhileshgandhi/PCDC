import { Navigate, Route, Routes } from "react-router-dom"

import FacultyAnalytics from "./FacultyAnalytics"
import FacultyCaseBuilder from "./FacultyCaseBuilder"
import FacultyCaseLibrary from "./FacultyCaseLibrary"
import FacultyDashboard from "./FacultyDashboard"
import FacultyModulePlaceholder from "./FacultyModulePlaceholder"
import FacultyRubricBuilder from "./FacultyRubricBuilder"
import FacultyStudents from "./FacultyStudents"

export default function FacultyPortal() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/faculty/dashboard" replace />} />
      <Route path="/dashboard" element={<FacultyDashboard />} />
      <Route path="/case-library" element={<FacultyCaseLibrary />} />
      <Route path="/case-builder" element={<FacultyCaseBuilder />} />
      <Route path="/case-builder/:id" element={<FacultyCaseBuilder />} />
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
        element={<FacultyRubricBuilder />}
      />
      <Route path="/students" element={<FacultyStudents />} />
      <Route path="/analytics" element={<FacultyAnalytics />} />
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

import { Navigate, Route, Routes } from "react-router-dom"

import FacultyAnalytics from "./FacultyAnalytics"
import FacultyAttemptReport from "./FacultyAttemptReport"
import FacultyAttempts from "./FacultyAttempts"
import FacultyCaseBuilder from "./FacultyCaseBuilder"
import FacultyCaseLibrary from "./FacultyCaseLibrary"
import FacultyDashboard from "./FacultyDashboard"
import FacultyReports from "./FacultyReports"
import FacultyRubricBuilder from "./FacultyRubricBuilder"
import FacultyRubricList from "./FacultyRubricList"
import FacultyStudents from "./FacultyStudents"

export default function FacultyPortal() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/faculty/dashboard" replace />} />
      <Route path="/dashboard" element={<FacultyDashboard />} />
      <Route path="/case-library" element={<FacultyCaseLibrary />} />
      <Route path="/case-builder" element={<FacultyCaseBuilder />} />
      <Route path="/case-builder/:id" element={<FacultyCaseBuilder />} />
      <Route path="/rubric-builder" element={<FacultyRubricList />} />
      <Route
        path="/rubric-builder/:caseId"
        element={<FacultyRubricBuilder />}
      />
      <Route path="/students" element={<FacultyStudents />} />
      <Route path="/case-attempts/:caseId" element={<FacultyAttempts mode="case" />} />
      <Route path="/student-attempts/:userId" element={<FacultyAttempts mode="student" />} />
      <Route path="/attempts/:attemptId" element={<FacultyAttemptReport />} />
      <Route path="/analytics" element={<FacultyAnalytics />} />
      <Route path="/reports" element={<FacultyReports />} />
      <Route path="*" element={<Navigate to="/faculty/dashboard" replace />} />
    </Routes>
  )
}

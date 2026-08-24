import { Navigate, Route, Routes } from "react-router-dom"

import FacultyAnalytics from "./FacultyAnalytics"
import FacultyAttemptReport from "./FacultyAttemptReport"
import FacultyAttempts from "./FacultyAttempts"
import FacultyCaseBank from "./FacultyCaseBank"
import FacultyCaseBuilder from "./FacultyCaseBuilder"
import FacultyCaseLibrary from "./FacultyCaseLibrary"
import FacultyDashboard from "./FacultyDashboard"
import FacultyMyTeaching from "./FacultyMyTeaching"
import FacultyReports from "./FacultyReports"
import FacultyStudents from "./FacultyStudents"

export default function FacultyPortal() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/faculty/dashboard" replace />} />
      <Route path="/dashboard" element={<FacultyDashboard />} />
      <Route path="/onboarding/my-teaching" element={<FacultyMyTeaching />} />
      <Route path="/onboarding/add-students" element={<Navigate to="/faculty/students" replace />} />
      <Route path="/case-library" element={<FacultyCaseLibrary />} />
      <Route path="/case-bank" element={<FacultyCaseBank />} />
      <Route path="/case-builder" element={<FacultyCaseBuilder />} />
      <Route path="/case-builder/:id" element={<FacultyCaseBuilder />} />
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

import { Navigate, Route, Routes, useParams } from "react-router-dom"

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

// "/case-builder" and "/case-builder/:id" are sibling routes rendering the
// same component at the same outlet position, so React Router/React preserve
// the instance across navigation between them instead of remounting it —
// leaving stale state (e.g. a previously-viewed case) on screen when
// switching from "view an existing case" to "start a new one". Keying on the
// id forces a fresh mount whenever it changes, including to/from undefined.
function FacultyCaseBuilderRoute() {
  const { id } = useParams()
  return <FacultyCaseBuilder key={id ?? "new"} />
}

export default function FacultyPortal() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/faculty/dashboard" replace />} />
      <Route path="/dashboard" element={<FacultyDashboard />} />
      <Route path="/onboarding/my-teaching" element={<FacultyMyTeaching />} />
      <Route path="/onboarding/add-students" element={<Navigate to="/faculty/students" replace />} />
      <Route path="/case-library" element={<FacultyCaseLibrary />} />
      <Route path="/case-bank" element={<FacultyCaseBank />} />
      <Route path="/case-builder" element={<FacultyCaseBuilderRoute />} />
      <Route path="/case-builder/:id" element={<FacultyCaseBuilderRoute />} />
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

import { Suspense, lazy } from "react"
import { Navigate, Route, Routes, useParams } from "react-router-dom"

import PageLoader from "../../components/common/PageLoader"

// Pages load on demand so each portal only downloads the screens it opens.
const FacultyAnalytics = lazy(() => import("./FacultyAnalytics"))
const FacultyAttemptReport = lazy(() => import("./FacultyAttemptReport"))
const FacultyAttempts = lazy(() => import("./FacultyAttempts"))
const FacultyCaseBank = lazy(() => import("./FacultyCaseBank"))
const FacultyCaseBuilder = lazy(() => import("./FacultyCaseBuilder"))
const FacultyCaseLibrary = lazy(() => import("./FacultyCaseLibrary"))
const FacultyDashboard = lazy(() => import("./FacultyDashboard"))
const FacultyMyTeaching = lazy(() => import("./FacultyMyTeaching"))
const FacultyReports = lazy(() => import("./FacultyReports"))
const FacultySettings = lazy(() => import("./FacultySettings"))
const FacultySimulationAttempt = lazy(() => import("./FacultySimulationAttempt"))
const FacultySimulationEditor = lazy(() => import("./FacultySimulationEditor"))
const FacultySimulationNew = lazy(() => import("./FacultySimulationNew"))
const FacultySimulationResults = lazy(() => import("./FacultySimulationResults"))
const FacultySimulations = lazy(() => import("./FacultySimulations"))
const FacultyStudents = lazy(() => import("./FacultyStudents"))

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

// Same reason as above: a fresh editor for each simulation (and for "manual").
function FacultySimulationEditorRoute() {
  const { id } = useParams()
  return <FacultySimulationEditor key={id ?? "manual"} />
}

export default function FacultyPortal() {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/settings" element={<FacultySettings />} />
        <Route path="/simulations" element={<FacultySimulations />} />
        <Route path="/simulations/new" element={<FacultySimulationNew />} />
        <Route path="/simulations/new/manual" element={<FacultySimulationEditorRoute />} />
        <Route path="/simulations/attempts/:attemptId" element={<FacultySimulationAttempt />} />
        <Route path="/simulations/:id/results" element={<FacultySimulationResults />} />
        <Route path="/simulations/:id" element={<FacultySimulationEditorRoute />} />
        <Route path="*" element={<Navigate to="/faculty/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

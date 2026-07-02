import { Navigate, Route, Routes } from "react-router-dom"

import MentorLayout from "../../layouts/MentorLayout"
import MentorDashboard from "./MentorDashboard"
import MentorStudents from "./MentorStudents"

export default function MentorPortal() {
  return (
    <Routes>
      <Route index element={<Navigate to="/mentor/dashboard" replace />} />
      <Route path="dashboard" element={<MentorDashboard />} />
      <Route path="students" element={<MentorStudents />} />
      <Route path="student/:studentId" element={<MentorModulePlaceholder title="Student Detail" />} />
      <Route path="thinking-path" element={<MentorModulePlaceholder title="Thinking Path" />} />
      <Route path="interventions" element={<MentorModulePlaceholder title="Interventions" />} />
      <Route path="sessions" element={<MentorModulePlaceholder title="Sessions" />} />
      <Route path="alerts" element={<MentorModulePlaceholder title="Alerts" />} />
      <Route path="*" element={<Navigate to="/mentor/dashboard" replace />} />
    </Routes>
  )
}

interface MentorModulePlaceholderProps {
  title: string
}

function MentorModulePlaceholder({ title }: MentorModulePlaceholderProps) {
  return (
    <MentorLayout>
      <section className="rounded-lg border border-[#dfe5dd] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-[#1c2420]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#617069]">
          This mentor workflow is wired into navigation and ready for the next implementation
          slice.
        </p>
      </section>
    </MentorLayout>
  )
}

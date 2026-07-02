import api from "./axios"

export interface StudentCapabilityScore {
  capability: string
  score: number
}

export interface StudentUpcomingSession {
  id: number
  session_type: string
  scheduled_at: string
  mentor_name: string
}

export interface StudentDashboardSummary {
  overall_capability_score: number
  capability_scores: StudentCapabilityScore[]
  pending_simulations: number
  completed_simulations: number
  current_level: number | null
  upcoming_session: StudentUpcomingSession | null
}

export async function getStudentDashboardSummary() {
  const response = await api.get<StudentDashboardSummary>("/student/dashboard/summary")
  return response.data
}

export interface StudentProfile {
  student_id: number
  current_level: number | null
  course_name: string | null
  batch_name: string | null
  section_name: string | null
  semester_number: number | null
  semester_name: string | null
  mentor_name: string | null
  career_track_name: string | null
}

export async function getStudentProfile() {
  const response = await api.get<StudentProfile>("/student/profile")
  return response.data
}

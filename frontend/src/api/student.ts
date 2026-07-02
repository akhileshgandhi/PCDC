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

import api from "./axios"

export type MentorStudentStatus =
  | "on_track"
  | "at_risk"
  | "stagnant"
  | "top_performer"
  | "inactive"

export interface MentorStudent {
  student_id: number
  user_id: number
  name: string
  email: string
  program: string | null
  career_track: string | null
  current_level: number | null
  average_score: number
  weakest_capability: string | null
  last_activity_at: string | null
  status: MentorStudentStatus
}

export interface MentorStudentsResponse {
  items: MentorStudent[]
  total: number
}

export interface MentorStudentFilters {
  status?: string
  track?: string
  level?: string
  weakness?: string
  search?: string
  sort?: string
}

export interface MentorDashboardSummary {
  assigned_students: number
  at_risk_students: number
  top_performers: number
  sessions_this_week: number
  weakness_signals: Array<{
    capability: string
    student_count: number
  }>
}

export interface MentorAlert {
  id: number
  alert_type: string
  severity: "critical" | "watch"
  message: string
  status: "active" | "dismissed"
  created_at: string
  student_id: number
  student_name: string
}

export interface MentorSession {
  id: number
  session_type: string
  agenda: string
  scheduled_at: string
  completed_at: string | null
  notes: string | null
  student_names: string
}

export async function getMentorDashboardSummary() {
  const response = await api.get<MentorDashboardSummary>("/mentor/dashboard/summary")
  return response.data
}

export async function getMentorDashboardAlerts() {
  const response = await api.get<MentorAlert[]>("/mentor/dashboard/alerts")
  return response.data
}

export async function getMentorUpcomingSessions() {
  const response = await api.get<MentorSession[]>("/mentor/dashboard/sessions/upcoming")
  return response.data
}

export async function getMentorStudents(filters: MentorStudentFilters = {}) {
  const response = await api.get<MentorStudentsResponse>("/mentor/students", {
    params: {
      status: filters.status || undefined,
      track: filters.track || undefined,
      level: filters.level || undefined,
      weakness: filters.weakness || undefined,
      search: filters.search || undefined,
      sort: filters.sort || undefined,
    },
  })
  return response.data
}

import api from "./axios"

export interface FacultyDashboardSummary {
  active_students: number
  simulations_running: number
  pending_reviews: number
  capability_alerts: number
}

export interface FacultyCase {
  id: number
  title: string
  description: string | null
  domain: string
  difficulty: number
  estimated_minutes: number
  status: "draft" | "published" | "archived"
  attempts_count: number
  created_at: string
  updated_at: string
}

export interface FacultyCaseFilters {
  domain?: string
  difficulty?: number
  status?: string
}

export async function getFacultyDashboardSummary() {
  const response = await api.get<FacultyDashboardSummary>("/faculty/dashboard/summary")
  return response.data
}

export async function getFacultyCases(filters: FacultyCaseFilters = {}) {
  const response = await api.get<FacultyCase[]>("/faculty/cases", {
    params: {
      domain: filters.domain || undefined,
      difficulty: filters.difficulty || undefined,
      status: filters.status || undefined,
    },
  })
  return response.data
}

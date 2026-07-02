import type { CaseDomain } from "../components/cases/DomainTag"
import type { CaseStatus } from "../components/cases/StatusBadge"
import api from "./axios"

export interface CaseStudyResponse {
  id: number
  title: string
  description: string | null
  domain: string
  difficulty: number
  case_code?: string | null
  subject?: string | null
  difficulty_label?: string | null
  total_marks?: number | null
  written_marks?: number | null
  rapid_fire_marks?: number | null
  reading_time_minutes?: number | null
  answer_writing_time_minutes?: number | null
  rapid_fire_time_minutes?: number | null
  estimated_minutes: number
  source: string
  status: string
  tags: Array<{
    tag_type: string
    tag_value: string
  }>
  assignment_source?: "mentor" | "faculty" | "admin" | null
  due_date?: string | null
}

export interface CaseStudyFilters {
  domain?: string
  difficulty?: number
  status?: string
}

export async function getCaseStudies(filters: CaseStudyFilters = {}) {
  const response = await api.get<CaseStudyResponse[]>("/cases/list", {
    params: {
      domain: filters.domain || undefined,
      difficulty: filters.difficulty || undefined,
      status: filters.status || undefined,
    },
  })
  return response.data
}

export function toCaseDomain(value: string): CaseDomain {
  const normalized = value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
  const domains: CaseDomain[] = [
    "Geopolitics",
    "Sports",
    "Business",
    "Social",
    "Science",
    "Technology",
    "Environment",
    "Healthcare",
  ]
  return domains.includes(normalized as CaseDomain)
    ? (normalized as CaseDomain)
    : "Business"
}

export function toCaseStatus(value: string): CaseStatus {
  if (value === "completed") {
    return "completed"
  }
  if (value === "active" || value === "in_progress") {
    return "in_progress"
  }
  return "available"
}

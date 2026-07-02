import type { CaseDomain } from "../components/cases/DomainTag"
import type { CaseStatus } from "../components/cases/StatusBadge"
import api from "./axios"

export interface CaseStudyResponse {
  id: number
  title: string
  description: string | null
  domain: string
  difficulty: number
  estimated_minutes: number
  source: string
  status: string
  tags: Array<{
    tag_type: string
    tag_value: string
  }>
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

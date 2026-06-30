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

export type CaseSectionKey =
  | "situation"
  | "background"
  | "data"
  | "characters"
  | "constraints"
  | "objectives"
  | "timeline"
  | "reflection_questions"
  | "learning_outcomes"

export type CaseSectionMeta = "ai_generated" | "edited" | "manual"
export type CaseSectionValue = string | string[]

export interface FacultyCapability {
  id: number
  name: string
}

export interface FacultyCaseEditor {
  id: number
  title: string
  industry: string
  difficulty: number
  duration_minutes: number
  status: "draft" | "published" | "archived"
  capabilities: string[]
  expected_outcomes: string
  sections: Record<CaseSectionKey, CaseSectionValue>
  section_meta: Record<CaseSectionKey, CaseSectionMeta>
  rubric_exists: boolean
  active_attempts: number
  created_at: string
  updated_at: string
}

export interface CreateFacultyCasePayload {
  title: string
  industry: string
  difficulty: number
  duration_minutes: number
  capabilities: string[]
  expected_outcomes: string
}

export interface UpdateFacultyCasePayload {
  title?: string
  industry?: string
  difficulty?: number
  duration_minutes?: number
  capabilities?: string[]
  expected_outcomes?: string
  sections?: Partial<Record<CaseSectionKey, CaseSectionValue>>
  section_meta?: Partial<Record<CaseSectionKey, CaseSectionMeta>>
}

export interface GenerateFacultyCasePayload {
  scope: "full" | "section"
  sections?: CaseSectionKey[]
  overwrite_manual?: boolean
}

export type GenerationJobStatus = "queued" | "in_progress" | "succeeded" | "failed"

export interface FacultyCaseGenerationJob {
  job_id: string
  case_id: number
  status: GenerationJobStatus
  scope: "full" | "section"
  sections: CaseSectionKey[]
  message: string
  error?: string
  case?: FacultyCaseEditor
  created_at: string
  updated_at: string
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

export async function getFacultyCapabilities() {
  const response = await api.get<FacultyCapability[]>("/faculty/capabilities")
  return response.data
}

export async function createFacultyCase(payload: CreateFacultyCasePayload) {
  const response = await api.post<FacultyCaseEditor>("/faculty/cases", payload)
  return response.data
}

export async function getFacultyCase(caseId: number) {
  const response = await api.get<FacultyCaseEditor>(`/faculty/cases/${caseId}`)
  return response.data
}

export async function updateFacultyCase(caseId: number, payload: UpdateFacultyCasePayload) {
  const response = await api.put<FacultyCaseEditor>(`/faculty/cases/${caseId}`, payload)
  return response.data
}

export async function generateFacultyCase(
  caseId: number,
  payload: GenerateFacultyCasePayload,
) {
  const response = await api.post<FacultyCaseGenerationJob>(
    `/faculty/cases/${caseId}/generate`,
    payload,
  )
  return response.data
}

export async function getFacultyCaseGenerationJob(caseId: number, jobId: string) {
  const response = await api.get<FacultyCaseGenerationJob>(
    `/faculty/cases/${caseId}/generate/${jobId}`,
  )
  return response.data
}

export async function publishFacultyCase(caseId: number) {
  const response = await api.post<FacultyCaseEditor>(`/faculty/cases/${caseId}/publish`)
  return response.data
}

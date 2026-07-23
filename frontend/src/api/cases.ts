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

export interface CaseDetailContent {
  id: number
  title: string
  description: string | null
  domain: string
  difficulty: number
  difficulty_label: string | null
  situation: string
  learning_outcomes: string[]
  reflection_questions: string[]
  capabilities: string[]
  estimated_minutes: number
  created_by_name: string | null
  created_at: string
}

export interface CaseAttemptState {
  exists: boolean
  attempt_id: number | null
  status: string | null
  stage: number | null
  stage_label: string | null
  total_score: number | null
  grade_label: string | null
}

export interface CaseDetail {
  case: CaseDetailContent
  attempt: CaseAttemptState
}

export async function getCaseDetail(caseId: number | string) {
  const response = await api.get<CaseDetail>(`/cases/${caseId}/detail`)
  return response.data
}

export interface StartAttemptResponse {
  attempt_id: number
  case_study_id: number
  title: string
  content: string
  reflection_questions: string | null
  status: string
}

export async function startCaseAttempt(caseStudyId: number | string) {
  const response = await api.post<StartAttemptResponse>("/cases/attempt/start", {
    case_study_id: Number(caseStudyId),
  })
  return response.data
}

export interface AttemptConversation {
  role: "ai" | "student"
  stage: "discussion" | "defense"
  message: string
  timestamp: string
}

export interface AttemptEvaluation {
  attempt_id: number
  thinking_depth: number
  logic_score: number
  creativity_score: number
  practicality_score: number
  risk_awareness_score: number
  reflection_score: number
  ai_utilization_score: number
  time_score: number
  total_score: number
  strengths: string
  weaknesses: string
  blind_spots: string
  improvement_areas: string
  next_recommended_case_id: number | null
}

export interface AttemptDetail {
  id: number
  case_study_id: number
  student_id: number
  status: string
  initial_analysis: string | null
  initial_word_count: number
  final_solution: string | null
  defense_responses: string | null
  reflection_text: string | null
  time_taken_minutes: number | null
  conversations: AttemptConversation[]
  evaluation: AttemptEvaluation | null
}

export async function getAttemptDetail(attemptId: number) {
  const response = await api.get<AttemptDetail>(`/cases/attempt/${attemptId}`)
  return response.data
}

export async function submitInitialAnalysis(attemptId: number, initialAnalysis: string) {
  const response = await api.post<{
    ai_unlocked: boolean
    attempt_id: number
    opening_message: string | null
  }>("/cases/attempt/submit-analysis", {
    attempt_id: attemptId,
    initial_analysis: initialAnalysis,
  })
  return response.data
}

export async function sendAttemptAiMessage(attemptId: number, message: string) {
  const response = await api.post<{ response: string }>("/cases/attempt/ai-message", {
    attempt_id: attemptId,
    message,
  })
  return response.data
}

export async function submitAttemptSolution(attemptId: number, finalSolution: string) {
  const response = await api.post<{ defense_questions: string[] }>(
    "/cases/attempt/submit-solution",
    { attempt_id: attemptId, final_solution: finalSolution },
  )
  return response.data
}

export async function submitAttemptDefense(attemptId: number, defenseResponses: string) {
  const response = await api.post<AttemptEvaluation>("/cases/attempt/submit-defense", {
    attempt_id: attemptId,
    defense_responses: defenseResponses,
  })
  return response.data
}

export async function submitAttemptReflection(attemptId: number, reflectionText: string) {
  const response = await api.post<AttemptEvaluation & { status: string }>(
    "/cases/attempt/submit-reflection",
    { attempt_id: attemptId, reflection_text: reflectionText },
  )
  return response.data
}

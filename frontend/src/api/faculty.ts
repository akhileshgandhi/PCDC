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

export interface FacultySection {
  id: number
  name: string
  academic_year: string | null
  semester_number: number
  semester_name: string
  batch_name: string
  course_name: string
  subjects: string | null
  student_count: number
}

export type FacultyStudentStatus = "on_track" | "at_risk" | "inactive" | "not_started"

export interface FacultyStudent {
  student_id: number
  user_id: number
  name: string
  email: string
  section_id: number
  section_name: string
  average_score: number
  last_activity_at: string | null
  assigned_count: number
  completed_count: number
  status: FacultyStudentStatus
}

export interface FacultyAssignedCase {
  assignment_id: number
  case_id: number
  case_title: string
  section_id: number
  section_name: string
  due_date: string | null
  status: "active" | "closed"
  instructions: string | null
  assigned_at: string
  total_assigned: number
  completed_count: number
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

export interface FacultyCaseMetadata {
  case_code?: string | null
  volume?: string | null
  subject?: string | null
  functional_area?: string | null
  capability_category?: string | null
  blooms_levels?: string[]
  target_learners?: string | null
  difficulty_label?: string | null
}

export interface FacultyCaseTiming {
  reading_time_minutes?: number | null
  answer_writing_time_minutes?: number | null
  rapid_fire_time_minutes?: number | null
}

export interface FacultyCaseMarks {
  total_marks?: number | null
  written_marks?: number | null
  rapid_fire_marks?: number | null
}

export interface FacultyCaseRecommendation {
  recommended_semesters: number[]
  recommended_course_ids: number[]
}

export interface FacultyCourseOption {
  id: number
  name: string
  code: string
  total_semesters: number
}

export interface FacultyCaseInstructions {
  student_instructions_before?: string | null
  student_instructions_during?: string | null
  student_instructions_submission?: string | null
  company_background?: string | null
  industry_background?: string | null
  faculty_common_mistakes?: string | null
  faculty_discussion_points?: string | null
  key_learning_points?: string | null
}

export interface FacultyCaseQuestion {
  id?: number
  question_number: number
  question_text: string
  marks: number
  blooms_level?: string | null
  word_limit_min?: number | null
  word_limit_max?: number | null
  instructions?: string | null
  model_answer?: string | null
  alternative_answers?: string[]
  marking_scheme?: string | null
}

export interface FacultyRapidFireQuestion {
  id?: number
  sequence: number
  question_text: string
  answer_text?: string | null
}

export interface FacultyCaseEditor {
  id: number
  title: string
  industry: string
  difficulty: number
  duration_minutes: number
  metadata: FacultyCaseMetadata
  timing: FacultyCaseTiming
  marks: FacultyCaseMarks
  instructions: FacultyCaseInstructions
  recommendation: FacultyCaseRecommendation
  questions: FacultyCaseQuestion[]
  rapid_fire_questions: FacultyRapidFireQuestion[]
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
  metadata?: FacultyCaseMetadata
  timing?: FacultyCaseTiming
  marks?: FacultyCaseMarks
  instructions?: FacultyCaseInstructions
  recommendation?: FacultyCaseRecommendation
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
  metadata?: FacultyCaseMetadata
  timing?: FacultyCaseTiming
  marks?: FacultyCaseMarks
  instructions?: FacultyCaseInstructions
  questions?: FacultyCaseQuestion[]
  rapid_fire_questions?: FacultyRapidFireQuestion[]
  recommendation?: FacultyCaseRecommendation
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

export type RubricCriterionKey =
  | "thinking_depth"
  | "logic"
  | "creativity"
  | "practicality"
  | "risk_awareness"
  | "reflection"

export interface RubricCriterion {
  key: RubricCriterionKey
  label: string
}

export interface FacultyRubric {
  weights: Record<RubricCriterionKey, number>
  case_specific_criteria: string[]
}

export interface FacultyCaseRubricResponse {
  case_id: number
  case_title: string
  case_status: "draft" | "published" | "archived"
  active_attempts: number
  criteria: RubricCriterion[]
  rubric: FacultyRubric
  rubric_exists: boolean
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

export async function getFacultyCourses() {
  const response = await api.get<{ items: FacultyCourseOption[] }>("/faculty/courses")
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

export async function getFacultyCaseRubric(caseId: number) {
  const response = await api.get<FacultyCaseRubricResponse>(`/faculty/cases/${caseId}/rubric`)
  return response.data
}

export async function saveFacultyCaseRubric(caseId: number, payload: FacultyRubric) {
  const response = await api.put<FacultyCaseRubricResponse>(
    `/faculty/cases/${caseId}/rubric`,
    payload,
  )
  return response.data
}

export async function publishFacultyCase(caseId: number) {
  const response = await api.post<FacultyCaseEditor>(`/faculty/cases/${caseId}/publish`)
  return response.data
}

export async function getFacultySections() {
  const response = await api.get<{ items: FacultySection[]; total: number }>(
    "/faculty/sections",
  )
  return response.data
}

export async function getFacultyStudents(sectionId?: number) {
  const response = await api.get<{ items: FacultyStudent[]; total: number }>(
    "/faculty/students",
    { params: { section_id: sectionId || undefined } },
  )
  return response.data
}

export async function assignCaseToSections(
  caseId: number,
  payload: { section_ids: number[]; due_date?: string; instructions?: string },
) {
  const response = await api.post<{
    case_id: number
    assignments: Array<{
      section_id: number
      section_name: string
      matched_students: number
      newly_assigned: number
    }>
  }>(`/faculty/cases/${caseId}/assign-section`, payload)
  return response.data
}

export async function getFacultyAssignedCases() {
  const response = await api.get<{ items: FacultyAssignedCase[]; total: number }>(
    "/faculty/cases/assigned",
  )
  return response.data
}

export async function closeFacultyCaseAssignment(assignmentId: number) {
  const response = await api.patch<{ id: number; status: string }>(
    `/faculty/case-assignments/${assignmentId}/close`,
  )
  return response.data
}

export interface FacultyAnalyticsSection {
  section_id: number
  section_name: string
  course_name: string
  semester_name: string
  student_count: number
  average_score: number
  cases_assigned: number
  total_assigned: number
  completed_count: number
  completion_rate: number
}

export interface FacultyAnalyticsSummary {
  sections: FacultyAnalyticsSection[]
  totals: {
    section_count: number
    student_count: number
    average_score: number
    completion_rate: number
  }
}

export async function getFacultyAnalyticsSummary() {
  const response = await api.get<FacultyAnalyticsSummary>("/faculty/analytics/summary")
  return response.data
}

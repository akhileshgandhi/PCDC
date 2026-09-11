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
  rubric_exists: boolean
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
  | "data"
  | "objectives"

export type CaseSectionMeta = "ai_generated" | "edited" | "manual"
export type CaseSectionValue = string | string[]

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
}

export interface FacultyCaseQuestion {
  id?: number
  question_number: number
  question_text: string
  marks: number
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
  created_by: number
  capabilities: string[]
  subject_areas: string[]
  expected_outcomes: string
  outcome_statement: string
  decision_options: string[]
  learning_takeaways: string[]
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
  subject_areas?: string[]
  expected_outcomes?: string
  outcome_statement?: string
  decision_options?: string[]
  learning_takeaways?: string[]
  sections?: Partial<Record<CaseSectionKey, CaseSectionValue>>
  section_meta?: Partial<Record<CaseSectionKey, CaseSectionMeta>>
  questions?: FacultyCaseQuestion[]
  rapid_fire_questions?: FacultyRapidFireQuestion[]
  rubric?: FacultyRubric
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
  subject_areas?: string[]
  expected_outcomes?: string
  outcome_statement?: string
  decision_options?: string[]
  learning_takeaways?: string[]
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
  scope: "full" | "section" | "ai_fill"
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

export interface FacultyNotification {
  id: number
  event_type: string
  message: string
  created_at: string
}

export async function getFacultyNotifications(limit = 20) {
  const response = await api.get<{ items: FacultyNotification[] }>("/faculty/notifications", {
    params: { limit },
  })
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

export async function deleteFacultyCase(caseId: number) {
  const response = await api.delete<{ status: string; id: number; title: string }>(
    `/faculty/cases/${caseId}`,
  )
  return response.data
}

export async function publishFacultyCase(caseId: number) {
  const response = await api.post<FacultyCaseEditor>(`/faculty/cases/${caseId}/publish`)
  return response.data
}

export async function generateFacultyCaseQuestions(caseId: number, summary: string) {
  const response = await api.post<{ questions: FacultyCaseQuestion[] }>(
    `/faculty/cases/${caseId}/generate-questions`,
    { summary },
  )
  return response.data.questions
}

// One-brief full-case autofill (fills every field + rubric). Runs as a
// background job on the server (full generation can take 30s-3min) — this
// kicks it off and returns the queued job immediately; poll it with
// getFacultyCaseGenerationJob the same way section generation already does.
export async function aiFillFacultyCase(caseId: number, brief: string, subject?: string) {
  const response = await api.post<FacultyCaseGenerationJob>(
    `/faculty/cases/${caseId}/ai-fill`,
    { brief, subject },
  )
  return response.data
}

export async function generateFacultyRapidFireQuestions(caseId: number, summary: string) {
  const response = await api.post<{ questions: FacultyRapidFireQuestion[] }>(
    `/faculty/cases/${caseId}/generate-rapid-fire`,
    { summary },
  )
  return response.data.questions
}

export interface FacultyTeachingSelection {
  id: number
  section_id: number
  subject: string
  status: "active" | "pending"
  section_name: string
  course_name: string
  semester_name: string
  batch_name: string
}

export interface FacultyTeachingOptionSemester {
  id: number
  number: number
  name: string
  sections: Array<{ id: number; name: string; batch_name: string }>
  subjects: string[]
}

export interface FacultyTeachingOptionCourse {
  id: number
  name: string
  code: string
  semesters: FacultyTeachingOptionSemester[]
}

export interface FacultyTeachingOptionDepartment {
  id: number
  name: string
  code: string
  courses: FacultyTeachingOptionCourse[]
}

export interface FacultyTeachingOptionInstitution {
  id: number
  name: string
  code: string
  departments: FacultyTeachingOptionDepartment[]
}

export interface FacultyTeachingResponse {
  require_approval: boolean
  selections: FacultyTeachingSelection[]
  options: FacultyTeachingOptionInstitution[]
}

export async function getFacultyTeaching() {
  const response = await api.get<FacultyTeachingResponse>("/faculty/teaching")
  return response.data
}

export async function addFacultyTeaching(payload: { section_id: number; subject: string }) {
  const response = await api.post<{ status: "active" | "pending" }>("/faculty/teaching", payload)
  return response.data
}

export async function addFacultyTeachingBulk(
  items: Array<{ section_id: number; subject: string }>,
) {
  const response = await api.post<{ status: "active" | "pending"; added: number; skipped: number }>(
    "/faculty/teaching/bulk",
    { items },
  )
  return response.data
}

export async function removeFacultyTeaching(selectionId: number) {
  const response = await api.delete<{ status: string; id: number }>(
    `/faculty/teaching/${selectionId}`,
  )
  return response.data
}

export interface FacultyAddStudentResult {
  name: string
  email: string
  password: string
  scholar_number: string
}

export async function facultyAddStudent(payload: {
  section_id: number
  name: string
  scholar_number: string
  email?: string
}) {
  const response = await api.post<FacultyAddStudentResult>("/faculty/students/add", payload)
  return response.data
}

export interface FacultyBulkImportResult {
  created: FacultyAddStudentResult[]
  skipped: Array<{ row: number; name: string; reason: string }>
  created_count: number
  skipped_count: number
}

export async function facultyBulkImportStudents(sectionId: number, file: File) {
  const form = new FormData()
  form.append("file", file)
  const response = await api.post<FacultyBulkImportResult>(
    `/faculty/students/bulk-import?section_id=${sectionId}`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  )
  return response.data
}

export interface FacultyCaseBulkUploadResult {
  created: Array<{ row: number; file: string; id: number; title: string }>
  errors: Array<{ row: number; file: string; title: string; reason: string }>
  created_count: number
  error_count: number
}

// Accepts one or more .docx/.pdf documents in a single upload — each may
// contain one or several case studies (the backend AI-splits and extracts
// them independently), so "one document" and "multiple documents" both
// funnel through this same call.
export async function bulkUploadFacultyCases(files: File[]) {
  const form = new FormData()
  files.forEach((file) => form.append("files", file))
  const response = await api.post<FacultyCaseBulkUploadResult>(
    "/faculty/cases/bulk-upload",
    form,
    { headers: { "Content-Type": "multipart/form-data" }, timeout: 300_000 },
  )
  return response.data
}

// Downloads a .docx with labeled sections the backend can parse directly
// (no AI needed) — filling it in makes bulk-upload extraction instant and
// immune to the AI mis-mapping a field from free-form prose.
export async function downloadBulkUploadCaseTemplate() {
  const response = await api.get("/faculty/cases/bulk-upload/template", { responseType: "blob" })
  const url = window.URL.createObjectURL(response.data as Blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "pcdc-case-study-template.docx"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
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

export async function assignCaseToStudents(
  caseId: number,
  payload: { student_ids: number[]; due_date?: string; instructions?: string },
) {
  const response = await api.post<{
    case_id: number
    requested: number
    matched: number
    newly_assigned: number
    skipped: number
  }>(`/faculty/cases/${caseId}/assign-students`, payload)
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

export interface FacultyAttemptMarks {
  written_awarded: number
  written_total: number
  rapid_awarded: number
  rapid_total: number
  total_awarded: number
  total_max: number
}

export interface FacultyAttemptListItem {
  attempt_id: number
  student_id: number
  student_name: string
  student_email: string
  case_id: number
  case_title: string
  status: string
  attempted_at: string | null
  total_score: number | null
  grade: string | null
  marks: FacultyAttemptMarks | null
}

export interface FacultyAttemptsResponse {
  context: "case" | "student"
  context_id: number
  title: string
  items: FacultyAttemptListItem[]
  total: number
}

export async function getFacultyCaseAttempts(caseId: number) {
  const response = await api.get<FacultyAttemptsResponse>(`/faculty/cases/${caseId}/attempts`)
  return response.data
}

export async function getFacultyStudentAttempts(studentUserId: number) {
  const response = await api.get<FacultyAttemptsResponse>(
    `/faculty/students/${studentUserId}/attempts`,
  )
  return response.data
}

export interface FacultyEvaluationQuestion {
  question_number: number
  marks_awarded: number
  marks_total: number
  feedback: string
  improvement: string
}

export interface FacultyRapidFireScore {
  sequence: number
  marks_awarded: number
  feedback: string
}

export interface FacultyCapabilityScore {
  capability: string
  score: number
  justification: string
}

export interface FacultyEvaluation {
  total_score: number
  thinking_depth: number
  logic_score: number
  creativity_score: number
  practicality_score: number
  risk_awareness_score: number
  reflection_score: number
  question_scores: FacultyEvaluationQuestion[]
  // Rapid fire is 3 independently-graded 1-mark questions, not a single
  // 0-100 score rescaled to a fraction.
  rapid_fire_scores: FacultyRapidFireScore[]
  rapid_fire_feedback: string
  capability_scores: FacultyCapabilityScore[]
  strengths: string
  weaknesses: string
  blind_spots: string
  improvement_areas: string
  overall_grade: string
  grade_comment: string
}

export interface FacultyAttemptDetail {
  attempt_id: number
  student_name: string
  student_email: string
  case_title: string
  status: string
  initial_summary: string | null
  initial_analysis: string | null
  rapid_fire_answers: string | null
  evaluation: FacultyEvaluation | null
  marks: FacultyAttemptMarks | null
}

export async function getFacultyAttemptDetail(attemptId: number) {
  const response = await api.get<FacultyAttemptDetail>(`/faculty/attempts/${attemptId}`)
  return response.data
}

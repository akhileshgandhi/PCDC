import api from "./axios"

// Job simulations (handover section 9.3). Student calls never return answer
// formulas or expected values; the server evaluates and marks everything.

export type CellFormat = "general" | "number" | "currency" | "percent"

export const CELL_FORMATS: Array<{ value: CellFormat; label: string }> = [
  { value: "general", label: "General" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency (₹)" },
  { value: "percent", label: "Percent" },
]

export interface JobsimTask {
  id: number
  position: number
  type: "spreadsheet" | "memo" | "presentation"
  stage: string | null
  prompt: string
  config: {
    cell_label?: string
    must_use_formula?: boolean
    required_sections?: string[]
    min_words?: number
    min_slides?: number
  }
  max_score: number
  has_hint: boolean
  result: "pending" | "correct" | "incorrect" | "scoring" | "scored"
  check_count: number
  hint_used: boolean
}

export interface SavedCell {
  input: string
  format: CellFormat
}

export interface JobsimAttempt {
  attempt_id: number
  status: "in_progress" | "submitted" | "scored"
  /** Set once the attempt is submitted (sum of task scores). */
  total_score: number | null
  started_at: string
  deadline_at: string
  remaining_seconds: number
  simulation: {
    id: number
    title: string
    description: string | null
    role: string | null
    level: string | null
    duration_minutes: number
  }
  dataset: { columns: string[]; rows: Array<Array<string | number | boolean | null>> }
  tasks: JobsimTask[]
  saved: {
    cells: Record<string, SavedCell>
    memo: unknown
    slides: unknown
    last_task_id: number | null
  }
}

export interface CellEvaluation {
  display: string
  value_type: "number" | "text" | "boolean" | "blank" | "error"
  error: string | null
  message: string
  is_formula: boolean
  format: CellFormat
}

export interface CheckResult {
  status: "correct" | "incorrect"
  message: string
  display: string
}

export type SimulationStatus = "not_started" | "in_progress" | "time_up" | "completed"

interface SimulationProgress {
  task_count: number
  spreadsheet_tasks: number
  memo_tasks: number
  presentation_tasks: number
  status: SimulationStatus
  attempt_id: number | null
  progress_pct: number
}

export interface AssignedSimulation extends SimulationProgress {
  id: number
  title: string
  description: string | null
  role: string
  level: string | null
  subject: string | null
  duration_minutes: number
  due_date: string | null
}

export interface SimulationDetail extends AssignedSimulation {
  stages: Array<{ name: string; tasks: number; types: Array<JobsimTask["type"]> }>
  skills: string[]
  dataset_summary: { columns: string[]; rows: number }
}

export async function getAssignedSimulations() {
  const response = await api.get<{ items: AssignedSimulation[]; total: number }>("/jobsim/assigned")
  return response.data
}

export async function getSimulationDetail(simulationId: number) {
  const response = await api.get<SimulationDetail>(`/jobsim/${simulationId}`)
  return response.data
}

export async function getJobsimHint(attemptId: number, taskId: number) {
  const response = await api.post<{ hint: string | null }>(
    `/jobsim/attempts/${attemptId}/tasks/${taskId}/hint`,
  )
  return response.data
}

export async function startJobsimAttempt(simulationId: number) {
  const response = await api.post<JobsimAttempt>(`/jobsim/${simulationId}/attempt`)
  return response.data
}

export async function getJobsimAttempt(attemptId: number) {
  const response = await api.get<JobsimAttempt>(`/jobsim/attempts/${attemptId}`)
  return response.data
}

export async function saveJobsimState(
  attemptId: number,
  state: {
    cells?: Record<string, SavedCell>
    memo?: unknown
    slides?: unknown
    last_task_id?: number | null
  },
) {
  const response = await api.put<{ saved: boolean; saved_at: string }>(
    `/jobsim/attempts/${attemptId}/state`,
    state,
  )
  return response.data
}

export async function evaluateJobsimCell(attemptId: number, input: string, format: CellFormat) {
  const response = await api.post<CellEvaluation>(`/jobsim/attempts/${attemptId}/evaluate`, {
    input,
    format,
  })
  return response.data
}

export async function checkJobsimTask(
  attemptId: number,
  taskId: number,
  input: string,
  format: CellFormat,
) {
  const response = await api.post<CheckResult>(
    `/jobsim/attempts/${attemptId}/tasks/${taskId}/check`,
    { input, format },
  )
  return response.data
}

// ---------------------------------------------------------------------------
// Faculty / admin: build simulations
// ---------------------------------------------------------------------------

export type SimulationAuthorStatus = "draft" | "approved" | "published" | "withdrawn"
export type DatasetCell = string | number | boolean | null

export interface SimulationDataset {
  columns: string[]
  rows: DatasetCell[][]
}

export interface AuthorTask {
  id?: number
  type: "spreadsheet" | "memo" | "presentation"
  stage: string | null
  prompt: string
  hint: string | null
  config: { cell_label?: string; must_use_formula?: boolean; [key: string]: unknown }
  rubric?: unknown
  max_score: number
  answer_formula: string | null
  expected_format: CellFormat | null
  verified_at?: string | null
}

export interface AuthorSimulation {
  id: number
  title: string
  description: string | null
  role: string | null
  level: string | null
  duration_minutes: number
  course_id: number | null
  subject: string | null
  semester: number | null
  status: SimulationAuthorStatus
  dataset: SimulationDataset
  can_regenerate_dataset: boolean
  skills: Array<{ id: number; name: string }>
  tasks: AuthorTask[]
  created_at: string
  updated_at: string
}

export interface AuthorSimulationListItem {
  id: number
  title: string
  role: string | null
  level: string | null
  subject: string | null
  status: SimulationAuthorStatus
  duration_minutes: number
  task_count: number
  attempt_count: number
  row_count: number
  updated_at: string
}

export interface SimulationSavePayload {
  title: string
  description?: string | null
  role?: string | null
  level?: string | null
  duration_minutes: number
  subject?: string | null
  semester?: number | null
  dataset: SimulationDataset
  tasks: AuthorTask[]
  capability_ids?: number[]
  dataset_uploaded?: boolean
}

export interface SimulationBrief {
  role: string
  subject?: string
  semester?: number | null
  level?: string
  duration_minutes: number
  task_count: number
  capability_ids: number[]
  notes?: string
}

export interface DraftJob {
  job_id: number
  status: "queued" | "running" | "done" | "failed"
  error: string | null
  simulation_id: number | null
  dropped: string[]
}

export async function listAuthorSimulations() {
  const response = await api.get<{ items: AuthorSimulationListItem[]; total: number }>("/faculty/jobsim")
  return response.data
}

export async function getAuthorSimulation(simulationId: number) {
  const response = await api.get<AuthorSimulation>(`/faculty/jobsim/${simulationId}`)
  return response.data
}

export async function createAuthorSimulation(payload: SimulationSavePayload) {
  const response = await api.post<AuthorSimulation>("/faculty/jobsim", payload)
  return response.data
}

export async function updateAuthorSimulation(simulationId: number, payload: SimulationSavePayload) {
  const response = await api.put<AuthorSimulation>(`/faculty/jobsim/${simulationId}`, payload)
  return response.data
}

export async function approveAuthorSimulation(simulationId: number) {
  const response = await api.post<AuthorSimulation>(`/faculty/jobsim/${simulationId}/approve`)
  return response.data
}

// AI questions for uploaded data. Nothing is saved until faculty save the draft.
export async function generateSimulationQuestions(payload: {
  dataset: { columns: string[]; rows: Array<Array<string | number | boolean | null>> }
  count: number
  title: string
  description: string
  role: string
  subject: string
  level: string
  focus: string
  existing: Array<Pick<AuthorTask, "type" | "prompt" | "answer_formula">>
}) {
  const response = await api.post<{ tasks: AuthorTask[]; dropped: string[] }>("/faculty/jobsim/questions/generate", payload)
  return response.data
}

export async function regenerateSimulationData(simulationId: number) {
  const response = await api.post<AuthorSimulation>(`/faculty/jobsim/${simulationId}/dataset/regenerate`)
  return response.data
}

export async function testAuthorFormula(dataset: SimulationDataset, input: string, format: CellFormat) {
  const response = await api.post<CellEvaluation>("/faculty/jobsim/evaluate", { dataset, input, format })
  return response.data
}

export async function startSimulationDraft(brief: SimulationBrief) {
  const response = await api.post<{ job_id: number; status: string }>("/faculty/jobsim/drafts", brief)
  return response.data
}

export async function getSimulationDraft(jobId: number) {
  const response = await api.get<DraftJob>(`/faculty/jobsim/drafts/${jobId}`)
  return response.data
}

export async function getCapabilityOptions() {
  const response = await api.get<Array<{ id: number; name: string }>>("/faculty/capabilities")
  return response.data
}

// --- assigning (faculty / admin) ---------------------------------------

export interface SimulationAssignment {
  id: number
  kind: "section" | "student"
  name: string | null
  due_date: string | null
  status: "active" | "closed"
  assigned_by_name: string | null
  created_at: string
  students: number
  started: number
  completed: number
}

export async function assignSimulationToSections(simulationId: number, sectionIds: number[], dueDate?: string) {
  const response = await api.post<{
    assignments: Array<{ section_id: number; section_name: string; matched_students: number; newly_assigned: number }>
  }>(`/faculty/jobsim/${simulationId}/assign-sections`, { section_ids: sectionIds, due_date: dueDate || null })
  return response.data
}

export async function assignSimulationToStudents(simulationId: number, studentIds: number[], dueDate?: string) {
  const response = await api.post<{ requested: number; matched: number; newly_assigned: number; skipped: number }>(
    `/faculty/jobsim/${simulationId}/assign-students`,
    { student_ids: studentIds, due_date: dueDate || null },
  )
  return response.data
}

export async function getSimulationAssignments(simulationId: number) {
  const response = await api.get<{ items: SimulationAssignment[] }>(`/faculty/jobsim/${simulationId}/assignments`)
  return response.data
}

export async function closeSimulationAssignment(assignmentId: number) {
  const response = await api.patch<{ id: number; status: string }>(`/faculty/jobsim/assignments/${assignmentId}/close`)
  return response.data
}

// --- admin publish queue -------------------------------------------------

export interface AdminSimulationListItem extends AuthorSimulationListItem {
  semester: number | null
  created_by_name: string | null
  published_by_name: string | null
  assignment_count: number
}

export async function listAdminSimulations() {
  const response = await api.get<{
    items: AdminSimulationListItem[]
    total: number
    counts: Record<"approved" | "published" | "withdrawn", number>
  }>("/admin/jobsim")
  return response.data
}

export async function publishSimulation(simulationId: number) {
  const response = await api.post<AuthorSimulation>(`/admin/jobsim/${simulationId}/publish`)
  return response.data
}

export async function withdrawSimulation(simulationId: number) {
  const response = await api.post<AuthorSimulation>(`/admin/jobsim/${simulationId}/withdraw`)
  return response.data
}

export type ReviewStatus = "correct" | "incorrect" | "not_answered"

export interface JobsimResults {
  attempt_id: number
  simulation: { id: number; title: string }
  finished_at: string | null
  marks: number
  max_marks: number
  percent: number
  correct: number
  incorrect: number
  not_answered: number
  unscored_parts: string[]
  tasks: Array<{
    position: number
    stage: string | null
    prompt: string
    student_input: string
    student_display: string
    format_label: string
    status: ReviewStatus
    reason: string
    marks: number
    max_marks: number
    marks_changed: boolean
  }>
}

export async function finishJobsimAttempt(attemptId: number) {
  const response = await api.post<{ attempt_id: number; status: string }>(`/jobsim/attempts/${attemptId}/finish`)
  return response.data
}

export async function getJobsimResults(attemptId: number) {
  const response = await api.get<JobsimResults>(`/jobsim/attempts/${attemptId}/results`)
  return response.data
}

// Faculty review. These are the only calls that return expected answers.

export interface SimulationResults {
  simulation: { id: number; title: string }
  task_count: number
  max_marks: number
  tasks: Array<{
    task_id: number
    position: number
    stage: string | null
    prompt: string
    max_marks: number
  }>
  items: Array<{
    attempt_id: number
    student_name: string
    college_id: string | null
    section_id: number | null
    section_name: string | null
    section_label: string | null
    status: "in_progress" | "submitted"
    started_at: string
    finished_at: string | null
    marks: number
    correct: number
    incorrect: number
    not_answered: number
    task_results: Array<{
      task_id: number
      status: ReviewStatus
      marks: number
      marks_changed: boolean
    }>
  }>
}

export interface MarksChange {
  original_marks: number
  new_marks: number
  changed_by: string | null
  changed_at: string
  note: string | null
}

export interface AttemptReviewTask {
  task_id: number
  task_result_id: number | null
  position: number
  stage: string | null
  prompt: string
  must_use_formula: boolean
  expected_formula: string
  student_input: string
  student_display: string
  student_format: CellFormat
  student_format_label: string
  expected_display: string
  expected_format: CellFormat
  expected_format_label: string
  status: ReviewStatus
  value_correct: boolean
  format_correct: boolean
  reason: string
  marks: number
  max_marks: number
  check_count: number
  hint_used: boolean
  changed_after_check: boolean
  marks_changes: MarksChange[]
}

export interface AttemptReview {
  attempt_id: number
  simulation: { id: number; title: string }
  student_name: string
  college_id: string | null
  status: "in_progress" | "submitted"
  started_at: string
  finished_at: string | null
  seed: string
  marks: number
  max_marks: number
  correct: number
  incorrect: number
  not_answered: number
  tasks: AttemptReviewTask[]
}

export async function getSimulationResults(simulationId: number) {
  const response = await api.get<SimulationResults>(`/faculty/jobsim/${simulationId}/results`)
  return response.data
}

export async function downloadSimulationResults(simulationId: number) {
  const response = await api.get(`/faculty/jobsim/${simulationId}/results.csv`, { responseType: "blob" })
  const url = window.URL.createObjectURL(response.data as Blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `simulation-${simulationId}-results.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function changeTaskMarks(taskResultId: number, score: number, note: string) {
  const response = await api.put<AttemptReview>(`/faculty/jobsim/task-results/${taskResultId}/score`, {
    score,
    note: note.trim() || null,
  })
  return response.data
}

export async function getSimulationAttemptReview(attemptId: number) {
  const response = await api.get<AttemptReview>(`/faculty/jobsim/attempts/${attemptId}`)
  return response.data
}

export async function sendBackSimulation(simulationId: number, note?: string) {
  const response = await api.post<AuthorSimulation>(`/admin/jobsim/${simulationId}/send-back`, { note: note || null })
  return response.data
}

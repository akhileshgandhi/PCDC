import type { FullscreenEvent, FullscreenStatus } from "../utils/studentGuard"
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
    /** What to write under each required section. */
    section_notes?: Record<string, string>
    min_words?: number
    min_slides?: number
    /** The slides the deck should have, each with a note on what goes there. */
    slide_plan?: SlidePlanItem[]
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

export interface SlidePlanItem {
  title: string
  guide: string
}

/** One slide: a title and its bullet points (handover 8.3). */
export interface Slide {
  title: string
  points: string[]
}

export interface SavedDeck {
  slides: Slide[]
  text: string
  word_count: number
}

export interface SavedMemo {
  doc: Record<string, unknown>
  text: string
  word_count: number
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
    /** By task id. */
    memo: Record<string, SavedMemo> | null
    /** By task id. */
    slides: Record<string, SavedDeck> | null
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
  assigned_at: string | null
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

export async function submitJobsimMemo(attemptId: number, taskId: number, doc: unknown) {
  const response = await api.post<{ status: "scoring" | "scored" }>(
    `/jobsim/attempts/${attemptId}/tasks/${taskId}/submit`,
    { doc },
  )
  return response.data
}

export async function submitJobsimSlides(attemptId: number, taskId: number, slides: Slide[]) {
  const response = await api.post<{ status: "scoring" | "scored" }>(
    `/jobsim/attempts/${attemptId}/tasks/${taskId}/submit`,
    { slides },
  )
  return response.data
}

export async function saveJobsimState(
  attemptId: number,
  state: {
    cells?: Record<string, SavedCell>
    /** By task id. The server builds the plain text itself. */
    memo?: Record<string, { doc: unknown }>
    /** By task id. */
    slides?: Record<string, { slides: Slide[] }>
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
// Faculty: build simulations
// ---------------------------------------------------------------------------

export type SimulationAuthorStatus = "draft" | "approved" | "published" | "withdrawn"
export type DatasetCell = string | number | boolean | null

export interface SimulationDataset {
  columns: string[]
  rows: DatasetCell[][]
}

export interface MemoRubric {
  criteria: Array<{ name: string; max: number }>
}

export interface AuthorTask {
  id?: number
  type: "spreadsheet" | "memo" | "presentation"
  stage: string | null
  prompt: string
  hint: string | null
  config: { cell_label?: string; must_use_formula?: boolean; [key: string]: unknown }
  rubric?: MemoRubric | null
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
  /** Set while a draft is back with its author after an admin sent it back. */
  sent_back?: { at: string; note: string | null } | null
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
  /** Sent back by an admin (faculty list only). */
  sent_back?: boolean
  /** ...and the author hasn't opened it since. */
  sent_back_unseen?: boolean
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
  /** Ask the AI to draft a memo brief and rubric too. */
  include_memo?: boolean
  /** Ask the AI to draft a slide deck brief, slide plan and rubric too. */
  include_presentation?: boolean
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

/** The faculty's simulations sent back by an admin and not opened since. */
export async function getSentBackSimulationCount() {
  const response = await api.get<{ sent_back: number }>("/faculty/jobsim/sent-back-count")
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

// --- publishing (faculty, direct — no admin approval step) ---------------

export async function publishSimulation(simulationId: number) {
  const response = await api.post<AuthorSimulation>(`/faculty/jobsim/${simulationId}/publish`)
  return response.data
}

export async function withdrawSimulation(simulationId: number) {
  const response = await api.post<AuthorSimulation>(`/faculty/jobsim/${simulationId}/withdraw`)
  return response.data
}

// --- admin: read-only visibility (no edit/publish/withdraw/assign) -------

export interface AdminSimulationListItem extends AuthorSimulationListItem {
  semester: number | null
  created_by_name: string | null
  published_by_name: string | null
  assignment_count: number
}

export type AdminSimulationTask = Omit<AuthorTask, "answer_formula" | "expected_format" | "verified_at">

export interface AdminSimulationDetail extends Omit<AuthorSimulation, "tasks"> {
  tasks: AdminSimulationTask[]
}

/** Every non-draft simulation in this admin's institute scope — view only,
 * faculty own the whole lifecycle including publish and withdraw. */
export async function listAdminSimulations() {
  const response = await api.get<{
    items: AdminSimulationListItem[]
    total: number
    counts: Record<"approved" | "published" | "withdrawn", number>
  }>("/admin/jobsim")
  return response.data
}

/** Read-only detail, same shape as the author's view minus the answer key. */
export async function getAdminSimulation(simulationId: number) {
  const response = await api.get<AdminSimulationDetail>(`/admin/jobsim/${simulationId}`)
  return response.data
}

export type ReviewStatus = "correct" | "incorrect" | "not_answered"

/** not_started: the attempt is open and the memo isn't submitted. review: the AI
 * couldn't mark it reliably, so faculty will. delayed: the AI kept failing. */
export type MemoStatus = "not_started" | "pending" | "delayed" | "review" | "scored"

export interface StudentMemoResult {
  position: number
  stage: string | null
  prompt: string
  status: MemoStatus
  marks: number
  max_marks: number
  feedback: string | null
  marks_changed: boolean
}

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
  memos: StudentMemoResult[]
  memos_pending: number
  decks: StudentMemoResult[]
  decks_pending: number
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

/** The student entered or left full screen. The third exit submits the attempt. */
export async function recordJobsimFullscreen(attemptId: number, event: FullscreenEvent) {
  const response = await api.post<FullscreenStatus>(`/jobsim/attempts/${attemptId}/fullscreen`, { event })
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
    memo_results: WrittenResult[]
    deck_results: WrittenResult[]
  }>
  memo_tasks: WrittenTask[]
  deck_tasks: WrittenTask[]
}

export interface WrittenResult {
  task_id: number
  status: MemoStatus
  marks: number
  marks_changed: boolean
}

export interface WrittenTask {
  task_id: number
  position: number
  stage: string | null
  prompt: string
  max_marks: number
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
  memos: AttemptReviewMemo[]
  decks: AttemptReviewDeck[]
}

export interface AttemptReviewDeck {
  task_id: number
  task_result_id: number | null
  position: number
  stage: string | null
  prompt: string
  min_slides: number
  slide_plan: SlidePlanItem[]
  rubric: Array<{ name: string; max: number }>
  status: MemoStatus
  marked_by: "auto" | "ai" | "faculty" | null
  marks: number
  max_marks: number
  slides: Slide[]
  ai_criteria: Array<{ name: string; max: number; score: number; reason: string; evidence: string }>
  ai_feedback: string | null
  ai_problems: string[]
  can_rescore: boolean
  marks_changes: MarksChange[]
}

/** A saved memo as stored by the server: headings, paragraphs, lists, bold and italics only. */
export interface MemoNode {
  type: string
  text?: string
  attrs?: { level?: number }
  marks?: Array<{ type: string }>
  content?: MemoNode[]
}

export interface AttemptReviewMemo {
  task_id: number
  task_result_id: number | null
  position: number
  stage: string | null
  prompt: string
  required_sections: string[]
  min_words: number
  rubric: Array<{ name: string; max: number }>
  status: MemoStatus
  marked_by: "auto" | "ai" | "faculty" | null
  marks: number
  max_marks: number
  doc: MemoNode | null
  word_count: number
  ai_criteria: Array<{ name: string; max: number; score: number; reason: string; evidence: string }>
  ai_feedback: string | null
  ai_problems: string[]
  can_rescore: boolean
  marks_changes: MarksChange[]
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

export async function rescoreMemo(taskResultId: number) {
  const response = await api.post<AttemptReview>(`/faculty/jobsim/task-results/${taskResultId}/rescore`)
  return response.data
}

export async function getSimulationAttemptReview(attemptId: number) {
  const response = await api.get<AttemptReview>(`/faculty/jobsim/attempts/${attemptId}`)
  return response.data
}

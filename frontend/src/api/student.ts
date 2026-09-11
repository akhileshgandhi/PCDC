import api from "./axios"

export interface StudentCapabilityScore {
  capability: string
  score: number
}

export interface StudentUpcomingSession {
  id: number
  session_type: string
  scheduled_at: string
  mentor_name: string
}

export interface StudentActiveCase {
  case_id: number
  title: string
  domain: string
  difficulty: number
  case_code: string | null
  subject: string | null
  difficulty_label: string | null
  due_date: string | null
  started: boolean
}

export interface StudentDashboardSummary {
  overall_capability_score: number
  capability_scores: StudentCapabilityScore[]
  pending_simulations: number
  completed_simulations: number
  current_level: number | null
  level_label: string | null
  hero_message: string
  active_case: StudentActiveCase | null
  upcoming_session: StudentUpcomingSession | null
}

export async function getStudentDashboardSummary() {
  const response = await api.get<StudentDashboardSummary>("/student/dashboard/summary")
  return response.data
}

export interface StudentMentor {
  name: string
  initials: string
}

export interface StudentProfile {
  student_id: number
  current_level: number | null
  full_name: string | null
  email: string | null
  course_name: string | null
  batch_name: string | null
  section_name: string | null
  semester_number: number | null
  semester_name: string | null
  mentor_name: string | null
  career_track_name: string | null
  mentor: StudentMentor | null
}

export async function getStudentProfile() {
  const response = await api.get<StudentProfile>("/student/profile")
  return response.data
}

export interface CapabilityMatrixItem {
  name: string
  score: number
  attempts: number
}

export interface CapabilityMatrixCategory {
  id: string
  label: string
  score: number
  items: CapabilityMatrixItem[]
}

export interface StudentCapabilityMatrix {
  categories: CapabilityMatrixCategory[]
  overall_score: number
  total_attempts: number
}

export async function getStudentDashboardCapabilities() {
  const response = await api.get<StudentCapabilityMatrix>("/student/dashboard/capabilities")
  return response.data
}

export interface SimulationCapability {
  name: string
  score: number
}

export interface SimulationGroup {
  name: string
  capabilities: SimulationCapability[]
}

export interface ConceptStudyPlaceholder {
  status: "coming_soon"
  groups: string[]
}

export interface StudentActiveEngagements {
  active_case_study: StudentActiveCase | null
  simulations: { groups: SimulationGroup[] }
  concept_study: ConceptStudyPlaceholder
}

export interface StudentRecentEvaluation {
  title: string
  date: string | null
  score: number
  status: string
}

export async function getStudentRecentEvaluations() {
  const response = await api.get<{ items: StudentRecentEvaluation[] }>(
    "/student/recent-evaluations",
  )
  return response.data.items
}

export interface StudentBadge {
  key: string
  label: string
  description: string
  earned: boolean
}

export interface StudentAchievementStats {
  badges_earned: number
  streak_days: number
  total_points: number
  cohort_rank: number | null
  cohort_size: number
}

export interface StudentLeaderboardRow {
  rank: number
  name: string
  score: number
  level: number
  cases: number
  self: boolean
}

export interface StudentMilestoneItem {
  title: string
  date: string
  status: "done" | "pending"
}

export interface StudentAchievements {
  badges: StudentBadge[]
  earned_count: number
  next_milestone: { label: string; current: number; target: number }
  stats: StudentAchievementStats
  leaderboard: StudentLeaderboardRow[]
  milestones: StudentMilestoneItem[]
}

export async function getStudentAchievements() {
  const response = await api.get<StudentAchievements>("/student/achievements")
  return response.data
}

export interface StudentPathwayFocus {
  capability: string
  score: number
}

export interface StudentPathwayCase {
  case_id: number
  title: string
  level: string
  domain: string | null
  develops: string[]
}

export interface StudentCareerPathway {
  pathway_name: string
  has_track: boolean
  progress: { developed: number; total: number }
  focus_areas: StudentPathwayFocus[]
  recommended_cases: StudentPathwayCase[]
}

export async function getStudentCareerPathway() {
  const response = await api.get<StudentCareerPathway>("/student/career-pathway")
  return response.data
}

export async function getStudentActiveEngagements() {
  const response = await api.get<StudentActiveEngagements>("/student/active-engagements")
  return response.data
}

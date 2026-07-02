import api from "./axios"

export type AdminUserRole = "student" | "faculty" | "mentor" | "admin" | "director"
export type AdminUserStatus = "active" | "inactive"

export interface AdminUser {
  id: number
  name: string
  email: string
  role: AdminUserRole
  program: string | null
  specialization: string | null
  admission_year: number | null
  status: AdminUserStatus
  last_login_at: string | null
  created_at: string
  updated_at: string | null
  course_name: string | null
  batch_name: string | null
  section_name: string | null
}

export interface AdminUsersResponse {
  items: AdminUser[]
  total: number
  page: number
  page_size: number
}

export interface AdminUserFilters {
  role?: string
  program?: string
  status?: string
  batch?: string
  search?: string
  page?: number
  page_size?: number
}

export interface CreateAdminUserPayload {
  name: string
  email: string
  role: AdminUserRole
  program?: string
  specialization?: string
  admission_year?: number
  mentor_id?: number
  career_track_id?: number
  section_id?: number
}

export interface AdminCourse {
  id: number
  name: string
  code: string
  total_semesters: number
  duration_years: number
  status: "active" | "inactive"
  batch_count: number
  section_count: number
  student_count: number
  faculty_count: number
  created_at: string
}

export interface AdminSemester {
  id: number
  semester_number: number
  name: string
}

export interface AdminBatch {
  id: number
  course_id: number
  name: string
  start_year: number
  end_year: number
  status: "active" | "completed" | "upcoming"
  created_at: string
}

export interface AdminSection {
  id: number
  course_id: number
  name: string
  academic_year: string | null
  status: "active" | "completed"
  semester_number: number
  semester_name: string
  batch_name: string
  student_count: number
  faculty_count: number
}

export interface AdminSectionDetail extends AdminSection {
  faculty: Array<{ id: number; faculty_id: number; faculty_name: string; subject: string }>
  students: Array<{ student_id: number; user_id: number; name: string; email: string }>
}

export interface AdvanceSemesterResult {
  advanced: Array<{
    student_id: number
    student_name: string
    from_section: string
    to_section: string
  }>
  flagged: Array<{
    student_id: number
    student_name: string
    current_section: string
    reason: string
  }>
  advanced_count: number
  flagged_count: number
}

export interface CreateAdminUserResponse {
  user: AdminUser
  onboarding_status: string
}

export interface AdminDashboardSummary {
  total_users: number
  active_today: number
  pending_imports: number
  users_by_role: Partial<Record<AdminUserRole, number>>
  recent_activity: Array<{
    id: number
    event_type: string
    message: string
    created_at: string
  }>
}

export async function getAdminDashboardSummary() {
  const response = await api.get<AdminDashboardSummary>("/admin/dashboard/summary")
  return response.data
}

export async function getAdminUsers(filters: AdminUserFilters = {}) {
  const response = await api.get<AdminUsersResponse>("/admin/users", {
    params: {
      role: filters.role || undefined,
      program: filters.program || undefined,
      status: filters.status || undefined,
      batch: filters.batch || undefined,
      search: filters.search || undefined,
      page: filters.page || 1,
      page_size: filters.page_size || 25,
    },
  })
  return response.data
}

export async function createAdminUser(payload: CreateAdminUserPayload) {
  const response = await api.post<CreateAdminUserResponse>("/admin/users", payload)
  return response.data
}

export async function updateAdminUserStatus(userId: number, status: AdminUserStatus) {
  const response = await api.patch<AdminUser>(`/admin/users/${userId}/status`, { status })
  return response.data
}

export async function updateAdminUserRole(userId: number, role: AdminUserRole) {
  const response = await api.patch<AdminUser>(`/admin/users/${userId}/role`, { role })
  return response.data
}

export async function resetAdminUserPassword(userId: number) {
  const response = await api.post<{ status: string }>(`/admin/users/${userId}/reset-password`)
  return response.data
}

export function userImportTemplateUrl() {
  const baseURL = api.defaults.baseURL || ""
  return `${baseURL}/admin/users/import/template`
}

export async function getAdminCourses() {
  const response = await api.get<{ items: AdminCourse[]; total: number }>("/admin/courses")
  return response.data
}

export async function createAdminCourse(payload: {
  name: string
  code: string
  total_semesters: number
  duration_years: number
}) {
  const response = await api.post<AdminCourse>("/admin/courses", payload)
  return response.data
}

export async function updateAdminCourse(
  courseId: number,
  payload: { name?: string; status?: "active" | "inactive" },
) {
  const response = await api.patch<AdminCourse>(`/admin/courses/${courseId}`, payload)
  return response.data
}

export async function getAdminCourseSemesters(courseId: number) {
  const response = await api.get<{ items: AdminSemester[] }>(
    `/admin/courses/${courseId}/semesters`,
  )
  return response.data
}

export async function getAdminCourseBatches(courseId: number) {
  const response = await api.get<{ items: AdminBatch[] }>(`/admin/courses/${courseId}/batches`)
  return response.data
}

export async function createAdminBatch(
  courseId: number,
  payload: { name: string; start_year: number; end_year: number },
) {
  const response = await api.post<AdminBatch>(`/admin/courses/${courseId}/batches`, payload)
  return response.data
}

export async function getAdminCourseSections(courseId: number) {
  const response = await api.get<{ items: AdminSection[]; total: number }>(
    `/admin/courses/${courseId}/sections`,
  )
  return response.data
}

export async function createAdminSection(
  courseId: number,
  payload: { semester_id: number; batch_id: number; name: string; academic_year?: string },
) {
  const response = await api.post<AdminSection>(
    `/admin/courses/${courseId}/sections`,
    payload,
  )
  return response.data
}

export async function getAdminSection(sectionId: number) {
  const response = await api.get<AdminSectionDetail>(`/admin/sections/${sectionId}`)
  return response.data
}

export async function assignAdminSectionFaculty(
  sectionId: number,
  payload: { faculty_id: number; subject: string },
) {
  const response = await api.post<{ id: number; already_assigned: boolean }>(
    `/admin/sections/${sectionId}/faculty`,
    payload,
  )
  return response.data
}

export async function enrollAdminSectionStudents(sectionId: number, studentUserIds: number[]) {
  const response = await api.post<{ enrolled: unknown[]; count: number }>(
    `/admin/sections/${sectionId}/students`,
    { student_user_ids: studentUserIds },
  )
  return response.data
}

export async function advanceBatchSemester(batchId: number) {
  const response = await api.post<AdvanceSemesterResult>(
    `/admin/batches/${batchId}/advance-semester`,
  )
  return response.data
}

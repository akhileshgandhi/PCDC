import api from "./axios"

export type AdminUserRole = "student" | "faculty" | "admin"
export type AdminUserStatus = "active" | "inactive"

export interface AdminUser {
  id: number
  name: string
  email: string
  role: AdminUserRole
  program: string | null
  specialization: string | null
  admission_year: number | null
  department: string | null
  designation: string | null
  employee_id: string | null
  experience_years: number | null
  college_id: string | null
  sections_teaching: number
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
  career_track_id?: number
  section_id?: number
  department?: string
  designation?: string
  employee_id?: string
  experience_years?: number
  college_id?: string
  institution_ids?: number[]
  department_ids?: number[]
}

export interface UpdateAdminUserPayload {
  name?: string
  program?: string
  specialization?: string
  admission_year?: number
  department?: string
  designation?: string
  employee_id?: string
  experience_years?: number
  college_id?: string
}

export async function updateAdminUser(userId: number, payload: UpdateAdminUserPayload) {
  const response = await api.patch<AdminUser>(`/admin/users/${userId}`, payload)
  return response.data
}

export interface AdminCourse {
  id: number
  name: string
  code: string
  total_semesters: number
  duration_years: number
  status: "active" | "inactive"
  department_id: number | null
  department_name: string | null
  batch_count: number
  section_count: number
  student_count: number
  faculty_count: number
  created_at: string
}

export interface AdminInstitution {
  id: number
  name: string
  code: string
  status: "active" | "inactive"
  department_count: number
  created_at: string
}

export interface AdminDepartment {
  id: number
  name: string
  code: string
  status: "active" | "inactive"
  course_count: number
  institution_id: number | null
  institution_name: string | null
  created_at: string
}

export interface AdminSubject {
  id: number
  name: string
  code: string | null
  status: "active" | "inactive"
  department_id: number | null
  department_name: string | null
  course_id: number | null
  course_name: string | null
  semester_id: number | null
  semester_name: string | null
  created_at: string
}

export interface AcademicSummary {
  institutions: number
  departments: number
  courses: number
  batches: number
  semesters: number
  sections: number
  subjects: number
}

export interface AdminBatchRow {
  id: number
  name: string
  start_year: number
  end_year: number
  status: string
  course_id: number
  course_name: string
  course_code: string
  section_count: number
  created_at: string
}

export interface AdminSemesterRow {
  id: number
  semester_number: number
  name: string
  course_id: number
  course_name: string
  course_code: string
  section_count: number
  subject_count: number
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

export interface AdminSectionListItem {
  id: number
  course_id: number
  course_name: string
  batch_id: number
  batch_name: string
  name: string
  academic_year: string | null
  status: "active" | "completed"
  semester_number: number
  semester_name: string
  student_count: number
  faculty_count: number
  cases_assigned_count: number
  faculty: Array<{ faculty_id: number; faculty_name: string; subject: string }>
}

export interface AdminSectionFilters {
  course_id?: number
  batch_id?: number
  status?: string
}

export interface AdminSectionBulkEnrollResult {
  enrolled: Array<{ row: number; email: string }>
  enrolled_count: number
  errors: Array<{ row: number; email: string; error: string }>
  error_count: number
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

export interface AdminUserLoginEvent {
  id: number
  user_agent: string | null
  ip_address: string | null
  created_at: string
}

export interface AdminUserDetail extends AdminUser {
  login_history: AdminUserLoginEvent[]
}

export async function getAdminUser(userId: number) {
  const response = await api.get<AdminUserDetail>(`/admin/users/${userId}`)
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
  const response = await api.post<{ status: "reset_email_sent" | "reset_email_failed" }>(
    `/admin/users/${userId}/reset-password`,
  )
  return response.data
}

export async function downloadImportTemplate(role?: string) {
  const params = role ? `?role=${encodeURIComponent(role)}` : ""
  const response = await api.get(`/admin/users/import/template${params}`, {
    responseType: "blob",
  })
  const disposition = response.headers["content-disposition"] || ""
  const match = disposition.match(/filename=(.+)/)
  const filename = match ? match[1] : "pcdc-user-import-template.csv"
  const url = window.URL.createObjectURL(response.data as Blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function getAdminAcademicSummary() {
  const response = await api.get<AcademicSummary>("/admin/academic/summary")
  return response.data
}

export interface AdminNotification {
  id: number
  event_type: string
  message: string
  created_at: string
}

export async function getAdminNotifications(limit = 20) {
  const response = await api.get<{ items: AdminNotification[]; total: number }>(
    "/admin/notifications",
    { params: { limit } },
  )
  return response.data
}

export type FacultyState = "awaiting" | "active" | "needs_attention"

export interface AdminFacultyRow {
  id: number
  name: string
  email: string
  department: string | null
  status: "active" | "inactive"
  joined: boolean
  subject_count: number
  section_count: number
  state: FacultyState
}

export async function getAdminFaculty() {
  const response = await api.get<{ items: AdminFacultyRow[]; total: number }>("/admin/faculty")
  return response.data
}

export interface TeachingApprovalItem {
  id: number
  subject: string
  section_name: string
  course_name: string
  semester_name: string
}

export interface TeachingApprovalPending {
  faculty_id: number
  faculty_name: string
  items: TeachingApprovalItem[]
}

export interface TeachingApprovalsResponse {
  require_approval: boolean
  pending: TeachingApprovalPending[]
  approved: TeachingApprovalPending[]
}

export async function getTeachingApprovals() {
  const response = await api.get<TeachingApprovalsResponse>("/admin/teaching-approvals")
  return response.data
}

export async function setTeachingApprovalSetting(requireApproval: boolean) {
  const response = await api.patch<{ require_approval: boolean }>(
    "/admin/teaching-approvals/settings",
    { require_approval: requireApproval },
  )
  return response.data
}

export async function approveTeachingSelection(selectionId: number) {
  const response = await api.post<{ status: string; id: number }>(
    `/admin/teaching-approvals/${selectionId}/approve`,
  )
  return response.data
}

export async function rejectTeachingSelection(selectionId: number) {
  const response = await api.post<{ status: string; id: number }>(
    `/admin/teaching-approvals/${selectionId}/reject`,
  )
  return response.data
}

export async function removeTeachingSelection(selectionId: number) {
  const response = await api.post<{ status: string; id: number }>(
    `/admin/teaching-approvals/${selectionId}/remove`,
  )
  return response.data
}

export async function getAdminInstitutions() {
  const response = await api.get<{ items: AdminInstitution[]; total: number }>(
    "/admin/institutions",
  )
  return response.data
}

export async function createAdminInstitution(payload: { name: string; code: string }) {
  const response = await api.post<AdminInstitution>("/admin/institutions", payload)
  return response.data
}

export async function updateAdminInstitution(
  institutionId: number,
  payload: { name?: string; status?: "active" | "inactive" },
) {
  const response = await api.patch<AdminInstitution>(
    `/admin/institutions/${institutionId}`,
    payload,
  )
  return response.data
}

export async function deleteAdminInstitution(institutionId: number) {
  const response = await api.delete<{ status: string; id: number }>(
    `/admin/institutions/${institutionId}`,
  )
  return response.data
}

export async function getAdminDepartments() {
  const response = await api.get<{ items: AdminDepartment[]; total: number }>(
    "/admin/departments",
  )
  return response.data
}

export async function createAdminDepartment(payload: {
  name: string
  code: string
  institution_id?: number | null
}) {
  const response = await api.post<AdminDepartment>("/admin/departments", payload)
  return response.data
}

export async function updateAdminDepartment(
  departmentId: number,
  payload: { name?: string; status?: "active" | "inactive"; institution_id?: number | null },
) {
  const response = await api.patch<AdminDepartment>(
    `/admin/departments/${departmentId}`,
    payload,
  )
  return response.data
}

export async function deleteAdminDepartment(departmentId: number) {
  const response = await api.delete<{ status: string; id: number }>(
    `/admin/departments/${departmentId}`,
  )
  return response.data
}

export async function getAdminAllBatches() {
  const response = await api.get<{ items: AdminBatchRow[]; total: number }>("/admin/batches")
  return response.data
}

export async function getAdminAllSemesters() {
  const response = await api.get<{ items: AdminSemesterRow[]; total: number }>(
    "/admin/semesters",
  )
  return response.data
}

export async function getAdminSubjects() {
  const response = await api.get<{ items: AdminSubject[]; total: number }>("/admin/subjects")
  return response.data
}

export async function createAdminSubject(payload: {
  name: string
  code?: string
  department_id?: number | null
  course_id?: number | null
  semester_id?: number | null
}) {
  const response = await api.post<AdminSubject>("/admin/subjects", payload)
  return response.data
}

export async function updateAdminSubject(
  subjectId: number,
  payload: {
    name?: string
    code?: string
    department_id?: number | null
    course_id?: number | null
    semester_id?: number | null
    status?: "active" | "inactive"
  },
) {
  const response = await api.patch<AdminSubject>(`/admin/subjects/${subjectId}`, payload)
  return response.data
}

export async function deleteAdminSubject(subjectId: number) {
  const response = await api.delete<{ status: string; id: number }>(
    `/admin/subjects/${subjectId}`,
  )
  return response.data
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
  department_id?: number | null
}) {
  const response = await api.post<AdminCourse>("/admin/courses", payload)
  return response.data
}

export async function updateAdminCourse(
  courseId: number,
  payload: { name?: string; status?: "active" | "inactive"; department_id?: number },
) {
  const response = await api.patch<AdminCourse>(`/admin/courses/${courseId}`, payload)
  return response.data
}

export async function deleteAdminCourse(courseId: number) {
  const response = await api.delete<{ status: string; name: string }>(`/admin/courses/${courseId}`)
  return response.data
}

export async function deleteAdminBatch(batchId: number) {
  const response = await api.delete<{ status: string; name: string }>(`/admin/batches/${batchId}`)
  return response.data
}

export async function deleteAdminSemester(semesterId: number) {
  const response = await api.delete<{ status: string; name: string }>(`/admin/semesters/${semesterId}`)
  return response.data
}

export async function deleteAdminSection(sectionId: number) {
  const response = await api.delete<{ status: string; name: string }>(`/admin/sections/${sectionId}`)
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

export async function updateAdminBatch(
  batchId: number,
  payload: { name?: string; start_year?: number; end_year?: number; status?: string },
) {
  const response = await api.patch<AdminBatch>(`/admin/batches/${batchId}`, payload)
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

export async function getAdminSections(filters: AdminSectionFilters = {}) {
  const response = await api.get<{ items: AdminSectionListItem[]; total: number }>(
    "/admin/sections",
    {
      params: {
        course_id: filters.course_id || undefined,
        batch_id: filters.batch_id || undefined,
        status: filters.status || undefined,
      },
    },
  )
  return response.data
}

export async function getAdminSection(sectionId: number) {
  const response = await api.get<AdminSectionDetail>(`/admin/sections/${sectionId}`)
  return response.data
}

// Admin creates a new student login and enrolls them into a section.
export interface AdminAddStudentResult {
  name: string
  email: string | null
  password: string
  scholar_number: string
}

export async function adminAddStudent(payload: {
  section_id: number
  name: string
  scholar_number: string
  email?: string
}) {
  const response = await api.post<AdminAddStudentResult>("/admin/students/add", payload)
  return response.data
}

export interface AdminStudentBulkImportResult {
  created: AdminAddStudentResult[]
  skipped: Array<{ row: number; name: string; reason: string }>
  created_count: number
  skipped_count: number
}

export async function adminBulkImportStudents(sectionId: number, file: File) {
  const form = new FormData()
  form.append("file", file)
  const response = await api.post<AdminStudentBulkImportResult>(
    `/admin/students/bulk-import?section_id=${sectionId}`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  )
  return response.data
}

export interface AdminEligibleStudent {
  id: number
  name: string
  email: string
}

export async function getAdminSectionEligibleStudents(sectionId: number) {
  const response = await api.get<{ items: AdminEligibleStudent[] }>(
    `/admin/sections/${sectionId}/eligible-students`,
  )
  return response.data
}

export async function removeAdminSectionFaculty(sectionId: number, facultyId: number) {
  const response = await api.delete<{ removed_count: number }>(
    `/admin/sections/${sectionId}/faculty/${facultyId}`,
  )
  return response.data
}

export async function removeAdminSectionStudent(sectionId: number, studentId: number) {
  const response = await api.delete<{ removed: boolean }>(
    `/admin/sections/${sectionId}/students/${studentId}`,
  )
  return response.data
}

export async function bulkEnrollAdminSectionStudents(sectionId: number, file: File) {
  const formData = new FormData()
  formData.append("file", file)
  const response = await api.post<AdminSectionBulkEnrollResult>(
    `/admin/sections/${sectionId}/students/bulk`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  )
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

export interface AdminUserImportResult {
  created: Array<{ row: number; name: string; email: string; user_id: number }>
  created_count: number
  errors: Array<{ row: number; email: string; error: string }>
  error_count: number
}

export async function importAdminUsers(file: File, role?: string) {
  const formData = new FormData()
  formData.append("file", file)
  const params = role ? `?role=${encodeURIComponent(role)}` : ""
  const response = await api.post<AdminUserImportResult>(
    `/admin/users/import${params}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  )
  return response.data
}

export async function deleteAdminUser(userId: number) {
  const response = await api.delete<{ status: string; name: string }>(`/admin/users/${userId}`)
  return response.data
}

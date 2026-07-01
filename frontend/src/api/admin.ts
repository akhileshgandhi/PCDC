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

import api from "./axios"

export type PromotionAction = "promote" | "repeat" | "graduate" | "exit"

export interface PromotionSection {
  id: number
  name: string
  semester_number: number
  semester_name: string
  course_id: number
  course_name: string
  course_code: string
  total_semesters: number
  batch_name: string | null
  program_name: string | null
  institution_name: string | null
  student_count: number
}

export interface PromotionSectionDetail {
  section_id: number
  semester_number: number | null
  total_semesters: number | null
  is_final_semester: boolean
  default_action: PromotionAction
  default_target_section_id: number | null
  next_sections: Array<{ id: number; name: string; batch_name: string | null; semester_number: number; semester_name: string }>
  students: Array<{
    student_id: number
    user_id: number
    name: string
    email: string | null
    college_id: string | null
    status: "active" | "inactive"
  }>
}

export interface PromotionResultItem {
  row?: number
  student_id: number | null
  name: string | null
  email?: string | null
  action: string
  from_section?: string | null
  from_semester?: number | null
  to_section?: string | null
  to_semester?: number | null
  ok: boolean
  message: string
}

export interface PromotionResult {
  dry_run: boolean
  items: PromotionResultItem[]
  ok_count: number
  error_count: number
  counts: Record<PromotionAction, number>
}

export async function getPromotionSections() {
  const response = await api.get<{ items: PromotionSection[] }>("/admin/promotion/sections")
  return response.data
}

export async function getPromotionSection(sectionId: number) {
  const response = await api.get<PromotionSectionDetail>(`/admin/promotion/sections/${sectionId}`)
  return response.data
}

export async function applyPromotions(
  items: Array<{ student_id: number; action: PromotionAction; target_section_id?: number | null }>,
  dryRun: boolean,
) {
  const response = await api.post<PromotionResult>(`/admin/promotion/apply?dry_run=${dryRun}`, { items })
  return response.data
}

export async function importPromotions(file: File, dryRun: boolean) {
  const form = new FormData()
  form.append("file", file)
  const response = await api.post<PromotionResult>(`/admin/promotion/import?dry_run=${dryRun}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return response.data
}

export async function downloadPromotionTemplate() {
  const response = await api.get("/admin/promotion/template", { responseType: "blob" })
  const url = window.URL.createObjectURL(response.data as Blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "pcdc-semester-progression-template.csv"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

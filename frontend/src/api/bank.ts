import api from "./axios"

export interface BankEntry {
  id: number
  title: string
  brief: string | null
  subject: string | null
  semester_number: number | null
  semesters: number[]
  difficulty: number
  difficulty_label: string
  source: "uploaded" | "ai_generated" | "case_builder"
  created_by: number | null
  creator_name: string | null
  creator_role: string | null
  has_attachment: boolean
  attachment_name: string | null
  has_full_case: boolean
  created_at: string
}

export interface BankEntryDetail extends BankEntry {
  status: string
  used_case_id: number | null
  snapshot: {
    description?: string
    industry?: string
    capabilities?: string[]
    sections?: Record<string, string | string[]>
    metadata?: Record<string, string>
    timing?: Record<string, number>
    instructions?: Record<string, string>
    questions?: Array<{ question_text: string; model_answer?: string; marking_scheme?: string }>
  }
}

export interface BankMeta {
  subjects: string[]
  semesters: number[]
  difficulties: Array<{ value: number; label: string }>
}

export interface BankFilters {
  q?: string
  subject?: string
  semester?: number
  difficulty?: number
  source?: string
}

export interface BankPublishPayload {
  title?: string
  brief?: string
  content_text?: string
  subject?: string
  semester_number?: number
  difficulty?: number
  industry?: string
  functional_area?: string
  capabilities?: string[]
  sections?: Record<string, string | string[]>
  reading_time_minutes?: number
  answer_writing_time_minutes?: number
  questions?: Array<Record<string, unknown>>
  instructions?: Record<string, string>
  publish_now?: boolean
}

export interface BankPublishResult {
  case_id: number
  case_status: "draft" | "published"
  edited: boolean
  entry_visible_in_bank: boolean
  missing_fields: string[]
}

export async function getBankEntries(filters: BankFilters = {}) {
  const response = await api.get<{ items: BankEntry[]; total: number }>("/bank", { params: filters })
  return response.data
}

export async function getBankMeta() {
  const response = await api.get<BankMeta>("/bank/meta")
  return response.data
}

export async function getBankEntry(id: number) {
  const response = await api.get<BankEntryDetail>(`/bank/${id}`)
  return response.data
}

export async function getBankAttachment(id: number) {
  const response = await api.get<{ name: string; data: string }>(`/bank/${id}/attachment`)
  return response.data
}

export async function uploadBankEntry(payload: {
  title: string
  brief?: string
  content_text?: string
  subject?: string
  semester_number?: number | null
  difficulty?: number
  attachment_name?: string | null
  attachment_data?: string | null
}) {
  const response = await api.post<{ id: number }>("/bank/upload", payload)
  return response.data
}

export async function generateBankEntry(payload: {
  topic?: string
  subject?: string
  semester_number?: number | null
  difficulty?: number
}) {
  const response = await api.post<{ id: number; title: string }>("/bank/generate", payload)
  return response.data
}

export async function publishBankEntry(id: number, payload: BankPublishPayload) {
  const response = await api.post<BankPublishResult>(`/bank/${id}/publish`, payload)
  return response.data
}

export async function deleteBankEntry(id: number) {
  const response = await api.delete<{ status: string }>(`/bank/${id}`)
  return response.data
}

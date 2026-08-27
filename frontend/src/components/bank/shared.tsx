import { FileUp, PenLine, Sparkles, X } from "lucide-react"

import type { BankEntry } from "../../api/bank"

export type BankVariant = "faculty" | "admin"

export const bankTheme = {
  faculty: {
    primaryBtn:
      "inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] shadow-sm transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60",
    accentText: "text-[#0b1d3a]",
    builderPath: "/faculty/case-builder",
  },
  admin: {
    primaryBtn:
      "inline-flex items-center justify-center gap-2 rounded-md bg-[#34c6a3] px-4 py-2.5 text-sm font-semibold text-[#102033] shadow-sm transition hover:bg-[#5cd2b6] disabled:cursor-not-allowed disabled:opacity-60",
    accentText: "text-[#102033]",
    builderPath: "/faculty/case-builder",
  },
} as const

export const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-md border border-[#e6e8eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:opacity-60"
export const inputClass =
  "h-11 w-full rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
export const textareaClass = `${inputClass} h-auto min-h-[70px] py-2`
export const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]"
export const cardClass = "rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6"
export const errorBanner =
  "mb-3 rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]"

export const CASE_DOMAINS = [
  "business", "technology", "healthcare", "environment",
  "geopolitics", "sports", "social", "science",
] as const

export const SECTION_FIELDS: Array<{ key: string; label: string; list?: boolean }> = [
  { key: "data", label: "Data (key facts & figures)" },
  { key: "objectives", label: "Objectives" },
]

export const INSTRUCTION_FIELDS: Array<{ key: string; label: string }> = [
  { key: "student_instructions_before", label: "Student instructions — before" },
  { key: "student_instructions_during", label: "Student instructions — during" },
  { key: "student_instructions_submission", label: "Student instructions — submission" },
]

export function formatDate(iso: string): string {
  const date = new Date(iso.endsWith("Z") ? iso : `${iso}Z`)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function roleLabel(role: string | null): string {
  if (!role) return ""
  return role === "faculty" ? "Faculty" : role.charAt(0).toUpperCase() + role.slice(1)
}

export function SourceChip({ source }: { source: BankEntry["source"] }) {
  if (source === "ai_generated") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f0ff] px-3 py-1 text-xs font-semibold text-[#6941c6]">
        <Sparkles size={12} aria-hidden="true" /> AI generated
      </span>
    )
  }
  if (source === "case_builder") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7df] px-3 py-1 text-xs font-semibold text-[#92702a]">
        <PenLine size={12} aria-hidden="true" /> Case Builder
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-semibold text-[#175cd3]">
      <FileUp size={12} aria-hidden="true" /> Uploaded
    </span>
  )
}

export function ModalShell({ title, onClose, children, wide }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1d3a]/45 p-4">
      <div className={`max-h-[90vh] w-full ${wide ? "max-w-3xl" : "max-w-lg"} overflow-y-auto rounded-lg bg-white p-5 shadow-xl sm:p-6`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="rounded-md p-1 text-[#6b7280] transition hover:bg-[#f6f7fb] hover:text-[#111827]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function apiErrorDetail(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === "string" ? detail : fallback
}

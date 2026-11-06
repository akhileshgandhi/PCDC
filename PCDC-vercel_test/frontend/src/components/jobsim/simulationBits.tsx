import type { AssignedSimulation, SimulationStatus } from "../../api/jobsim"

export const STATUS_META: Record<SimulationStatus, { label: string; className: string }> = {
  not_started: { label: "Not started", className: "bg-[#F2F4F7] text-[#475467]" },
  in_progress: { label: "In progress", className: "bg-[#FFF7DF] text-[#92702A]" },
  time_up: { label: "Time up", className: "bg-[#FFF5F5] text-[#B42318]" },
  completed: { label: "Completed", className: "bg-[#ECFDF3] text-[#067647]" },
}

export function StatusBadge({ status }: { status: SimulationStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export function durationText(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export function taskMixText(sim: Pick<AssignedSimulation, "spreadsheet_tasks" | "memo_tasks" | "presentation_tasks">) {
  const parts: string[] = []
  if (sim.spreadsheet_tasks) {
    parts.push(`${sim.spreadsheet_tasks} spreadsheet ${sim.spreadsheet_tasks === 1 ? "task" : "tasks"}`)
  }
  if (sim.memo_tasks) parts.push("memo")
  if (sim.presentation_tasks) parts.push("slides")
  return parts.join(" · ") || "No tasks yet"
}

export function dueText(iso: string | null) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

export function actionText(status: SimulationStatus) {
  if (status === "in_progress") return "Continue simulation"
  if (status === "not_started") return "Start simulation"
  return "View results"
}

import { ArrowRight, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import CountUp from "../common/CountUp"

// Small shared pieces for the role dashboards' "insights" sections. Each
// portal passes its own accent so the blocks match the page they sit on.

export type InsightAccent = "admin" | "faculty" | "student"

const ACCENTS: Record<InsightAccent, { icon: string; bar: string; link: string; border: string; hover: string }> = {
  admin: {
    icon: "bg-[#dbeafe] text-[#1d4ed8]",
    bar: "bg-[#2563eb]",
    link: "text-[#1d4ed8] hover:text-[#0c1f3d]",
    border: "border-[#dde4ec]",
    hover: "hover:border-[#2563eb]",
  },
  faculty: {
    icon: "bg-[#dbeafe] text-[#1d4ed8]",
    bar: "bg-[#2563eb]",
    link: "text-[#1d4ed8] hover:text-[#0c1f3d]",
    border: "border-[#e6e8eb]",
    hover: "hover:border-[#2563eb]",
  },
  student: {
    icon: "bg-[#dbeafe] text-[#1d4ed8]",
    bar: "bg-[#2563eb]",
    link: "text-[#1d4ed8] hover:text-[#0c1f3d]",
    border: "border-[#e6e8eb]",
    hover: "hover:border-[#2563eb]",
  },
}

interface AlertTileProps {
  accent: InsightAccent
  label: string
  value: number | string
  hint: string
  icon: LucideIcon
  isLoading: boolean
  /** Red value when > 0: something is waiting on this user. */
  urgent?: boolean
  to?: string
}

export function AlertTile({ accent, label, value, hint, icon: Icon, isLoading, urgent, to }: AlertTileProps) {
  const a = ACCENTS[accent]
  const highlighted = urgent && typeof value === "number" && value > 0
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${highlighted ? "bg-[#fff1f0] text-[#b42318]" : a.icon}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-[#667085]">{label}</p>
      </div>
      <p className={`mt-4 text-3xl font-semibold ${highlighted ? "text-[#b42318]" : "text-[#17202a]"}`}>
        <CountUp value={value} isLoading={isLoading} />
      </p>
      <p className="mt-1 text-xs leading-5 text-[#98a2b3]">{hint}</p>
    </>
  )
  const className = `block rounded-2xl border ${a.border} bg-white p-5 shadow-md shadow-blue-500/[0.06] transition hover:-translate-y-0.5 hover:scale-[1.02] ${a.hover} hover:shadow-lg hover:shadow-blue-500/20`
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
  )
}

interface PanelProps {
  accent: InsightAccent
  title: string
  subtitle?: string
  action?: { label: string; to: string }
  children: ReactNode
}

export function Panel({ accent, title, subtitle, action, children }: PanelProps) {
  const a = ACCENTS[accent]
  return (
    <section
      className={`rounded-2xl border ${a.border} bg-white p-6 shadow-md shadow-blue-500/[0.06] transition hover:shadow-lg hover:shadow-blue-500/20`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#17202a]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-[#667085]">{subtitle}</p> : null}
        </div>
        {action ? (
          <Link to={action.to} className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${a.link}`}>
            {action.label}
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function ProgressBar({ accent, pct, label }: { accent: InsightAccent; pct: number | null; label: string }) {
  const width = pct === null ? 0 : Math.max(0, Math.min(100, pct))
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-[#eef2f7]"
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${ACCENTS[accent].bar}`} style={{ width: `${width}%` }} />
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-[#f5f7fa] px-4 py-6 text-center text-sm text-[#667085]">{children}</p>
}

export function pctText(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${Math.round(value)}%`
}

function parseServerDate(value: string) {
  return new Date(value.includes("T") ? value : value.replace(" ", "T"))
}

export function shortDate(value: string | null) {
  if (!value) return "—"
  const date = parseServerDate(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date)
}

/** "Due today" / "Due in 3 days" / "Overdue by 2 days", plus whether it's late. */
export function dueText(value: string | null): { text: string; overdue: boolean } {
  if (!value) return { text: "No due date", overdue: false }
  const due = parseServerDate(value)
  if (Number.isNaN(due.getTime())) return { text: value.slice(0, 10), overdue: false }
  const diffMs = due.getTime() - Date.now()
  const days = Math.round(Math.abs(diffMs) / 86_400_000)
  if (diffMs < 0) {
    return { text: days === 0 ? "Overdue today" : `Overdue by ${days} day${days === 1 ? "" : "s"}`, overdue: true }
  }
  if (days === 0) return { text: "Due today", overdue: false }
  return { text: `Due in ${days} day${days === 1 ? "" : "s"}`, overdue: false }
}

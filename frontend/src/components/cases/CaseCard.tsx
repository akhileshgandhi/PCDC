import { ArrowRight, CheckCircle2, Clock3, Layers3 } from "lucide-react"
import { Link } from "react-router-dom"

import DifficultyBadge from "./DifficultyBadge"
import DomainTag, { type CaseDomain } from "./DomainTag"
import StatusBadge, { type CaseStatus } from "./StatusBadge"

export interface CaseStudy {
  id: number
  title: string
  description: string
  domain: CaseDomain
  case_code?: string | null
  subject?: string | null
  difficulty_label?: string | null
  total_marks?: number | null
  written_marks?: number | null
  rapid_fire_marks?: number | null
  reading_time_minutes?: number | null
  answer_writing_time_minutes?: number | null
  rapid_fire_time_minutes?: number | null
  difficulty: number
  estimated_minutes: number
  status: CaseStatus
  career_tracks: string[]
  capabilities: string[]
  assigned_by_mentor?: boolean
}

interface CaseCardProps {
  caseStudy: CaseStudy
}

function actionForStatus(caseStudy: CaseStudy) {
  if (caseStudy.status === "completed") {
    return {
      label: "View Results",
      to: `/student/case-studies/${caseStudy.id}/results`,
      className: "border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white",
      showArrow: false,
    }
  }

  if (caseStudy.status === "in_progress") {
    return {
      label: "Continue Attempt",
      to: `/student/case-studies/${caseStudy.id}/attempt`,
      className: "border-[#0B1D3A] text-[#0B1D3A] hover:bg-[#0B1D3A] hover:text-white",
      showArrow: true,
    }
  }

  return {
    label: "Start Attempt",
    to: `/student/case-studies/${caseStudy.id}`,
    className: "border-[#C9A227] bg-[#C9A227] text-white hover:bg-[#B08D20]",
    showArrow: true,
  }
}

export default function CaseCard({ caseStudy }: CaseCardProps) {
  const action = actionForStatus(caseStudy)

  return (
    <article className="relative flex min-h-full flex-col rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {caseStudy.status === "completed" ? (
        <CheckCircle2
          className="absolute right-4 top-4 text-[#16A34A]"
          size={22}
          aria-label="Completed"
        />
      ) : null}

      <div className="flex flex-wrap items-start gap-2 pr-7">
        <DomainTag domain={caseStudy.domain} />
        <DifficultyBadge level={caseStudy.difficulty} />
        <StatusBadge status={caseStudy.status} />
        {caseStudy.assigned_by_mentor ? (
          <span className="rounded-full bg-[#E9F7F1] px-3 py-1 text-xs font-semibold text-[#0F766E]">
            Assigned by Mentor
          </span>
        ) : null}
      </div>

      <h2 className="mt-5 text-lg font-semibold leading-6 text-[#111827]">{caseStudy.title}</h2>
      {caseStudy.case_code || caseStudy.subject || caseStudy.difficulty_label ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-normal text-[#6B7280]">
          {[caseStudy.case_code, caseStudy.subject, caseStudy.difficulty_label]
            .filter(Boolean)
            .join(" / ")}
        </p>
      ) : null}
      <p
        className="mt-3 overflow-hidden text-sm leading-6 text-[#6B7280]"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {caseStudy.description}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-medium text-[#6B7280]">
        <span className="inline-flex items-center gap-2">
          <Layers3 size={16} aria-hidden="true" />
          Level {caseStudy.difficulty}
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock3 size={16} aria-hidden="true" />
          {caseStudy.estimated_minutes} min
        </span>
        {caseStudy.total_marks ? (
          <span className="inline-flex items-center gap-2">
            {caseStudy.total_marks}/10 marks
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {caseStudy.career_tracks.map((track) => (
          <span
            key={track}
            className="rounded-md bg-[#F6F7F9] px-3 py-1 text-xs font-semibold text-[#111827]"
          >
            {track}
          </span>
        ))}
      </div>

      <div className="my-5 border-t border-[#E6EBEB]" />

      <Link
        to={action.to}
        className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${action.className}`}
      >
        {action.label}
        {action.showArrow ? <ArrowRight size={16} aria-hidden="true" /> : null}
      </Link>
    </article>
  )
}

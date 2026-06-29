import { ArrowRight, MessageSquare, Share2 } from "lucide-react"
import { Link } from "react-router-dom"

import RadarChart, { type RadarMetric } from "./RadarChart"

export interface EvaluationData {
  total_score: number
  thinking_depth: number
  logic_score: number
  creativity_score: number
  practicality_score: number
  risk_awareness_score: number
  reflection_score: number
  strengths: string
  weaknesses: string
  blind_spots: string
  next_case: {
    id: number
    title: string
    domain: string
    difficulty: number
    estimated_minutes: number
  }
}

interface Screen6EvaluationProps {
  evaluation: EvaluationData
}

function scoreLabel(score: number) {
  if (score >= 90) return { label: "Excellent", className: "text-[#16A34A]" }
  if (score >= 75) return { label: "Good", className: "text-[#16A34A]" }
  if (score >= 60) return { label: "Improving", className: "text-[#C9A227]" }
  return { label: "Needs Work", className: "text-[#F59E0B]" }
}

function barSegments(score: number) {
  const filled = Math.round(score / 10)
  return "#".repeat(filled) + "-".repeat(10 - filled)
}

export default function Screen6Evaluation({ evaluation }: Screen6EvaluationProps) {
  const label = scoreLabel(evaluation.total_score)
  const metrics: RadarMetric[] = [
    { label: "Thinking Depth", score: evaluation.thinking_depth },
    { label: "Logic", score: evaluation.logic_score },
    { label: "Creativity", score: evaluation.creativity_score },
    { label: "Practicality", score: evaluation.practicality_score },
    { label: "Risk Awareness", score: evaluation.risk_awareness_score },
    { label: "Reflection", score: evaluation.reflection_score },
  ]

  return (
    <section className="mx-auto max-w-[900px] space-y-5">
      <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
          Evaluation Complete
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[#0B1D3A]">Overall Score</h2>
        <div className="mt-6 text-6xl font-semibold text-[#111827]">
          {evaluation.total_score}
          <span className="text-2xl text-[#6B7280]"> / 100</span>
        </div>
        <p className={`mt-2 text-lg font-semibold ${label.className}`}>{label.label}</p>
      </article>

      <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-[#111827]">Capability Breakdown</h3>
        <div className="mt-5 grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
          <RadarChart metrics={metrics} />
          <div className="space-y-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="grid grid-cols-[140px_1fr_36px] items-center gap-3 text-sm"
              >
                <span className="font-medium text-[#374151]">{metric.label}</span>
                <span className="font-mono text-[#0B1D3A]">{barSegments(metric.score)}</span>
                <span className="font-semibold text-[#111827]">{metric.score}</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        <InsightCard title="Strengths" tone="green" text={evaluation.strengths} />
        <InsightCard title="Areas to Improve" tone="gold" text={evaluation.weaknesses} />
        <InsightCard title="Blind Spots" tone="red" text={evaluation.blind_spots} />
      </div>

      <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-[#111827]">Next Recommended Case</h3>
        <div className="mt-4 rounded-xl bg-[#F6F7F9] p-5">
          <h4 className="text-lg font-semibold text-[#0B1D3A]">{evaluation.next_case.title}</h4>
          <p className="mt-2 text-sm text-[#6B7280]">
            {evaluation.next_case.domain} / Level {evaluation.next_case.difficulty} /{" "}
            {evaluation.next_case.estimated_minutes} min
          </p>
          <Link
            to={`/student/case-studies/${evaluation.next_case.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#C9A227] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B08D20]"
          >
            View Case
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </article>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/student/case-studies"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#0B1D3A] px-5 py-3 text-sm font-semibold text-[#0B1D3A] transition hover:bg-[#0B1D3A] hover:text-white"
        >
          <MessageSquare size={16} aria-hidden="true" />
          Back to My Case Studies
        </Link>
        <button
          type="button"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0B1D3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#122A54]"
        >
          <Share2 size={16} aria-hidden="true" />
          Share with Mentor
        </button>
      </div>
    </section>
  )
}

interface InsightCardProps {
  title: string
  text: string
  tone: "green" | "gold" | "red"
}

function InsightCard({ title, text, tone }: InsightCardProps) {
  const toneClass = {
    green: "border-[#16A34A]",
    gold: "border-[#F59E0B]",
    red: "border-[#EF4444]",
  }[tone]

  return (
    <article className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${toneClass}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">{text}</p>
    </article>
  )
}

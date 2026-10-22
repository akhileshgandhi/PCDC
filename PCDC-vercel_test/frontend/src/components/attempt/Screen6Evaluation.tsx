import { ArrowRight, CheckCircle, MessageSquare, TrendingUp, Zap } from "lucide-react"
import { Link } from "react-router-dom"

import RadarChart, { type RadarMetric } from "./RadarChart"
import type { CapabilityScore, QuestionScore, RapidFireScore } from "../../api/cases"
import { scoreColorClass } from "../../utils/scoreColor"

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
  improvement_areas: string
  question_scores: QuestionScore[]
  rapid_fire_scores: RapidFireScore[]
  rapid_fire_feedback: string
  capability_scores: CapabilityScore[]
  overall_grade: string
  grade_comment: string
  next_case?: {
    id: number
    title: string
    domain: string
    difficulty: number
    estimated_minutes: number
  } | null
}

export interface AnsweredQuestion {
  question_number: number
  question_text: string
  answer_text: string
}

export interface RapidFireAnswer {
  sequence: number
  question_text: string
  answer_text: string
}

interface Screen6EvaluationProps {
  evaluation: EvaluationData
  answeredQuestions?: AnsweredQuestion[]
  rapidFireAnswers?: RapidFireAnswer[]
}

function gradeColor(grade: string) {
  if (grade === "A") return "text-[#16A34A] bg-[#F0FDF4]"
  if (grade === "B") return "text-[#0284C7] bg-[#F0F9FF]"
  if (grade === "C") return "text-[#C9A227] bg-[#FFFBEB]"
  if (grade === "D") return "text-[#EA580C] bg-[#FFF7ED]"
  return "text-[#DC2626] bg-[#FEF2F2]"
}

const scoreColor = scoreColorClass

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.min((score / max) * 100, 100)
  const color = score / max >= 0.8 ? "bg-[#16A34A]" : score / max >= 0.6 ? "bg-[#C9A227]" : "bg-[#DC2626]"
  return (
    <div className="h-2 w-full rounded-full bg-[#E6EBEB]">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Renders improvement points cleanly whether the value arrives as bullet/newline
// text or as a legacy stringified list like ['a', 'b', 'c'].
function toBulletItems(raw: string): string[] {
  const text = raw.trim()
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1)
    const items = inner
      .split(/['"]\s*,\s*['"]/)
      .map((part) => part.replace(/^['"]|['"]$/g, "").trim())
      .filter(Boolean)
    if (items.length > 0) return items
  }
  return text
    .split("\n")
    .map((line) => line.replace(/^[•\-\d.)\s]+/, "").trim())
    .filter(Boolean)
}

export default function Screen6Evaluation({ evaluation, answeredQuestions, rapidFireAnswers }: Screen6EvaluationProps) {
  const answersByQuestion = new Map(
    (answeredQuestions || []).map((q) => [q.question_number, q]),
  )
  const metrics: RadarMetric[] = [
    { label: "Thinking", score: evaluation.thinking_depth },
    { label: "Logic", score: evaluation.logic_score },
    { label: "Creativity", score: evaluation.creativity_score },
    { label: "Practicality", score: evaluation.practicality_score },
    { label: "Risk", score: evaluation.risk_awareness_score },
    { label: "Reflection", score: evaluation.reflection_score },
  ]
  const grade = evaluation.overall_grade || "—"
  const gc = gradeColor(grade)

  // Actual marks scored out of the case's total marks (written question marks +
  // rapid fire marks), rather than the 0-100 capability score. Rapid fire is
  // 3 independently-graded 1-mark questions summed directly, not a single
  // 0-100 score rescaled to a fraction of 3.
  const writtenAwarded = evaluation.question_scores.reduce((s, q) => s + (q.marks_awarded || 0), 0)
  const writtenTotal = evaluation.question_scores.reduce((s, q) => s + (q.marks_total || 0), 0)
  const rapidMarks = Math.round(
    evaluation.rapid_fire_scores.reduce((s, rf) => s + (rf.marks_awarded || 0), 0) * 10,
  ) / 10
  const rapidTotal = evaluation.rapid_fire_scores.length || 3
  const marksScored = Math.round((writtenAwarded + rapidMarks) * 10) / 10
  const totalMarks = writtenTotal + rapidTotal
  const hasMarks = writtenTotal > 0
  const marksPct = hasMarks ? (marksScored / totalMarks) * 100 : evaluation.total_score

  return (
    <section className="space-y-5">

      {/* Header — Grade + Marks */}
      <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Report Card</p>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {hasMarks ? (
              <h2 className="text-3xl font-semibold text-[#0B1D3A]">
                Marks Scored: <span className={scoreColor(marksPct)}>{marksScored}</span>
                <span className="text-lg text-[#6B7280]"> / {totalMarks}</span>
              </h2>
            ) : (
              <h2 className="text-3xl font-semibold text-[#0B1D3A]">
                Overall Score: <span className={scoreColor(evaluation.total_score)}>{evaluation.total_score}</span>
                <span className="text-lg text-[#6B7280]"> / 100</span>
              </h2>
            )}
            {hasMarks && (
              <p className="mt-1 text-sm text-[#6B7280]">
                Written {writtenAwarded}/{writtenTotal} + Rapid Fire {rapidMarks}/{rapidTotal}
              </p>
            )}
            {evaluation.grade_comment && (
              <p className="mt-2 text-sm text-[#6B7280]">{evaluation.grade_comment}</p>
            )}
          </div>
          {grade !== "—" && (
            <div className={`flex size-20 shrink-0 items-center justify-center rounded-2xl text-4xl font-bold ${gc}`}>
              {grade}
            </div>
          )}
        </div>
      </article>

      {/* Per-Question Scores */}
      {evaluation.question_scores.length > 0 && (
        <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#111827]">Written Question Scores</h3>
          <div className="mt-4 space-y-5">
            {evaluation.question_scores.map((qs) => {
              const answered = answersByQuestion.get(qs.question_number)
              return (
              <div key={qs.question_number} className="rounded-lg border border-[#E6EBEB] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A227]">
                    Question {qs.question_number}
                  </p>
                  <span className={`text-base font-bold ${scoreColor(qs.marks_awarded / qs.marks_total * 100)}`}>
                    {qs.marks_awarded} / {qs.marks_total} marks
                  </span>
                </div>
                {answered?.question_text ? (
                  <p className="mt-3 text-sm font-medium leading-6 text-[#111827]">
                    {answered.question_text}
                  </p>
                ) : null}
                {answered?.answer_text ? (
                  <div className="mt-2 rounded-lg bg-[#F6F7F9] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Your Answer</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#374151]">
                      {answered.answer_text}
                    </p>
                  </div>
                ) : null}
                <div className="mt-3">
                  <ScoreBar score={qs.marks_awarded} max={qs.marks_total} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#374151]">{qs.feedback}</p>
                {qs.improvement && (
                  <div className="mt-2 flex gap-2 rounded-lg bg-[#FFFBEB] p-3">
                    <TrendingUp size={15} className="mt-0.5 shrink-0 text-[#C9A227]" />
                    <p className="text-xs leading-5 text-[#92400E]"><span className="font-semibold">Improve: </span>{qs.improvement}</p>
                  </div>
                )}
              </div>
              )
            })}
          </div>
        </article>
      )}

      {/* Rapid Fire Score */}
      {(evaluation.rapid_fire_scores.length > 0 || evaluation.rapid_fire_feedback) && (
        <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[#C9A227]" />
            <h3 className="text-lg font-semibold text-[#111827]">Rapid Fire Round</h3>
            <span className={`ml-auto text-lg font-bold ${scoreColor(rapidTotal > 0 ? (rapidMarks / rapidTotal) * 100 : 0)}`}>
              {rapidMarks} / {rapidTotal} marks
            </span>
          </div>
          {evaluation.rapid_fire_feedback && (
            <p className="mt-3 text-sm leading-6 text-[#374151]">{evaluation.rapid_fire_feedback}</p>
          )}
          {evaluation.rapid_fire_scores.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-[#E6EBEB] pt-4">
              {evaluation.rapid_fire_scores.map((rf) => {
                const qa = rapidFireAnswers?.find((a) => a.sequence === rf.sequence)
                return (
                  <div key={rf.sequence} className="rounded-lg border border-[#E6EBEB] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A227]">
                        Question {rf.sequence}
                      </p>
                      <span className={`text-sm font-bold ${scoreColor(rf.marks_awarded * 100)}`}>
                        {rf.marks_awarded} / 1 mark
                      </span>
                    </div>
                    {qa?.question_text ? (
                      <p className="mt-2 text-sm font-medium leading-6 text-[#111827]">{qa.question_text}</p>
                    ) : null}
                    {qa?.answer_text ? (
                      <div className="mt-2 rounded-lg bg-[#F6F7F9] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Your Answer</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#374151]">
                          {qa.answer_text || "(no answer given)"}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-3">
                      <ScoreBar score={rf.marks_awarded} max={1} />
                    </div>
                    {rf.feedback && (
                      <p className="mt-3 text-sm leading-6 text-[#374151]">{rf.feedback}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </article>
      )}

      {/* Capability Radar */}
      <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#111827]">Capability Breakdown</h3>
        <div className="mt-5 grid gap-6 lg:grid-cols-[300px_1fr] lg:items-center">
          <RadarChart metrics={metrics} />
          <div className="space-y-3">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-medium text-[#374151]">{m.label}</span>
                <div className="flex-1">
                  <ScoreBar score={m.score} max={100} />
                </div>
                <span className={`w-8 text-right font-semibold ${scoreColor(m.score)}`}>{m.score}</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Capability Demonstration — separate from the generic 6-dimension
          rubric above: scored against the specific capabilities this case
          was designed to assess. */}
      {evaluation.capability_scores.length > 0 && (
        <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#111827]">Capability Demonstration</h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            How well this attempt demonstrated the capabilities this case is designed to build.
          </p>
          <div className="mt-4 space-y-4">
            {evaluation.capability_scores.map((cap) => (
              <div key={cap.capability}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#111827]">{cap.capability}</span>
                  <span className={`font-semibold ${scoreColor(cap.score)}`}>{cap.score}</span>
                </div>
                <div className="mt-1.5">
                  <ScoreBar score={cap.score} max={100} />
                </div>
                {cap.justification && (
                  <p className="mt-1.5 text-sm leading-6 text-[#6B7280]">{cap.justification}</p>
                )}
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <InsightCard title="Strengths" tone="green" icon={<CheckCircle size={15} />} text={evaluation.strengths} />
        <InsightCard title="Areas to Improve" tone="gold" icon={<TrendingUp size={15} />} text={evaluation.weaknesses} />
        <InsightCard title="Blind Spots" tone="red" icon={<Zap size={15} />} text={evaluation.blind_spots} />
      </div>

      {/* Improvement Areas */}
      {evaluation.improvement_areas && (
        <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#111827]">Specific Improvement Actions</h3>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[#374151]">
            {toBulletItems(evaluation.improvement_areas).map((item, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-[#C9A227]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      )}

      {/* Next Case */}
      {evaluation.next_case && (
        <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#111827]">Next Recommended Case</h3>
          <div className="mt-4 rounded-xl bg-[#F6F7F9] p-5">
            <h4 className="text-base font-semibold text-[#0B1D3A]">{evaluation.next_case.title}</h4>
            <p className="mt-1 text-sm text-[#6B7280]">
              {evaluation.next_case.domain} · Level {evaluation.next_case.difficulty} · {evaluation.next_case.estimated_minutes} min
            </p>
            <Link
              to={`/student/case-studies/${evaluation.next_case.id}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#C9A227] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B08D20]"
            >
              View Case <ArrowRight size={14} />
            </Link>
          </div>
        </article>
      )}

      <Link
        to="/student/case-studies"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#0B1D3A] px-5 py-3 text-sm font-semibold text-[#0B1D3A] transition hover:bg-[#0B1D3A] hover:text-white"
      >
        <MessageSquare size={16} />
        Back to My Case Studies
      </Link>
    </section>
  )
}

interface InsightCardProps {
  title: string
  text: string
  tone: "green" | "gold" | "red"
  icon: React.ReactNode
}

function InsightCard({ title, text, tone, icon }: InsightCardProps) {
  const styles = {
    green: "border-[#16A34A] text-[#16A34A]",
    gold: "border-[#F59E0B] text-[#F59E0B]",
    red: "border-[#EF4444] text-[#EF4444]",
  }[tone]
  return (
    <article className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${styles}`}>
      <div className={`flex items-center gap-1.5 ${styles}`}>
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">{text || "—"}</p>
    </article>
  )
}






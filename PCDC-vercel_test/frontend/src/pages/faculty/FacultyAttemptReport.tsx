import { AlertTriangle, ArrowLeft, Bot, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import {
  getFacultyAttemptAiCheck,
  getFacultyAttemptDetail,
  type FacultyAnswerAiCheck,
  type FacultyAnswerOriginality,
  type FacultyAttemptAiCheck,
  type FacultyAttemptDetail,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"
import { scoreColorHex } from "../../utils/scoreColor"

const DIMENSIONS: Array<{ key: keyof NonNullable<FacultyAttemptDetail["evaluation"]>; label: string }> = [
  { key: "thinking_depth", label: "Thinking depth" },
  { key: "logic_score", label: "Logic" },
  { key: "creativity_score", label: "Creativity" },
  { key: "practicality_score", label: "Practicality" },
  { key: "risk_awareness_score", label: "Risk awareness" },
  { key: "reflection_score", label: "Reflection" },
]

const tone = scoreColorHex

function toBulletItems(raw: string): string[] {
  const text = (raw ?? "").trim()
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

export default function FacultyAttemptReport() {
  const navigate = useNavigate()
  const { attemptId } = useParams()
  const [data, setData] = useState<FacultyAttemptDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  // AI-written-content estimate loads after the report: the first check of an
  // attempt calls the AI and can take a few seconds.
  const [aiCheck, setAiCheck] = useState<FacultyAttemptAiCheck | null>(null)
  const [isAiChecking, setIsAiChecking] = useState(false)

  useEffect(() => {
    const id = Number(attemptId)
    if (!id) return
    let active = true
    getFacultyAttemptDetail(id)
      .then((result) => {
        if (active) setData(result)
      })
      .catch(() => {
        if (active) setError("Unable to load this report.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [attemptId])

  useEffect(() => {
    const id = Number(attemptId)
    if (!id) return
    let active = true
    setIsAiChecking(true)
    getFacultyAttemptAiCheck(id)
      .then((result) => {
        if (active) setAiCheck(result)
      })
      .catch(() => {
        if (active) setAiCheck({ status: "unavailable", results: [] })
      })
      .finally(() => {
        if (active) setIsAiChecking(false)
      })
    return () => {
      active = false
    }
  }, [attemptId])

  const evaluation = data?.evaluation ?? null
  const originality = data?.originality ?? []
  const originalityByQuestion = new Map(originality.map((item) => [item.question_number, item]))
  const flaggedCount = originality.filter((item) => item.flagged).length
  const aiResults = aiCheck?.results ?? []
  const aiByQuestion = new Map(aiResults.map((item) => [item.question_number, item]))
  const aiFlaggedCount = aiResults.filter((item) => item.flagged).length

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b1d3a] transition hover:text-[#c9a227]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : isLoading || !data ? (
          <div className="rounded-lg border border-[#e6e8eb] bg-white p-8 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            {isLoading ? "Loading report..." : "No report found."}
          </div>
        ) : (
          <>
            <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c9a227]">
                Attempt Report
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[#17202a]">{data.student_name}</h1>
              <p className="mt-1 text-sm text-[#6b7280]">
                {data.student_email} · {data.case_title}
              </p>
              {flaggedCount > 0 ? (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2 rounded-md border border-[#fcd9b6] bg-[#fff7ed] px-3 py-2.5 text-sm text-[#9a3412]"
                >
                  <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">Copied content detected</span> in {flaggedCount}{" "}
                    {flaggedCount === 1 ? "answer" : "answers"}: more than 50% matches the case
                    text or another student's answer. Marks are unchanged; please review below.
                  </span>
                </div>
              ) : null}
              {aiFlaggedCount > 0 ? (
                <div
                  role="status"
                  className="mt-3 flex items-start gap-2 rounded-md border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-2.5 text-sm text-[#5b21b6]"
                >
                  <Bot size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">Possible AI-written content</span> in {aiFlaggedCount}{" "}
                    {aiFlaggedCount === 1 ? "answer" : "answers"}: more than 50% likely written with an
                    AI tool. This is an estimate, not proof — marks are unchanged; please review below.
                  </span>
                </div>
              ) : null}
              {isAiChecking ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-3 flex items-center gap-2.5 rounded-md border border-[#c4b5fd] bg-[#f5f3ff] px-3 py-2.5 text-sm text-[#5b21b6]"
                >
                  <Loader2 size={17} className="shrink-0 animate-spin" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">Checking answers for AI-written content…</span> This
                    can take a few seconds the first time.
                  </span>
                </div>
              ) : aiCheck?.status === "unavailable" ? (
                <div
                  role="status"
                  className="mt-3 flex items-start gap-2 rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-sm text-[#4b5563]"
                >
                  <Bot size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">AI-written content check is unavailable right now.</span>{" "}
                    Reload the page to try again.
                  </span>
                </div>
              ) : null}
            </section>

            {evaluation ? (
              <>
                <section className="flex flex-wrap items-center gap-5 rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
                  <div>
                    {data.marks ? (
                      <>
                        <p className="text-4xl font-extrabold text-[#0b1d3a]">
                          {data.marks.total_awarded}
                          <span className="text-base font-semibold text-[#6b7280]">
                            {" "}
                            / {data.marks.total_max}
                          </span>
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#17202a]">
                          Overall score: {evaluation.total_score}/100
                        </p>
                      </>
                    ) : (
                      <p className="text-4xl font-extrabold text-[#0b1d3a]">
                        {evaluation.total_score}
                        <span className="text-base font-semibold text-[#6b7280]">/100</span>
                      </p>
                    )}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
                      Report Card
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#374151]">
                      {evaluation.grade_comment}
                    </p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-xl bg-[#eaf2ff] text-xl font-extrabold text-[#1d4ed8]">
                    {evaluation.overall_grade}
                  </div>
                </section>

                <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-[#17202a]">Capability Scores</h2>
                  <div className="mt-4 flex flex-col gap-3">
                    {DIMENSIONS.map((dim) => {
                      const value = Number(evaluation[dim.key] ?? 0)
                      return (
                        <div
                          key={dim.key}
                          className="grid grid-cols-[130px_1fr_36px] items-center gap-3 text-sm"
                        >
                          <span className="text-[#374151]">{dim.label}</span>
                          <div className="h-2 rounded-full bg-[#eef0f2]">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${value}%`, backgroundColor: tone(value) }}
                            />
                          </div>
                          <span className="text-right font-semibold" style={{ color: tone(value) }}>
                            {value}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-[#17202a]">Written Question Scores</h2>
                  <div className="mt-4 space-y-3">
                    {evaluation.question_scores.map((question) => (
                      <article
                        key={question.question_number}
                        className="rounded-lg border border-[#e6e8eb] bg-[#f9fafb] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase text-[#c9a227]">
                            Question {question.question_number}
                          </span>
                          <span className="text-sm font-semibold text-[#17202a]">
                            {question.marks_awarded} / {question.marks_total} marks
                          </span>
                        </div>
                        <OriginalityBadge result={originalityByQuestion.get(question.question_number)} />
                        <AiContentBadge result={aiByQuestion.get(question.question_number)} />
                        <p className="mt-2 text-sm text-[#374151]">{question.feedback}</p>
                        {question.improvement ? (
                          <p className="mt-2 rounded-md bg-[#fff8ec] px-3 py-2 text-sm text-[#8a5a00]">
                            <span className="font-semibold">Improve:</span> {question.improvement}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#17202a]">Rapid Fire Round</h2>
                    <span className="text-sm font-bold text-[#16a34a]">
                      {data.marks ? `${data.marks.rapid_awarded} / ${data.marks.rapid_total} marks` : ""}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#374151]">{evaluation.rapid_fire_feedback}</p>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <Insight title="Strengths" tone="pos" text={evaluation.strengths} />
                  <Insight title="Areas to Improve" tone="warn" text={evaluation.weaknesses} />
                  <Insight title="Blind Spots" tone="crit" text={evaluation.blind_spots} />
                </section>

                <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-[#17202a]">Specific Improvement Actions</h2>
                  <ul className="mt-3 space-y-2 text-sm text-[#374151]">
                    {toBulletItems(evaluation.improvement_areas).map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-[#c9a227]">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : (
              <div className="rounded-lg border border-[#facc15] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
                {data.status === "expired"
                  ? "This attempt expired before the student submitted anything — there's nothing to evaluate."
                  : "This attempt has no evaluation yet (still in progress)."}
              </div>
            )}

            {data.initial_summary ? (
              <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-[#17202a]">
                    Student&apos;s Initial Analysis
                  </h2>
                  <span className="rounded-full bg-[#f6f7fb] px-2 py-0.5 text-xs font-semibold text-[#6b7280]">
                    Not marked
                  </span>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-[#f6f7fb] p-4 text-sm leading-6 text-[#374151]">
                  {data.initial_summary}
                </pre>
              </section>
            ) : null}

            <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-[#17202a]">Student&apos;s Written Answers</h2>
              <pre className="mt-3 whitespace-pre-wrap rounded-md bg-[#f6f7fb] p-4 text-sm leading-6 text-[#374151]">
                {data.initial_analysis || "No written answers recorded."}
              </pre>
            </section>

            <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-[#17202a]">Student&apos;s Rapid Fire Answers</h2>
              <pre className="mt-3 whitespace-pre-wrap rounded-md bg-[#f6f7fb] p-4 text-sm leading-6 text-[#374151]">
                {data.rapid_fire_answers || "No rapid fire answers recorded."}
              </pre>
            </section>
          </>
        )}
      </div>
    </FacultyLayout>
  )
}

// Copied-content result for one written answer: an orange warning when more
// than 50% matches the case or another student, otherwise a quiet "original"
// line so faculty can see the check ran.
function OriginalityBadge({ result }: { result?: FacultyAnswerOriginality }) {
  if (!result) return null
  if (!result.checked) {
    return (
      <p className="mt-2 text-xs text-[#9ca3af]">
        Originality: too short to check ({result.word_count} words)
      </p>
    )
  }
  const casePct = result.case_copied_pct ?? 0
  const peerPct = result.peer_copied_pct ?? 0
  if (!result.flagged) {
    return (
      <p className="mt-2 text-xs text-[#16a34a]">
        Original · {casePct}% matches case
        {result.peer_copied_pct != null ? ` · ${peerPct}% matches closest classmate` : ""}
      </p>
    )
  }
  const detail =
    result.source === "peer"
      ? `${peerPct}% matches ${result.peer_student_name ?? "another student"}'s answer`
      : `${casePct}% copied from the case text`
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#fff7ed] px-2.5 py-1 text-xs font-semibold text-[#c2410c]">
      <AlertTriangle size={13} aria-hidden="true" />
      Copied content: {detail}
    </p>
  )
}

// AI-written-content estimate for one written answer: a purple warning above
// 50%, otherwise a quiet line so faculty can see the check ran.
function AiContentBadge({ result }: { result?: FacultyAnswerAiCheck }) {
  if (!result) return null
  if (result.too_short) {
    return (
      <p className="mt-1 text-xs text-[#9ca3af]">
        AI check: too short to check ({result.word_count} words)
      </p>
    )
  }
  if (!result.checked || result.ai_pct == null) return null
  if (!result.flagged) {
    return (
      <p className="mt-1 text-xs text-[#16a34a]" title={result.reason ?? undefined}>
        Likely student-written · {result.ai_pct}% AI likelihood
      </p>
    )
  }
  return (
    <div className="mt-1">
      <p className="inline-flex items-center gap-1.5 rounded-md bg-[#f5f3ff] px-2.5 py-1 text-xs font-semibold text-[#6d28d9]">
        <Bot size={13} aria-hidden="true" />
        Possible AI-written content: {result.ai_pct}% likelihood
      </p>
      {result.reason ? <p className="mt-1 text-xs text-[#6b7280]">{result.reason}</p> : null}
    </div>
  )
}

function Insight({ title, tone, text }: { title: string; tone: "pos" | "warn" | "crit"; text: string }) {
  const styles = {
    pos: "border-[#bdebdc] bg-[#f0fcf8] text-[#176b5a]",
    warn: "border-[#f5d9a8] bg-[#fff8ec] text-[#8a5a00]",
    crit: "border-[#f3c4c4] bg-[#fff5f5] text-[#b42318]",
  }[tone]
  return (
    <article className={`rounded-lg border p-4 ${styles}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#374151]">{text}</p>
    </article>
  )
}

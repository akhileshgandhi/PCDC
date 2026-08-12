import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { getFacultyAttemptDetail, type FacultyAttemptDetail } from "../../api/faculty"
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

  const evaluation = data?.evaluation ?? null

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
                This attempt has no evaluation yet (still in progress).
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

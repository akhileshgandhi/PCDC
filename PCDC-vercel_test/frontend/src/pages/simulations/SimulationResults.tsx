import { isAxiosError } from "axios"
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, MinusCircle, UserCheck, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import {
  getJobsimResults,
  getSimulationDetail,
  type JobsimResults,
  type MemoStatus,
  type ReviewStatus,
  type StudentMemoResult,
} from "../../api/jobsim"
import DashboardLayout from "../../layouts/DashboardLayout"

const STATUS_META: Record<ReviewStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  correct: { label: "Correct", className: "bg-[#ECFDF3] text-[#067647]", Icon: CheckCircle2 },
  incorrect: { label: "Incorrect", className: "bg-[#FFF5F5] text-[#B42318]", Icon: XCircle },
  not_answered: { label: "Not answered", className: "bg-[#F2F4F7] text-[#475467]", Icon: MinusCircle },
}

type WrittenMeta = Record<Exclude<MemoStatus, "scored">, { label: string; note: string; className: string; Icon: typeof Clock }>

/** Status labels for a memo or a slide deck; `the` is "this memo" or "these slides". */
function writtenMeta(the: string, your: string): WrittenMeta {
  return {
    not_started: {
      label: "Not submitted",
      note: `${the[0].toUpperCase()}${the.slice(1)} ${the.startsWith("these") ? "weren't" : "wasn't"} submitted.`,
      className: "bg-[#F2F4F7] text-[#475467]",
      Icon: MinusCircle,
    },
    pending: {
      label: "Scoring",
      note: `${your} ${your.endsWith("slides") ? "are" : "is"} being scored. This page updates on its own.`,
      className: "bg-[#FFF7DF] text-[#92702A]",
      Icon: Clock,
    },
    review: {
      label: "With your faculty",
      note: `Your faculty will mark ${the}.`,
      className: "bg-[#EFF4FF] text-[#1D4ED8]",
      Icon: UserCheck,
    },
    delayed: {
      label: "Scoring delayed",
      note: "Scoring is taking longer than usual. Your faculty has been told and your marks will appear here.",
      className: "bg-[#FFF5F5] text-[#B42318]",
      Icon: AlertTriangle,
    },
  }
}

const MEMO_META = writtenMeta("this memo", "Your memo")
const DECK_META = writtenMeta("these slides", "Your slides")

const REFRESH_MS = 10000

/** The student's score and task-by-task breakdown. Never shows the correct answers. */
export default function SimulationResults() {
  const { id } = useParams()
  const [data, setData] = useState<JobsimResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!data || ![...data.memos, ...(data.decks ?? [])].some((item) => item.status === "pending")) return
    const timer = window.setTimeout(() => {
      getJobsimResults(data.attempt_id)
        .then(setData)
        .catch(() => undefined)
    }, REFRESH_MS)
    return () => window.clearTimeout(timer)
  }, [data])

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const detail = await getSimulationDetail(Number(id))
        if (!detail.attempt_id) throw new Error("not started")
        const results = await getJobsimResults(detail.attempt_id)
        if (isMounted) setData(results)
      } catch (err) {
        const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
        if (isMounted) setError(typeof detail === "string" ? detail : "Results aren't available for this simulation yet.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [id])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <Link
            to={`/student/simulations/${id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280] transition hover:text-[#111827]"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to simulation
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-[#111827]">Your results</h1>
          {data ? <p className="mt-1 text-sm text-[#6B7280]">{data.simulation.title}</p> : null}
        </div>

        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-[#6B7280]">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading results...
          </p>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-[#E6EBEB] bg-white p-5 text-sm font-medium text-[#374151]">{error}</div>
        ) : null}

        {data ? (
          <>
            <section className="grid grid-cols-2 gap-4 rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm sm:grid-cols-4">
              {[
                ["Score", `${data.marks} / ${data.max_marks}`],
                ["Percent", `${data.percent}%`],
                ["Correct", data.correct],
                ["To improve", data.incorrect + data.not_answered],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-[#6B7280]">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[#0B1D3A]">{value}</p>
                </div>
              ))}
              {data.memos_pending ? (
                <p className="col-span-full text-sm text-[#6B7280]">
                  Your memo marks aren't in this score yet. It will update once your memo is marked.
                </p>
              ) : null}
              {data.decks_pending ? (
                <p className="col-span-full text-sm text-[#6B7280]">
                  Your slide marks aren't in this score yet. It will update once your slides are marked.
                </p>
              ) : null}
              {data.unscored_parts.length ? (
                <p className="col-span-full text-sm text-[#6B7280]">
                  {data.unscored_parts.join(" and ")} scoring isn't available yet.
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">Task by task</h2>
              <ul className="mt-3 divide-y divide-[#EEF2F6]">
                {data.tasks.map((task) => {
                  const meta = STATUS_META[task.status]
                  return (
                    <li key={task.position} className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#6B7280]">
                            Task {task.position}
                            {task.stage ? ` · ${task.stage}` : ""}
                          </p>
                          <p className="mt-1 text-sm font-medium leading-6 text-[#111827]">{task.prompt}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm tabular-nums text-[#6B7280]">
                            {task.marks} / {task.max_marks}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
                            <meta.Icon size={14} aria-hidden="true" /> {meta.label}
                          </span>
                        </div>
                      </div>
                      {task.status !== "not_answered" ? (
                        <p className="mt-2 break-words text-sm text-[#374151]">
                          Your answer: <span className="font-mono">{task.student_input}</span>
                          {" → "}
                          <span className="font-mono font-semibold">{task.student_display}</span>
                          <span className="text-[#6B7280]"> ({task.format_label})</span>
                        </p>
                      ) : null}
                      {task.status === "incorrect" ? <p className="mt-1 text-sm text-[#6B7280]">{task.reason}</p> : null}
                      {task.marks_changed ? <p className="mt-1 text-xs text-[#92702A]">Marks changed by your faculty.</p> : null}
                    </li>
                  )
                })}
              </ul>
            </section>

            <WrittenSection title="Memo" items={data.memos} meta={MEMO_META} />
            <WrittenSection title="Slides" items={data.decks ?? []} meta={DECK_META} />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}

function WrittenSection({ title, items, meta }: { title: string; items: StudentMemoResult[]; meta: WrittenMeta }) {
  if (!items.length) return null
  return (
    <section className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <ul className="mt-3 divide-y divide-[#EEF2F6]">
        {items.map((memo) => {
          const status = memo.status === "scored" ? null : meta[memo.status]
          return (
            <li key={memo.position} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#6B7280]">
                    Task {memo.position}
                    {memo.stage ? ` · ${memo.stage}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-[#111827]">{memo.prompt}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm tabular-nums text-[#6B7280]">
                    {status ? "—" : memo.marks} / {memo.max_marks}
                  </span>
                  {status ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                      <status.Icon size={14} aria-hidden="true" /> {status.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#067647]">
                      <CheckCircle2 size={14} aria-hidden="true" /> Marked
                    </span>
                  )}
                </div>
              </div>
              {status ? <p className="mt-2 text-sm text-[#6B7280]">{status.note}</p> : null}
              {memo.feedback ? (
                <div className="mt-3 rounded-lg bg-[#F9FAFB] p-3">
                  <p className="text-xs font-semibold text-[#6B7280]">Feedback</p>
                  <p className="mt-1 text-sm leading-6 text-[#374151]">{memo.feedback}</p>
                </div>
              ) : null}
              {memo.marks_changed ? <p className="mt-2 text-xs text-[#92702A]">Marks changed by your faculty.</p> : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

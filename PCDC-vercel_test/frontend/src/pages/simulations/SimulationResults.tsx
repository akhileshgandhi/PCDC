import { isAxiosError } from "axios"
import { ArrowLeft, CheckCircle2, Loader2, MinusCircle, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import {
  getJobsimResults,
  getSimulationDetail,
  type JobsimResults,
  type ReviewStatus,
} from "../../api/jobsim"
import DashboardLayout from "../../layouts/DashboardLayout"

const STATUS_META: Record<ReviewStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  correct: { label: "Correct", className: "bg-[#ECFDF3] text-[#067647]", Icon: CheckCircle2 },
  incorrect: { label: "Incorrect", className: "bg-[#FFF5F5] text-[#B42318]", Icon: XCircle },
  not_answered: { label: "Not answered", className: "bg-[#F2F4F7] text-[#475467]", Icon: MinusCircle },
}

/** The student's score and task-by-task breakdown. Never shows the correct answers. */
export default function SimulationResults() {
  const { id } = useParams()
  const [data, setData] = useState<JobsimResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

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
              {data.unscored_parts.length ? (
                <p className="col-span-full text-sm text-[#6B7280]">
                  This score is for the spreadsheet part only. {data.unscored_parts.join(" and ")} scoring isn't available yet.
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
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}

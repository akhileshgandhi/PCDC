import { isAxiosError } from "axios"
import { ArrowLeft, ArrowRight, CalendarClock, Clock3, Database, Gauge, ListChecks, Tag, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { getSimulationDetail, type SimulationDetail as Detail } from "../../api/jobsim"
import { StatusBadge, actionText, dueText, durationText, taskMixText } from "../../components/jobsim/simulationBits"
import DashboardLayout from "../../layouts/DashboardLayout"

const TYPE_LABELS: Record<string, string> = {
  spreadsheet: "Spreadsheet",
  memo: "Memo",
  presentation: "Slides",
}

export default function SimulationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const simulationId = Number(id)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    getSimulationDetail(simulationId)
      .then((data) => {
        if (isMounted) setDetail(data)
      })
      .catch((err) => {
        const message = isAxiosError(err) ? err.response?.data?.detail : undefined
        if (isMounted) setError(typeof message === "string" ? message : "Unable to load this simulation.")
      })
    return () => {
      isMounted = false
    }
  }, [simulationId])

  const isFinished = detail?.status === "completed" || detail?.status === "time_up"

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <Link to="/student/simulations" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827]">
          <ArrowLeft size={16} aria-hidden="true" /> My Simulations
        </Link>

        {error ? (
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">{error}</div>
        ) : !detail ? (
          <section className="rounded-xl border border-[#E6EBEB] bg-white px-5 py-16 text-center text-sm text-[#6B7280] shadow-sm">
            Loading simulation...
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-xl bg-[#0B1D3A] p-6 text-white shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {detail.level ? (
                    <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">{detail.level}</span>
                  ) : null}
                  <span className="text-sm text-white/70">{detail.role}</span>
                </div>
                <h1 className="mt-3 text-3xl font-semibold [text-wrap:balance]">{detail.title}</h1>
                <p className="mt-2 text-sm text-white/75">{taskMixText(detail)}</p>
              </section>

              <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#111827]">About the simulation</h2>
                <p className="mt-2 max-w-[68ch] text-sm leading-6 text-[#374151]">
                  {detail.description || "You'll work as a " + detail.role + " on a real business dataset."}
                </p>
                {detail.skills.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {detail.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-[#FFF7DF] px-3 py-1 text-xs font-semibold text-[#92702A]">{skill}</span>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#111827]">What's inside</h2>
                <ol className="mt-4 space-y-4">
                  {detail.stages.map((stage, index) => (
                    <li key={stage.name} className="flex gap-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0B1D3A] text-sm font-semibold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-[#111827]">{stage.name}</p>
                        <p className="text-sm text-[#6B7280]">
                          {stage.tasks} {stage.tasks === 1 ? "task" : "tasks"} · {stage.types.map((t) => TYPE_LABELS[t] ?? t).join(", ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#111827]">How it works</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#374151]">
                  <li>The company's data opens as a read-only sheet. Type your answer, a value or a formula like =SUM(C2:C100), in the answer cell for each task.</li>
                  <li>Pick the format the task asks for (General, Number, Currency or Percent) and press Check Answer to see if it's right.</li>
                  <li>The timer starts when you start and keeps running even if you leave. Your work saves automatically, and Save and Exit lets you come back later.</li>
                </ul>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#111827]">Simulation details</h2>
                  <StatusBadge status={detail.status} />
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <DetailRow icon={<Clock3 size={16} />} label="Duration" value={durationText(detail.duration_minutes)} />
                  <DetailRow icon={<UserRound size={16} />} label="Job role" value={detail.role} />
                  {detail.level ? <DetailRow icon={<Gauge size={16} />} label="Level" value={detail.level} /> : null}
                  {detail.subject ? <DetailRow icon={<Tag size={16} />} label="Subject" value={detail.subject} /> : null}
                  <DetailRow icon={<ListChecks size={16} />} label="Tasks" value={String(detail.task_count)} />
                  <DetailRow
                    icon={<Database size={16} />}
                    label="Dataset"
                    value={`${detail.dataset_summary.rows.toLocaleString("en-IN")} rows · ${detail.dataset_summary.columns.length} columns`}
                  />
                  {dueText(detail.due_date) ? (
                    <DetailRow icon={<CalendarClock size={16} />} label="Due" value={dueText(detail.due_date) as string} />
                  ) : null}
                </dl>
                {detail.status === "in_progress" || detail.status === "time_up" ? (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs font-semibold text-[#6B7280]">
                      <span>Progress</span>
                      <span>{detail.progress_pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F6]">
                      <div className="h-full rounded-full bg-[#C9A227]" style={{ width: `${detail.progress_pct}%` }} />
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={detail.task_count === 0}
                  onClick={() => navigate(`/student/simulations/${detail.id}/${isFinished ? "results" : "workspace"}`)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#C9A227] px-4 py-3 text-sm font-semibold text-[#0B1D3A] transition hover:bg-[#E0B84E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionText(detail.status)} <ArrowRight size={16} aria-hidden="true" />
                </button>
                {detail.status === "not_started" ? (
                  <p className="mt-2 text-xs text-[#6B7280]">
                    The {durationText(detail.duration_minutes)} timer starts as soon as you click Start.
                  </p>
                ) : null}
              </section>

              {detail.dataset_summary.columns.length ? (
                <section className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-[#111827]">Data you'll work with</h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {detail.dataset_summary.columns.map((column) => (
                      <span key={column} className="rounded border border-[#E6EBEB] bg-[#F6F7F9] px-2 py-0.5 font-mono text-xs text-[#374151]">{column}</span>
                    ))}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#C9A227]" aria-hidden="true">{icon}</span>
      <dt className="w-20 shrink-0 text-[#6B7280]">{label}</dt>
      <dd className="min-w-0 font-semibold text-[#111827]">{value}</dd>
    </div>
  )
}

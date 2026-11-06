import { ArrowLeft, Download, Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { downloadSimulationResults, getSimulationResults, type SimulationResults } from "../../api/jobsim"
import FacultyLayout from "../../layouts/FacultyLayout"

type ResultItem = SimulationResults["items"][number]
type View = "students" | "sections" | "tasks"

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "students", label: "By student" },
  { id: "sections", label: "By section" },
  { id: "tasks", label: "By task" },
]
const NO_SECTION = "No section"
const ALL_SECTIONS = "all"

// By id: many sections share a name like A.
const sectionKey = (item: ResultItem) => String(item.section_id ?? "")

function sectionList(items: ResultItem[]) {
  const labels = new Map(items.map((item) => [sectionKey(item), item.section_label ?? NO_SECTION]))
  return [...labels].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label))
}

function average(values: number[]) {
  if (!values.length) return null
  return Math.round((100 * values.reduce((total, value) => total + value, 0)) / values.length) / 100
}

function SectionsTable({ items, maxMarks }: { items: ResultItem[]; maxMarks: number }) {
  return (
    <table className="w-full min-w-[620px] text-left text-sm">
      <thead className="text-xs uppercase tracking-wide text-[#6b7280]">
        <tr>
          <th className="pb-3 pr-4 font-semibold">Section</th>
          <th className="pb-3 text-right font-semibold">Started</th>
          <th className="pb-3 text-right font-semibold">Submitted</th>
          <th className="pb-3 text-right font-semibold">Average marks</th>
          <th className="pb-3 text-right font-semibold">Average %</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#eef2f7]">
        {sectionList(items).map((section) => {
          const inSection = items.filter((item) => sectionKey(item) === section.key)
          const submitted = inSection.filter((item) => item.status === "submitted")
          const mean = average(submitted.map((item) => item.marks))
          return (
            <tr key={section.key}>
              <td className="py-3 pr-4 font-semibold text-[#0b1d3a]">{section.label}</td>
              <td className="py-3 text-right tabular-nums text-[#374151]">{inSection.length}</td>
              <td className="py-3 text-right tabular-nums text-[#374151]">{submitted.length}</td>
              <td className="py-3 text-right tabular-nums text-[#374151]">{mean === null ? "—" : `${mean} / ${maxMarks}`}</td>
              <td className="py-3 text-right tabular-nums text-[#374151]">
                {mean === null || !maxMarks ? "—" : `${Math.round((1000 * mean) / maxMarks) / 10}%`}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function TasksTable({ items, tasks }: { items: ResultItem[]; tasks: SimulationResults["tasks"] }) {
  const submitted = items.filter((item) => item.status === "submitted")
  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="text-xs uppercase tracking-wide text-[#6b7280]">
        <tr>
          <th className="pb-3 pr-4 font-semibold">Task</th>
          <th className="pb-3 text-right font-semibold">Correct</th>
          <th className="pb-3 text-right font-semibold">Incorrect</th>
          <th className="pb-3 text-right font-semibold">Not answered</th>
          <th className="pb-3 text-right font-semibold">Average marks</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#eef2f7]">
        {tasks.map((task) => {
          const results = submitted.flatMap((item) => item.task_results.filter((result) => result.task_id === task.task_id))
          const count = (status: string) => results.filter((result) => result.status === status).length
          const mean = average(results.map((result) => result.marks))
          return (
            <tr key={task.task_id}>
              <td className="py-3 pr-4">
                <p className="text-xs font-semibold text-[#6b7280]">
                  Task {task.position}
                  {task.stage ? ` · ${task.stage}` : ""}
                </p>
                <p className="mt-0.5 text-[#111827]">{task.prompt}</p>
              </td>
              <td className="py-3 text-right tabular-nums text-[#374151]">{count("correct")}</td>
              <td className="py-3 text-right tabular-nums text-[#374151]">{count("incorrect")}</td>
              <td className="py-3 text-right tabular-nums text-[#374151]">{count("not_answered")}</td>
              <td className="py-3 text-right tabular-nums text-[#374151]">{mean === null ? "—" : `${mean} / ${task.max_marks}`}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Every student's attempt at one simulation, by student, section or task. */
export default function FacultySimulationResults() {
  const { id } = useParams()
  const [data, setData] = useState<SimulationResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [view, setView] = useState<View>("students")
  const [section, setSection] = useState(ALL_SECTIONS)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    let isMounted = true
    getSimulationResults(Number(id))
      .then((result) => {
        if (isMounted) setData(result)
      })
      .catch(() => {
        if (isMounted) setError("Unable to load the results.")
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [id])

  const sections = useMemo(() => sectionList(data?.items ?? []), [data])
  const items = useMemo(
    () => (data?.items ?? []).filter((item) => section === ALL_SECTIONS || sectionKey(item) === section),
    [data, section],
  )

  async function download() {
    setIsDownloading(true)
    setError("")
    try {
      await downloadSimulationResults(Number(id))
    } catch {
      setError("Unable to download the results.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              to={`/faculty/simulations/${id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#6b7280] transition hover:text-[#111827]"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to simulation
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-[#111827]">Results</h1>
            {data ? <p className="mt-1 text-sm text-[#6b7280]">{data.simulation.title}</p> : null}
          </div>
          {data && data.items.length ? (
            <button
              type="button"
              onClick={() => void download()}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-md border border-[#0b1d3a] px-3 py-2 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Download size={16} aria-hidden="true" />
              )}
              Download all results (CSV)
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-medium text-[#b91c1c]">{error}</div>
        ) : null}

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading results...
            </p>
          ) : data && data.items.length === 0 ? (
            <p className="rounded-md border border-dashed border-[#d0d5dd] py-6 text-center text-sm text-[#6b7280]">
              No student from your sections has started this simulation yet.
            </p>
          ) : data ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {VIEWS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={view === option.id}
                      onClick={() => setView(option.id)}
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                        view === option.id ? "bg-[#0b1d3a] text-white" : "text-[#374151] hover:bg-[#f2f4f7]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {view !== "sections" ? (
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#374151]">
                    Section
                    <select
                      value={section}
                      onChange={(event) => setSection(event.target.value)}
                      className="rounded-md border border-[#d0d5dd] bg-white px-3 py-1.5 text-sm font-normal text-[#111827]"
                    >
                      <option value={ALL_SECTIONS}>All sections</option>
                      {sections.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              <div className="overflow-x-auto">
                {view === "sections" ? (
                  <SectionsTable items={data.items} maxMarks={data.max_marks} />
                ) : view === "tasks" ? (
                  <TasksTable items={items} tasks={data.tasks} />
                ) : (
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-[#6b7280]">
                      <tr>
                        <th className="pb-3 pr-4 font-semibold">Student</th>
                        <th className="pb-3 pr-4 font-semibold">Section</th>
                        <th className="pb-3 pr-4 font-semibold">Status</th>
                        <th className="pb-3 text-right font-semibold">Correct</th>
                        <th className="pb-3 text-right font-semibold">Incorrect</th>
                        <th className="pb-3 text-right font-semibold">Not answered</th>
                        <th className="pb-3 text-right font-semibold">Marks</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2f7]">
                      {items.map((item) => (
                        <tr key={item.attempt_id}>
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-[#0b1d3a]">{item.student_name}</p>
                            {item.college_id ? <p className="text-xs text-[#6b7280]">{item.college_id}</p> : null}
                          </td>
                          <td className="py-3 pr-4 text-[#374151]">{item.section_label ?? "—"}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                item.status === "submitted" ? "bg-[#ecfdf3] text-[#067647]" : "bg-[#fff7df] text-[#92702a]"
                              }`}
                            >
                              {item.status === "submitted" ? "Submitted" : "In progress"}
                            </span>
                          </td>
                          <td className="py-3 text-right tabular-nums text-[#374151]">{item.correct}</td>
                          <td className="py-3 text-right tabular-nums text-[#374151]">{item.incorrect}</td>
                          <td className="py-3 text-right tabular-nums text-[#374151]">{item.not_answered}</td>
                          <td className="py-3 text-right tabular-nums text-[#374151]">
                            {item.marks} / {data.max_marks}
                            {item.task_results.some((result) => result.marks_changed) ? (
                              <p className="text-xs text-[#92702a]">Changed by faculty</p>
                            ) : null}
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Link
                              to={`/faculty/simulations/attempts/${item.attempt_id}`}
                              className="inline-flex rounded-md border border-[#0b1d3a] px-3 py-1.5 text-xs font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
                            >
                              View answers
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {view !== "students" ? (
                <p className="mt-3 text-xs text-[#6b7280]">Averages and counts use submitted attempts only.</p>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </FacultyLayout>
  )
}

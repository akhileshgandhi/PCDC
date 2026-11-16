import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { getAdminSimulation, type AdminSimulationDetail } from "../../api/jobsim"
import DatasetGrid from "../../components/jobsim/DatasetGrid"
import AdminLayout from "../../layouts/AdminLayout"
import { AuthorStatusBadge } from "../faculty/FacultySimulations"

/** Admin's read-only look at one simulation — its details, dataset and every
 * task, but never the answer key (formula, expected format). There is
 * nothing to save or publish here; faculty own the whole lifecycle. */
export default function AdminSimulationView() {
  const { id } = useParams()
  const simulationId = id ? Number(id) : null
  const [sim, setSim] = useState<AdminSimulationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!simulationId) return
    let isMounted = true
    setIsLoading(true)
    getAdminSimulation(simulationId)
      .then((data) => {
        if (isMounted) setSim(data)
      })
      .catch(() => {
        if (isMounted) setError("Unable to load this simulation.")
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [simulationId])

  return (
    <AdminLayout>
      <div className="space-y-5">
        <Link
          to="/admin/simulations"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6b7280] hover:text-[#111827]"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Simulations
        </Link>

        {isLoading ? (
          <p className="py-16 text-center text-sm text-[#6b7280]">Loading simulation...</p>
        ) : error ? (
          <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div>
        ) : sim ? (
          <>
            <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#111827]">{sim.title}</h1>
                <AuthorStatusBadge status={sim.status} />
              </div>
              <p className="mt-1 text-sm text-[#6b7280]">
                {[sim.role, sim.subject, sim.semester ? `Semester ${sim.semester}` : null, sim.level, `${sim.duration_minutes} min`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {sim.description ? <p className="mt-3 text-sm leading-6 text-[#374151]">{sim.description}</p> : null}
              {sim.skills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sim.skills.map((skill) => (
                    <span key={skill.id} className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#374151]">
                      {skill.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
                Dataset ({sim.dataset.rows.length.toLocaleString("en-IN")} rows)
              </h2>
              <div className="mt-3 h-80 overflow-hidden rounded-md border border-[#e6e8eb]">
                <DatasetGrid columns={sim.dataset.columns} rows={sim.dataset.rows} />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
                Tasks ({sim.tasks.length})
              </h2>
              {sim.tasks.map((task, index) => (
                <div key={task.id ?? index} className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
                      Task {index + 1} · {task.type}
                      {task.stage ? ` · ${task.stage}` : ""}
                    </span>
                    <span className="text-xs font-semibold text-[#6b7280]">{task.max_score} marks</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#111827]">{task.prompt}</p>
                  {task.hint ? <p className="mt-2 text-sm italic text-[#6b7280]">Hint: {task.hint}</p> : null}
                  {task.rubric?.criteria.length ? (
                    <ul className="mt-3 space-y-1 text-sm text-[#374151]">
                      {task.rubric.criteria.map((criterion, i) => (
                        <li key={i}>
                          {criterion.name} — {criterion.max} marks
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </AdminLayout>
  )
}

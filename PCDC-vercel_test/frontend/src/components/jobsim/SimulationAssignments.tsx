import { Send, UserRound, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
  closeSimulationAssignment,
  getSimulationAssignments,
  type SimulationAssignment,
} from "../../api/jobsim"
import AssignSimulationDialog from "./AssignSimulationDialog"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso))
}

/** Who a published simulation is assigned to, with progress, plus Assign and Close. */
export default function SimulationAssignments({
  simulation,
  canAssign,
}: {
  simulation: { id: number; title: string }
  canAssign: boolean
}) {
  const [items, setItems] = useState<SimulationAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [closingId, setClosingId] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ text: string; warn?: boolean } | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      setItems((await getSimulationAssignments(simulation.id)).items)
    } catch {
      setError("Unable to load the assignments.")
    } finally {
      setIsLoading(false)
    }
  }, [simulation.id])

  useEffect(() => {
    void load()
  }, [load])

  async function close(item: SimulationAssignment) {
    if (!window.confirm(`Close the assignment for "${item.name}"? Students who haven't started will no longer see it; anyone who started can still finish.`)) return
    setClosingId(item.id)
    setError("")
    try {
      await closeSimulationAssignment(item.id)
      setItems((current) => current.map((x) => (x.id === item.id ? { ...x, status: "closed" } : x)))
      setNotice({ text: "Assignment closed." })
    } catch {
      setError("Unable to close this assignment.")
    } finally {
      setClosingId(null)
    }
  }

  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Assignments</h2>
          <p className="text-sm text-[#6b7280]">
            {canAssign
              ? "Assign this simulation to whole sections or specific students. The timer starts when each student clicks Start."
              : "This simulation is withdrawn, so it can't be newly assigned. Students who started can still finish."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {items.some((item) => item.started > 0) ? (
            <Link
              to={`/faculty/simulations/${simulation.id}/results`}
              className="inline-flex items-center justify-center rounded-md border border-[#0b1d3a] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
            >
              View results
            </Link>
          ) : null}
          {canAssign ? (
            <button
              type="button"
              onClick={() => setIsAssigning(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e]"
            >
              <Send size={16} aria-hidden="true" /> Assign
            </button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div
          className={`mt-4 rounded-md border px-3 py-2 text-sm font-medium ${
            notice.warn ? "border-[#fde68a] bg-[#fffbeb] text-[#92400e]" : "border-[#a6f4c5] bg-[#ecfdf3] text-[#067647]"
          }`}
        >
          {notice.text}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-medium text-[#b91c1c]">{error}</div>
      ) : null}

      <div className="mt-4">
        {isLoading ? (
          <p className="py-4 text-sm text-[#6b7280]">Loading assignments...</p>
        ) : items.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#d0d5dd] py-6 text-center text-sm text-[#6b7280]">
            Not assigned to anyone yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#eef2f7]">
            {items.map((item) => {
              const pct = item.students ? Math.round((item.completed / item.students) * 100) : 0
              return (
                <li key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-[#f6f7fb] text-[#0b1d3a]">
                      {item.kind === "section" ? <Users size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111827]">
                        {item.name ?? "—"}{" "}
                        <span className="text-xs font-medium text-[#6b7280]">{item.kind === "section" ? "Section" : "Student"}</span>
                        {item.status === "closed" ? (
                          <span className="ml-2 rounded-full bg-[#f2f4f7] px-2 py-0.5 text-xs font-semibold text-[#475467]">Closed</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        Assigned {formatDate(item.created_at)}
                        {item.assigned_by_name ? ` by ${item.assigned_by_name}` : ""}
                        {item.due_date ? ` · Due ${formatDate(item.due_date)}` : " · No due date"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-44">
                      <p className="text-xs text-[#6b7280]">
                        <span className="font-semibold text-[#111827] tabular-nums">{item.completed}/{item.students}</span> completed ·{" "}
                        <span className="tabular-nums">{item.started}</span> started
                      </p>
                      <div className="mt-1 h-1.5 rounded-full bg-[#eef2f7]">
                        <div className="h-1.5 rounded-full bg-[#067647]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {item.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => void close(item)}
                        disabled={closingId === item.id}
                        className="rounded-md border border-[#e6e8eb] px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#f6f7fb] disabled:opacity-60"
                      >
                        {closingId === item.id ? "Closing..." : "Close"}
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {isAssigning ? (
        <AssignSimulationDialog
          simulation={simulation}
          onClose={() => setIsAssigning(false)}
          onAssigned={(text, warn) => {
            setIsAssigning(false)
            setNotice({ text, warn })
            void load()
          }}
        />
      ) : null}
    </section>
  )
}

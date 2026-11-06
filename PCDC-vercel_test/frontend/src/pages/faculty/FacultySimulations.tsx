import { Plus, Send, Table2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  listAuthorSimulations,
  type AuthorSimulationListItem,
  type SimulationAuthorStatus,
} from "../../api/jobsim"
import AssignSimulationDialog from "../../components/jobsim/AssignSimulationDialog"
import FacultyLayout from "../../layouts/FacultyLayout"

export const AUTHOR_STATUS: Record<SimulationAuthorStatus, { label: string; className: string; note: string }> = {
  draft: { label: "Draft", className: "bg-[#f2f4f7] text-[#475467]", note: "Being edited" },
  approved: { label: "Approved", className: "bg-[#fff7df] text-[#92702a]", note: "Waiting for an admin to publish" },
  published: { label: "Published", className: "bg-[#ecfdf3] text-[#067647]", note: "Ready to assign" },
  withdrawn: { label: "Withdrawn", className: "bg-[#fff5f5] text-[#b42318]", note: "Can't be newly assigned" },
}

export function AuthorStatusBadge({ status }: { status: SimulationAuthorStatus }) {
  const meta = AUTHOR_STATUS[status]
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`} title={meta.note}>
      {meta.label}
    </span>
  )
}

/** Faculty library of spreadsheet job simulations they created. */
export default function FacultySimulations() {
  const [items, setItems] = useState<AuthorSimulationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [assigning, setAssigning] = useState<AuthorSimulationListItem | null>(null)
  const [notice, setNotice] = useState<{ text: string; warn?: boolean } | null>(null)

  useEffect(() => {
    let isMounted = true
    listAuthorSimulations()
      .then((data) => {
        if (isMounted) setItems(data.items)
      })
      .catch(() => {
        if (isMounted) setError("Unable to load your simulations.")
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const counts = useMemo(() => {
    const out: Record<SimulationAuthorStatus, number> = { draft: 0, approved: 0, published: 0, withdrawn: 0 }
    for (const item of items) out[item.status] += 1
    return out
  }, [items])

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">My Simulations</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Spreadsheet job simulations: a company dataset plus tasks students answer with formulas.
                Create one with AI or build it yourself, check every answer, then approve it for publishing.
              </p>
            </div>
            <Link
              to="/faculty/simulations/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-5 py-3 text-sm font-semibold text-[#0b1d3a] shadow-sm transition hover:bg-[#e0b84e]"
            >
              <Plus size={17} aria-hidden="true" /> Create Simulation
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {(Object.keys(AUTHOR_STATUS) as SimulationAuthorStatus[]).map((status) => (
              <span key={status} className="rounded-full border border-[#e6e8eb] bg-[#f6f7fb] px-4 py-2 text-sm">
                <span className="font-semibold text-[#111827]">{AUTHOR_STATUS[status].label}:</span>{" "}
                <span className="font-semibold text-[#0b1d3a]">{counts[status]}</span>
              </span>
            ))}
          </div>
        </section>

        {notice ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              notice.warn ? "border-[#fde68a] bg-[#fffbeb] text-[#92400e]" : "border-[#a6f4c5] bg-[#ecfdf3] text-[#067647]"
            }`}
          >
            {notice.text}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div>
        ) : null}

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#6b7280]">Loading simulations...</p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <Table2 className="mx-auto text-[#c9a227]" size={28} aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold text-[#111827]">No simulations yet</h2>
              <p className="mt-1 text-sm text-[#6b7280]">Create your first spreadsheet simulation with AI in about a minute.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eef2f7] text-xs uppercase tracking-wide text-[#6b7280]">
                    <th className="pb-3 font-semibold">Simulation</th>
                    <th className="pb-3 font-semibold">Job role</th>
                    <th className="pb-3 text-right font-semibold">Tasks</th>
                    <th className="pb-3 text-right font-semibold">Data rows</th>
                    <th className="pb-3 text-right font-semibold">Attempts</th>
                    <th className="pb-3 pl-6 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Updated</th>
                    <th className="pb-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f7]">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-4">
                        <Link to={`/faculty/simulations/${item.id}`} className="font-semibold text-[#0b1d3a] hover:underline">
                          {item.title}
                        </Link>
                        <p className="text-xs text-[#6b7280]">
                          {[item.subject, item.level, `${item.duration_minutes} min`].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="py-3 text-[#374151]">{item.role || "—"}</td>
                      <td className="py-3 text-right tabular-nums text-[#374151]">{item.task_count}</td>
                      <td className="py-3 text-right tabular-nums text-[#374151]">{item.row_count.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right tabular-nums text-[#374151]">{item.attempt_count}</td>
                      <td className="py-3 pl-6"><AuthorStatusBadge status={item.status} /></td>
                      <td className="py-3 text-[#6b7280]">
                        {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(item.updated_at))}
                      </td>
                      <td className="space-x-2 whitespace-nowrap py-3 text-right">
                        {item.attempt_count > 0 ? (
                          <Link
                            to={`/faculty/simulations/${item.id}/results`}
                            className="inline-flex items-center rounded-md border border-[#0b1d3a] px-3 py-1.5 text-xs font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
                          >
                            Results
                          </Link>
                        ) : null}
                        {item.status === "published" ? (
                          <button
                            type="button"
                            onClick={() => setAssigning(item)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#0b1d3a] px-3 py-1.5 text-xs font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
                          >
                            <Send size={13} aria-hidden="true" /> Assign
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {assigning ? (
        <AssignSimulationDialog
          simulation={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={(text, warn) => {
            setAssigning(null)
            setNotice({ text, warn })
          }}
        />
      ) : null}
    </FacultyLayout>
  )
}

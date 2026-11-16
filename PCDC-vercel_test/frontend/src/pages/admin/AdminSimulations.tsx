import { Table2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { listAdminSimulations, type AdminSimulationListItem } from "../../api/jobsim"
import AdminLayout from "../../layouts/AdminLayout"
import { AuthorStatusBadge } from "../faculty/FacultySimulations"

type Tab = "approved" | "published" | "withdrawn"

const TABS: Array<{ value: Tab; label: string; empty: string }> = [
  { value: "approved", label: "Approved", empty: "No approved simulations yet." },
  { value: "published", label: "Published", empty: "No published simulations yet." },
  { value: "withdrawn", label: "Withdrawn", empty: "No withdrawn simulations." },
]

/** Admin's read-only view of spreadsheet job simulations (handover A1/A2).
 * Faculty own the whole lifecycle — approve, publish, withdraw, assign — so
 * this page only shows what exists, with no action beyond opening one to
 * look at its data and tasks (never the answer key). */
export default function AdminSimulations() {
  const [items, setItems] = useState<AdminSimulationListItem[]>([])
  const [counts, setCounts] = useState<Record<Tab, number>>({ approved: 0, published: 0, withdrawn: 0 })
  const [tab, setTab] = useState<Tab>("approved")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await listAdminSimulations()
      setItems(data.items)
      setCounts(data.counts)
    } catch {
      setError("Unable to load simulations.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = items.filter((item) => item.status === tab)
  const current = TABS.find((t) => t.value === tab)!

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">Simulations</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
            Spreadsheet job simulations faculty have approved, published or withdrawn. View only — faculty approve,
            publish, withdraw and assign their own simulations directly; there's nothing to action here.
          </p>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  tab === t.value
                    ? "border-[#0b1d3a] bg-[#0b1d3a] text-white"
                    : "border-[#e6e8eb] bg-[#f6f7fb] text-[#111827] hover:border-[#c9a227]"
                }`}
              >
                {t.label} <span className="ml-1 tabular-nums opacity-80">{counts[t.value] ?? 0}</span>
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div>
        ) : null}

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#6b7280]">Loading simulations...</p>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center">
              <Table2 className="mx-auto text-[#c9a227]" size={28} aria-hidden="true" />
              <p className="mt-3 text-sm text-[#6b7280]">{current.empty}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eef2f7] text-xs uppercase tracking-wide text-[#6b7280]">
                    <th className="pb-3 font-semibold">Simulation</th>
                    <th className="pb-3 font-semibold">Created by</th>
                    <th className="pb-3 text-right font-semibold">Tasks</th>
                    <th className="pb-3 text-right font-semibold">Data rows</th>
                    <th className="pb-3 text-right font-semibold">Assigned</th>
                    <th className="pb-3 text-right font-semibold">Attempts</th>
                    <th className="pb-3 pl-6 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Updated</th>
                    <th className="pb-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f7]">
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-4">
                        <Link to={`/admin/simulations/${item.id}`} className="font-semibold text-[#0b1d3a] hover:underline">
                          {item.title}
                        </Link>
                        <p className="text-xs text-[#6b7280]">
                          {[item.role, item.subject, item.semester ? `Semester ${item.semester}` : null, item.level, `${item.duration_minutes} min`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </td>
                      <td className="py-3 text-[#374151]">{item.created_by_name ?? "—"}</td>
                      <td className="py-3 text-right tabular-nums text-[#374151]">{item.task_count}</td>
                      <td className="py-3 text-right tabular-nums text-[#374151]">{item.row_count.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right tabular-nums text-[#374151]">{item.assignment_count}</td>
                      <td className="py-3 text-right tabular-nums text-[#374151]">{item.attempt_count}</td>
                      <td className="py-3 pl-6"><AuthorStatusBadge status={item.status} /></td>
                      <td className="py-3 text-[#6b7280]">
                        {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(item.updated_at))}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/admin/simulations/${item.id}`}
                          className="rounded-md border border-[#e6e8eb] px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#f6f7fb]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}

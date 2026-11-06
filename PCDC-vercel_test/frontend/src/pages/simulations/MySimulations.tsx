import { BriefcaseBusiness, CalendarClock, Clock3, Search, Table2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { getAssignedSimulations, type AssignedSimulation } from "../../api/jobsim"
import {
  StatusBadge,
  actionText,
  dueText,
  durationText,
  taskMixText,
} from "../../components/jobsim/simulationBits"
import DashboardLayout from "../../layouts/DashboardLayout"

const ALL_ROLES = "__all__"

/**
 * My Simulations: job simulations assigned by faculty, grouped by job role.
 * The student picks a role to focus on, then opens a simulation.
 */
export default function MySimulations() {
  const [items, setItems] = useState<AssignedSimulation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [role, setRole] = useState(ALL_ROLES)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let isMounted = true
    getAssignedSimulations()
      .then((data) => {
        if (isMounted) setItems(data.items)
      })
      .catch(() => {
        if (isMounted) setError("Unable to load your simulations. Reload the page to try again.")
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const roles = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) counts.set(item.role, (counts.get(item.role) ?? 0) + 1)
    return Array.from(counts, ([name, count]) => ({ name, count }))
  }, [items])

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = items.filter(
      (item) =>
        (role === ALL_ROLES || item.role === role) &&
        (!query ||
          item.title.toLowerCase().includes(query) ||
          (item.subject ?? "").toLowerCase().includes(query)),
    )
    const byRole = new Map<string, AssignedSimulation[]>()
    for (const item of filtered) byRole.set(item.role, [...(byRole.get(item.role) ?? []), item])
    return Array.from(byRole, ([name, sims]) => ({ name, sims }))
  }, [items, role, search])

  const count = (status: AssignedSimulation["status"]) => items.filter((i) => i.status === status).length

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <section className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">My Simulations</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
                Step into a job role and do the real work: analyse a company's data in a spreadsheet,
                check each answer, and build job-ready skills.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatPill label="Assigned" value={items.length} />
              <StatPill label="Not started" value={count("not_started")} />
              <StatPill label="In progress" value={count("in_progress")} />
              <StatPill label="Completed" value={count("completed")} />
            </div>
          </div>
        </section>

        {roles.length > 0 ? (
          <section className="rounded-xl border border-[#E6EBEB] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Choose a job role
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Job role">
                  <RoleChip label="All roles" count={items.length} active={role === ALL_ROLES} onClick={() => setRole(ALL_ROLES)} />
                  {roles.map((r) => (
                    <RoleChip key={r.name} label={r.name} count={r.count} active={role === r.name} onClick={() => setRole(r.name)} />
                  ))}
                </div>
              </div>
              <label className="flex h-11 w-full items-center gap-3 rounded-lg border border-[#E6EBEB] bg-white px-3 text-[#6B7280] transition focus-within:border-[#C9A227] focus-within:ring-2 focus-within:ring-[#C9A227]/20 xl:max-w-xs">
                <Search size={17} aria-hidden="true" />
                <span className="sr-only">Search simulations</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search simulations..."
                  className="w-full bg-transparent text-sm font-medium text-[#111827] outline-none placeholder:text-[#6B7280]"
                />
              </label>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">{error}</div>
        ) : null}

        {isLoading ? (
          <section className="rounded-xl border border-[#E6EBEB] bg-white px-5 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-[#6B7280]">Loading your simulations...</p>
          </section>
        ) : groups.length === 0 ? (
          <section className="rounded-xl border border-dashed border-[#E6EBEB] bg-white px-5 py-16 text-center shadow-sm">
            <BriefcaseBusiness className="mx-auto text-[#C9A227]" size={28} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#111827]">
              {items.length ? "No simulations match your search." : "No simulations assigned yet."}
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Job simulations your faculty assign to you will appear here, grouped by job role.
            </p>
          </section>
        ) : (
          groups.map((group) => (
            <section key={group.name} className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-[#111827]">{group.name}</h2>
                <p className="text-sm text-[#6B7280]">
                  {group.sims.length} {group.sims.length === 1 ? "simulation" : "simulations"} ·{" "}
                  {group.sims.filter((s) => s.status === "not_started").length} not started ·{" "}
                  {group.sims.filter((s) => s.status === "in_progress").length} in progress ·{" "}
                  {group.sims.filter((s) => s.status === "completed").length} completed
                </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.sims.map((sim) => (
                  <SimulationCard key={sim.id} sim={sim} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}

function SimulationCard({ sim }: { sim: AssignedSimulation }) {
  const due = dueText(sim.due_date)
  const target =
    sim.status === "in_progress"
      ? `/student/simulations/${sim.id}/workspace`
      : sim.status === "not_started"
        ? `/student/simulations/${sim.id}`
        : `/student/simulations/${sim.id}/results`
  return (
    <article className="flex flex-col rounded-lg border border-[#E6EBEB] bg-white transition hover:border-[#C9A227] hover:shadow-sm">
      <div className="rounded-t-lg bg-[#0B1D3A] px-4 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            {sim.level || "Simulation"}
          </span>
          <Table2 size={18} className="text-[#C9A227]" aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-snug [text-wrap:balance]">{sim.title}</h3>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280]">
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} aria-hidden="true" /> {durationText(sim.duration_minutes)}
          </span>
          {sim.subject ? <span>{sim.subject}</span> : null}
          {due ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={13} aria-hidden="true" /> Due {due}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-[#374151]">{taskMixText(sim)}</p>
        <div className="mt-auto">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <StatusBadge status={sim.status} />
            <span className="text-[#6B7280]">{sim.progress_pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F6]" role="progressbar" aria-valuenow={sim.progress_pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${sim.title} progress`}>
            <div className="h-full rounded-full bg-[#C9A227]" style={{ width: `${sim.progress_pct}%` }} />
          </div>
        </div>
        <Link
          to={target}
          className="inline-flex items-center justify-center rounded-lg bg-[#0B1D3A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B3452]"
        >
          {actionText(sim.status)}
        </Link>
      </div>
    </article>
  )
}

function RoleChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-[#0B1D3A] bg-[#0B1D3A] text-white"
          : "border-[#E6EBEB] bg-white text-[#374151] hover:border-[#C9A227]"
      }`}
    >
      {label} <span className={active ? "text-white/70" : "text-[#9CA3AF]"}>{count}</span>
    </button>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-[#E6EBEB] bg-[#F6F7F9] px-4 py-2 text-sm">
      <span className="font-semibold text-[#111827]">{label}:</span>{" "}
      <span className="font-semibold text-[#0B1D3A]">{value}</span>
    </div>
  )
}

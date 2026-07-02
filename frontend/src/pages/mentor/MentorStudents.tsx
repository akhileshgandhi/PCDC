import { AlertTriangle, ArrowRight, RefreshCw, Search, TrendingUp } from "lucide-react"
import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  getMentorStudents,
  type MentorStudent,
  type MentorStudentStatus,
} from "../../api/mentor"
import MentorLayout from "../../layouts/MentorLayout"

const statuses: Array<{ label: string; value: "" | MentorStudentStatus }> = [
  { label: "All Status", value: "" },
  { label: "On Track", value: "on_track" },
  { label: "At Risk", value: "at_risk" },
  { label: "Stagnant", value: "stagnant" },
  { label: "Top Performer", value: "top_performer" },
  { label: "Inactive", value: "inactive" },
]

const sortOptions = [
  { label: "Score High-Low", value: "score_desc" },
  { label: "Score Low-High", value: "score_asc" },
  { label: "Last Activity", value: "last_activity" },
  { label: "Level", value: "level" },
]

export default function MentorStudents() {
  const [students, setStudents] = useState<MentorStudent[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [level, setLevel] = useState("")
  const [weakness, setWeakness] = useState("")
  const [sort, setSort] = useState("score_desc")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadStudents() {
    setIsLoading(true)
    try {
      const data = await getMentorStudents({
        search,
        status,
        level,
        weakness,
        sort,
      })
      setStudents(data.items)
      setTotal(data.total)
      setError("")
    } catch {
      setError("Unable to load assigned students right now.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, level, weakness, sort])

  const atRiskCount = useMemo(
    () => students.filter((student) => ["at_risk", "inactive"].includes(student.status)).length,
    [students],
  )
  const topPerformerCount = useMemo(
    () => students.filter((student) => student.status === "top_performer").length,
    [students],
  )

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    loadStudents()
  }

  return (
    <MentorLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#dfe5dd] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#1c2420]">
                My Students
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#617069]">
                Prioritize assigned students by risk, activity, capability weakness, and level.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatPill label="Loaded" value={students.length} />
              <StatPill label="At Risk" value={atRiskCount} />
              <StatPill label="Top" value={topPerformerCount} />
              <StatPill label="Total" value={total} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#dfe5dd] bg-white p-4 shadow-sm">
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-3 xl:grid-cols-[1fr_170px_130px_190px_170px_auto]"
          >
            <label className="flex h-11 items-center gap-3 rounded-md border border-[#dfe5dd] bg-white px-3 text-[#617069] transition focus-within:border-[#f3c95b] focus-within:ring-2 focus-within:ring-[#f3c95b]/30">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search students</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email..."
                className="w-full bg-transparent text-sm font-medium text-[#1c2420] outline-none placeholder:text-[#617069]"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-md border border-[#dfe5dd] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#f3c95b] focus:ring-2 focus:ring-[#f3c95b]/30"
              aria-label="Status"
            >
              {statuses.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="h-11 rounded-md border border-[#dfe5dd] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#f3c95b] focus:ring-2 focus:ring-[#f3c95b]/30"
              aria-label="Level"
            >
              <option value="">All Levels</option>
              {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                <option key={item} value={item}>
                  Level {item}
                </option>
              ))}
            </select>

            <input
              value={weakness}
              onChange={(event) => setWeakness(event.target.value)}
              placeholder="Weakest capability"
              className="h-11 rounded-md border border-[#dfe5dd] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#f3c95b] focus:ring-2 focus:ring-[#f3c95b]/30"
            />

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-11 rounded-md border border-[#dfe5dd] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#f3c95b] focus:ring-2 focus:ring-[#f3c95b]/30"
              aria-label="Sort"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#17382f] px-4 text-sm font-semibold text-white transition hover:bg-[#245848]"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Apply
            </button>
          </form>
        </section>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-[#dfe5dd] bg-white shadow-sm">
          <div className="hidden grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.9fr_1fr_auto] gap-4 border-b border-[#dfe5dd] bg-[#f6f7f4] px-5 py-3 text-xs font-semibold uppercase text-[#617069] lg:grid">
            <span>Name</span>
            <span>Level</span>
            <span>Score</span>
            <span>Weakness</span>
            <span>Status</span>
            <span>Last Activity</span>
            <span>Open</span>
          </div>

          {isLoading ? (
            <div className="px-5 py-12 text-center text-sm font-medium text-[#617069]">
              Loading assigned students...
            </div>
          ) : students.length > 0 ? (
            <div className="divide-y divide-[#dfe5dd]">
              {students.map((student) => (
                <StudentRow key={student.student_id} student={student} />
              ))}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <h2 className="text-lg font-semibold text-[#1c2420]">No students found.</h2>
              <p className="mt-2 text-sm text-[#617069]">
                Adjust filters or confirm mentor assignments with an admin.
              </p>
            </div>
          )}
        </section>
      </div>
    </MentorLayout>
  )
}

interface StudentRowProps {
  student: MentorStudent
}

function StudentRow({ student }: StudentRowProps) {
  return (
    <article className="grid gap-4 px-5 py-4 lg:grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.9fr_1fr_auto] lg:items-center">
      <div className="min-w-0">
        <Link
          to={`/mentor/student/${student.student_id}`}
          className="truncate text-sm font-semibold text-[#1c2420] transition hover:text-[#2d6f5d]"
        >
          {student.name}
        </Link>
        <p className="mt-1 truncate text-sm text-[#617069]">{student.email}</p>
        <p className="mt-2 text-xs text-[#617069] lg:hidden">
          Level {student.current_level ?? "-"} - {titleCase(student.status)}
        </p>
      </div>

      <span className="text-sm font-semibold text-[#1c2420]">
        L{student.current_level ?? "-"}
      </span>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#1c2420]">
          {student.average_score}
        </span>
        {student.average_score >= 80 ? (
          <TrendingUp size={16} className="text-[#2d6f5d]" aria-hidden="true" />
        ) : null}
      </div>

      <span className="text-sm text-[#617069]">{student.weakest_capability || "-"}</span>

      <span>
        <StatusBadge status={student.status} />
      </span>

      <span className="text-sm text-[#617069]">
        {student.last_activity_at ? formatDate(student.last_activity_at) : "No activity"}
      </span>

      <Link
        to={`/mentor/student/${student.student_id}`}
        className="inline-flex size-9 items-center justify-center rounded-md border border-[#dfe5dd] text-[#17382f] transition hover:border-[#f3c95b] hover:bg-[#fff8db]"
        aria-label={`Open ${student.name}`}
        title="Open student"
      >
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}

interface StatusBadgeProps {
  status: MentorStudentStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<MentorStudentStatus, string> = {
    on_track: "bg-[#ecfdf3] text-[#027a48]",
    at_risk: "bg-[#fff1f0] text-[#b42318]",
    stagnant: "bg-[#fff8db] text-[#8a6100]",
    top_performer: "bg-[#e6f2ee] text-[#2d6f5d]",
    inactive: "bg-[#f2f4f7] text-[#475467]",
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status === "at_risk" || status === "stagnant" ? (
        <AlertTriangle size={12} aria-hidden="true" />
      ) : null}
      {titleCase(status)}
    </span>
  )
}

interface StatPillProps {
  label: string
  value: number
}

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="rounded-full border border-[#dfe5dd] bg-[#f6f7f4] px-4 py-2 text-sm">
      <span className="font-semibold text-[#1c2420]">{label}:</span>{" "}
      <span className="font-semibold text-[#2d6f5d]">{value}</span>
    </div>
  )
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

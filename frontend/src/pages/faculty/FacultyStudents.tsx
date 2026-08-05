import { AlertTriangle, FileText, RefreshCw, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  getFacultySections,
  getFacultyStudents,
  type FacultySection,
  type FacultyStudent,
  type FacultyStudentStatus,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"

const statusOptions: Array<{ label: string; value: "" | FacultyStudentStatus }> = [
  { label: "All Status", value: "" },
  { label: "On Track", value: "on_track" },
  { label: "At Risk", value: "at_risk" },
  { label: "Inactive", value: "inactive" },
  { label: "Not Started", value: "not_started" },
]

export default function FacultyStudents() {
  const [sections, setSections] = useState<FacultySection[]>([])
  const [students, setStudents] = useState<FacultyStudent[]>([])
  const [sectionId, setSectionId] = useState("")
  const [status, setStatus] = useState<"" | FacultyStudentStatus>("")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadStudents(nextSectionId: string) {
    setIsLoading(true)
    try {
      const data = await getFacultyStudents(nextSectionId ? Number(nextSectionId) : undefined)
      setStudents(data.items)
      setError("")
    } catch {
      setError("Unable to load students right now.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    getFacultySections()
      .then((data) => {
        if (isMounted) setSections(data.items)
      })
      .catch(() => {
        if (isMounted) setSections([])
      })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    loadStudents(sectionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId])

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (status && student.status !== status) return false
      if (search) {
        const term = search.toLowerCase()
        if (
          !student.name.toLowerCase().includes(term) &&
          !student.email.toLowerCase().includes(term)
        ) {
          return false
        }
      }
      return true
    })
  }, [students, status, search])

  const groupedBySection = useMemo(() => {
    const groups = new Map<string, FacultyStudent[]>()
    for (const student of filteredStudents) {
      const list = groups.get(student.section_name) ?? []
      list.push(student)
      groups.set(student.section_name, list)
    }
    return Array.from(groups.entries())
  }, [filteredStudents])

  const summary = useMemo(() => {
    const onTrack = students.filter((s) => s.status === "on_track").length
    const atRisk = students.filter((s) => s.status === "at_risk").length
    const notStarted = students.filter(
      (s) => s.status === "not_started" || s.status === "inactive",
    ).length
    return { total: students.length, onTrack, atRisk, notStarted }
  }, [students])

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-semibold text-[#111827]">My Students</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
            Everyone enrolled in your sections, including students who haven't started a case
            yet.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_200px_200px_auto]">
            <label className="flex h-11 items-center gap-3 rounded-md border border-[#e6e8eb] bg-white px-3 text-[#6b7280] transition focus-within:border-[#c9a227] focus-within:ring-2 focus-within:ring-[#c9a227]/20">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search students</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email..."
                className="w-full bg-transparent text-sm font-medium text-[#111827] outline-none placeholder:text-[#6b7280]"
              />
            </label>
            <select
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "" | FacultyStudentStatus)}
              className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
            >
              {statusOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadStudents(sectionId)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b1d3a] px-4 text-sm font-semibold text-white transition hover:bg-[#17315c]"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </section>

        {!isLoading && students.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Students" value={summary.total} tone="ink" />
            <Stat label="On Track" value={summary.onTrack} tone="good" />
            <Stat label="At Risk" value={summary.atRisk} tone="bad" />
            <Stat label="Not Started" value={summary.notStarted} tone="muted" />
          </section>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <section className="rounded-lg border border-[#e6e8eb] bg-white p-8 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            Loading students...
          </section>
        ) : filteredStudents.length === 0 ? (
          <section className="rounded-lg border border-[#e6e8eb] bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">No students found.</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Adjust filters, or ask an admin to enroll students into your sections.
            </p>
          </section>
        ) : (
          <div className="space-y-5">
            {groupedBySection.map(([sectionName, sectionStudents]) => (
              <section
                key={sectionName}
                className="overflow-hidden rounded-lg border border-[#e6e8eb] bg-white shadow-sm"
              >
                <div className="border-b border-[#e6e8eb] bg-[#f6f7fb] px-5 py-3">
                  <h2 className="text-sm font-semibold text-[#111827]">
                    {sectionName} ({sectionStudents.length} students)
                  </h2>
                </div>
                <div className="hidden grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_0.7fr_0.8fr] gap-4 border-b border-[#e6e8eb] px-5 py-3 text-xs font-semibold uppercase text-[#6b7280] lg:grid">
                  <span>Name</span>
                  <span>Avg Score</span>
                  <span>Cases Attempted</span>
                  <span>Last Active</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                <div className="divide-y divide-[#e6e8eb]">
                  {sectionStudents.map((student) => (
                    <div
                      key={student.student_id}
                      className="grid gap-2 px-5 py-4 lg:grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_0.7fr_0.8fr] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827]">
                          {student.name}
                        </p>
                        <p className="truncate text-sm text-[#6b7280]">{student.email}</p>
                      </div>
                      <span className="flex items-center gap-1.5 text-sm">
                        {student.last_activity_at ? (
                          <>
                            <span
                              className="font-semibold"
                              style={{ color: scoreTone(student.average_score) }}
                            >
                              {student.average_score}
                            </span>
                            <span className="text-xs text-[#9ca3af]">/100</span>
                          </>
                        ) : (
                          <span className="text-[#9ca3af]">—</span>
                        )}
                      </span>
                      <span className="text-sm font-medium text-[#111827]">
                        {student.completed_count}/{student.assigned_count}
                      </span>
                      <span className="text-sm text-[#6b7280]">
                        {student.last_activity_at
                          ? formatDate(student.last_activity_at)
                          : "Never"}
                      </span>
                      <span>
                        <StatusBadge status={student.status} />
                      </span>
                      <span>
                        <Link
                          to={`/faculty/student-attempts/${student.user_id}`}
                          className="inline-flex items-center gap-2 rounded-md border border-[#e6e8eb] px-3 py-2 text-xs font-semibold text-[#0b1d3a] transition hover:border-[#c9a227] hover:bg-[#fff7df]"
                        >
                          <FileText size={14} aria-hidden="true" />
                          View report
                        </Link>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </FacultyLayout>
  )
}

interface StatusBadgeProps {
  status: FacultyStudentStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<FacultyStudentStatus, { label: string; className: string; icon?: boolean }> = {
    on_track: { label: "On Track", className: "bg-[#ecfdf3] text-[#027a48]" },
    at_risk: { label: "At Risk", className: "bg-[#fff5f5] text-[#b42318]", icon: true },
    inactive: { label: "Inactive", className: "bg-[#f2f4f7] text-[#475467]" },
    not_started: { label: "Not Started", className: "bg-[#fff7df] text-[#92702a]" },
  }
  const { label, className, icon } = config[status]

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {icon ? <AlertTriangle size={12} aria-hidden="true" /> : null}
      {label}
    </span>
  )
}

function scoreTone(score: number): string {
  if (score >= 75) return "#16a34a"
  if (score >= 60) return "#b45309"
  return "#b91c1c"
}

interface StatProps {
  label: string
  value: number
  tone: "ink" | "good" | "bad" | "muted"
}

function Stat({ label, value, tone }: StatProps) {
  const color = {
    ink: "#0b1d3a",
    good: "#027a48",
    bad: "#b42318",
    muted: "#6b7280",
  }[tone]
  return (
    <article className="rounded-lg border border-[#e6e8eb] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </article>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

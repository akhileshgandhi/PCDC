import { Archive, CircleX, Edit3, Eye, Plus, Search, Send } from "lucide-react"
import type { FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  assignCaseToSections,
  closeFacultyCaseAssignment,
  getFacultyAssignedCases,
  getFacultyCases,
  getFacultySections,
  type FacultyAssignedCase,
  type FacultyCase,
  type FacultySection,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"

const domains = [
  "All Domains",
  "geopolitics",
  "sports",
  "business",
  "social",
  "science",
  "technology",
  "environment",
  "healthcare",
] as const

const statuses = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
] as const

export default function FacultyCaseLibrary() {
  const [cases, setCases] = useState<FacultyCase[]>([])
  const [domainFilter, setDomainFilter] = useState("All Domains")
  const [difficultyFilter, setDifficultyFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [assigningCase, setAssigningCase] = useState<FacultyCase | null>(null)
  const [assignedCases, setAssignedCases] = useState<FacultyAssignedCase[]>([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
  const [closingAssignmentId, setClosingAssignmentId] = useState<number | null>(null)

  const loadAssignedCases = useCallback(async () => {
    setIsLoadingAssignments(true)
    try {
      const data = await getFacultyAssignedCases()
      setAssignedCases(data.items)
    } catch {
      setAssignedCases([])
    } finally {
      setIsLoadingAssignments(false)
    }
  }, [])

  useEffect(() => {
    loadAssignedCases()
  }, [loadAssignedCases])

  async function handleCloseAssignment(assignmentId: number) {
    setClosingAssignmentId(assignmentId)
    try {
      await closeFacultyCaseAssignment(assignmentId)
      setAssignedCases((current) =>
        current.map((item) =>
          item.assignment_id === assignmentId ? { ...item, status: "closed" } : item,
        ),
      )
      setNotice("Assignment closed.")
    } catch {
      setError("Unable to close this assignment.")
    } finally {
      setClosingAssignmentId(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadCases() {
      setIsLoading(true)
      try {
        const data = await getFacultyCases({
          domain: domainFilter === "All Domains" ? undefined : domainFilter,
          difficulty: difficultyFilter ? Number(difficultyFilter) : undefined,
          status: statusFilter || undefined,
        })
        if (isMounted) {
          setCases(data)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load faculty case studies right now.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCases()

    return () => {
      isMounted = false
    }
  }, [difficultyFilter, domainFilter, statusFilter])

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    if (!normalizedSearch) {
      return cases
    }

    return cases.filter((caseStudy) => {
      return (
        caseStudy.title.toLowerCase().includes(normalizedSearch) ||
        caseStudy.domain.toLowerCase().includes(normalizedSearch) ||
        caseStudy.description?.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [cases, searchQuery])

  const stats = useMemo(
    () => ({
      draft: cases.filter((caseStudy) => caseStudy.status === "draft").length,
      published: cases.filter((caseStudy) => caseStudy.status === "published").length,
      archived: cases.filter((caseStudy) => caseStudy.status === "archived").length,
    }),
    [cases],
  )

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">
                Case Study Library
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Browse, filter, and manage case studies owned by your faculty account.
              </p>
            </div>

            <Link
              to="/faculty/case-builder"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-5 py-3 text-sm font-semibold text-[#0b1d3a] shadow-sm transition hover:bg-[#e0b84e]"
            >
              <Plus size={17} aria-hidden="true" />
              New Case Study
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <StatPill label="Draft" value={stats.draft} />
            <StatPill label="Published" value={stats.published} />
            <StatPill label="Archived" value={stats.archived} />
          </div>
        </section>

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[180px_160px_auto_320px]">
            <select
              value={domainFilter}
              onChange={(event) => setDomainFilter(event.target.value)}
              className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              aria-label="Domain"
            >
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain === "All Domains" ? domain : titleCase(domain)}
                </option>
              ))}
            </select>

            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value)}
              className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              aria-label="Difficulty"
            >
              <option value="">All Levels</option>
              {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </select>

            <div className="flex rounded-md border border-[#e6e8eb] bg-[#f6f7fb] p-1">
              {statuses.map((status) => (
                <button
                  key={status.label}
                  type="button"
                  onClick={() => setStatusFilter(status.value)}
                  className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition ${
                    statusFilter === status.value
                      ? "bg-[#0b1d3a] text-white shadow-sm"
                      : "text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>

            <label className="flex h-11 items-center gap-3 rounded-md border border-[#e6e8eb] bg-white px-3 text-[#6b7280] transition focus-within:border-[#c9a227] focus-within:ring-2 focus-within:ring-[#c9a227]/20">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search cases</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search cases..."
                className="w-full bg-transparent text-sm font-medium text-[#111827] outline-none placeholder:text-[#6b7280]"
              />
            </label>
          </div>
        </section>

        {notice ? (
          <div className="rounded-lg border border-[#bdebdc] bg-[#f0fcf8] px-4 py-3 text-sm font-medium text-[#176b5a]">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-[#e6e8eb] bg-white shadow-sm">
          <div className="hidden grid-cols-[1.5fr_0.8fr_0.7fr_0.7fr_0.8fr_1.2fr] gap-4 border-b border-[#e6e8eb] bg-[#f6f7fb] px-5 py-3 text-xs font-semibold uppercase text-[#6b7280] lg:grid">
            <span>Title</span>
            <span>Industry</span>
            <span>Difficulty</span>
            <span>Status</span>
            <span>Attempts</span>
            <span>Actions</span>
          </div>

          {isLoading ? (
            <div className="px-5 py-12 text-center text-sm font-medium text-[#6b7280]">
              Loading faculty cases...
            </div>
          ) : filteredCases.length > 0 ? (
            <div className="divide-y divide-[#e6e8eb]">
              {filteredCases.map((caseStudy) => (
                <CaseRow
                  key={caseStudy.id}
                  caseStudy={caseStudy}
                  onAssign={() => setAssigningCase(caseStudy)}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <h2 className="text-lg font-semibold text-[#111827]">No case studies found.</h2>
              <p className="mt-2 text-sm text-[#6b7280]">
                Create a draft or adjust the current filters.
              </p>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-[#e6e8eb] bg-white shadow-sm">
          <div className="border-b border-[#e6e8eb] bg-[#f6f7fb] px-5 py-3">
            <h2 className="text-sm font-semibold uppercase text-[#6b7280]">Class Assignments</h2>
          </div>

          {isLoadingAssignments ? (
            <div className="px-5 py-10 text-center text-sm font-medium text-[#6b7280]">
              Loading class assignments...
            </div>
          ) : assignedCases.length > 0 ? (
            <div className="divide-y divide-[#e6e8eb]">
              {assignedCases.map((assignment) => {
                const completionRate =
                  assignment.total_assigned > 0
                    ? Math.round(
                        (assignment.completed_count / assignment.total_assigned) * 100,
                      )
                    : 0
                return (
                  <article
                    key={assignment.assignment_id}
                    className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">
                        {assignment.case_title}
                      </p>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        {assignment.section_name}
                        {assignment.due_date
                          ? ` · Due ${formatDate(assignment.due_date)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-40">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#f2f4f7]">
                          <div
                            className="h-2 rounded-full bg-[#c9a227]"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-medium text-[#6b7280]">
                          {assignment.completed_count}/{assignment.total_assigned} completed (
                          {completionRate}%)
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          assignment.status === "active"
                            ? "bg-[#ecfdf3] text-[#027a48]"
                            : "bg-[#f2f4f7] text-[#475467]"
                        }`}
                      >
                        {titleCase(assignment.status)}
                      </span>
                      {assignment.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => handleCloseAssignment(assignment.assignment_id)}
                          disabled={closingAssignmentId === assignment.assignment_id}
                          className="inline-flex items-center gap-2 rounded-md border border-[#e6e8eb] px-3 py-2 text-xs font-semibold text-[#0b1d3a] transition hover:border-[#b42318] hover:text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CircleX size={14} aria-hidden="true" />
                          {closingAssignmentId === assignment.assignment_id
                            ? "Closing..."
                            : "Close"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-[#6b7280]">
              No cases have been assigned to a class section yet.
            </div>
          )}
        </section>
      </div>

      {assigningCase ? (
        <AssignToClassDialog
          caseStudy={assigningCase}
          onClose={() => setAssigningCase(null)}
          onAssigned={(message) => {
            setAssigningCase(null)
            setNotice(message)
            setError("")
            loadAssignedCases()
          }}
        />
      ) : null}
    </FacultyLayout>
  )
}

interface CaseRowProps {
  caseStudy: FacultyCase
  onAssign: () => void
}

function CaseRow({ caseStudy, onAssign }: CaseRowProps) {
  return (
    <article className="grid gap-4 px-5 py-4 lg:grid-cols-[1.5fr_0.8fr_0.7fr_0.7fr_0.8fr_1.2fr] lg:items-center">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-[#111827]">{caseStudy.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6b7280]">
          {caseStudy.description || "No description provided yet."}
        </p>
        <p className="mt-2 text-xs text-[#6b7280] lg:hidden">
          {titleCase(caseStudy.domain)} - Level {caseStudy.difficulty} -{" "}
          {caseStudy.attempts_count} attempts
        </p>
      </div>
      <span className="hidden text-sm font-medium text-[#111827] lg:block">
        {titleCase(caseStudy.domain)}
      </span>
      <span className="hidden text-sm font-medium text-[#111827] lg:block">
        Level {caseStudy.difficulty}
      </span>
      <span>
        <StatusBadge status={caseStudy.status} />
      </span>
      <span className="hidden text-sm font-semibold text-[#111827] lg:block">
        {caseStudy.attempts_count}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {caseStudy.status === "published" ? (
          <button
            type="button"
            onClick={onAssign}
            className="inline-flex items-center gap-2 rounded-md border border-[#c9a227] px-3 py-2 text-xs font-semibold text-[#92702a] transition hover:bg-[#fff7df]"
            aria-label={`Assign ${caseStudy.title} to a class`}
            title="Assign to Class"
          >
            <Send size={14} aria-hidden="true" />
            Assign to Class
          </button>
        ) : null}
        <div className="flex items-center gap-2">
          <Link
            to={`/faculty/case-builder/${caseStudy.id}`}
            className="inline-flex size-9 items-center justify-center rounded-md border border-[#e6e8eb] text-[#0b1d3a] transition hover:border-[#c9a227] hover:bg-[#fff7df]"
            aria-label={`Edit ${caseStudy.title}`}
            title="Edit"
          >
            <Edit3 size={16} aria-hidden="true" />
          </Link>
          <Link
            to={`/faculty/case-library?case=${caseStudy.id}`}
            className="inline-flex size-9 items-center justify-center rounded-md border border-[#e6e8eb] text-[#0b1d3a] transition hover:border-[#c9a227] hover:bg-[#fff7df]"
            aria-label={`View attempts for ${caseStudy.title}`}
            title="View attempts"
          >
            <Eye size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md border border-[#e6e8eb] text-[#0b1d3a] transition hover:border-[#c9a227] hover:bg-[#fff7df]"
            aria-label={`Archive ${caseStudy.title}`}
            title="Archive"
          >
            <Archive size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

interface AssignToClassDialogProps {
  caseStudy: FacultyCase
  onClose: () => void
  onAssigned: (message: string) => void
}

function AssignToClassDialog({ caseStudy, onClose, onAssigned }: AssignToClassDialogProps) {
  const [sections, setSections] = useState<FacultySection[]>([])
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState("")
  const [instructions, setInstructions] = useState("")
  const [isLoadingSections, setIsLoadingSections] = useState(true)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true
    getFacultySections()
      .then((data) => {
        if (isMounted) setSections(data.items)
      })
      .catch(() => {
        if (isMounted) setError("Unable to load your sections.")
      })
      .finally(() => {
        if (isMounted) setIsLoadingSections(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  function toggleSection(sectionId: number) {
    setSelectedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedSectionIds.length === 0) {
      setError("Select at least one section.")
      return
    }
    setIsSaving(true)
    setError("")
    try {
      const result = await assignCaseToSections(caseStudy.id, {
        section_ids: selectedSectionIds,
        due_date: dueDate || undefined,
        instructions: instructions || undefined,
      })
      const totalNew = result.assignments.reduce((sum, item) => sum + item.newly_assigned, 0)
      onAssigned(
        `Assigned "${caseStudy.title}" to ${result.assignments.length} section(s); ${totalNew} student(s) newly notified.`,
      )
    } catch {
      setError("Unable to assign this case. It may already be assigned or not published.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1d3a]/45 p-4">
      <div className="w-full max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg bg-white p-5 shadow-xl sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#111827]">Assign to Class</h2>
              <p className="mt-1 text-sm text-[#6b7280]">{caseStudy.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#e6e8eb] px-3 py-2 text-sm font-semibold"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Select Section(s)</p>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-[#e6e8eb] p-3">
                {isLoadingSections ? (
                  <p className="text-sm text-[#6b7280]">Loading sections...</p>
                ) : sections.length === 0 ? (
                  <p className="text-sm text-[#6b7280]">
                    You have no sections yet. Ask an admin to assign you to a class section.
                  </p>
                ) : (
                  sections.map((section) => (
                    <label key={section.id} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSectionIds.includes(section.id)}
                        onChange={() => toggleSection(section.id)}
                        className="size-4"
                      />
                      <span>
                        {section.name} · {section.semester_name} · {section.batch_name} (
                        {section.student_count} students)
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-[#111827]">
              Due Date (optional)
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-11 rounded-md border border-[#e6e8eb] px-3 text-sm outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#111827]">
              Instructions to Class (optional)
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={3}
                placeholder="e.g. Complete this before Thursday's session"
                className="rounded-md border border-[#e6e8eb] px-3 py-2 text-sm outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-[#f3c4c4] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#e6e8eb] px-4 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-[#c9a227] px-4 py-3 text-sm font-semibold text-[#0b1d3a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Assigning..." : "Assign to Selected Sections"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface StatusBadgeProps {
  status: FacultyCase["status"]
}

function StatusBadge({ status }: StatusBadgeProps) {
  const className =
    status === "published"
      ? "bg-[#ecfdf3] text-[#027a48]"
      : status === "archived"
        ? "bg-[#f2f4f7] text-[#475467]"
        : "bg-[#fff7df] text-[#92702a]"

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
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
    <div className="rounded-full border border-[#e6e8eb] bg-[#f6f7fb] px-4 py-2 text-sm">
      <span className="font-semibold text-[#111827]">{label}:</span>{" "}
      <span className="font-semibold text-[#0b1d3a]">{value}</span>
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
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(value),
  )
}

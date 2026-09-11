import { Archive, BookOpen, CircleX, Edit3, Eye, FileUp, Plus, Rocket, Search, Send, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  closeFacultyCaseAssignment,
  deleteFacultyCase,
  getFacultyAssignedCases,
  getFacultyCases,
  publishFacultyCase,
  type FacultyAssignedCase,
  type FacultyCase,
} from "../../api/faculty"
import AssignToClassDialog from "../../components/faculty/AssignToClassDialog"
import BulkUploadCaseDialog from "../../components/faculty/BulkUploadCaseDialog"
import FacultyLayout from "../../layouts/FacultyLayout"
import { getCurrentUser } from "../../utils/auth"

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
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
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

  async function handleDeleteCase(caseStudy: FacultyCase) {
    if (
      !window.confirm(
        `Delete "${caseStudy.title}"? This permanently removes the case, its questions, and any student attempts. This cannot be undone.`,
      )
    ) {
      return
    }
    try {
      await deleteFacultyCase(caseStudy.id)
      setCases((current) => current.filter((item) => item.id !== caseStudy.id))
      setNotice(`Deleted "${caseStudy.title}".`)
      setError("")
      loadAssignedCases()
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || "Unable to delete this case study.")
    }
  }

  async function handlePublishCase(caseStudy: FacultyCase) {
    if (!window.confirm(`Publish "${caseStudy.title}"? Students will be able to see and attempt it once assigned.`)) {
      return
    }
    try {
      const updated = await publishFacultyCase(caseStudy.id)
      setCases((current) =>
        current.map((item) => (item.id === caseStudy.id ? { ...item, status: updated.status } : item)),
      )
      setNotice(`Published "${caseStudy.title}".`)
      setError("")
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const missingFields =
        detail && typeof detail === "object" && Array.isArray((detail as { missing_fields?: unknown }).missing_fields)
          ? ((detail as { missing_fields: string[] }).missing_fields)
          : null
      setError(
        typeof detail === "string"
          ? detail
          : missingFields && missingFields.length
            ? `Unable to publish — missing/incomplete: ${missingFields.join(", ")}.`
            : "Unable to publish this case study. It may be missing required fields.",
      )
    }
  }

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
  }, [difficultyFilter, domainFilter, statusFilter, refreshKey])

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
                My Case Library
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Browse, filter, and manage case studies owned by your faculty account.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowBulkUpload(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#e6e8eb] bg-white px-5 py-3 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#f6f7fb]"
              >
                <FileUp size={17} aria-hidden="true" />
                Bulk Upload
              </button>
              <Link
                to="/faculty/case-builder"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-5 py-3 text-sm font-semibold text-[#0b1d3a] shadow-sm transition hover:bg-[#e0b84e]"
              >
                <Plus size={17} aria-hidden="true" />
                New Case Study
              </Link>
            </div>
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
              {[1, 2, 3, 4, 5].map((level) => (
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
                  onPublish={() => handlePublishCase(caseStudy)}
                  onDelete={() => handleDeleteCase(caseStudy)}
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
          onAssigned={(message, hadNoEffect) => {
            setAssigningCase(null)
            if (hadNoEffect) {
              setError(message)
              setNotice("")
            } else {
              setNotice(message)
              setError("")
            }
            loadAssignedCases()
          }}
        />
      ) : null}

      {showBulkUpload ? (
        <BulkUploadCaseDialog
          onClose={() => setShowBulkUpload(false)}
          onDone={() => {
            setShowBulkUpload(false)
            setNotice("Bulk upload complete. New cases are saved as drafts for admin review.")
            setError("")
            setRefreshKey((key) => key + 1)
          }}
        />
      ) : null}
    </FacultyLayout>
  )
}

interface CaseRowProps {
  caseStudy: FacultyCase
  onAssign: () => void
  onPublish: () => void
  onDelete: () => void
}

function CaseRow({ caseStudy, onAssign, onPublish, onDelete }: CaseRowProps) {
  const isAdmin = getCurrentUser()?.role === "admin"
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
      <div className="flex w-fit flex-col gap-2">
        {caseStudy.status === "published" ? (
          <button
            type="button"
            onClick={onAssign}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#c9a227] px-3 py-2 text-xs font-semibold text-[#92702a] transition hover:bg-[#fff7df]"
            aria-label={`Assign ${caseStudy.title} to a class`}
            title="Assign to Class"
          >
            <Send size={14} aria-hidden="true" />
            Assign to Class
          </button>
        ) : null}
        {caseStudy.status === "draft" ? (
          <button
            type="button"
            onClick={onPublish}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#c9a227] bg-[#c9a227] px-3 py-2 text-xs font-semibold text-[#0b1d3a] transition hover:border-[#e0b84e] hover:bg-[#e0b84e]"
            aria-label={`Publish ${caseStudy.title}`}
            title="Publish"
          >
            <Rocket size={14} aria-hidden="true" />
            Publish
          </button>
        ) : null}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Link
              to={`/faculty/case-builder/${caseStudy.id}`}
              className="inline-flex size-9 items-center justify-center rounded-md border border-[#e6e8eb] text-[#0b1d3a] transition hover:border-[#c9a227] hover:bg-[#fff7df]"
              aria-label={`Edit ${caseStudy.title}`}
              title="Edit"
            >
              <Edit3 size={16} aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to={`/faculty/case-builder/${caseStudy.id}`}
              className="inline-flex size-9 items-center justify-center rounded-md border border-[#e6e8eb] text-[#0b1d3a] transition hover:border-[#c9a227] hover:bg-[#fff7df]"
              aria-label={`View ${caseStudy.title}`}
              title="View"
            >
              <BookOpen size={16} aria-hidden="true" />
            </Link>
          )}
          <Link
            to={`/faculty/case-attempts/${caseStudy.id}`}
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
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex size-9 items-center justify-center rounded-md border border-[#e6e8eb] text-[#b42318] transition hover:border-[#b42318] hover:bg-[#fff5f5]"
            aria-label={`Delete ${caseStudy.title}`}
            title="Delete"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
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

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function formatDate(value: string) {
  // The backend sends this as a bare calendar date (e.g. "2026-08-12", sometimes
  // with a trailing " 00:00:00"). Parsing that through `new Date()` is timezone-
  // dependent — a date-time string with no offset gets parsed as LOCAL time, which
  // shifts the displayed day by one for any timezone ahead of UTC. Read the
  // year/month/day digits directly instead of ever constructing a Date from it.
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return value
  const [, , month, day] = match
  return `${MONTH_ABBR[Number(month) - 1]} ${Number(day)}`
}

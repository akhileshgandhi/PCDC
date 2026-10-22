import { RefreshCw, Search } from "lucide-react"
import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  getAdminAllBatches,
  getAdminCourses,
  getAdminDepartments,
  getAdminInstitutions,
  getAdminUsers,
  type AdminBatchRow,
  type AdminCourse,
  type AdminDepartment,
  type AdminInstitution,
  type AdminSectionListItem,
  type AdminUser,
} from "../../api/admin"

const pageSize = 25

interface Filters {
  institution: string
  department: string
  course: string
  batch: string
  semester: string
  section: string
  status: string
}

const emptyFilters: Filters = {
  institution: "",
  department: "",
  course: "",
  batch: "",
  semester: "",
  section: "",
  status: "",
}

/**
 * Filterable student list for People > Students. `sections` comes from the
 * parent page (already loaded for the add form) and `refreshKey` bumps
 * whenever a student is added or imported there, so the list stays current.
 */
export default function AdminStudentList({
  sections,
  refreshKey,
}: {
  sections: AdminSectionListItem[]
  refreshKey: number
}) {
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([])
  const [departments, setDepartments] = useState<AdminDepartment[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [batches, setBatches] = useState<AdminBatchRow[]>([])

  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [search, setSearch] = useState("")
  const [students, setStudents] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    getAdminInstitutions().then((d) => setInstitutions(d.items)).catch(() => undefined)
    getAdminDepartments().then((d) => setDepartments(d.items)).catch(() => undefined)
    getAdminCourses().then((d) => setCourses(d.items)).catch(() => undefined)
    getAdminAllBatches().then((d) => setBatches(d.items)).catch(() => undefined)
  }, [])

  // Each dropdown only offers options inside the choices made to its left.
  const departmentOptions = useMemo(
    () =>
      departments.filter(
        (d) => !filters.institution || String(d.institution_id) === filters.institution,
      ),
    [departments, filters.institution],
  )
  const courseOptions = useMemo(() => {
    const allowed = new Set(departmentOptions.map((d) => d.id))
    return courses.filter((c) =>
      filters.department
        ? String(c.department_id) === filters.department
        : !filters.institution || (c.department_id !== null && allowed.has(c.department_id)),
    )
  }, [courses, departmentOptions, filters.department, filters.institution])
  const courseIds = useMemo(() => new Set(courseOptions.map((c) => c.id)), [courseOptions])
  const batchOptions = useMemo(
    () =>
      batches.filter((b) =>
        filters.course ? String(b.course_id) === filters.course : courseIds.has(b.course_id),
      ),
    [batches, courseIds, filters.course],
  )
  const semesterOptions = useMemo(() => {
    const scoped = filters.course
      ? courseOptions.filter((c) => String(c.id) === filters.course)
      : courseOptions
    const max = Math.max(0, ...scoped.map((c) => c.total_semesters || 0))
    return Array.from({ length: max }, (_, i) => i + 1)
  }, [courseOptions, filters.course])
  const sectionOptions = useMemo(
    () =>
      sections.filter(
        (s) =>
          (filters.course ? String(s.course_id) === filters.course : courseIds.has(s.course_id)) &&
          (!filters.batch || String(s.batch_id) === filters.batch) &&
          (!filters.semester || String(s.semester_number) === filters.semester),
      ),
    [sections, courseIds, filters.course, filters.batch, filters.semester],
  )

  async function loadStudents(nextPage = 1, searchValue = search) {
    setIsLoading(true)
    try {
      const data = await getAdminUsers({
        role: "student",
        search: searchValue,
        status: filters.status,
        institution_id: Number(filters.institution) || undefined,
        department_id: Number(filters.department) || undefined,
        course_id: Number(filters.course) || undefined,
        batch_id: Number(filters.batch) || undefined,
        semester: Number(filters.semester) || undefined,
        section_id: Number(filters.section) || undefined,
        page: nextPage,
        page_size: pageSize,
      })
      setStudents(data.items)
      setTotal(data.total)
      setPage(data.page)
      setError("")
    } catch {
      setError("Unable to load students right now.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudents(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, refreshKey])

  // Changing a filter clears the ones to its right, which may no longer apply.
  const order: Array<keyof Filters> = ["institution", "department", "course", "batch", "semester", "section"]
  function setFilter(key: keyof Filters, value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: value }
      const index = order.indexOf(key)
      if (index >= 0) order.slice(index + 1).forEach((k) => (next[k] = ""))
      return next
    })
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    loadStudents(1)
  }

  function clearAll() {
    setSearch("")
    setFilters(emptyFilters)
    if (JSON.stringify(filters) === JSON.stringify(emptyFilters)) loadStudents(1, "")
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showingStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const showingEnd = Math.min(page * pageSize, total)
  const hasFilters = search !== "" || Object.values(filters).some(Boolean)

  const select =
    "h-11 w-full rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20 disabled:cursor-not-allowed disabled:bg-[#f9fafb] disabled:text-[#98a2b3]"
  const gridClass = "lg:grid-cols-[1.5fr_1fr_1.4fr_1fr_0.8fr_0.7fr]"

  return (
    <section className="rounded-lg border border-[#eef2f7] bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-0">
        <div>
          <h2 className="text-lg font-semibold text-[#17202a]">All students</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Filter by institute, program, specialization, batch, semester or section.
          </p>
        </div>
        <span className="rounded-full bg-[#f5f7fa] px-3 py-1 text-xs font-semibold text-[#475467]">
          {total} student{total === 1 ? "" : "s"}
        </span>
      </div>

      <form onSubmit={handleSearch} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex h-11 items-center gap-3 rounded-md border border-[#dde4ec] bg-white px-3 text-[#667085] transition focus-within:border-[#34c6a3] focus-within:ring-2 focus-within:ring-[#34c6a3]/20 sm:col-span-2">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search students</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or scholar number..."
            className="w-full bg-transparent text-sm font-medium text-[#17202a] outline-none placeholder:text-[#667085]"
          />
        </label>
        {institutions.length > 1 ? (
          <select
            className={select}
            aria-label="Institute"
            value={filters.institution}
            onChange={(e) => setFilter("institution", e.target.value)}
          >
            <option value="">All institutes</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        ) : null}
        <select
          className={select}
          aria-label="Program"
          value={filters.department}
          onChange={(e) => setFilter("department", e.target.value)}
        >
          <option value="">All programs</option>
          {departmentOptions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          className={select}
          aria-label="Specialization"
          value={filters.course}
          onChange={(e) => setFilter("course", e.target.value)}
        >
          <option value="">All specializations</option>
          {courseOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className={select}
          aria-label="Batch"
          value={filters.batch}
          onChange={(e) => setFilter("batch", e.target.value)}
        >
          <option value="">All batches</option>
          {batchOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {filters.course ? b.name : `${b.name} · ${b.course_name}`}
            </option>
          ))}
        </select>
        <select
          className={select}
          aria-label="Semester"
          value={filters.semester}
          onChange={(e) => setFilter("semester", e.target.value)}
          disabled={semesterOptions.length === 0}
        >
          <option value="">All semesters</option>
          {semesterOptions.map((n) => (
            <option key={n} value={n}>Semester {n}</option>
          ))}
        </select>
        <select
          className={select}
          aria-label="Section"
          value={filters.section}
          onChange={(e) => setFilter("section", e.target.value)}
        >
          <option value="">All sections</option>
          {sectionOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.course_name} · Sem {s.semester_number} · {s.batch_name}
            </option>
          ))}
        </select>
        <select
          className={select}
          aria-label="Status"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#102033] px-4 text-sm font-semibold text-white transition hover:bg-[#1b3452]"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Apply
          </button>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="h-11 rounded-md border border-[#dde4ec] px-3 text-sm font-semibold text-[#475467] transition hover:bg-[#f5f7fa]"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="mx-5 mb-4 rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p>
      ) : null}

      <div className={`hidden gap-4 border-y border-[#dde4ec] bg-[#f5f7fa] px-5 py-3 text-xs font-semibold uppercase text-[#667085] lg:grid ${gridClass}`}>
        <span>Name</span>
        <span>Scholar no.</span>
        <span>Program / Specialization</span>
        <span>Semester / Section</span>
        <span>Batch</span>
        <span>Status</span>
      </div>

      {isLoading ? (
        <div className="px-5 py-12 text-center text-sm font-medium text-[#667085]">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <h3 className="text-base font-semibold text-[#17202a]">No students found</h3>
          <p className="mt-1 text-sm text-[#667085]">
            {hasFilters ? "Try removing a filter." : "Add a student above to get started."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#dde4ec]">
          {students.map((s) => (
            <div key={s.id} className={`grid gap-1 px-5 py-4 text-sm lg:items-center lg:gap-4 ${gridClass}`}>
              <div className="min-w-0">
                <Link
                  to={`/admin/user/${s.id}`}
                  className="block truncate font-semibold text-[#17202a] transition hover:text-[#176b5a]"
                >
                  {s.name}
                </Link>
                <p className="truncate text-[#667085]">{s.email || "No email"}</p>
                {institutions.length > 1 && s.institution_name ? (
                  <p className="truncate text-xs text-[#98a2b3]">{s.institution_name}</p>
                ) : null}
              </div>
              <span className="font-mono text-[#475467]">{s.college_id || "-"}</span>
              <span className="text-[#667085]">
                {[s.department_name, s.course_name].filter(Boolean).join(" · ") || "-"}
              </span>
              <span className="text-[#667085]">
                {[s.semester_number ? `Sem ${s.semester_number}` : null, s.section_name]
                  .filter(Boolean)
                  .join(" · ") || "-"}
              </span>
              <span className="text-[#667085]">{s.batch_name || "-"}</span>
              <span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.status === "active" ? "bg-[#ecfdf3] text-[#067647]" : "bg-[#f2f4f7] text-[#475467]"
                  }`}
                >
                  {s.status === "active" ? "Active" : "Inactive"}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[#dde4ec] px-5 py-4 text-sm text-[#667085] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {showingStart}-{showingEnd} of {total}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => loadStudents(page - 1)}
            className="rounded-md border border-[#dde4ec] px-3 py-2 font-semibold text-[#17202a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => loadStudents(page + 1)}
            className="rounded-md border border-[#dde4ec] px-3 py-2 font-semibold text-[#17202a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}

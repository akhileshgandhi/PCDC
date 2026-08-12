import { ChevronRight, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { getFacultyStudents, type FacultyStudent } from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"

export default function FacultyStudents() {
  const [searchParams] = useSearchParams()
  const [students, setStudents] = useState<FacultyStudent[]>([])
  const [sectionName, setSectionName] = useState("")
  const [search, setSearch] = useState(searchParams.get("search") ?? "")

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "")
  }, [searchParams])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    getFacultyStudents()
      .then((data) => {
        if (mounted) {
          setStudents(data.items)
          setError("")
        }
      })
      .catch(() => mounted && setError("Unable to load students."))
      .finally(() => mounted && setIsLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  const sectionNames = useMemo(
    () => [...new Set(students.map((s) => s.section_name))].sort(),
    [students],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return students.filter((s) => {
      if (sectionName && s.section_name !== sectionName) return false
      if (term) {
        return (
          s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
        )
      }
      return true
    })
  }, [students, sectionName, search])

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-[#111827]">Students</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
            Everyone enrolled in the sections you teach. Open a student to see their record and
            history. Students are added by your program office (admin).
          </p>
        </div>

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex h-11 flex-1 items-center gap-3 rounded-md border border-[#e6e8eb] bg-white px-3 text-[#6b7280]">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search students</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or scholar number"
                className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#6b7280]"
              />
            </label>
            <select
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
            >
              <option value="">All sections</option>
              {sectionNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="shrink-0 text-sm font-medium text-[#6b7280]">
              {visible.length} of {students.length}
            </span>
          </div>

          <div className="mt-4">
            {error ? (
              <p className="py-8 text-center text-sm font-medium text-[#b42318]">{error}</p>
            ) : isLoading ? (
              <p className="py-10 text-center text-sm font-medium text-[#6b7280]">Loading students…</p>
            ) : visible.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#e6e8eb] px-5 py-12 text-center">
                <h3 className="text-base font-semibold text-[#111827]">No students yet</h3>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {students.length === 0
                    ? "Once the admin enrolls students into your sections, they'll appear here."
                    : "No students match your search."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#eef0f2]">
                {visible.map((s) => (
                  <Link
                    key={s.student_id}
                    to={`/faculty/student-attempts/${s.user_id}`}
                    className="flex items-center gap-4 px-1 py-4 transition hover:bg-[#f9fafb]"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[#0b1d3a] text-sm font-semibold text-white">
                      {initials(s.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#111827]">{s.name}</p>
                      <p className="truncate text-sm text-[#6b7280]">
                        {s.email}
                        <span className="text-[#9ca3af]"> · {s.section_name}</span>
                      </p>
                    </div>
                    <span className="hidden shrink-0 text-sm text-[#6b7280] sm:block">
                      {s.completed_count}/{s.assigned_count} cases
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-[#9ca3af]" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </FacultyLayout>
  )
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

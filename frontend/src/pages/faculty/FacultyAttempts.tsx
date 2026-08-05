import { ArrowLeft, FileText } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  getFacultyCaseAttempts,
  getFacultyStudentAttempts,
  type FacultyAttemptsResponse,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"

interface FacultyAttemptsProps {
  mode: "case" | "student"
}

export default function FacultyAttempts({ mode }: FacultyAttemptsProps) {
  const navigate = useNavigate()
  const params = useParams()
  const id = mode === "case" ? Number(params.caseId) : Number(params.userId)

  const [data, setData] = useState<FacultyAttemptsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    let active = true
    setIsLoading(true)
    const request =
      mode === "case" ? getFacultyCaseAttempts(id) : getFacultyStudentAttempts(id)
    request
      .then((result) => {
        if (active) {
          setData(result)
          setError("")
        }
      })
      .catch(() => {
        if (active) setError("Unable to load attempts right now.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, mode])

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b1d3a] transition hover:text-[#c9a227]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c9a227]">
            {mode === "case" ? "Case Attempts" : "Student Attempts"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#17202a]">{data?.title ?? "…"}</h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            {data ? `${data.total} attempt${data.total === 1 ? "" : "s"}` : ""}
          </p>
        </section>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-[#e6e8eb] bg-white shadow-sm">
          <div className="hidden grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_0.8fr_0.6fr_1fr] gap-4 border-b border-[#e6e8eb] bg-[#f6f7fb] px-5 py-3 text-xs font-semibold uppercase text-[#6b7280] lg:grid">
            <span>{mode === "case" ? "Student" : "Case"}</span>
            <span>Status</span>
            <span>Total</span>
            <span>Written</span>
            <span>Rapid Fire</span>
            <span>Grade</span>
            <span>Actions</span>
          </div>

          {isLoading ? (
            <div className="px-5 py-12 text-center text-sm font-medium text-[#6b7280]">
              Loading attempts...
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="divide-y divide-[#e6e8eb]">
              {data.items.map((item) => (
                <article
                  key={item.attempt_id}
                  className="grid gap-3 px-5 py-4 lg:grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_0.8fr_0.6fr_1fr] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#17202a]">
                      {mode === "case" ? item.student_name : item.case_title}
                    </p>
                    <p className="truncate text-xs text-[#6b7280]">
                      {mode === "case" ? item.student_email : item.student_name}
                    </p>
                  </div>
                  <span className="text-sm text-[#6b7280]">{prettyStatus(item.status)}</span>
                  <span className="text-sm font-semibold text-[#17202a]">
                    {item.marks ? `${item.marks.total_awarded}/${item.marks.total_max}` : "—"}
                  </span>
                  <span className="text-sm text-[#6b7280]">
                    {item.marks ? `${item.marks.written_awarded}/${item.marks.written_total}` : "—"}
                  </span>
                  <span className="text-sm text-[#6b7280]">
                    {item.marks ? `${item.marks.rapid_awarded}/${item.marks.rapid_total}` : "—"}
                  </span>
                  <span>
                    {item.grade ? (
                      <span className="inline-flex rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">
                        {item.grade}
                      </span>
                    ) : (
                      <span className="text-xs text-[#9ca3af]">—</span>
                    )}
                  </span>
                  <div>
                    {item.total_score !== null ? (
                      <Link
                        to={`/faculty/attempts/${item.attempt_id}`}
                        className="inline-flex items-center gap-2 rounded-md border border-[#e6e8eb] px-3 py-2 text-xs font-semibold text-[#0b1d3a] transition hover:border-[#c9a227] hover:bg-[#fff7df]"
                      >
                        <FileText size={14} aria-hidden="true" />
                        View report
                      </Link>
                    ) : (
                      <span className="text-xs text-[#9ca3af]">In progress</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <h2 className="text-lg font-semibold text-[#17202a]">No attempts yet.</h2>
              <p className="mt-2 text-sm text-[#6b7280]">
                {mode === "case"
                  ? "No student has attempted this case yet."
                  : "This student has not attempted any of your cases yet."}
              </p>
            </div>
          )}
        </section>
      </div>
    </FacultyLayout>
  )
}

function prettyStatus(status: string): string {
  const map: Record<string, string> = {
    analysis_submitted: "In progress",
    ai_discussion: "In progress",
    solution_submitted: "In progress",
    defense_complete: "Completed",
    evaluated: "Completed",
    completed: "Completed",
    expired: "Expired",
  }
  return map[status] ?? status
}

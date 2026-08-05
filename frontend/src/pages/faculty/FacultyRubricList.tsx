import { CheckCircle2, Circle, PenLine, SlidersHorizontal } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getFacultyCases, type FacultyCase } from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"

const statusBadge: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-[#dde4ec] bg-[#f5f7fa] text-[#667085]" },
  published: { label: "Published", className: "border-[#bdebdc] bg-[#f0fcf8] text-[#176b5a]" },
  archived: { label: "Archived", className: "border-[#f3c4c4] bg-[#fff5f5] text-[#b42318]" },
}

export default function FacultyRubricList() {
  const [cases, setCases] = useState<FacultyCase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const data = await getFacultyCases()
        setCases(data)
      } catch {
        setError("Unable to load cases.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <SlidersHorizontal size={24} className="text-[#b8860b]" />
            <div>
              <h1 className="text-3xl font-semibold text-[#17202a]">Rubric Builder</h1>
              <p className="mt-1 text-sm text-[#667085]">
                Set up weighted evaluation criteria for each of your cases.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-8 text-center text-sm font-medium text-[#667085] shadow-sm">
            Loading cases...
          </section>
        ) : cases.length === 0 ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-10 text-center shadow-sm">
            <SlidersHorizontal className="mx-auto text-[#667085]" size={32} />
            <h2 className="mt-3 text-lg font-semibold text-[#17202a]">No cases yet</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Create a case in the Case Builder first, then come back here to set up its rubric.
            </p>
            <Link
              to="/faculty/case-builder"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#34c6a3] px-4 py-2.5 text-sm font-semibold text-[#102033]"
            >
              Go to Case Builder
            </Link>
          </section>
        ) : (
          <div className="grid gap-3">
            {cases.map((c) => {
              const badge = statusBadge[c.status] ?? statusBadge.draft
              return (
                <Link
                  key={c.id}
                  to={`/faculty/rubric-builder/${c.id}`}
                  className="group flex items-center justify-between rounded-lg border border-[#dde4ec] bg-white p-4 shadow-sm transition hover:border-[#34c6a3] hover:shadow-md sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate text-base font-semibold text-[#17202a] group-hover:text-[#176b5a]">
                        {c.title}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-3 text-xs text-[#667085]">
                      <span>{c.domain}</span>
                      <span>·</span>
                      <span>Difficulty {c.difficulty}/5</span>
                      <span>·</span>
                      <span>{c.attempts_count} attempt{c.attempts_count !== 1 ? "s" : ""}</span>
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {c.rubric_exists ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bdebdc] bg-[#f0fcf8] px-3 py-1.5 text-xs font-semibold text-[#176b5a]">
                        <CheckCircle2 size={14} /> Rubric Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f3c4c4] bg-[#fff5f5] px-3 py-1.5 text-xs font-semibold text-[#b42318]">
                        <Circle size={14} /> No Rubric
                      </span>
                    )}
                    <PenLine size={16} className="text-[#667085] group-hover:text-[#176b5a]" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </FacultyLayout>
  )
}

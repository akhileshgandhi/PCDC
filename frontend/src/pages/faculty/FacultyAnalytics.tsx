import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { getFacultyAnalyticsSummary, type FacultyAnalyticsSummary } from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"

export default function FacultyAnalytics() {
  const [summary, setSummary] = useState<FacultyAnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    async function load() {
      setIsLoading(true)
      try {
        const data = await getFacultyAnalyticsSummary()
        if (isMounted) {
          setSummary(data)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load analytics right now.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
            Cohort capability scores and case completion, broken down by class section.
          </p>

          {summary ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <StatPill label="Sections" value={summary.totals.section_count} />
              <StatPill label="Students" value={summary.totals.student_count} />
              <StatPill label="Avg Score" value={`${summary.totals.average_score}`} />
              <StatPill label="Completion" value={`${summary.totals.completion_rate}%`} />
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg border border-[#e6e8eb] bg-white px-5 py-12 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            Loading analytics...
          </div>
        ) : !summary || summary.sections.length === 0 ? (
          <div className="rounded-lg border border-[#e6e8eb] bg-white px-5 py-14 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">No sections yet.</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Analytics appear once an admin assigns you to a class section.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Average Capability Score by Section
              </h2>
              <div className="mt-4 h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.sections}>
                    <CartesianGrid stroke="#E6EBEB" vertical={false} />
                    <XAxis
                      dataKey="section_name"
                      tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderColor: "#E6EBEB",
                        borderRadius: "8px",
                        color: "#111827",
                      }}
                    />
                    <Bar dataKey="average_score" name="Avg Score" fill="#C9A227" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-[#e6e8eb] bg-white shadow-sm">
              <div className="hidden grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_1.2fr] gap-4 border-b border-[#e6e8eb] bg-[#f6f7fb] px-5 py-3 text-xs font-semibold uppercase text-[#6b7280] lg:grid">
                <span>Section</span>
                <span>Students</span>
                <span>Avg Score</span>
                <span>Cases Assigned</span>
                <span>Completion</span>
              </div>
              <div className="divide-y divide-[#e6e8eb]">
                {summary.sections.map((section) => (
                  <article
                    key={section.section_id}
                    className="grid gap-2 px-5 py-4 lg:grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_1.2fr] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">
                        {section.section_name}
                      </p>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {section.course_name} · {section.semester_name}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-[#111827]">
                      {section.student_count}
                    </span>
                    <span className="text-sm font-medium text-[#111827]">
                      {section.average_score}
                    </span>
                    <span className="text-sm font-medium text-[#111827]">
                      {section.cases_assigned}
                    </span>
                    <div>
                      <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-[#f2f4f7]">
                        <div
                          className="h-2 rounded-full bg-[#0b1d3a]"
                          style={{ width: `${section.completion_rate}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs font-medium text-[#6b7280]">
                        {section.completed_count}/{section.total_assigned} ({section.completion_rate}%)
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </FacultyLayout>
  )
}

interface StatPillProps {
  label: string
  value: number | string
}

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="rounded-full border border-[#e6e8eb] bg-[#f6f7fb] px-4 py-2 text-sm">
      <span className="font-semibold text-[#111827]">{label}:</span>{" "}
      <span className="font-semibold text-[#0b1d3a]">{value}</span>
    </div>
  )
}

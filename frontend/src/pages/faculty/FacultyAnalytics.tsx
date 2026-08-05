import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
            Average case scores and completion across your class sections.
          </p>
        </section>

        {summary && !isLoading && summary.sections.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Sections" value={summary.totals.section_count} />
            <Stat label="Students" value={summary.totals.student_count} />
            <Stat
              label="Avg Score"
              value={summary.totals.average_score}
              suffix="/100"
              tone={scoreTone(summary.totals.average_score)}
            />
            <Stat label="Completion" value={summary.totals.completion_rate} suffix="%" />
          </section>
        ) : null}

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
                Average Case Score by Section
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
                    <Bar dataKey="average_score" name="Avg Score" radius={[4, 4, 0, 0]}>
                      {summary.sections.map((section) => (
                        <Cell key={section.section_id} fill={scoreTone(section.average_score)} />
                      ))}
                      <LabelList
                        dataKey="average_score"
                        position="top"
                        fill="#374151"
                        fontSize={12}
                        fontWeight={700}
                      />
                    </Bar>
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
                    <span
                      className="text-sm font-semibold"
                      style={{ color: scoreTone(section.average_score) }}
                    >
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

function scoreTone(score: number): string {
  if (score >= 75) return "#16a34a"
  if (score >= 60) return "#b45309"
  if (score > 0) return "#b91c1c"
  return "#9ca3af"
}

interface StatProps {
  label: string
  value: number | string
  suffix?: string
  tone?: string
}

function Stat({ label, value, suffix, tone }: StatProps) {
  return (
    <article className="rounded-lg border border-[#e6e8eb] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: tone ?? "#0b1d3a" }}>
        {value}
        {suffix ? <span className="text-sm font-semibold text-[#9ca3af]">{suffix}</span> : null}
      </p>
    </article>
  )
}

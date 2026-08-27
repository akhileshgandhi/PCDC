import { ArrowRight, CalendarDays, Target } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
  getStudentCareerPathway,
  getStudentDashboardCapabilities,
  getStudentDashboardSummary,
  getStudentRecentEvaluations,
  type StudentCareerPathway,
  type StudentCapabilityMatrix,
  type StudentDashboardSummary,
  type StudentRecentEvaluation,
} from "../../api/student"
import CapabilityCard from "../../components/capability/CapabilityCard"
import CapabilityHistoryTable, {
  type CapabilityHistoryRow,
} from "../../components/capability/CapabilityHistoryTable"
import CapabilityRadar from "../../components/capability/CapabilityRadar"
import DashboardLayout from "../../layouts/DashboardLayout"
import { scoreColorClass } from "../../utils/scoreColor"

function formatEvaluationDate(value: string | null): string {
  if (!value) return ""
  const parsed = new Date(value.replace(" ", "T"))
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    parsed,
  )
}

export default function CapabilityProfile() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null)
  const [matrix, setMatrix] = useState<StudentCapabilityMatrix | null>(null)
  const [recentEvaluations, setRecentEvaluations] = useState<StudentRecentEvaluation[]>([])
  const [careerPathway, setCareerPathway] = useState<StudentCareerPathway | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const [summaryData, matrixData, evaluationsData, pathwayData] = await Promise.all([
          getStudentDashboardSummary(),
          getStudentDashboardCapabilities(),
          getStudentRecentEvaluations().catch(() => []),
          getStudentCareerPathway().catch(() => null),
        ])
        if (isMounted) {
          setSummary(summaryData)
          setMatrix(matrixData)
          setRecentEvaluations(evaluationsData)
          setCareerPathway(pathwayData)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load your capability profile right now.")
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const items = matrix?.categories.flatMap((category) => category.items) ?? []
  const totalAttempts = matrix?.total_attempts ?? 0
  const lastEvaluatedDate = recentEvaluations[0]?.date ?? null

  const historyRows: CapabilityHistoryRow[] = recentEvaluations.map((evaluation) => ({
    title: evaluation.title,
    date: formatEvaluationDate(evaluation.date),
    score: evaluation.score,
    status: evaluation.status,
  }))

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-[#E6EBEB] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-[#6B7280]">Loading your capability profile...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#111827]">My Capability Profile</h1>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                Track your growth across all executive competencies.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#6B7280]">
              {lastEvaluatedDate ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F6F7F9] px-4 py-2">
                  <CalendarDays size={16} aria-hidden="true" />
                  Last updated: {formatEvaluationDate(lastEvaluatedDate)}
                </span>
              ) : null}
              <span className="rounded-full bg-[#F6F7F9] px-4 py-2">
                Based on {totalAttempts} case attempt{totalAttempts === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="rounded-xl border border-dashed border-[#E6EBEB] bg-white px-5 py-16 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">No capability data yet</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Complete a case study and your capability scores will show up here.
            </p>
            <Link
              to="/student/case-studies"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-[#C9A227] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#B08D20]"
            >
              Browse Case Studies
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <>
            <section className="grid gap-5 xl:grid-cols-[minmax(0,60%)_minmax(360px,40%)]">
              <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#111827]">Capability Radar</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      Current scores across all tracked competencies.
                    </p>
                  </div>
                </div>

                <CapabilityRadar capabilities={items} />

                <div className="mt-5 rounded-xl bg-[#F6F7F9] p-5">
                  <p className="text-sm font-semibold text-[#6B7280]">Overall Capability Score</p>
                  <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p
                        className={`text-5xl font-semibold ${scoreColorClass(summary?.overall_capability_score ?? 0)}`}
                      >
                        {summary?.overall_capability_score ?? 0}
                      </p>
                      {summary?.current_level != null ? (
                        <p className="mt-2 text-sm font-semibold text-[#0B1D3A]">
                          Level {summary.current_level}
                          {summary.level_label ? ` - ${summary.level_label}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <CapabilityCard key={item.name} capability={item} />
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#111827]">Recent Case Study Performance</h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  How recent attempts contributed to your capability profile.
                </p>
              </div>
              {historyRows.length > 0 ? (
                <CapabilityHistoryTable rows={historyRows} />
              ) : (
                <div className="rounded-xl border border-dashed border-[#E6EBEB] bg-white px-5 py-10 text-center text-sm text-[#6B7280] shadow-sm">
                  No evaluated case studies yet.
                </div>
              )}
            </section>

            {careerPathway && careerPathway.recommended_cases.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#111827]">Recommended Next Steps</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Cases suggested for your current pathway and capability gaps.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {careerPathway.recommended_cases.map((item) => (
                    <article
                      key={item.case_id}
                      className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#FFF7DF] text-[#92702A]">
                          <Target size={19} aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-[#111827]">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                            {[item.domain, item.level].filter(Boolean).join(" · ")}
                          </p>
                          {item.develops.length > 0 ? (
                            <p className="mt-2 text-sm font-semibold text-[#0B1D3A]">
                              Develops: {item.develops.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <Link
                        to={`/student/case-studies/${item.case_id}`}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#92702A] transition hover:text-[#0B1D3A]"
                      >
                        View Case
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

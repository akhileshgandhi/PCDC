import { ClipboardList } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getStudentCareerPathway, type StudentCareerPathway } from "../../api/student"
import PathwayBanner from "../../components/career/PathwayBanner"
import DashboardLayout from "../../layouts/DashboardLayout"

export default function CareerPathway() {
  const [data, setData] = useState<StudentCareerPathway | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getStudentCareerPathway()
      .then((result) => {
        if (active) setData(result)
      })
      .catch(() => {
        if (active) setError("Unable to load your pathway right now.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const readiness = data && data.progress.total > 0
    ? Math.round((data.progress.developed / data.progress.total) * 100)
    : 0
  const focusAreas = (data?.focus_areas ?? []).map((focus) => focus.capability)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Career Pathway</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Your personalised development roadmap{data?.pathway_name ? ` — ${data.pathway_name}` : ""}.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {isLoading || !data ? (
          <div className="rounded-lg border border-[#e6e8eb] bg-white p-8 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            {isLoading ? "Loading your pathway..." : "No pathway data yet."}
          </div>
        ) : (
          <>
            <PathwayBanner
              name={data.pathway_name}
              description={
                data.has_track
                  ? "Focused development toward your chosen career track."
                  : "Build breadth across every capability. Assign a career track to tailor this path."
              }
              readiness={readiness}
              readinessLabel={`${data.progress.developed} of ${data.progress.total} capabilities developed`}
              focusAreas={focusAreas}
            />

            <section>
              <h2 className="text-lg font-semibold text-[#111827]">Focus Areas</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                The capabilities where you have the most room to grow.
              </p>
              {data.focus_areas.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.focus_areas.map((focus) => (
                    <article
                      key={focus.capability}
                      className="rounded-lg border border-[#e6e8eb] bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#111827]">
                          {focus.capability}
                        </span>
                        <span className="text-xs font-semibold text-[#6b7280]">
                          {focus.score}/100
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[#e6e8eb]">
                        <div
                          className="h-2 rounded-full bg-[#c9a227]"
                          style={{ width: `${focus.score}%` }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-[#e6e8eb] bg-white p-6 text-center text-sm text-[#6b7280]">
                  Complete a case study to reveal your focus areas.
                </p>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#111827]">Next Recommended Activities</h2>
              {data.recommended_cases.length > 0 ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {data.recommended_cases.map((activity) => (
                    <article
                      key={activity.case_id}
                      className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm"
                    >
                      <div className="grid size-11 place-items-center rounded-md bg-[#081d3a] text-white">
                        <ClipboardList size={20} aria-hidden="true" />
                      </div>
                      <h3 className="mt-4 font-semibold text-[#111827]">{activity.title}</h3>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        {activity.level}
                        {activity.domain ? ` · ${activity.domain}` : ""}
                      </p>
                      {activity.develops.length > 0 ? (
                        <p className="mt-3 text-sm text-[#111827]">
                          Develops:{" "}
                          <span className="font-semibold">{activity.develops.join(", ")}</span>
                        </p>
                      ) : null}
                      <Link
                        to={`/student/case-studies/${activity.case_id}`}
                        className="mt-4 inline-flex rounded-md bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#081d3a]"
                      >
                        Start
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-[#e6e8eb] bg-white p-6 text-center text-sm text-[#6b7280]">
                  No pending cases right now. Check{" "}
                  <Link to="/student/case-studies" className="font-semibold text-[#0b1d3a] underline">
                    My Case Studies
                  </Link>{" "}
                  for what&apos;s available.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

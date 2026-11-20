import { ClipboardList } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { getStudentCareerPathway, type StudentCareerPathway } from "../../api/student"
import CareerTrackPicker from "../../components/career/CareerTrackPicker"
import PathwayBanner from "../../components/career/PathwayBanner"
import DashboardLayout from "../../layouts/DashboardLayout"

export default function CareerPathway() {
  const location = useLocation()
  const [data, setData] = useState<StudentCareerPathway | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  // Arriving from Profile → "Change Pathway" (#choose-track) opens the picker.
  const [isPicking, setIsPicking] = useState(location.hash === "#choose-track")

  const loadPathway = useCallback(() => {
    let active = true
    getStudentCareerPathway()
      .then((result) => {
        if (active) {
          setData(result)
          setError("")
        }
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

  useEffect(() => loadPathway(), [loadPathway])

  const showPicker = Boolean(data) && (!data?.has_track || isPicking)

  useEffect(() => {
    if (showPicker && location.hash === "#choose-track") {
      document.getElementById("choose-track")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [showPicker, location.hash])

  function handleChosen() {
    setIsPicking(false)
    loadPathway()
  }

  const keyCapabilities = data?.key_capabilities ?? []
  const hasTrackFocus = Boolean(data?.has_track) && keyCapabilities.length > 0
  // With a track: readiness = average score across the track's key capabilities.
  const readiness = hasTrackFocus
    ? data?.track_readiness ?? 0
    : data && data.progress.total > 0
      ? Math.round((data.progress.developed / data.progress.total) * 100)
      : 0
  const readinessLabel = hasTrackFocus
    ? `Average score across ${keyCapabilities.length} key capabilities for ${data?.pathway_name}`
    : `${data?.progress.developed ?? 0} of ${data?.progress.total ?? 0} capabilities developed`
  const focusAreas = (data?.focus_areas ?? []).map((focus) => focus.capability)
  const capabilityCards = hasTrackFocus ? keyCapabilities : data?.focus_areas ?? []

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
                  : "Build breadth across every capability. Choose a career track below to tailor this path."
              }
              readiness={readiness}
              readinessLabel={readinessLabel}
              focusAreas={focusAreas}
            />

            {showPicker ? (
              <CareerTrackPicker
                currentTrack={data.has_track ? data.pathway_name : null}
                onChosen={handleChosen}
                onCancel={data.has_track ? () => setIsPicking(false) : undefined}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e6e8eb] bg-white px-5 py-4 shadow-sm">
                <p className="text-sm text-[#374151]">
                  Your career track: <span className="font-semibold text-[#111827]">{data.pathway_name}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setIsPicking(true)}
                  className="rounded-md border border-[#e6e8eb] px-3 py-1.5 text-sm font-semibold text-[#2563eb] transition hover:border-[#2563eb] hover:bg-[#eaf1fd]"
                >
                  Change track
                </button>
              </div>
            )}

            <section>
              <h2 className="text-lg font-semibold text-[#111827]">
                {hasTrackFocus ? `Key Capabilities for ${data.pathway_name}` : "Focus Areas"}
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                {hasTrackFocus
                  ? "The capabilities this career relies on most, weakest first. Build these to raise your readiness."
                  : "The capabilities where you have the most room to grow."}
              </p>
              {capabilityCards.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {capabilityCards.map((focus) => (
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
                          className="h-2 rounded-full bg-[#2563eb]"
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
                      <div className="grid size-11 place-items-center rounded-md bg-[#0c1f3d] text-white">
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
                        className="mt-4 inline-flex rounded-md bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Start
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-[#e6e8eb] bg-white p-6 text-center text-sm text-[#6b7280]">
                  No pending cases right now. Check{" "}
                  <Link to="/student/case-studies" className="font-semibold text-[#0c1f3d] underline">
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

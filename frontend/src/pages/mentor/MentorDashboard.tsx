import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
  getMentorDashboardAlerts,
  getMentorDashboardSummary,
  getMentorUpcomingSessions,
  type MentorAlert,
  type MentorDashboardSummary,
  type MentorSession,
} from "../../api/mentor"
import MentorLayout from "../../layouts/MentorLayout"
import { getCurrentUser } from "../../utils/auth"

const defaultSummary: MentorDashboardSummary = {
  assigned_students: 0,
  at_risk_students: 0,
  top_performers: 0,
  sessions_this_week: 0,
  weakness_signals: [],
}

export default function MentorDashboard() {
  const [summary, setSummary] = useState<MentorDashboardSummary>(defaultSummary)
  const [alerts, setAlerts] = useState<MentorAlert[]>([])
  const [sessions, setSessions] = useState<MentorSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const currentUser = getCurrentUser()
  const firstName = currentUser?.name?.split(" ")[0] ?? "Mentor"

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        const [summaryData, alertData, sessionData] = await Promise.all([
          getMentorDashboardSummary(),
          getMentorDashboardAlerts(),
          getMentorUpcomingSessions(),
        ])
        if (isMounted) {
          setSummary(summaryData)
          setAlerts(alertData)
          setSessions(sessionData)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load mentor dashboard right now.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <MentorLayout>
      <div className="space-y-5">
        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-lg bg-[#17382f] p-6 text-white shadow-md sm:p-8">
            <div className="inline-flex rounded-full bg-[#f3c95b] px-3 py-1 text-xs font-semibold text-[#17382f]">
              Student pulse
            </div>
            <h2 className="mt-7 text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back, {firstName}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/82 sm:text-base">
              Focus today on capability drops, stalled progress, and the students who need
              a timely conversation.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/mentor/students"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f3c95b] px-5 py-3 text-sm font-semibold text-[#17382f] shadow-sm transition hover:bg-[#f7d87c]"
              >
                Review Students
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                to="/mentor/alerts"
                className="inline-flex items-center justify-center rounded-md border border-[#f3c95b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View Alerts
              </Link>
            </div>
          </div>

          <article className="rounded-lg border border-[#dfe5dd] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Weakness Signals</h3>
            <div className="mt-5 space-y-3">
              {isLoading ? (
                <p className="text-sm font-medium text-[#617069]">Loading signals...</p>
              ) : summary.weakness_signals.length > 0 ? (
                summary.weakness_signals.map((signal) => (
                  <div
                    key={signal.capability}
                    className="flex items-center justify-between rounded-md bg-[#f6f7f4] px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-[#617069]">
                      {signal.capability}
                    </span>
                    <span className="text-sm font-semibold text-[#1c2420]">
                      {signal.student_count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#617069]">
                  Capability weakness signals will appear after student scores are recorded.
                </p>
              )}
            </div>
          </article>
        </section>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Assigned Students"
            value={summary.assigned_students}
            icon={Users}
            isLoading={isLoading}
          />
          <SummaryCard
            label="At Risk"
            value={summary.at_risk_students}
            icon={AlertTriangle}
            isLoading={isLoading}
          />
          <SummaryCard
            label="Top Performers"
            value={summary.top_performers}
            icon={TrendingUp}
            isLoading={isLoading}
          />
          <SummaryCard
            label="Sessions This Week"
            value={summary.sessions_this_week}
            icon={CalendarDays}
            isLoading={isLoading}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-lg border border-[#dfe5dd] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Alerts</h2>
                <p className="mt-1 text-sm text-[#617069]">Most urgent active signals.</p>
              </div>
              <Link
                to="/mentor/alerts"
                className="text-sm font-semibold text-[#2d6f5d] transition hover:text-[#17382f]"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <p className="text-sm font-medium text-[#617069]">Loading alerts...</p>
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    to={`/mentor/student/${alert.student_id}`}
                    className="block rounded-md border border-[#dfe5dd] bg-white p-4 transition hover:border-[#f3c95b] hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 grid size-9 place-items-center rounded-md ${
                          alert.severity === "critical"
                            ? "bg-[#fff1f0] text-[#b42318]"
                            : "bg-[#fff8db] text-[#8a6100]"
                        }`}
                      >
                        <AlertTriangle size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#1c2420]">
                          {alert.student_name}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-[#617069]">
                          {alert.message}
                        </span>
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#617069]">
                  No active alerts are waiting for review.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[#dfe5dd] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">Upcoming Sessions</h2>
            <div className="mt-5 space-y-3">
              {isLoading ? (
                <p className="text-sm font-medium text-[#617069]">Loading sessions...</p>
              ) : sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-md bg-[#f6f7f4] p-3">
                    <p className="text-sm font-semibold text-[#1c2420]">
                      {formatDate(session.scheduled_at)}
                    </p>
                    <p className="mt-1 text-sm text-[#617069]">{session.student_names}</p>
                    <p className="mt-1 text-sm text-[#617069]">{session.agenda}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#617069]">
                  Scheduled sessions will appear here.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </MentorLayout>
  )
}

interface SummaryCardProps {
  label: string
  value: number
  icon: LucideIcon
  isLoading: boolean
}

function SummaryCard({ label, value, icon: Icon, isLoading }: SummaryCardProps) {
  return (
    <article className="rounded-lg border border-[#dfe5dd] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-[#e6f2ee] text-[#2d6f5d]">
          <Icon size={19} aria-hidden="true" />
        </div>
        <span className="rounded-full bg-[#f6f7f4] px-3 py-1 text-xs font-semibold text-[#617069]">
          Live
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[#617069]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#1c2420]">
        {isLoading ? "..." : value}
      </p>
    </article>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

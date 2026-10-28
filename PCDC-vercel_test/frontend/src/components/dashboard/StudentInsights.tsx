import { CalendarClock, CalendarX, CheckCircle2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getStudentDashboardInsights, type StudentDashboardInsights } from "../../api/student"
import { AlertTile, EmptyNote, Panel, dueText, pctText } from "./InsightBits"
import { AssignmentStatusBar, ScoreTrendChart } from "./InsightCharts"

/** Student dashboard: deadlines, overall progress and recent score trend.
 * Only the student's own data (never AI-content checks). Loads on its own
 * so the rest of the dashboard is unaffected if it fails. */
export default function StudentInsights() {
  const [data, setData] = useState<StudentDashboardInsights | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let isMounted = true
    getStudentDashboardInsights()
      .then((result) => {
        if (isMounted) setData(result)
      })
      .catch(() => {
        if (isMounted) setFailed(true)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // The main dashboard already reports profile/connection problems.
  if (failed) return null

  const isLoading = data === null
  const progress = data?.progress

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <AlertTile
          accent="student"
          label="Overdue"
          value={progress?.overdue ?? 0}
          hint="Assigned cases past their due date."
          icon={CalendarX}
          isLoading={isLoading}
          urgent
          to="/student/case-studies"
        />
        <AlertTile
          accent="student"
          label="Due This Week"
          value={progress?.due_next_7_days ?? 0}
          hint="Cases due in the next 7 days."
          icon={CalendarClock}
          isLoading={isLoading}
          to="/student/case-studies"
        />
        <AlertTile
          accent="student"
          label="Completed"
          value={isLoading ? 0 : `${progress?.completed ?? 0}/${progress?.assigned ?? 0}`}
          hint={`${pctText(progress?.completion_pct)} of your assigned cases are done.`}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel
          accent="student"
          title="Upcoming Deadlines"
          action={{ label: "All case studies", to: "/student/case-studies" }}
        >
          {isLoading ? null : (
            <div className="mb-4 border-b border-[#eef2f7] pb-4">
              <AssignmentStatusBar counts={data.assignment_status} />
            </div>
          )}
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : data.deadlines.length === 0 ? (
            <EmptyNote>You're all caught up — no open assignments.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {data.deadlines.map((item) => {
                const due = dueText(item.due_date)
                return (
                  <li key={item.case_id}>
                    <Link
                      to={`/student/case-studies/${item.case_id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-1 py-2.5 transition hover:bg-[#f9fafb]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827]">{item.title}</p>
                        <p className="text-xs text-[#6b7280]">{item.started ? "In progress" : "Not started"}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          due.overdue ? "bg-[#fff1f0] text-[#b42318]" : "bg-[#fff7df] text-[#92702a]"
                        }`}
                      >
                        {due.text}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel accent="student" title="Recent Scores" subtitle="Your last evaluated case studies">
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : data.score_trend.length === 0 ? (
            <EmptyNote>Scores appear here once your first case study is evaluated.</EmptyNote>
          ) : (
            <>
              <ScoreTrendChart data={data.score_trend} />
              <ol className="mt-3 space-y-1 border-t border-[#eef2f7] pt-3">
                {data.score_trend.map((item, index) => (
                  <li key={`${item.case_id}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-[#6b7280]">
                      #{index + 1} {item.title}
                    </span>
                    <span className="shrink-0 font-semibold text-[#081d3a]">{pctText(item.score_pct)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Panel>
      </section>
    </>
  )
}

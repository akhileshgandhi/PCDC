import { CalendarClock, CalendarX, Hourglass, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getFacultyDashboardInsights, type FacultyDashboardInsights } from "../../api/faculty"
import { AlertTile, EmptyNote, Panel, ProgressBar, dueText, pctText, shortDate } from "./InsightBits"
import { AssignmentStatusBar, SERIES_1, SimpleBarChart, WeeklyTrendChart } from "./InsightCharts"

const STATUS_LABELS: Record<string, string> = {
  solution_submitted: "Submitted",
  defense_complete: "Awaiting review",
  evaluated: "Evaluated",
}

/** Faculty dashboard: deadlines, overdue work, AI flags, per-section
 * performance, latest submissions and students who need support. Loads on
 * its own so the rest of the dashboard is unaffected if it fails. */
export default function FacultyInsights() {
  const [data, setData] = useState<FacultyDashboardInsights | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let isMounted = true
    getFacultyDashboardInsights()
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

  if (failed) {
    return <EmptyNote>Dashboard insights are unavailable right now. Reload the page to try again.</EmptyNote>
  }

  const isLoading = data === null
  const attention = data?.attention

  return (
    <>
      <section>
        <h2 className="mb-3 text-xl font-semibold text-[#111827]">Needs Your Attention</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AlertTile
            accent="faculty"
            label="Due in Next 7 Days"
            value={attention?.due_next_7_days ?? 0}
            hint="Student submissions due this week that aren't completed yet."
            icon={CalendarClock}
            isLoading={isLoading}
          />
          <AlertTile
            accent="faculty"
            label="Overdue Submissions"
            value={attention?.overdue_submissions ?? 0}
            hint="Assigned cases past their due date and not completed."
            icon={CalendarX}
            isLoading={isLoading}
            urgent
          />
          <AlertTile
            accent="faculty"
            label="AI-Content Flags"
            value={attention?.ai_flagged_attempts ?? 0}
            hint="Attempts with an answer likely AI-written (from reports you've opened)."
            icon={Sparkles}
            isLoading={isLoading}
            urgent
          />
          <AlertTile
            accent="faculty"
            label="Teaching Awaiting Approval"
            value={attention?.teaching_pending_approval ?? 0}
            hint="Your teaching selections an admin hasn't approved yet."
            icon={Hourglass}
            isLoading={isLoading}
            to="/faculty/onboarding/my-teaching"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel accent="faculty" title="Submissions" subtitle="Per week, last 8 weeks">
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : (
            <WeeklyTrendChart
              data={data.weekly_submissions}
              series={[{ key: "submissions", label: "Submissions", color: SERIES_1 }]}
            />
          )}
        </Panel>
        <Panel accent="faculty" title="Score Distribution" subtitle="Evaluated attempts by score band">
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : data.score_distribution.every((band) => band.attempts === 0) ? (
            <EmptyNote>No evaluated attempts yet.</EmptyNote>
          ) : (
            <SimpleBarChart
              data={data.score_distribution}
              categoryKey="band"
              valueKey="attempts"
              valueName="Attempts"
            />
          )}
        </Panel>
        <Panel accent="faculty" title="Assignment Status" subtitle="Cases you assigned or wrote">
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : (
            <AssignmentStatusBar counts={data.assignment_status} />
          )}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel accent="faculty" title="Upcoming Deadlines" subtitle="Your assigned cases with work still open">
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : data.deadlines.length === 0 ? (
            <EmptyNote>No open deadlines. Assign a case to a section to set one.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {data.deadlines.map((item) => {
                const due = dueText(item.due_date)
                const pct = item.students ? (100 * item.completed) / item.students : null
                return (
                  <li key={`${item.case_id}-${item.due_date}`} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/faculty/case-attempts/${item.case_id}`}
                        className="min-w-0 truncate text-sm font-semibold text-[#111827] hover:underline"
                      >
                        {item.title}
                      </Link>
                      <span className={`shrink-0 text-xs font-semibold ${due.overdue ? "text-[#b42318]" : "text-[#92702a]"}`}>
                        {due.text}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar accent="faculty" pct={pct} label={`${item.title} completion`} />
                      <span className="shrink-0 text-xs text-[#6b7280]">
                        {item.completed}/{item.students} done
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel accent="faculty" title="Section Performance" subtitle="Average score and completion of assigned cases">
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : data.sections.length === 0 ? (
            <EmptyNote>No approved sections yet.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {data.sections.map((section) => (
                <li key={section.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">{section.name}</p>
                      <p className="truncate text-xs text-[#6b7280]">
                        {[section.course_name, section.semester_name].filter(Boolean).join(" · ")} ·{" "}
                        {section.students} students
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-[#0b1d3a]">{pctText(section.avg_score_pct)}</p>
                      <p className="text-[11px] text-[#9ca3af]">avg. score</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ProgressBar accent="faculty" pct={section.completion_pct} label={`${section.name} completion`} />
                    <span className="w-24 shrink-0 text-right text-xs text-[#6b7280]">
                      {pctText(section.completion_pct)} completed
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          accent="faculty"
          title="Latest Submissions"
          action={{ label: "All reports", to: "/faculty/reports" }}
        >
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : data.recent_submissions.length === 0 ? (
            <EmptyNote>No submissions yet.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {data.recent_submissions.map((item) => (
                <li key={item.attempt_id}>
                  <Link
                    to={`/faculty/attempts/${item.attempt_id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-1 py-2.5 transition hover:bg-[#f9fafb]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">
                        {item.student_name}
                        {item.ai_flagged ? (
                          <span className="ml-2 rounded-full bg-[#f4f0ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6941c6]">
                            AI flag
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-[#6b7280]">
                        {item.case_title} · {shortDate(item.submitted_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-[#0b1d3a]">{pctText(item.score_pct)}</p>
                      <p className="text-[11px] text-[#9ca3af]">{STATUS_LABELS[item.status] ?? item.status}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel accent="faculty" title="Students Needing Support" subtitle="Average score below 50% on evaluated cases">
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading...</p>
          ) : data.students_needing_support.length === 0 ? (
            <EmptyNote>No students below 50% right now.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {data.students_needing_support.map((student) => (
                <li key={student.user_id}>
                  <Link
                    to={`/faculty/student-attempts/${student.user_id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-1 py-2.5 transition hover:bg-[#f9fafb]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">{student.name}</p>
                      <p className="text-xs text-[#6b7280]">
                        {student.evaluated_attempts} evaluated {student.evaluated_attempts === 1 ? "case" : "cases"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#b42318]">{pctText(student.avg_score_pct)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </>
  )
}

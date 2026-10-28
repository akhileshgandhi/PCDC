import { CalendarClock, LayoutGrid, Sparkles, UserX } from "lucide-react"
import { useEffect, useState } from "react"

import { getAdminDashboardInsights, type AdminDashboardInsights } from "../../api/admin"
import { AlertTile, EmptyNote, Panel, ProgressBar, pctText } from "./InsightBits"
import {
  AssignmentStatusBar,
  HorizontalScoreBars,
  SERIES_1,
  SERIES_2,
  WeeklyTrendChart,
} from "./InsightCharts"

/** Admin dashboard: what needs attention, platform totals, last-30-day
 * engagement and an institute (or specialization) comparison. Loads on its
 * own so the rest of the dashboard is unaffected if it fails. */
export default function AdminInsights() {
  const [data, setData] = useState<AdminDashboardInsights | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let isMounted = true
    getAdminDashboardInsights()
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
  const totals = data?.totals
  const engagement = data?.engagement
  const completionPct =
    engagement && engagement.cases_assigned > 0
      ? (100 * engagement.cases_completed) / engagement.cases_assigned
      : null

  return (
    <>
      <section>
        <h2 className="mb-3 text-xl font-semibold text-[#17202a]">Needs Attention</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AlertTile
            accent="admin"
            label="Students Without a Section"
            value={attention?.students_without_section ?? 0}
            hint="Active students not enrolled in any class section yet."
            icon={UserX}
            isLoading={isLoading}
            urgent
            to="/admin/people/students"
          />
          <AlertTile
            accent="admin"
            label="Sections Without Faculty"
            value={attention?.sections_without_faculty ?? 0}
            hint="Active sections with no approved faculty teaching them."
            icon={LayoutGrid}
            isLoading={isLoading}
            urgent
            to="/admin/academic/sections"
          />
          <AlertTile
            accent="admin"
            label="Overdue Assignments"
            value={attention?.overdue_assignments ?? 0}
            hint="Assigned cases past their due date and not yet completed."
            icon={CalendarClock}
            isLoading={isLoading}
            urgent
          />
          <AlertTile
            accent="admin"
            label="AI-Flagged Attempts"
            value={attention?.ai_flagged_attempts_30d ?? 0}
            hint="Attempts with an answer flagged as likely AI-written (last 30 days, faculty-checked)."
            icon={Sparkles}
            isLoading={isLoading}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel accent="admin" title="Case Study Activity" subtitle="Attempts started and evaluated per week, last 8 weeks">
          {isLoading ? (
            <p className="text-sm text-[#667085]">Loading...</p>
          ) : (
            <WeeklyTrendChart
              data={data.weekly_activity}
              series={[
                { key: "attempts_started", label: "Attempts started", color: SERIES_1 },
                { key: "attempts_evaluated", label: "Attempts evaluated", color: SERIES_2 },
              ]}
            />
          )}
        </Panel>
        <Panel accent="admin" title="Assignment Status" subtitle="Every assigned case right now">
          {isLoading ? (
            <p className="text-sm text-[#667085]">Loading...</p>
          ) : (
            <AssignmentStatusBar counts={data.assignment_status} />
          )}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Panel accent="admin" title="Engagement" subtitle="Last 30 days">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Cases assigned" value={engagement?.cases_assigned} isLoading={isLoading} />
            <Metric label="Cases completed" value={engagement?.cases_completed} isLoading={isLoading} />
            <Metric label="Attempts started" value={engagement?.attempts_started} isLoading={isLoading} />
            <Metric label="Attempts evaluated" value={engagement?.attempts_evaluated} isLoading={isLoading} />
            <Metric label="Active students" value={engagement?.active_students} isLoading={isLoading} />
            <Metric label="Average score" value={pctText(engagement?.avg_score_pct)} isLoading={isLoading} />
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#667085]">
              <span>Completion rate</span>
              <span>{isLoading ? "..." : pctText(completionPct)}</span>
            </div>
            <ProgressBar accent="admin" pct={completionPct} label="Completion rate, last 30 days" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#eef2f7] pt-4 text-center sm:grid-cols-6">
            {[
              ["Institutes", totals?.institutions],
              ["Specializations", totals?.courses],
              ["Sections", totals?.sections],
              ["Students", totals?.students],
              ["Faculty", totals?.faculty],
              ["Published cases", totals?.published_cases],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-lg font-semibold text-[#17202a]">{isLoading ? "..." : value}</p>
                <p className="text-[11px] font-medium text-[#98a2b3]">{label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          accent="admin"
          title={`By ${data?.breakdown.group_label ?? "Institute"}`}
          subtitle="Students, recent attempts, average score and completion of assigned cases"
        >
          {isLoading ? (
            <p className="text-sm text-[#667085]">Loading...</p>
          ) : data.breakdown.rows.length === 0 ? (
            <EmptyNote>No academic data yet.</EmptyNote>
          ) : (
            <div>
              {data.breakdown.rows.some((row) => row.avg_score_pct !== null) ? (
                <div className="mb-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">Average score</p>
                  <HorizontalScoreBars
                    data={data.breakdown.rows
                      .filter((row) => row.avg_score_pct !== null)
                      .map((row) => ({ name: row.name, score: Math.round(row.avg_score_pct ?? 0) }))}
                    categoryKey="name"
                    valueKey="score"
                    valueName="Average score"
                  />
                </div>
              ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[#98a2b3]">
                    <th className="pb-2 font-semibold">{data.breakdown.group_label}</th>
                    <th className="pb-2 text-right font-semibold">Students</th>
                    <th className="pb-2 text-right font-semibold">Attempts (30d)</th>
                    <th className="pb-2 text-right font-semibold">Avg. score</th>
                    <th className="w-36 pb-2 pl-4 font-semibold">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f7]">
                  {data.breakdown.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 font-medium text-[#17202a]">{row.name}</td>
                      <td className="py-2.5 text-right text-[#344054]">{row.students}</td>
                      <td className="py-2.5 text-right text-[#344054]">{row.attempts_30d}</td>
                      <td className="py-2.5 text-right text-[#344054]">{pctText(row.avg_score_pct)}</td>
                      <td className="py-2.5 pl-4">
                        <div className="flex items-center gap-2">
                          <ProgressBar accent="admin" pct={row.completion_pct} label={`${row.name} completion`} />
                          <span className="w-9 shrink-0 text-right text-xs text-[#667085]">{pctText(row.completion_pct)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </Panel>
      </section>
    </>
  )
}

function Metric({ label, value, isLoading }: { label: string; value: number | string | undefined; isLoading: boolean }) {
  return (
    <div className="rounded-md bg-[#f5f7fa] px-3 py-2.5">
      <p className="text-xl font-semibold text-[#17202a]">{isLoading ? "..." : value ?? 0}</p>
      <p className="text-xs font-medium text-[#667085]">{label}</p>
    </div>
  )
}

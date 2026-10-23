import {
  BookOpen,
  ClipboardList,
  FilePlus2,
  Layers,
  LogIn,
  Send,
  Settings2,
  UserCheck,
  Users,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"

import {
  getFacultyActivity,
  getFacultyTimeline,
  type FacultyActivity,
  type FacultyTimelineItem,
} from "../../api/admin"
import { formatDate, titleCase } from "./AdminUsers"

type Tab = "timeline" | "cases" | "assignments" | "bank"

const TABS: { key: Tab; label: string }[] = [
  { key: "timeline", label: "Activity timeline" },
  { key: "cases", label: "Case studies" },
  { key: "assignments", label: "Assignments" },
  { key: "bank", label: "Case Bank" },
]

const TIMELINE_PAGE_SIZE = 10

const TIMELINE_ICONS: Record<string, typeof LogIn> = {
  login: LogIn,
  case_created: FilePlus2,
  case_updated: ClipboardList,
  case_assigned_section: Send,
  case_assigned_student: UserCheck,
  bank_contribution: Layers,
  teaching: BookOpen,
  system: Settings2,
}

function when(value: string | null | undefined) {
  return value ? formatDate(value) : "—"
}

export default function FacultyActivitySection({ facultyId }: { facultyId: number }) {
  const [activity, setActivity] = useState<FacultyActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<Tab>("timeline")

  const [timeline, setTimeline] = useState<FacultyTimelineItem[]>([])
  const [nextOffset, setNextOffset] = useState<number | null>(0)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState(false)

  function load() {
    setLoading(true)
    setLoadError(false)
    getFacultyActivity(facultyId)
      .then(setActivity)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  // First page shows TIMELINE_PAGE_SIZE items; "Load more" fetches everything that's left.
  function loadTimeline(offset: number) {
    setTimelineLoading(true)
    setTimelineError(false)
    getFacultyTimeline(facultyId, offset, TIMELINE_PAGE_SIZE, offset > 0)
      .then((page) => {
        setTimeline((current) => (offset === 0 ? page.items : [...current, ...page.items]))
        setNextOffset(page.next_offset)
      })
      .catch(() => setTimelineError(true))
      .finally(() => setTimelineLoading(false))
  }

  useEffect(() => {
    load()
    setTimeline([])
    loadTimeline(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facultyId])

  if (loading) {
    return (
      <Card>
        <p className="py-6 text-center text-sm font-medium text-[#667085]">Loading faculty activity…</p>
      </Card>
    )
  }

  if (loadError || !activity) {
    return (
      <Card>
        <p className="text-sm font-medium text-[#b42318]">Could not load faculty activity.</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 rounded-md border border-[#dde4ec] px-4 py-2 text-sm font-semibold text-[#17202a] hover:bg-[#f5f7fa]"
        >
          Retry
        </button>
      </Card>
    )
  }

  const { summary } = activity

  return (
    <>
      <Card>
        <h2 className="text-base font-semibold text-[#17202a]">Activity overview</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label="Case studies"
            value={summary.cases_total}
            hint={`${summary.cases_published} published · ${summary.cases_draft} draft`}
          />
          <Stat
            label="Assignments"
            value={summary.section_assignments + summary.student_assignments}
            hint={`${summary.section_assignments} section · ${summary.student_assignments} student`}
          />
          <Stat label="Case Bank items" value={summary.bank_items} />
          <Stat label="Student attempts" value={summary.attempts_total} hint={`${summary.students_reached} students`} />
          <Stat label="Avg. marks" value={summary.avg_marks ?? "—"} hint="on their cases" />
          <Stat label="Logins" value={summary.login_count} />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-[#17202a]">Teaching</h2>
        {activity.teaching.length === 0 ? (
          <p className="mt-3 text-sm text-[#667085]">No sections or subjects selected yet.</p>
        ) : (
          <Table head={["Subject", "Section", "Course", "Semester", "Batch", "Students", "Status", "Since"]}>
            {activity.teaching.map((t) => (
              <tr key={t.id}>
                <Td strong>{t.subject || "—"}</Td>
                <Td>{t.section_name}</Td>
                <Td>{t.course_name || "—"}</Td>
                <Td>{t.semester_name || "—"}</Td>
                <Td>{t.batch_name || "—"}</Td>
                <Td>{t.student_count}</Td>
                <Td>
                  <Pill value={t.status} />
                </Td>
                <Td>{when(t.assigned_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-[#eef2f7] pb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                tab === t.key ? "bg-[#e8f8f4] text-[#176b5a]" : "text-[#667085] hover:bg-[#f5f7fa]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "timeline" ? (
          <div className="mt-4">
            {timeline.length === 0 && !timelineLoading && !timelineError ? (
              <p className="text-sm text-[#667085]">No recorded activity yet.</p>
            ) : null}
            <ol className="space-y-1">
              {timeline.map((item, i) => {
                const Icon = TIMELINE_ICONS[item.type] ?? Settings2
                return (
                  <li key={`${item.type}-${item.occurred_at}-${i}`} className="flex gap-3 rounded-md px-1 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f0f4f8] text-[#176b5a]">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#17202a]">
                        {item.type === "system" ? titleCase(item.title.replace(/[.\s]/g, "_")) : item.title}
                      </p>
                      {item.detail ? (
                        item.ref_id && item.type.startsWith("case_") ? (
                          <Link
                            to={`/admin/case-builder/${item.ref_id}`}
                            className="block truncate text-sm text-[#0f766e] hover:underline"
                          >
                            {item.detail}
                          </Link>
                        ) : (
                          <p className="truncate text-sm text-[#667085]">{item.detail}</p>
                        )
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[#98a2b3]">{formatDate(item.occurred_at)}</span>
                  </li>
                )
              })}
            </ol>
            {timelineError ? (
              <p className="mt-3 text-sm font-medium text-[#b42318]">Could not load the activity timeline.</p>
            ) : null}
            {nextOffset !== null || timelineError ? (
              <button
                type="button"
                disabled={timelineLoading}
                onClick={() => loadTimeline(timelineError ? timeline.length : (nextOffset ?? 0))}
                className="mt-3 rounded-md border border-[#dde4ec] px-4 py-2 text-sm font-semibold text-[#17202a] hover:bg-[#f5f7fa] disabled:opacity-60"
              >
                {timelineLoading ? "Loading…" : timelineError ? "Retry" : "Load more"}
              </button>
            ) : null}
          </div>
        ) : null}

        {tab === "cases" ? (
          activity.cases.length === 0 ? (
            <p className="mt-4 text-sm text-[#667085]">No case studies created yet.</p>
          ) : (
            <Table head={["Title", "Subject", "Status", "Sections", "Attempts", "Avg. marks", "Created", "Updated"]}>
              {activity.cases.map((c) => (
                <tr key={c.id}>
                  <Td strong>
                    <Link to={`/admin/case-builder/${c.id}`} className="text-[#0f766e] hover:underline">
                      {c.title}
                    </Link>
                  </Td>
                  <Td>{c.subject || "—"}</Td>
                  <Td>
                    <Pill value={c.status} />
                  </Td>
                  <Td>{c.section_count}</Td>
                  <Td>{c.attempts}</Td>
                  <Td>{c.avg_marks ?? "—"}</Td>
                  <Td>{when(c.created_at)}</Td>
                  <Td>{when(c.updated_at)}</Td>
                </tr>
              ))}
            </Table>
          )
        ) : null}

        {tab === "assignments" ? (
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
                <Users size={15} aria-hidden="true" /> Section assignments
              </h3>
              {activity.section_assignments.length === 0 ? (
                <p className="mt-2 text-sm text-[#667085]">No cases assigned to sections yet.</p>
              ) : (
                <Table head={["Case", "Section", "Course", "Completed", "Status", "Assigned", "Due"]}>
                  {activity.section_assignments.map((a) => (
                    <tr key={a.id}>
                      <Td strong>{a.case_title || "—"}</Td>
                      <Td>{a.section_name || "—"}</Td>
                      <Td>{a.course_name || "—"}</Td>
                      <Td>
                        {a.completed_count} / {a.student_count}
                      </Td>
                      <Td>
                        <Pill value={a.status} />
                      </Td>
                      <Td>{when(a.assigned_at)}</Td>
                      <Td>{when(a.due_date)}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
                <UserCheck size={15} aria-hidden="true" /> Individual student assignments
              </h3>
              {activity.student_assignments.length === 0 ? (
                <p className="mt-2 text-sm text-[#667085]">No cases assigned to individual students yet.</p>
              ) : (
                <Table head={["Case", "Student", "Status", "Assigned", "Completed"]}>
                  {activity.student_assignments.map((a) => (
                    <tr key={a.id}>
                      <Td strong>{a.case_title || "—"}</Td>
                      <Td>{a.student_name || "—"}</Td>
                      <Td>
                        <Pill value={a.status} />
                      </Td>
                      <Td>{when(a.assigned_at)}</Td>
                      <Td>{when(a.completed_at)}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          </div>
        ) : null}

        {tab === "bank" ? (
          activity.bank_items.length === 0 ? (
            <p className="mt-4 text-sm text-[#667085]">No Case Bank contributions yet.</p>
          ) : (
            <Table head={["Title", "Subject", "Semester", "Difficulty", "Source", "Status", "Added"]}>
              {activity.bank_items.map((b) => (
                <tr key={b.id}>
                  <Td strong>{b.title}</Td>
                  <Td>{b.subject || "—"}</Td>
                  <Td>{b.semester_number ?? "—"}</Td>
                  <Td>{b.difficulty != null ? `Level ${b.difficulty}` : "—"}</Td>
                  <Td>{titleCase(b.source)}</Td>
                  <Td>
                    <Pill value={b.status} />
                  </Td>
                  <Td>{when(b.created_at)}</Td>
                </tr>
              ))}
            </Table>
          )
        ) : null}
      </Card>
    </>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">{children}</section>
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-md border border-[#eef2f7] bg-[#f9fafb] px-3 py-3">
      <p className="text-xs font-semibold uppercase text-[#667085]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#17202a]">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[#98a2b3]">{hint}</p> : null}
    </div>
  )
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
            {head.map((h) => (
              <th key={h} className="py-2 pr-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef2f7]">{children}</tbody>
      </table>
    </div>
  )
}

function Td({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <td className={`py-2.5 pr-4 ${strong ? "font-medium text-[#17202a]" : "text-[#667085]"}`}>{children}</td>
  )
}

function Pill({ value }: { value: string | null | undefined }) {
  const v = (value || "").toLowerCase()
  const tone =
    v === "published" || v === "active" || v === "completed" || v === "approved"
      ? "bg-[#e8f8f4] text-[#176b5a]"
      : v === "draft" || v === "pending" || v === "available"
        ? "bg-[#fff7e6] text-[#b54708]"
        : v === "rejected" || v === "closed" || v === "archived"
          ? "bg-[#fff5f5] text-[#b42318]"
          : "bg-[#f0f4f8] text-[#475467]"
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {value ? titleCase(value) : "—"}
    </span>
  )
}

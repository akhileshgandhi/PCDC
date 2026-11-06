import { ArrowLeft, CheckCircle2, Loader2, MinusCircle, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import {
  changeTaskMarks,
  getSimulationAttemptReview,
  type AttemptReview,
  type AttemptReviewTask,
  type ReviewStatus,
} from "../../api/jobsim"
import { apiErrorDetail } from "../../components/bank/shared"
import FacultyLayout from "../../layouts/FacultyLayout"

const STATUS_META: Record<ReviewStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  correct: { label: "Correct", className: "bg-[#ecfdf3] text-[#067647]", Icon: CheckCircle2 },
  incorrect: { label: "Incorrect", className: "bg-[#fff5f5] text-[#b42318]", Icon: XCircle },
  not_answered: { label: "Not answered", className: "bg-[#f2f4f7] text-[#475467]", Icon: MinusCircle },
}

function Match({ ok, hidden }: { ok: boolean; hidden: boolean }) {
  if (hidden) return null
  const Icon = ok ? CheckCircle2 : XCircle
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ok ? "text-[#067647]" : "text-[#b42318]"}`}>
      <Icon size={13} aria-hidden="true" /> {ok ? "Matches" : "Doesn't match"}
    </span>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-baseline gap-2 py-1 text-sm">
      <dt className="text-xs font-semibold text-[#6b7280]">{label}</dt>
      <dd className="min-w-0 break-words text-[#111827]">{children}</dd>
    </div>
  )
}

function MarksEditor({
  task,
  onSaved,
  onClose,
}: {
  task: AttemptReviewTask
  onSaved: (review: AttemptReview) => void
  onClose: () => void
}) {
  const [marks, setMarks] = useState(String(task.marks))
  const [note, setNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    const score = Number(marks)
    if (marks.trim() === "" || !Number.isFinite(score) || score < 0 || score > task.max_marks) {
      setError(`Marks must be between 0 and ${task.max_marks}.`)
      return
    }
    setIsSaving(true)
    setError("")
    try {
      onSaved(await changeTaskMarks(task.task_result_id as number, score, note))
      onClose()
    } catch (saveError) {
      setError(apiErrorDetail(saveError, "Unable to change the marks."))
      setIsSaving(false)
    }
  }

  return (
    <div className="mt-3 rounded-md border border-[#e6e8eb] bg-[#f9fafb] p-3">
      <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
        <label className="text-xs font-semibold text-[#6b7280]">
          New marks (out of {task.max_marks})
          <input
            type="number"
            min={0}
            max={task.max_marks}
            step="any"
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#d0d5dd] bg-white px-3 py-2 text-sm font-normal text-[#111827]"
          />
        </label>
        <label className="text-xs font-semibold text-[#6b7280]">
          Reason (optional, not shown to the student)
          <input
            type="text"
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#d0d5dd] bg-white px-3 py-2 text-sm font-normal text-[#111827]"
          />
        </label>
      </div>
      {error ? <p className="mt-2 text-sm font-medium text-[#b91c1c]">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-[#0b1d3a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#13294d] disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null} Save marks
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="rounded-md border border-[#d0d5dd] px-3 py-1.5 text-xs font-semibold text-[#374151] transition hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function TaskCard({
  task,
  canChangeMarks,
  onSaved,
}: {
  task: AttemptReviewTask
  canChangeMarks: boolean
  onSaved: (review: AttemptReview) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const meta = STATUS_META[task.status]
  const notAnswered = task.status === "not_answered"
  const notes = [
    task.changed_after_check ? "The student changed this answer after their last Check Answer." : "",
    task.hint_used ? "Used the hint." : "",
  ].filter(Boolean)

  return (
    <article className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#6b7280]">
            Task {task.position}
            {task.stage ? ` · ${task.stage}` : ""}
            {task.must_use_formula ? " · Formula required" : ""}
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-[#111827]">{task.prompt}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-[#6b7280]">
            {task.marks} / {task.max_marks} marks
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
            <meta.Icon size={14} aria-hidden="true" /> {meta.label}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-[#e6e8eb] p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Student's answer</h3>
          <dl>
            <Row label="Typed">
              <span className="font-mono">{task.student_input || "—"}</span>
            </Row>
            <Row label="Result">
              <span className="font-mono font-semibold">{task.student_display || "—"}</span>{" "}
              <Match ok={task.value_correct} hidden={notAnswered} />
            </Row>
            <Row label="Format">
              {notAnswered ? "—" : task.student_format_label}{" "}
              <Match ok={task.format_correct} hidden={notAnswered} />
            </Row>
          </dl>
        </div>
        <div className="rounded-md border border-[#e6e8eb] bg-[#f9fafb] p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Correct answer</h3>
          <dl>
            <Row label="Formula">
              <span className="font-mono">{task.expected_formula}</span>
            </Row>
            <Row label="Result">
              <span className="font-mono font-semibold">{task.expected_display}</span>
            </Row>
            <Row label="Format">{task.expected_format_label}</Row>
          </dl>
        </div>
      </div>

      <p className="mt-3 text-sm text-[#374151]">{task.reason}</p>
      {notes.length ? <p className="mt-1 text-xs text-[#92702a]">{notes.join(" ")}</p> : null}

      {task.marks_changes.length ? (
        <ul className="mt-3 space-y-1 border-t border-[#eef2f7] pt-3 text-xs text-[#374151]">
          {task.marks_changes.map((change) => (
            <li key={change.changed_at}>
              Marks changed from {change.original_marks} to {change.new_marks} by {change.changed_by ?? "a deleted user"} on{" "}
              {new Date(change.changed_at).toLocaleString()}
              {change.note ? `. Reason: ${change.note}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {canChangeMarks && task.task_result_id !== null ? (
        isEditing ? (
          <MarksEditor task={task} onSaved={onSaved} onClose={() => setIsEditing(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="mt-3 inline-flex rounded-md border border-[#0b1d3a] px-3 py-1.5 text-xs font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
          >
            Change marks
          </button>
        )
      ) : null}
    </article>
  )
}

/** One student's spreadsheet answers next to the correct ones. */
export default function FacultySimulationAttempt() {
  const { attemptId } = useParams()
  const [data, setData] = useState<AttemptReview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    getSimulationAttemptReview(Number(attemptId))
      .then((result) => {
        if (isMounted) setData(result)
      })
      .catch(() => {
        if (isMounted) setError("Unable to load this attempt.")
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [attemptId])

  return (
    <FacultyLayout>
      <div className="space-y-5">
        {data ? (
          <div>
            <Link
              to={`/faculty/simulations/${data.simulation.id}/results`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#6b7280] transition hover:text-[#111827]"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to results
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-[#111827]">{data.student_name}</h1>
            <p className="mt-1 text-sm text-[#6b7280]">
              {[data.simulation.title, data.college_id, data.status === "submitted" ? "Submitted" : "In progress"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-medium text-[#b91c1c]">{error}</div>
        ) : null}
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-[#6b7280]">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading answers...
          </p>
        ) : null}

        {data ? (
          <>
            <section className="grid grid-cols-2 gap-3 rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:grid-cols-4">
              {[
                ["Correct", data.correct],
                ["Incorrect", data.incorrect],
                ["Not answered", data.not_answered],
                ["Marks", `${data.marks} / ${data.max_marks}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-[#6b7280]">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[#111827]">{value}</p>
                </div>
              ))}
              <p className="col-span-full text-xs text-[#6b7280]">
                Dataset seed: {data.seed}
                {data.status === "in_progress" ? " · Marks become final when the student finishes." : ""}
              </p>
            </section>
            {data.tasks.map((task) => (
              <TaskCard key={task.task_id} task={task} canChangeMarks={data.status === "submitted"} onSaved={setData} />
            ))}
          </>
        ) : null}
      </div>
    </FacultyLayout>
  )
}

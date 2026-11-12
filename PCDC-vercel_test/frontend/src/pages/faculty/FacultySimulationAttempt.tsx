import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, MinusCircle, RotateCcw, UserCheck, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import {
  changeTaskMarks,
  getSimulationAttemptReview,
  rescoreMemo,
  type AttemptReview,
  type AttemptReviewDeck,
  type AttemptReviewMemo,
  type AttemptReviewTask,
  type MarksChange,
  type MemoStatus,
  type ReviewStatus,
} from "../../api/jobsim"
import { apiErrorDetail } from "../../components/bank/shared"
import MemoView from "../../components/jobsim/MemoView"
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
  task: Pick<AttemptReviewTask, "marks" | "max_marks" | "task_result_id">
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

function MarksHistory({ changes }: { changes: MarksChange[] }) {
  if (!changes.length) return null
  return (
    <ul className="mt-3 space-y-1 border-t border-[#eef2f7] pt-3 text-xs text-[#374151]">
      {changes.map((change) => (
        <li key={change.changed_at}>
          Marks changed from {change.original_marks} to {change.new_marks} by {change.changed_by ?? "a deleted user"} on{" "}
          {new Date(change.changed_at).toLocaleString()}
          {change.note ? `. Reason: ${change.note}` : ""}
        </li>
      ))}
    </ul>
  )
}

const MEMO_META: Record<MemoStatus, { label: string; className: string; Icon: typeof Clock }> = {
  not_started: { label: "Not submitted yet", className: "bg-[#f2f4f7] text-[#475467]", Icon: MinusCircle },
  pending: { label: "AI scoring pending", className: "bg-[#fff7df] text-[#92702a]", Icon: Clock },
  review: { label: "Needs your marks", className: "bg-[#eff4ff] text-[#1d4ed8]", Icon: UserCheck },
  delayed: { label: "Scoring delayed", className: "bg-[#fff5f5] text-[#b42318]", Icon: AlertTriangle },
  scored: { label: "Marked", className: "bg-[#ecfdf3] text-[#067647]", Icon: CheckCircle2 },
}

const sectionKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase()

function memoHeadings(memo: AttemptReviewMemo) {
  const found = new Set<string>()
  const walk = (node: AttemptReviewMemo["doc"]) => {
    if (!node) return
    if (node.type === "heading") found.add(sectionKey((node.content ?? []).map((c) => c.text ?? "").join("")))
    node.content?.forEach(walk)
  }
  walk(memo.doc)
  return found
}

function MemoCard({
  memo,
  canChangeMarks,
  onSaved,
}: {
  memo: AttemptReviewMemo
  canChangeMarks: boolean
  onSaved: (review: AttemptReview) => void
}) {
  const headings = memoHeadings(memo)
  return (
    <WrittenCard
      memo={memo}
      label="Memo"
      noun="memo"
      canChangeMarks={canChangeMarks}
      onSaved={onSaved}
      work={
        <div className="rounded-md border border-[#e6e8eb] p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Student's memo</h3>
            <span className="text-xs text-[#6b7280]">
              {memo.word_count} words{memo.min_words ? ` (minimum ${memo.min_words})` : ""}
            </span>
          </div>
          {memo.required_sections.length ? (
            <p className="mb-3 flex flex-wrap gap-1.5 text-xs">
              {memo.required_sections.map((name) => {
                const ok = headings.has(sectionKey(name))
                return (
                  <span
                    key={name}
                    className={`rounded-full px-2 py-0.5 font-semibold ${ok ? "bg-[#ecfdf3] text-[#067647]" : "bg-[#fff5f5] text-[#b42318]"}`}
                  >
                    {ok ? "✓" : "✗"} {name}
                  </span>
                )
              })}
            </p>
          ) : null}
          <div className="max-h-[480px] overflow-y-auto">
            <MemoView doc={memo.doc} />
          </div>
        </div>
      }
    />
  )
}

function DeckCard({
  deck,
  canChangeMarks,
  onSaved,
}: {
  deck: AttemptReviewDeck
  canChangeMarks: boolean
  onSaved: (review: AttemptReview) => void
}) {
  return (
    <WrittenCard
      memo={deck}
      label="Slides"
      noun="deck"
      canChangeMarks={canChangeMarks}
      onSaved={onSaved}
      work={
        <div className="rounded-md border border-[#e6e8eb] p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Student's slides</h3>
            <span className="text-xs text-[#6b7280]">
              {deck.slides.length} {deck.slides.length === 1 ? "slide" : "slides"}
              {deck.min_slides > 1 ? ` (minimum ${deck.min_slides})` : ""}
            </span>
          </div>
          {deck.slides.length ? (
            <ol className="max-h-[480px] space-y-2 overflow-y-auto">
              {deck.slides.map((slide, i) => (
                <li key={i} className="rounded-md border border-[#e6e8eb] border-l-4 border-l-[#0b1d3a] bg-white p-3">
                  <p className="text-[11px] font-semibold text-[#6b7280]">
                    Slide {i + 1}
                    {deck.slide_plan[i] && deck.slide_plan[i].title !== slide.title ? ` · planned as "${deck.slide_plan[i].title}"` : ""}
                  </p>
                  <h4 className="mt-0.5 text-sm font-semibold text-[#0b1d3a]">{slide.title || "Untitled"}</h4>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[#374151]">
                    {slide.points.filter((point) => point.trim()).map((point, j) => (
                      <li key={j}>{point}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[#6b7280]">No slides were saved.</p>
          )}
        </div>
      }
    />
  )
}

/** A memo or deck: the student's work, the AI's marking and the faculty controls. */
function WrittenCard({
  memo,
  label,
  noun,
  work,
  canChangeMarks,
  onSaved,
}: {
  memo: AttemptReviewMemo | AttemptReviewDeck
  label: string
  noun: string
  work: ReactNode
  canChangeMarks: boolean
  onSaved: (review: AttemptReview) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isRescoring, setIsRescoring] = useState(false)
  const [error, setError] = useState("")
  const meta = MEMO_META[memo.status]
  const markedBy =
    memo.status !== "scored"
      ? ""
      : memo.marked_by === "faculty"
        ? "Marked by faculty"
        : memo.marked_by === "ai"
          ? "Marked by AI"
          : `Blank ${noun}: 0 marks`

  async function rescore() {
    setIsRescoring(true)
    setError("")
    try {
      onSaved(await rescoreMemo(memo.task_result_id as number))
    } catch (rescoreError) {
      setError(apiErrorDetail(rescoreError, "Unable to start scoring again."))
    } finally {
      setIsRescoring(false)
    }
  }

  return (
    <article className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#6b7280]">
            Task {memo.position}
            {memo.stage ? ` · ${memo.stage}` : ""} · {label}
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-[#111827]">{memo.prompt}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-[#6b7280]">
            {memo.status === "scored" ? memo.marks : "—"} / {memo.max_marks} marks
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
            <meta.Icon size={14} aria-hidden="true" /> {meta.label}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {work}

        <div className="rounded-md border border-[#e6e8eb] bg-[#f9fafb] p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">AI marking</h3>
          {memo.ai_criteria.length ? (
            <ul className="space-y-3">
              {memo.ai_criteria.map((criterion) => (
                <li key={criterion.name} className="text-sm">
                  <p className="flex justify-between gap-3 font-semibold text-[#111827]">
                    <span>{criterion.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {criterion.score} / {criterion.max}
                    </span>
                  </p>
                  {criterion.reason ? <p className="mt-0.5 text-[#374151]">{criterion.reason}</p> : null}
                  {criterion.evidence ? (
                    <blockquote className="mt-1 border-l-2 border-[#c9a227] pl-2 text-xs italic text-[#6b7280]">
                      “{criterion.evidence}”
                    </blockquote>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ul className="space-y-1 text-sm text-[#374151]">
                {memo.rubric.map((criterion) => (
                  <li key={criterion.name} className="flex justify-between gap-3">
                    <span>{criterion.name}</span>
                    <span className="shrink-0 tabular-nums text-[#6b7280]">out of {criterion.max}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-[#6b7280]">
                {memo.status === "pending"
                  ? `The AI hasn't marked this ${noun} yet. This usually takes under a minute.`
                  : memo.status === "delayed"
                    ? "The AI couldn't be reached after several tries. Try again, or set the marks yourself."
                    : memo.status === "review"
                      ? "The AI's marking didn't pass the checks, so it wasn't used. Set the marks yourself, or try again."
                      : memo.status === "not_started"
                        ? `The student hasn't submitted this ${noun} yet.`
                        : "There was nothing to mark."}
              </p>
            </>
          )}
          {memo.ai_feedback ? (
            <div className="mt-3 border-t border-[#e6e8eb] pt-3">
              <p className="text-xs font-semibold text-[#6b7280]">Feedback shown to the student</p>
              <p className="mt-1 text-sm leading-6 text-[#374151]">{memo.ai_feedback}</p>
            </div>
          ) : null}
          {memo.status === "review" && memo.ai_problems.length ? (
            <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-[#6b7280]">
              {memo.ai_problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {markedBy ? <p className="mt-3 text-xs text-[#6b7280]">{markedBy}</p> : null}
      {error ? <p className="mt-2 text-sm font-medium text-[#b91c1c]">{error}</p> : null}
      <MarksHistory changes={memo.marks_changes} />

      <div className="mt-3 flex flex-wrap gap-2">
        {canChangeMarks && memo.can_rescore && memo.task_result_id !== null && !isEditing ? (
          <button
            type="button"
            onClick={() => void rescore()}
            disabled={isRescoring}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#d0d5dd] px-3 py-1.5 text-xs font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:opacity-60"
          >
            {isRescoring ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />}
            Try AI scoring again
          </button>
        ) : null}
        {canChangeMarks && memo.task_result_id !== null && !isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex rounded-md border border-[#0b1d3a] px-3 py-1.5 text-xs font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
          >
            {memo.status === "scored" ? "Change marks" : "Set marks"}
          </button>
        ) : null}
      </div>
      {isEditing ? (
        <MarksEditor
          task={{ ...memo, marks: memo.status === "scored" ? memo.marks : 0 }}
          onSaved={onSaved}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </article>
  )
}

/** One student's spreadsheet answers next to the correct ones, then their memos and slides. */
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
            {data.memos.map((memo) => (
              <MemoCard key={memo.task_id} memo={memo} canChangeMarks={data.status === "submitted"} onSaved={setData} />
            ))}
            {(data.decks ?? []).map((deck) => (
              <DeckCard key={deck.task_id} deck={deck} canChangeMarks={data.status === "submitted"} onSaved={setData} />
            ))}
          </>
        ) : null}
      </div>
    </FacultyLayout>
  )
}

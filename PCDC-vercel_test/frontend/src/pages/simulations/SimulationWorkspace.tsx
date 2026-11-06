import { isAxiosError } from "axios"
import { CheckCheck, ChevronLeft, ChevronRight, Clock3, Lightbulb, LogOut, Monitor } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  finishJobsimAttempt,
  getJobsimAttempt,
  getJobsimHint,
  saveJobsimState,
  startJobsimAttempt,
  type CellFormat,
  type CheckResult,
  type JobsimAttempt,
  type JobsimTask,
  type SavedCell,
} from "../../api/jobsim"
import ConfirmDialog from "../../components/ConfirmDialog"
import AnswerCell from "../../components/jobsim/AnswerCell"
import DatasetGrid from "../../components/jobsim/DatasetGrid"

const AUTOSAVE_MS = 15_000
const MIN_WIDTH = 1024

function clock(seconds: number) {
  const s = Math.max(0, seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(sec).padStart(2, "0")
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function messageOf(error: unknown, fallback: string) {
  const detail = isAxiosError(error) ? error.response?.data?.detail : undefined
  return typeof detail === "string" ? detail : fallback
}

/**
 * The simulation workspace: the read-only data sheet on the left and the task
 * panel on the right. The server owns the timer, the answers and the marking;
 * this screen only shows them. Work autosaves every 15 seconds, on task change
 * and when the tab is hidden.
 */
export default function SimulationWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const simulationId = Number(id)

  const [attempt, setAttempt] = useState<JobsimAttempt | null>(null)
  const [loadError, setLoadError] = useState("")
  const [index, setIndex] = useState(0)
  const [cells, setCells] = useState<Record<string, SavedCell>>({})
  const [results, setResults] = useState<Record<number, JobsimTask["result"]>>({})
  const [hints, setHints] = useState<Record<number, string>>({})
  const [remaining, setRemaining] = useState(0)
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved")
  const [isWide, setIsWide] = useState(() => window.innerWidth >= MIN_WIDTH)
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishError, setFinishError] = useState("")

  const dirty = useRef<Record<string, SavedCell>>({})
  const deadline = useRef(0)
  const currentTaskId = useRef<number | null>(null)
  const savedTaskId = useRef<number | null>(null)

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= MIN_WIDTH)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    let isMounted = true
    startJobsimAttempt(simulationId)
      .then((data) => {
        if (!isMounted) return
        setAttempt(data)
        setCells(data.saved.cells)
        setResults(Object.fromEntries(data.tasks.map((t) => [t.id, t.result])))
        const resumeAt = data.tasks.findIndex((t) => t.id === data.saved.last_task_id)
        setIndex(resumeAt >= 0 ? resumeAt : 0)
        savedTaskId.current = data.saved.last_task_id
        deadline.current = Date.now() + data.remaining_seconds * 1000
        setRemaining(data.remaining_seconds)
      })
      .catch((error) => {
        if (isMounted) setLoadError(messageOf(error, "Unable to open this simulation."))
      })
    return () => {
      isMounted = false
    }
  }, [simulationId])

  // Time left for display only; the server enforces the deadline.
  useEffect(() => {
    if (!attempt) return
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, Math.round((deadline.current - Date.now()) / 1000)))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [attempt])

  const timeUp = Boolean(attempt) && remaining <= 0
  const submitted = Boolean(attempt) && attempt?.status !== "in_progress"
  const locked = timeUp || submitted
  const tasks = useMemo(() => attempt?.tasks ?? [], [attempt])

  // When the countdown reaches zero the server submits the attempt; fetch it
  // again to show that it was submitted, with the score.
  useEffect(() => {
    if (!timeUp || !attempt || attempt.status !== "in_progress") return
    const timer = window.setTimeout(() => {
      getJobsimAttempt(attempt.attempt_id)
        .then((data) => setAttempt((current) => (current ? { ...current, status: data.status, total_score: data.total_score } : current)))
        .catch(() => undefined)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [timeUp, attempt])
  const task = tasks[index]

  const flush = useCallback(async () => {
    if (!attempt || locked) return true
    const pending = dirty.current
    const taskId = currentTaskId.current
    if (!Object.keys(pending).length && taskId === savedTaskId.current) return true
    dirty.current = {}
    setSaveState("saving")
    try {
      await saveJobsimState(attempt.attempt_id, { cells: pending, last_task_id: taskId })
      savedTaskId.current = taskId
      setSaveState(Object.keys(dirty.current).length ? "unsaved" : "saved")
      return true
    } catch {
      dirty.current = { ...pending, ...dirty.current }
      setSaveState("error")
      return false
    }
  }, [attempt, locked])

  useEffect(() => {
    if (!attempt) return
    const timer = window.setInterval(() => void flush(), AUTOSAVE_MS)
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush()
    }
    document.addEventListener("visibilitychange", onHide)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [attempt, flush])

  // Remember the task position and save when switching tasks.
  useEffect(() => {
    if (!task) return
    if (currentTaskId.current !== null && currentTaskId.current !== task.id) {
      currentTaskId.current = task.id
      void flush()
    } else {
      currentTaskId.current = task.id
    }
  }, [task, flush])

  function onCellChange(taskId: number, input: string, format: CellFormat) {
    const cell = { input, format }
    dirty.current[String(taskId)] = cell
    setCells((current) => ({ ...current, [String(taskId)]: cell }))
    setSaveState("unsaved")
  }

  function onChecked(taskId: number, result: CheckResult) {
    // A check also saves the cell on the server.
    delete dirty.current[String(taskId)]
    if (!Object.keys(dirty.current).length) setSaveState("saved")
    setResults((current) => ({ ...current, [taskId]: result.status }))
  }

  async function showHint(taskId: number) {
    if (!attempt) return
    try {
      const { hint } = await getJobsimHint(attempt.attempt_id, taskId)
      setHints((current) => ({ ...current, [taskId]: hint ?? "There's no hint for this task." }))
    } catch (error) {
      setHints((current) => ({ ...current, [taskId]: messageOf(error, "Couldn't load the hint.") }))
    }
  }

  async function finish() {
    if (!attempt) return
    setIsConfirmingFinish(false)
    setIsFinishing(true)
    setFinishError("")
    try {
      // Marks come from the saved answers, so the last edits must be saved first.
      if (!(await flush())) throw new Error("not saved")
      await finishJobsimAttempt(attempt.attempt_id)
      navigate(`/student/simulations/${simulationId}/results`)
    } catch (error) {
      setFinishError(messageOf(error, "Couldn't finish. Your work is safe; please try again."))
      setIsFinishing(false)
    }
  }

  async function saveAndExit() {
    const ok = await flush()
    if (ok || locked) navigate(`/student/simulations/${simulationId}`)
  }

  if (!isWide) {
    return (
      <Centered>
        <Monitor className="mx-auto text-[#C9A227]" size={32} aria-hidden="true" />
        <h1 className="mt-3 text-lg font-semibold text-[#111827]">Please use a laptop or desktop</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Simulations need a larger screen (at least 1024 px wide). Open this page on a computer in Chrome or Edge.
        </p>
        <Link to="/student/simulations" className="mt-4 inline-block text-sm font-semibold text-[#92702A]">Back to My Simulations</Link>
      </Centered>
    )
  }
  if (loadError) {
    return (
      <Centered>
        <h1 className="text-lg font-semibold text-[#111827]">{loadError}</h1>
        <Link to="/student/simulations" className="mt-4 inline-block text-sm font-semibold text-[#92702A]">Back to My Simulations</Link>
      </Centered>
    )
  }
  if (!attempt || !task) {
    return <Centered><p className="text-sm text-[#6B7280]">Loading simulation...</p></Centered>
  }

  const correct = Object.values(results).filter((r) => r === "correct").length
  const filled = tasks.filter((t) => (cells[String(t.id)]?.input ?? "").trim()).length
  const saved = cells[String(task.id)]
  const lowTime = remaining > 0 && remaining <= 300
  // The clock counts up from 1 second; remaining still drives time-up.
  const totalSeconds = Math.round((Date.parse(attempt.deadline_at) - Date.parse(attempt.started_at)) / 1000)
  const elapsed = Math.min(totalSeconds, Math.max(1, totalSeconds - remaining))
  const unanswered = tasks.filter((t) => t.type === "spreadsheet" && !(cells[String(t.id)]?.input ?? "").trim()).length

  return (
    <div className="flex h-screen flex-col bg-[#F6F7F9]">
      <header className="flex items-center gap-4 bg-[#0B1D3A] px-5 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{attempt.simulation.title}</p>
          <p className="truncate text-xs text-white/60">{attempt.simulation.role}</p>
        </div>
        <span className="ml-auto text-xs text-white/70" aria-live="polite">
          {locked ? "Read only" : saveState === "saving" ? "Saving..." : saveState === "error" ? "Couldn't save, retrying" : saveState === "unsaved" ? "Unsaved changes" : "All work saved"}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-sm tabular-nums ${lowTime ? "bg-[#B42318]" : "bg-white/15"}`}
          aria-label={`Time used ${clock(elapsed)} of ${clock(totalSeconds)}`}
        >
          <Clock3 size={14} aria-hidden="true" /> {clock(elapsed)} / {clock(totalSeconds)}
        </span>
        {!locked ? (
          <button
            type="button"
            onClick={() => setIsConfirmingFinish(true)}
            disabled={isFinishing}
            className="inline-flex items-center gap-2 rounded-md bg-[#C9A227] px-3 py-1.5 text-sm font-semibold text-[#0B1D3A] transition hover:bg-[#E0B84E] disabled:opacity-60"
          >
            <CheckCheck size={15} aria-hidden="true" /> {isFinishing ? "Finishing..." : "Finish"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void saveAndExit()}
          className="inline-flex items-center gap-2 rounded-md border border-white/30 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10"
        >
          <LogOut size={15} aria-hidden="true" /> Save and Exit
        </button>
      </header>

      {submitted ? (
        <div className="bg-[#ECFDF3] px-5 py-2 text-sm font-medium text-[#067647]">
          {timeUp ? "Time is up. " : ""}This simulation has been submitted
          {attempt.total_score !== null
            ? `: spreadsheet score ${attempt.total_score} of ${tasks.filter((t) => t.type === "spreadsheet").reduce((sum, t) => sum + t.max_score, 0)}.`
            : "."}{" "}
          Your answers are shown read-only.{" "}
          <Link to={`/student/simulations/${simulationId}/results`} className="font-semibold underline">
            View results
          </Link>
        </div>
      ) : timeUp ? (
        <div className="bg-[#FFF5F5] px-5 py-2 text-sm font-medium text-[#B42318]">
          Time is up. Your saved answers are kept and editing is now locked.
        </div>
      ) : null}

      {finishError ? (
        <div className="bg-[#FFF5F5] px-5 py-2 text-sm font-medium text-[#B42318]">{finishError}</div>
      ) : null}
      {isConfirmingFinish ? (
        <ConfirmDialog
          title="Finish this simulation?"
          message={`${unanswered ? `${unanswered} ${unanswered === 1 ? "task has" : "tasks have"} no answer. ` : ""}You can't change your answers after finishing. Your marks come from the answers in your cells now.`}
          confirmLabel="Finish"
          cancelLabel="Keep working"
          danger={false}
          onConfirm={() => void finish()}
          onCancel={() => setIsConfirmingFinish(false)}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <main className="min-w-0 flex-1">
          <DatasetGrid columns={attempt.dataset.columns} rows={attempt.dataset.rows} />
        </main>

        <aside className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded-lg border border-[#E6EBEB] bg-white">
          <div className="border-b border-[#EEF2F6] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111827]">Task {index + 1} of {tasks.length}</p>
              {task.stage ? <p className="truncate pl-3 text-xs text-[#6B7280]">{task.stage}</p> : null}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF2F6]">
              <div className="h-full rounded-full bg-[#C9A227]" style={{ width: `${tasks.length ? (100 * correct) / tasks.length : 0}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-[#6B7280]">
              {correct} correct · {filled} filled · {tasks.length - filled} remaining
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5" role="list" aria-label="Tasks">
              {tasks.map((t, i) => {
                const result = results[t.id]
                const isFilled = (cells[String(t.id)]?.input ?? "").trim()
                const tone =
                  result === "correct"
                    ? "border-[#12B76A] bg-[#ECFDF3] text-[#067647]"
                    : result === "incorrect"
                      ? "border-[#F04438] bg-white text-[#B42318]"
                      : isFilled
                        ? "border-[#C9A227] bg-[#FFF7DF] text-[#92702A]"
                        : "border-[#E6EBEB] bg-white text-[#475467]"
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="listitem"
                    onClick={() => setIndex(i)}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={`Task ${i + 1}${result === "correct" ? ", correct" : result === "incorrect" ? ", incorrect" : ""}`}
                    className={`size-8 rounded-full border text-xs font-semibold transition ${tone} ${i === index ? "ring-2 ring-[#0B1D3A] ring-offset-1" : ""}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Question</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-[#111827]">{task.prompt}</p>
              {task.config.must_use_formula ? (
                <p className="mt-2 text-xs font-medium text-[#92702A]">Answer with a formula (start with =).</p>
              ) : null}
            </div>

            {task.type === "spreadsheet" ? (
              <AnswerCell
                key={task.id}
                attemptId={attempt.attempt_id}
                taskId={task.id}
                label={task.config.cell_label || `Answer cell for task ${index + 1}`}
                initialInput={saved?.input ?? ""}
                initialFormat={saved?.format ?? "general"}
                disabled={locked}
                onInputChange={(input, format) => onCellChange(task.id, input, format)}
                onChecked={(result) => onChecked(task.id, result)}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-[#E6EBEB] bg-[#F9FAFB] p-4 text-sm text-[#6B7280]">
                The {task.type === "memo" ? "memo" : "slide"} editor for this task is coming soon. Carry on with the spreadsheet tasks.
              </div>
            )}

            {hints[task.id] ? (
              <p className="rounded-lg bg-[#FFF7DF] p-3 text-sm text-[#5C4613]">
                <Lightbulb size={14} className="mr-1.5 inline text-[#C9A227]" aria-hidden="true" />
                {hints[task.id]}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-[#EEF2F6] p-4">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-[#E6EBEB] px-3 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#F6F7F9] disabled:opacity-40"
            >
              <ChevronLeft size={16} aria-hidden="true" /> Prev
            </button>
            <button
              type="button"
              onClick={() => void showHint(task.id)}
              disabled={!task.has_hint || locked || Boolean(hints[task.id])}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-[#E6EBEB] px-3 py-2 text-sm font-semibold text-[#92702A] transition hover:bg-[#FFF7DF] disabled:opacity-40"
            >
              <Lightbulb size={15} aria-hidden="true" /> Hint
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(tasks.length - 1, i + 1))}
              disabled={index === tasks.length - 1}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-[#0B1D3A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1B3452] disabled:opacity-40"
            >
              Next <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F7F9] p-6">
      <div className="max-w-md rounded-xl border border-[#E6EBEB] bg-white p-8 text-center shadow-sm">{children}</div>
    </div>
  )
}

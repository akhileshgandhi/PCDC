import { isAxiosError } from "axios"
import { ArrowLeft, Loader2, PencilRuler, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"

import { getFacultyTeaching } from "../../api/faculty"
import { getCapabilityOptions, getSimulationDraft, startSimulationDraft } from "../../api/jobsim"
import FacultyLayout from "../../layouts/FacultyLayout"

const POLL_MS = 3000
const LEVELS = ["Beginner", "Intermediate", "Advanced"]
const PROGRESS_STEPS = [
  "Writing the scenario and tasks",
  "Building the company dataset",
  "Calculating and checking every answer",
]

/**
 * Create a simulation: the AI Simulation Designer (brief in, checked draft
 * out) or a blank one built by hand.
 */
export default function FacultySimulationNew() {
  const navigate = useNavigate()
  const [role, setRole] = useState("")
  const [subject, setSubject] = useState("")
  const [semester, setSemester] = useState("")
  const [level, setLevel] = useState("Intermediate")
  const [duration, setDuration] = useState("60")
  const [taskCount, setTaskCount] = useState("10")
  const [notes, setNotes] = useState("")
  const [skills, setSkills] = useState<number[]>([])
  const [capabilities, setCapabilities] = useState<Array<{ id: number; name: string }>>([])
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>([])
  const [error, setError] = useState("")
  const [jobId, setJobId] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(0)

  useEffect(() => {
    getCapabilityOptions().then(setCapabilities).catch(() => undefined)
    getFacultyTeaching()
      .then((data) => setTeachingSubjects(Array.from(new Set(data.selections.map((s) => s.subject))).sort()))
      .catch(() => undefined)
  }, [])

  // Poll the draft job until it's done, then open the editor.
  useEffect(() => {
    if (jobId === null) return
    let stopped = false
    const tick = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000)
    const poll = async () => {
      try {
        const job = await getSimulationDraft(jobId)
        if (stopped) return
        if (job.status === "done" && job.simulation_id) {
          navigate(`/faculty/simulations/${job.simulation_id}`, { state: { dropped: job.dropped, fromAi: true } })
          return
        }
        if (job.status === "failed") {
          setError(job.error || "The AI couldn't produce a valid draft. Try again.")
          setJobId(null)
          return
        }
      } catch {
        // keep polling through a brief network blip
      }
      if (!stopped) window.setTimeout(poll, POLL_MS)
    }
    window.setTimeout(poll, POLL_MS)
    return () => {
      stopped = true
      window.clearInterval(tick)
    }
  }, [jobId, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!role.trim()) {
      setError("Enter the job role students will play.")
      return
    }
    try {
      const job = await startSimulationDraft({
        role: role.trim(),
        subject: subject.trim() || undefined,
        semester: semester ? Number(semester) : null,
        level,
        duration_minutes: Number(duration) || 60,
        task_count: Math.min(50, Math.max(1, Number(taskCount) || 10)),
        capability_ids: skills,
        notes: notes.trim() || undefined,
      })
      startedAt.current = Date.now()
      setElapsed(0)
      setJobId(job.job_id)
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
      setError(typeof detail === "string" ? detail : "Couldn't start the AI draft. Try again.")
    }
  }

  const field =
    "h-11 w-full rounded-md border border-[#e6e8eb] bg-white px-3 text-sm outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20 disabled:bg-[#f9fafb]"
  const isRunning = jobId !== null
  const step = Math.min(PROGRESS_STEPS.length - 1, Math.floor(elapsed / 12))

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <Link to="/faculty/simulations" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6b7280] hover:text-[#111827]">
          <ArrowLeft size={16} aria-hidden="true" /> My Simulations
        </Link>
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-semibold text-[#111827]">Create a spreadsheet simulation</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
            Describe the job and the AI drafts the scenario, the company's data columns and the tasks. The platform
            then builds the dataset and works out every correct answer itself; the AI never writes numbers or answers.
            You review and edit everything before approving it.
          </p>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#c9a227]" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-[#111827]">AI Simulation Designer</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Job role" required>
                <input className={field} value={role} disabled={isRunning} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Retail sales analyst" />
              </Field>
              <Field label="Subject">
                <input className={field} value={subject} disabled={isRunning} onChange={(e) => setSubject(e.target.value)} list="sim-subjects" placeholder="e.g. Business Analytics" />
                <datalist id="sim-subjects">
                  {teachingSubjects.map((s) => <option key={s} value={s} />)}
                </datalist>
              </Field>
              <Field label="Semester">
                <select className={field} value={semester} disabled={isRunning} onChange={(e) => setSemester(e.target.value)}>
                  <option value="">Any semester</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Semester {n}</option>)}
                </select>
              </Field>
              <Field label="Level">
                <select className={field} value={level} disabled={isRunning} onChange={(e) => setLevel(e.target.value)}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Time allowed (minutes)">
                <input className={field} type="number" min={10} max={300} value={duration} disabled={isRunning} onChange={(e) => setDuration(e.target.value)} />
              </Field>
              <Field label="Spreadsheet tasks (up to 50)">
                <input className={field} type="number" min={1} max={50} value={taskCount} disabled={isRunning} onChange={(e) => setTaskCount(e.target.value)} />
              </Field>
            </div>

            {capabilities.length ? (
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-[#111827]">Skills to assess</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {capabilities.map((c) => {
                    const on = skills.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={isRunning}
                        aria-pressed={on}
                        onClick={() => setSkills((cur) => (on ? cur.filter((id) => id !== c.id) : [...cur, c.id]))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          on ? "border-[#0b1d3a] bg-[#0b1d3a] text-white" : "border-[#e6e8eb] text-[#374151] hover:border-[#c9a227]"
                        }`}
                      >
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            <Field label="Anything specific? (optional)" className="mt-5">
              <textarea
                rows={3}
                value={notes}
                disabled={isRunning}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. An FMCG company in India; focus on regional sales, discounts and returns."
                className="w-full rounded-md border border-[#e6e8eb] px-3 py-2 text-sm outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              />
            </Field>

            {error ? <p className="mt-4 rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}

            {isRunning ? (
              <div className="mt-5 rounded-lg border border-[#e6e8eb] bg-[#f9fafb] p-4" role="status" aria-live="polite">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                  <Loader2 size={16} className="animate-spin text-[#c9a227]" aria-hidden="true" /> Creating your simulation… {elapsed}s
                </p>
                <ol className="mt-3 space-y-1.5 text-sm">
                  {PROGRESS_STEPS.map((label, i) => (
                    <li key={label} className={i < step ? "text-[#067647]" : i === step ? "font-semibold text-[#111827]" : "text-[#9ca3af]"}>
                      {i < step ? "✓ " : ""}{label}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-[#6b7280]">This usually takes under a minute. Stay on this page.</p>
              </div>
            ) : (
              <button
                type="submit"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#c9a227] px-5 py-3 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e]"
              >
                <Sparkles size={17} aria-hidden="true" /> Generate draft
              </button>
            )}
          </form>

          <aside className="h-fit rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PencilRuler size={18} className="text-[#c9a227]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-[#111827]">Build it yourself</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
              Upload your own data as a CSV file and write each task's question and answer formula by hand.
            </p>
            <Link
              to="/faculty/simulations/new/manual"
              className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-[#0b1d3a] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
            >
              Start from scratch
            </Link>
          </aside>
        </div>
      </div>
    </FacultyLayout>
  )
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={`grid gap-1.5 text-sm font-semibold text-[#111827] ${className}`}>
      <span>
        {label} {required ? <span className="text-[#d92d20]">*</span> : null}
      </span>
      {children}
    </label>
  )
}

import { isAxiosError } from "axios"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Ban,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"

import {
  CELL_FORMATS,
  approveAuthorSimulation,
  createAuthorSimulation,
  getAuthorSimulation,
  getCapabilityOptions,
  publishSimulation,
  generateSimulationQuestions,
  regenerateSimulationData,
  sendBackSimulation,
  testAuthorFormula,
  updateAuthorSimulation,
  withdrawSimulation,
  type AuthorSimulation,
  type AuthorTask,
  type CellEvaluation,
  type CellFormat,
  type SimulationDataset,
} from "../../api/jobsim"
import DatasetGrid from "../../components/jobsim/DatasetGrid"
import SimulationAssignments from "../../components/jobsim/SimulationAssignments"
import { parseDatasetCsv } from "../../components/jobsim/csv"
import AdminLayout from "../../layouts/AdminLayout"
import FacultyLayout from "../../layouts/FacultyLayout"
import { AUTHOR_STATUS, AuthorStatusBadge } from "./FacultySimulations"

interface EditableTask extends AuthorTask {
  key: string
}

const LEVELS = ["Beginner", "Intermediate", "Advanced"]
let keySeed = 0
const newKey = () => `t${++keySeed}`

function blankTask(): EditableTask {
  return {
    key: newKey(),
    type: "spreadsheet",
    stage: "",
    prompt: "",
    hint: "",
    config: { must_use_formula: true },
    max_score: 1,
    answer_formula: "=",
    expected_format: "general",
  }
}

const APPROVED_FUNCTIONS =
  "SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, COUNTIF, COUNTIFS, SUMIF, SUMIFS, AVERAGEIF, AVERAGEIFS, IF, IFERROR, AND, OR, ROUND, ROUNDUP, ROUNDDOWN, ABS, MEDIAN, STDEV, VLOOKUP, INDEX, MATCH"

function columnLetters(index: number) {
  let letters = ""
  let n = index + 1
  while (n > 0) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

function errorsFrom(err: unknown): string[] {
  if (!isAxiosError(err)) return ["Something went wrong. Try again."]
  const detail = err.response?.data?.detail
  if (typeof detail === "string") return [detail]
  if (detail && Array.isArray(detail.errors)) return [detail.message, ...detail.errors].filter(Boolean)
  return ["Something went wrong. Try again."]
}

/**
 * Review and edit a spreadsheet simulation: details, the dataset, and every
 * task's question, hint, answer formula and format. Each formula can be tested
 * on the data. Drafts are editable; approving re-checks every answer and sends
 * the simulation to an admin to publish.
 */
export default function FacultySimulationEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state ?? {}) as { dropped?: string[]; fromAi?: boolean }
  const simulationId = id ? Number(id) : null
  // Admins open the same editor from the publish queue and stay in the Admin Portal.
  const isAdminPortal = location.pathname.startsWith("/admin")
  const PortalLayout = isAdminPortal ? AdminLayout : FacultyLayout

  const [sim, setSim] = useState<AuthorSimulation | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(simulationId))
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [role, setRole] = useState("")
  const [level, setLevel] = useState("Intermediate")
  const [subject, setSubject] = useState("")
  const [semester, setSemester] = useState("")
  const [duration, setDuration] = useState("60")
  const [dataset, setDataset] = useState<SimulationDataset>({ columns: [], rows: [] })
  const [datasetUploaded, setDatasetUploaded] = useState(false)
  const [tasks, setTasks] = useState<EditableTask[]>(simulationId ? [] : [blankTask()])
  const [skills, setSkills] = useState<number[]>([])
  const [capabilities, setCapabilities] = useState<Array<{ id: number; name: string }>>([])
  const [tests, setTests] = useState<Record<string, CellEvaluation | "loading">>({})
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState(routeState.fromAi ? "Draft created by AI. Review every task, test the formulas, then approve." : "")
  const [busy, setBusy] = useState<"" | "save" | "approve" | "regenerate" | "publish" | "questions">("")
  const [isAskingAi, setIsAskingAi] = useState(false)
  const [questionCount, setQuestionCount] = useState("5")
  const [questionFocus, setQuestionFocus] = useState("")
  const [dirty, setDirty] = useState(!simulationId)
  const fileRef = useRef<HTMLInputElement>(null)

  function applySimulation(data: AuthorSimulation) {
    setSim(data)
    setTitle(data.title)
    setDescription(data.description ?? "")
    setRole(data.role ?? "")
    setLevel(data.level ?? "Intermediate")
    setSubject(data.subject ?? "")
    setSemester(data.semester ? String(data.semester) : "")
    setDuration(String(data.duration_minutes))
    setDataset(data.dataset)
    setDatasetUploaded(false)
    setTasks(data.tasks.map((t) => ({ ...t, key: newKey(), hint: t.hint ?? "", stage: t.stage ?? "" })))
    setSkills(data.skills.map((s) => s.id))
    setTests({})
    setDirty(false)
  }

  useEffect(() => {
    getCapabilityOptions().then(setCapabilities).catch(() => undefined)
    if (!simulationId) return
    getAuthorSimulation(simulationId)
      .then(applySimulation)
      .catch((err) => setErrors(errorsFrom(err)))
      .finally(() => setIsLoading(false))
  }, [simulationId])

  const readOnly = Boolean(sim && sim.status !== "draft")
  const touch = () => {
    setDirty(true)
    setNotice("")
  }

  function updateTask(key: string, patch: Partial<AuthorTask>) {
    setTasks((current) => current.map((t) => (t.key === key ? { ...t, ...patch } : t)))
    setTests((current) => {
      const { [key]: _drop, ...rest } = current
      return rest
    })
    touch()
  }

  function moveTask(index: number, delta: number) {
    setTasks((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    touch()
  }

  async function runTest(task: EditableTask) {
    setTests((current) => ({ ...current, [task.key]: "loading" }))
    try {
      const result = await testAuthorFormula(dataset, task.answer_formula ?? "", (task.expected_format ?? "general") as CellFormat)
      setTests((current) => ({ ...current, [task.key]: result }))
    } catch (err) {
      setTests((current) => {
        const { [task.key]: _drop, ...rest } = current
        return rest
      })
      setErrors(errorsFrom(err))
    }
  }

  async function generateQuestions() {
    setErrors([])
    setNotice("")
    setBusy("questions")
    try {
      const { tasks: generated, dropped } = await generateSimulationQuestions({
        dataset,
        count: Number(questionCount) || 5,
        title,
        description,
        role,
        subject,
        level,
        focus: questionFocus,
        existing: tasks.filter((t) => t.prompt.trim()).map(({ type, prompt, answer_formula }) => ({ type, prompt, answer_formula })),
      })
      if (!generated.length) {
        setErrors(["The AI couldn't write usable questions for this data. Try again or write them yourself.", ...dropped])
        return
      }
      // Empty tasks are dropped so the new questions don't sit below a blank one.
      setTasks((current) => [
        ...current.filter((t) => t.prompt.trim()),
        ...generated.map((t) => ({ ...t, key: newKey() })),
      ])
      touch()
      setIsAskingAi(false)
      setQuestionFocus("")
      setNotice(
        `Added ${generated.length} ${generated.length === 1 ? "question" : "questions"}. Review each one, edit anything you like, then save.` +
          (dropped.length ? ` ${dropped.length} didn't pass the checks and were left out.` : ""),
      )
    } catch (err) {
      setErrors(errorsFrom(err))
    } finally {
      setBusy("")
    }
  }

  async function onUpload(file: File) {
    try {
      const parsed = parseDatasetCsv(await file.text())
      setDataset(parsed)
      setDatasetUploaded(true)
      setTests({})
      touch()
      setNotice(`Loaded ${parsed.rows.length.toLocaleString("en-IN")} rows and ${parsed.columns.length} columns. Check each task's formula still points at the right columns, then save.`)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Couldn't read that file."])
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function payload() {
    return {
      title: title.trim(),
      description: description.trim() || null,
      role: role.trim() || null,
      level,
      subject: subject.trim() || null,
      semester: semester ? Number(semester) : null,
      duration_minutes: Number(duration) || 60,
      dataset,
      dataset_uploaded: datasetUploaded,
      capability_ids: skills,
      tasks: tasks.map(({ key: _key, id: _id, verified_at: _v, ...task }) => ({
        ...task,
        stage: task.stage?.trim() || null,
        hint: task.hint?.trim() || null,
      })),
    }
  }

  async function save(): Promise<AuthorSimulation | null> {
    setErrors([])
    if (!title.trim()) {
      setErrors(["Give the simulation a title."])
      return null
    }
    if (!dataset.columns.length) {
      setErrors(["Upload the data (a CSV file) before saving."])
      return null
    }
    setBusy("save")
    try {
      if (!sim) {
        const created = await createAuthorSimulation(payload())
        navigate(`/faculty/simulations/${created.id}`, { replace: true })
        return created
      }
      const updated = await updateAuthorSimulation(sim.id, payload())
      applySimulation(updated)
      setNotice("Draft saved. Every answer formula was checked on the data.")
      return updated
    } catch (err) {
      setErrors(errorsFrom(err))
      return null
    } finally {
      setBusy("")
    }
  }

  async function approve() {
    if (!sim) return
    const saved = dirty ? await save() : sim
    if (!saved) return
    setBusy("approve")
    try {
      applySimulation(await approveAuthorSimulation(saved.id))
      setNotice("Approved. An admin will review and publish it; you can then assign it to your sections.")
    } catch (err) {
      setErrors(errorsFrom(err))
    } finally {
      setBusy("")
    }
  }

  async function regenerate() {
    if (!sim) return
    setBusy("regenerate")
    setErrors([])
    try {
      applySimulation(await regenerateSimulationData(sim.id))
      setNotice("New numbers generated. The columns and tasks are the same, and every answer was re-calculated.")
    } catch (err) {
      setErrors(errorsFrom(err))
    } finally {
      setBusy("")
    }
  }

  async function adminAction(action: "publish" | "withdraw" | "send_back") {
    if (!sim) return
    let note: string | undefined
    if (action === "send_back") {
      const answer = window.prompt("Send this simulation back to the author as a draft. Add a note for them (optional):", "")
      if (answer === null) return
      note = answer
    } else if (action === "withdraw" && !window.confirm("Withdraw this simulation? Students who haven't started can no longer start it; anyone who started can still finish.")) {
      return
    }
    setBusy("publish")
    setErrors([])
    try {
      const run = action === "publish" ? publishSimulation : action === "withdraw" ? withdrawSimulation : (sid: number) => sendBackSimulation(sid, note)
      applySimulation(await run(sim.id))
      setNotice(
        action === "publish"
          ? "Published. Faculty can now assign it to their sections."
          : action === "withdraw"
            ? "Withdrawn. It can't be newly assigned or started."
            : "Sent back to the author as a draft.",
      )
    } catch (err) {
      setErrors(errorsFrom(err))
    } finally {
      setBusy("")
    }
  }

  const stageOptions = useMemo(
    () => Array.from(new Set(tasks.map((t) => (t.stage ?? "").trim()).filter(Boolean))),
    [tasks],
  )
  const input =
    "h-10 w-full rounded-md border border-[#e6e8eb] bg-white px-3 text-sm outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20 read-only:bg-[#f9fafb] disabled:bg-[#f9fafb]"

  if (isLoading) {
    return (
      <PortalLayout>
        <p className="py-16 text-center text-sm text-[#6b7280]">Loading simulation...</p>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout>
      <div className="space-y-5">
        <Link
          to={isAdminPortal ? "/admin/simulations" : "/faculty/simulations"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6b7280] hover:text-[#111827]"
        >
          <ArrowLeft size={16} aria-hidden="true" /> {isAdminPortal ? "Simulations" : "My Simulations"}
        </Link>

        <section className="flex flex-col gap-4 rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-semibold text-[#111827]">{sim ? sim.title : "New simulation"}</h1>
              {sim ? <AuthorStatusBadge status={sim.status} /> : null}
            </div>
            <p className="mt-1 text-sm text-[#6b7280]">
              {sim ? AUTHOR_STATUS[sim.status].note : "Upload your data, write the tasks, then save."}
              {dirty && !readOnly ? " · Unsaved changes" : ""}
            </p>
          </div>
          {!readOnly ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy !== ""}
                className="inline-flex items-center gap-2 rounded-md border border-[#0b1d3a] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white disabled:opacity-60"
              >
                {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save draft
              </button>
              {sim ? (
                <button
                  type="button"
                  onClick={() => void approve()}
                  disabled={busy !== ""}
                  className="inline-flex items-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:opacity-60"
                >
                  {busy === "approve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Approve
                </button>
              ) : null}
            </div>
          ) : isAdminPortal && sim ? (
            <div className="flex gap-2">
              {sim.status === "approved" ? (
                <button
                  type="button"
                  onClick={() => void adminAction("send_back")}
                  disabled={busy !== ""}
                  className="inline-flex items-center gap-2 rounded-md border border-[#e6e8eb] px-4 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f6f7fb] disabled:opacity-60"
                >
                  <Undo2 size={16} aria-hidden="true" /> Send back
                </button>
              ) : null}
              {sim.status === "approved" || sim.status === "withdrawn" ? (
                <button
                  type="button"
                  onClick={() => void adminAction("publish")}
                  disabled={busy !== ""}
                  className="inline-flex items-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:opacity-60"
                >
                  {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} aria-hidden="true" />} Publish
                </button>
              ) : null}
              {sim.status === "published" ? (
                <button
                  type="button"
                  onClick={() => void adminAction("withdraw")}
                  disabled={busy !== ""}
                  className="inline-flex items-center gap-2 rounded-md border border-[#fecaca] px-4 py-2.5 text-sm font-semibold text-[#b42318] transition hover:bg-[#fef2f2] disabled:opacity-60"
                >
                  {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} aria-hidden="true" />} Withdraw
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {notice ? <div className="rounded-lg border border-[#a6f4c5] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#067647]">{notice}</div> : null}
        {routeState.dropped?.length ? (
          <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            <p className="font-semibold">Some AI tasks failed the answer checks and were left out:</p>
            <ul className="mt-1 list-disc pl-5">{routeState.dropped.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
        ) : null}
        {errors.length ? (
          <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]" role="alert">
            <ul className="list-disc space-y-0.5 pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        ) : null}
        {sim && (sim.status === "published" || sim.status === "withdrawn") ? (
          <SimulationAssignments key={`${sim.id}-${sim.status}`} simulation={sim} canAssign={sim.status === "published"} />
        ) : null}

        <Card title="Details">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_2fr_1.3fr_1fr_1fr]">
            <Labeled label="Title" className="md:col-span-2 xl:col-span-5">
              <input className={input} readOnly={readOnly} value={title} onChange={(e) => { setTitle(e.target.value); touch() }} />
            </Labeled>
            <Labeled label="Scenario shown to students" className="md:col-span-2 xl:col-span-5">
              <textarea
                rows={3}
                readOnly={readOnly}
                value={description}
                onChange={(e) => { setDescription(e.target.value); touch() }}
                className="w-full rounded-md border border-[#e6e8eb] px-3 py-2 text-sm outline-none read-only:bg-[#f9fafb] focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              />
            </Labeled>
            <Labeled label="Job role">
              <input className={input} readOnly={readOnly} value={role} onChange={(e) => { setRole(e.target.value); touch() }} />
            </Labeled>
            <Labeled label="Subject">
              <input className={input} readOnly={readOnly} value={subject} onChange={(e) => { setSubject(e.target.value); touch() }} />
            </Labeled>
            <Labeled label="Level">
                <select className={input} disabled={readOnly} value={level} onChange={(e) => { setLevel(e.target.value); touch() }}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
            </Labeled>
            <Labeled label="Semester">
                <select className={input} disabled={readOnly} value={semester} onChange={(e) => { setSemester(e.target.value); touch() }}>
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
            </Labeled>
            <Labeled label="Minutes">
                <input className={input} type="number" min={10} max={300} readOnly={readOnly} value={duration} onChange={(e) => { setDuration(e.target.value); touch() }} />
            </Labeled>
          </div>
          {capabilities.length ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-[#111827]">Skills assessed</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {capabilities.map((c) => {
                  const on = skills.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={readOnly}
                      aria-pressed={on}
                      onClick={() => { setSkills((cur) => (on ? cur.filter((x) => x !== c.id) : [...cur, c.id])); touch() }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-default ${
                        on ? "border-[#0b1d3a] bg-[#0b1d3a] text-white" : "border-[#e6e8eb] text-[#374151] hover:border-[#c9a227]"
                      }`}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </Card>

        <Card
          title="Company data"
          subtitle={
            dataset.columns.length
              ? `${dataset.rows.length.toLocaleString("en-IN")} rows · ${dataset.columns.length} columns. Students see this read-only sheet; row 1 is the header, data starts at row 2.`
              : "Upload a CSV file: first row = column names, up to 2,000 rows and 30 columns."
          }
          action={
            readOnly ? null : (
              <div className="flex gap-2">
                {sim?.can_regenerate_dataset && !datasetUploaded ? (
                  <button
                    type="button"
                    onClick={() => void regenerate()}
                    disabled={busy !== "" || dirty}
                    title={dirty ? "Save your changes first" : "Same columns and tasks, new numbers"}
                    className="inline-flex items-center gap-2 rounded-md border border-[#e6e8eb] px-3 py-2 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#f6f7fb] disabled:opacity-50"
                  >
                    {busy === "regenerate" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} New numbers
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-md border border-[#e6e8eb] px-3 py-2 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#f6f7fb]"
                >
                  <Upload size={15} /> {dataset.columns.length ? "Replace with CSV" : "Upload CSV"}
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && void onUpload(e.target.files[0])} />
              </div>
            )
          }
        >
          {dataset.columns.length ? (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {dataset.columns.map((name, i) => (
                  <span key={name} className="rounded border border-[#e6e8eb] bg-[#f6f7fb] px-2 py-0.5 font-mono text-xs text-[#374151]">
                    <b className="text-[#0b1d3a]">{columnLetters(i)}</b> {name}
                  </span>
                ))}
                <span className="px-1 py-0.5 text-xs text-[#6b7280]">
                  e.g. the {dataset.columns[0]} column is {columnLetters(0)}2:{columnLetters(0)}{dataset.rows.length + 1}
                </span>
              </div>
              <div className="h-[340px]">
                <DatasetGrid columns={dataset.columns} rows={dataset.rows} />
              </div>
            </>
          ) : null}
        </Card>

        <Card
          title={`Tasks (${tasks.length})`}
          subtitle="Each task needs a question, the answer formula and the format the answer must use. Test each formula on the data; students never see formulas or answers."
          action={
            readOnly ? null : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAskingAi((open) => !open)}
                  disabled={!dataset.columns.length}
                  title={dataset.columns.length ? undefined : "Upload the data first"}
                  className="inline-flex items-center gap-2 rounded-md bg-[#c9a227] px-3 py-2 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles size={15} /> Generate with AI
                </button>
                <button
                  type="button"
                  onClick={() => { setTasks((cur) => [...cur, blankTask()]); touch() }}
                  className="inline-flex items-center gap-2 rounded-md border border-[#e6e8eb] px-3 py-2 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#f6f7fb]"
                >
                  <Plus size={15} /> Add task
                </button>
              </div>
            )
          }
        >
          <p className="mb-4 rounded-md bg-[#f6f7fb] px-3 py-2 text-xs leading-5 text-[#475467]">
            <b className="text-[#0b1d3a]">Answer formulas can use only these 25 functions:</b> {APPROVED_FUNCTIONS}.
          </p>
          {isAskingAi && !readOnly ? (
            <div className="mb-4 rounded-lg border border-[#e6e8eb] bg-[#f9fafb] p-4">
              <p className="text-sm text-[#374151]">
                The AI reads your details above and a summary of each column, not the rows. Its questions are checked, then added below for you to review and edit.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
                <Labeled label="How many">
                  <input
                    className={input}
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                  />
                </Labeled>
                <Labeled label="Focus (optional)">
                  <input
                    className={input}
                    value={questionFocus}
                    maxLength={500}
                    onChange={(e) => setQuestionFocus(e.target.value)}
                    placeholder="e.g. Regional sales and return rates"
                  />
                </Labeled>
              </div>
              <button
                type="button"
                onClick={() => void generateQuestions()}
                disabled={busy !== ""}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#0b1d3a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b3452] disabled:opacity-60"
              >
                {busy === "questions" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {busy === "questions" ? "Writing questions..." : "Generate questions"}
              </button>
            </div>
          ) : null}
          <datalist id="sim-stages">{stageOptions.map((s) => <option key={s} value={s} />)}</datalist>
          <ol className="space-y-4">
            {tasks.map((task, index) => {
              const test = tests[task.key]
              return (
                <li key={task.key} className="rounded-lg border border-[#e6e8eb] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0b1d3a] text-xs font-semibold text-white">{index + 1}</span>
                    <input
                      className={`${input} max-w-xs`}
                      list="sim-stages"
                      readOnly={readOnly}
                      placeholder="Stage, e.g. Understand the sales"
                      value={task.stage ?? ""}
                      onChange={(e) => updateTask(task.key, { stage: e.target.value })}
                      aria-label={`Task ${index + 1} stage`}
                    />
                    {task.type !== "spreadsheet" ? <span className="text-xs text-[#6b7280]">{task.type} task</span> : null}
                    {!readOnly ? (
                      <div className="ml-auto flex gap-1">
                        <IconButton label="Move up" disabled={index === 0} onClick={() => moveTask(index, -1)}><ArrowUp size={15} /></IconButton>
                        <IconButton label="Move down" disabled={index === tasks.length - 1} onClick={() => moveTask(index, 1)}><ArrowDown size={15} /></IconButton>
                        <IconButton label="Delete task" danger onClick={() => { setTasks((cur) => cur.filter((t) => t.key !== task.key)); touch() }}><Trash2 size={15} /></IconButton>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-3">
                    <Labeled label="Question">
                      <textarea
                        rows={2}
                        readOnly={readOnly}
                        value={task.prompt}
                        onChange={(e) => updateTask(task.key, { prompt: e.target.value })}
                        placeholder="e.g. What is the total revenue from the North region? Show it in rupees."
                        className="w-full rounded-md border border-[#e6e8eb] px-3 py-2 text-sm outline-none read-only:bg-[#f9fafb] focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
                      />
                    </Labeled>
                    <Labeled label="Hint (shown only if the student asks)">
                      <input className={input} readOnly={readOnly} value={task.hint ?? ""} onChange={(e) => updateTask(task.key, { hint: e.target.value })} />
                    </Labeled>
                    {task.type === "spreadsheet" ? (
                      <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-end">
                        <Labeled label="Answer formula (hidden from students)">
                          <input
                            className={`${input} font-mono`}
                            readOnly={readOnly}
                            spellCheck={false}
                            value={task.answer_formula ?? ""}
                            onChange={(e) => updateTask(task.key, { answer_formula: e.target.value })}
                            placeholder='=SUMIF(C2:C201,"North",G2:G201)'
                          />
                        </Labeled>
                        <Labeled label="Answer format">
                          <select
                            className={input}
                            disabled={readOnly}
                            value={task.expected_format ?? "general"}
                            onChange={(e) => updateTask(task.key, { expected_format: e.target.value as CellFormat })}
                          >
                            {CELL_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </Labeled>
                        <button
                          type="button"
                          onClick={() => void runTest(task)}
                          disabled={!dataset.columns.length || test === "loading"}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0b1d3a] px-4 text-sm font-semibold text-white transition hover:bg-[#1b3452] disabled:opacity-50"
                        >
                          {test === "loading" ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />} Test
                        </button>
                      </div>
                    ) : null}
                    {task.type === "spreadsheet" ? (
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <label className="inline-flex items-center gap-2 text-[#374151]">
                          <input
                            type="checkbox"
                            disabled={readOnly}
                            checked={Boolean(task.config.must_use_formula)}
                            onChange={(e) => updateTask(task.key, { config: { ...task.config, must_use_formula: e.target.checked } })}
                          />
                          Student must answer with a formula
                        </label>
                        {test && test !== "loading" ? (
                          <span className={test.error ? "text-[#b42318]" : "text-[#067647]"}>
                            Result: <b className="font-mono">{test.display || "(blank)"}</b>
                            {test.error ? ` · ${test.message}` : test.value_type !== "number" ? " · not a number" : ""}
                          </span>
                        ) : task.verified_at && !dirty ? (
                          <span className="inline-flex items-center gap-1 text-[#067647]"><CheckCircle2 size={14} /> Answer verified</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
          {tasks.length === 0 ? <p className="text-sm text-[#6b7280]">No tasks yet.</p> : null}
        </Card>
      </div>
    </PortalLayout>
  )
}

function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
          {subtitle ? <p className="mt-0.5 max-w-3xl text-sm text-[#6b7280]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Labeled({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`grid gap-1.5 text-sm font-semibold text-[#111827] ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-md border border-[#e6e8eb] transition disabled:opacity-40 ${
        danger ? "text-[#b42318] hover:border-[#b42318] hover:bg-[#fff5f5]" : "text-[#0b1d3a] hover:bg-[#f6f7fb]"
      }`}
    >
      {children}
    </button>
  )
}

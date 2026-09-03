import { Download, Edit3, Eye, FileUp, Rocket, Search, Send, Sparkles, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  deleteBankEntry,
  generateBankEntry,
  getBankAttachment,
  getBankEntries,
  getBankEntry,
  getBankMeta,
  type BankEntry,
  type BankEntryDetail,
  type BankMeta,
  type BankPublishResult,
} from "../../api/bank"
import { getCurrentUser } from "../../utils/auth"
import AssignToClassDialog from "../faculty/AssignToClassDialog"
import PublishCaseDialog from "./PublishCaseDialog"
import UploadCaseDialog from "./UploadCaseDialog"
import ViewCaseDialog from "./ViewCaseDialog"
import {
  ModalShell,
  SourceChip,
  apiErrorDetail,
  bankTheme,
  cardClass,
  errorBanner,
  formatDate,
  inputClass,
  labelClass,
  roleLabel,
  secondaryBtn,
  textareaClass,
  type BankVariant,
} from "./shared"

export default function CaseBankView({ variant }: { variant: BankVariant }) {
  const t = bankTheme[variant]
  const currentUser = getCurrentUser()
  const [entries, setEntries] = useState<BankEntry[]>([])
  const [meta, setMeta] = useState<BankMeta>({ subjects: [], semesters: [], difficulties: [], creators: [] })
  const [searchQuery, setSearchQuery] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("")
  const [semesterFilter, setSemesterFilter] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [creatorFilter, setCreatorFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [viewing, setViewing] = useState<BankEntryDetail | null>(null)
  const [publishing, setPublishing] = useState<BankEntryDetail | null>(null)
  const [assigning, setAssigning] = useState<BankEntry | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)

  const loadEntries = useCallback(async () => {
    try {
      const data = await getBankEntries({
        q: searchQuery || undefined,
        subject: subjectFilter || undefined,
        semester: semesterFilter ? Number(semesterFilter) : undefined,
        difficulty: difficultyFilter ? Number(difficultyFilter) : undefined,
        source: sourceFilter || undefined,
        creator: creatorFilter || undefined,
      })
      setEntries(data.items)
      setError("")
    } catch {
      setError("Could not load the case study bank.")
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, subjectFilter, semesterFilter, difficultyFilter, sourceFilter, creatorFilter])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  useEffect(() => {
    getBankMeta().then(setMeta).catch(() => undefined)
  }, [])

  const isAdmin = currentUser?.role === "admin"

  const canDelete = useCallback(
    (entry: BankEntry) =>
      currentUser?.role === "admin" ||
      (currentUser?.sub != null && entry.created_by === Number(currentUser.sub)),
    [currentUser],
  )

  async function openView(entry: BankEntry) {
    try {
      setViewing(await getBankEntry(entry.id))
    } catch {
      setError("Could not load that entry.")
    }
  }

  async function openPublish(entry: BankEntry) {
    try {
      setPublishing(await getBankEntry(entry.id))
    } catch {
      setError("Could not load that entry.")
    }
  }

  async function handleDelete(entry: BankEntry) {
    if (!window.confirm(`Remove "${entry.title}" from the bank?`)) return
    try {
      await deleteBankEntry(entry.id)
      setNotice(`"${entry.title}" removed from the bank.`)
      void loadEntries()
    } catch {
      setError("Could not delete that entry.")
    }
  }

  async function handleDownload(entry: BankEntry) {
    try {
      const attachment = await getBankAttachment(entry.id)
      const link = document.createElement("a")
      link.href = `data:application/octet-stream;base64,${attachment.data}`
      link.download = attachment.name || "attachment"
      link.click()
    } catch {
      setError("Could not download the attachment.")
    }
  }

  const stats = useMemo(
    () => ({
      total: entries.length,
      uploaded: entries.filter((e) => e.source === "uploaded").length,
      ai: entries.filter((e) => e.source === "ai_generated").length,
      caseBuilder: entries.filter((e) => e.source === "case_builder").length,
    }),
    [entries],
  )

  function handlePublished(result: BankPublishResult) {
    setPublishing(null)
    const where = result.case_status === "published" ? "published live" : "saved as a draft in the Case Library"
    const bankNote = result.entry_visible_in_bank
      ? "The original entry stays in the bank."
      : "The entry is removed from the bank while this copy is live."
    const missing = result.missing_fields.length
      ? ` (publish blocked — complete: ${result.missing_fields.join(", ")})`
      : ""
    setNotice(`Case ${where}${missing}. ${bankNote}`)
    void loadEntries()
  }

  return (
    <div className="space-y-5">
      <section className={cardClass}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">Case Study Bank</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
              A shared library of already-published case studies from every faculty — assign any
              entry straight to a class. A case still in draft or admin review, or a fresh
              upload/AI draft that hasn't been published yet, won't appear here until it is.
            </p>
            <p className="mt-2 text-xs text-[#6b7280]">
              {stats.total} entries · {stats.caseBuilder} from Case Builder · {stats.uploaded} uploaded ·{" "}
              {stats.ai} AI generated
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setShowGenerate(true)}>
              <Sparkles size={16} aria-hidden="true" /> Generate with AI
            </button>
            <button type="button" className={t.primaryBtn} onClick={() => setShowUpload(true)}>
              <FileUp size={16} aria-hidden="true" /> Upload case study
            </button>
          </div>
        </div>
      </section>

      {error ? <div className={errorBanner.replace("mb-3 ", "")}>{error}</div> : null}
      {notice ? (
        <div className="rounded-lg border border-[#bdebdc] bg-[#f0fcf8] px-4 py-3 text-sm font-medium text-[#176b5a]">{notice}</div>
      ) : null}

      <section className={cardClass}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-1">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <select className={inputClass} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">All subjects</option>
            {meta.subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          <select className={inputClass} value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
            <option value="">All semesters</option>
            {meta.semesters.map((semester) => (
              <option key={semester} value={semester}>Semester {semester}</option>
            ))}
          </select>
          <select className={inputClass} value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
            <option value="">All difficulty</option>
            {meta.difficulties.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>{difficulty.label}</option>
            ))}
          </select>
          <select className={inputClass} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All sources</option>
            <option value="case_builder">Case Builder</option>
            <option value="uploaded">Uploaded</option>
            <option value="ai_generated">AI generated</option>
          </select>
          <select className={inputClass} value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)}>
            <option value="">All faculty</option>
            {meta.creators.map((creator) => (
              <option key={creator} value={creator}>{creator}</option>
            ))}
          </select>
        </div>
      </section>

      <section className={cardClass}>
        <div className="hidden gap-3 border-b border-[#eef2f7] pb-3 text-xs font-semibold uppercase tracking-wide text-[#6b7280] lg:grid lg:grid-cols-[1.5fr_0.75fr_0.55fr_0.7fr_0.85fr_1fr_1.5fr]">
          <span>Case study</span>
          <span>Subject</span>
          <span>Semester</span>
          <span>Difficulty</span>
          <span>Source</span>
          <span>Added by</span>
          <span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <p className="py-6 text-sm text-[#6b7280]">Loading the bank…</p>
        ) : entries.length === 0 ? (
          <p className="py-6 text-sm text-[#6b7280]">
            No case studies match — upload one or generate with AI.
          </p>
        ) : (
          <div className="divide-y divide-[#eef2f7]">
            {entries.map((entry) => (
              <div key={entry.id}
                className="grid gap-2 py-4 lg:grid-cols-[1.5fr_0.75fr_0.55fr_0.7fr_0.85fr_1fr_1.5fr] lg:items-center">
                <div>
                  {entry.linked_case_id ? (
                    <Link to={`/faculty/case-builder/${entry.linked_case_id}`}
                      className={`text-left text-sm font-semibold ${t.accentText} hover:underline`}>
                      {entry.title}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => void openView(entry)}
                      className={`text-left text-sm font-semibold ${t.accentText} hover:underline`}>
                      {entry.title}
                    </button>
                  )}
                  {entry.brief ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-[#6b7280]">{entry.brief}</p>
                  ) : null}
                </div>
                <span className="text-sm text-[#111827]">{entry.subject || "—"}</span>
                <span className="text-sm text-[#111827]">
                  {entry.semesters.length > 0 ? entry.semesters.map((s) => `Sem ${s}`).join(", ") : "—"}
                </span>
                <span className="inline-flex w-fit rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-semibold text-[#111827]">
                  {entry.difficulty_label}
                </span>
                <SourceChip source={entry.source} />
                <span className="text-sm text-[#111827]">
                  {entry.creator_name || "—"}
                  {entry.creator_role ? (
                    <span className="text-xs text-[#6b7280]"> ({roleLabel(entry.creator_role)})</span>
                  ) : null}
                  <span className="block text-xs text-[#6b7280]">{formatDate(entry.created_at)}</span>
                </span>
                <div className="flex items-center justify-end gap-1.5">
                  {entry.linked_case_id && entry.linked_case_published ? (
                    <button type="button" title="Assign to Class" onClick={() => setAssigning(entry)}
                      className={`${t.primaryBtn} !px-3.5 !py-2 whitespace-nowrap text-xs`}>
                      <Send size={13} aria-hidden="true" /> Assign to Class
                    </button>
                  ) : (
                    <button type="button" title="Publish into my Case Library" onClick={() => void openPublish(entry)}
                      className={`${t.primaryBtn} !px-3.5 !py-2 whitespace-nowrap text-xs`}>
                      <Rocket size={13} aria-hidden="true" /> Publish
                    </button>
                  )}
                  <div className="flex items-center gap-0.5">
                    {entry.linked_case_id ? (
                      <Link to={`/faculty/case-builder/${entry.linked_case_id}`}
                        title={isAdmin ? "Edit" : "View"}
                        className="rounded-md p-2 text-[#6b7280] transition hover:bg-[#f6f7fb] hover:text-[#111827]">
                        {isAdmin ? <Edit3 size={16} /> : <Eye size={16} />}
                      </Link>
                    ) : (
                      <button type="button" title="View" onClick={() => void openView(entry)}
                        className="rounded-md p-2 text-[#6b7280] transition hover:bg-[#f6f7fb] hover:text-[#111827]">
                        <Eye size={16} />
                      </button>
                    )}
                    {entry.has_attachment ? (
                      <button type="button" title={`Download ${entry.attachment_name ?? "attachment"}`}
                        onClick={() => void handleDownload(entry)}
                        className="rounded-md p-2 text-[#6b7280] transition hover:bg-[#f6f7fb] hover:text-[#111827]">
                        <Download size={16} />
                      </button>
                    ) : null}
                    {canDelete(entry) ? (
                      <button type="button" title="Delete" onClick={() => void handleDelete(entry)}
                        className="rounded-md p-2 text-[#b42318] transition hover:bg-[#fff5f5]">
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {viewing ? (
        <ViewCaseDialog entry={viewing} variant={variant} onClose={() => setViewing(null)}
          onPublish={() => { setPublishing(viewing); setViewing(null) }} />
      ) : null}
      {showUpload ? (
        <UploadCaseDialog variant={variant} meta={meta}
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); setNotice("Case study added to the bank."); void loadEntries() }} />
      ) : null}
      {showGenerate ? (
        <GenerateDialog meta={meta} primaryBtn={t.primaryBtn}
          onClose={() => setShowGenerate(false)}
          onDone={(title) => { setShowGenerate(false); setNotice(`AI generated "${title}" — it's now in the bank.`); void loadEntries() }} />
      ) : null}
      {publishing ? (
        <PublishCaseDialog entry={publishing} variant={variant} meta={meta}
          onClose={() => setPublishing(null)} onDone={handlePublished} />
      ) : null}
      {assigning && assigning.linked_case_id ? (
        <AssignToClassDialog
          caseStudy={{ id: assigning.linked_case_id, title: assigning.title }}
          onClose={() => setAssigning(null)}
          onAssigned={(message) => { setAssigning(null); setNotice(message); setError("") }}
        />
      ) : null}
    </div>
  )
}

function GenerateDialog({ meta, primaryBtn, onClose, onDone }: {
  meta: BankMeta
  primaryBtn: string
  onClose: () => void
  onDone: (title: string) => void
}) {
  const [topic, setTopic] = useState("")
  const [subject, setSubject] = useState("")
  const [semester, setSemester] = useState("")
  const [difficulty, setDifficulty] = useState("2")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  async function handleGenerate() {
    setError("")
    setIsGenerating(true)
    try {
      const result = await generateBankEntry({
        topic: topic.trim() || undefined,
        subject: subject.trim() || undefined,
        semester_number: semester ? Number(semester) : null,
        difficulty: Number(difficulty),
      })
      onDone(result.title)
    } catch (generateError: unknown) {
      setError(apiErrorDetail(generateError, "AI generation failed — try again."))
      setIsGenerating(false)
    }
  }

  return (
    <ModalShell title="Generate a case study with AI" onClose={onClose}>
      {error ? <div className={errorBanner}>{error}</div> : null}
      <p className="mb-4 text-sm leading-6 text-[#6b7280]">
        The AI writes a complete case (situation, data, questions, model answers) for the mapped
        subject, semester and difficulty. It's stored in the shared bank, tagged
        <span className="font-semibold text-[#111827]"> AI generated</span> with your name.
      </p>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Topic / brief (optional)</label>
          <textarea className={textareaClass} value={topic}
            onChange={(e) => setTopic(e.target.value)} placeholder="e.g. a D2C brand facing rising customer-acquisition costs" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Subject</label>
            <input className={inputClass} list="bank-subjects-gen" value={subject}
              onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Marketing" />
            <datalist id="bank-subjects-gen">
              {meta.subjects.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Semester</label>
            <select className={inputClass} value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">Not set</option>
              {meta.semesters.map((item) => <option key={item} value={item}>Semester {item}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Difficulty</label>
            <select className={inputClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {meta.difficulties.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={secondaryBtn} onClick={onClose} disabled={isGenerating}>Cancel</button>
        <button type="button" className={primaryBtn} onClick={() => void handleGenerate()} disabled={isGenerating}>
          <Sparkles size={15} aria-hidden="true" /> {isGenerating ? "Generating… (up to a minute)" : "Generate"}
        </button>
      </div>
    </ModalShell>
  )
}

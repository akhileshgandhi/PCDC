import { Download, Edit3, Eye, FileUp, RotateCcw, Rocket, Search, Send, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import {
  deleteBankEntry,
  getBankAttachment,
  getBankEntries,
  getBankEntry,
  getBankMeta,
  restoreBankEntryCase,
  type BankEntry,
  type BankEntryDetail,
  type BankMeta,
  type BankPublishResult,
} from "../../api/bank"
import { publishFacultyCase } from "../../api/faculty"
import { getCurrentUser, isAdminRole } from "../../utils/auth"
import { Pager } from "../common/ListControls"
import AssignToClassDialog from "../faculty/AssignToClassDialog"
import BulkUploadCaseDialog from "../faculty/BulkUploadCaseDialog"
import PublishCaseDialog from "./PublishCaseDialog"
import ViewCaseDialog from "./ViewCaseDialog"
import {
  SourceChip,
  apiErrorDetail,
  bankTheme,
  cardClass,
  errorBanner,
  formatDate,
  inputClass,
  roleLabel,
  type BankVariant,
} from "./shared"

export default function CaseBankView({ variant }: { variant: BankVariant }) {
  const t = bankTheme[variant]
  const backTo = variant === "admin" ? "/admin/case-bank" : "/faculty/case-bank"
  const currentUser = getCurrentUser()
  const [entries, setEntries] = useState<BankEntry[]>([])
  const [meta, setMeta] = useState<BankMeta>({ subjects: [], semesters: [], difficulties: [], creators: [] })
  const [searchQuery, setSearchQuery] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("")
  const [semesterFilter, setSemesterFilter] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [creatorFilter, setCreatorFilter] = useState("")
  // Subject and faculty lists can run into the dozens, so these are a
  // type-to-filter search instead of a plain <select> — picking out one
  // name from a long list by scrolling was effectively unusable.
  const [subjectSearch, setSubjectSearch] = useState("")
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false)
  const subjectPickerRef = useRef<HTMLDivElement>(null)
  const [facultySearch, setFacultySearch] = useState("")
  const [facultyMenuOpen, setFacultyMenuOpen] = useState(false)
  const facultyPickerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [viewing, setViewing] = useState<BankEntryDetail | null>(null)
  const [publishing, setPublishing] = useState<BankEntryDetail | null>(null)
  const [assigning, setAssigning] = useState<BankEntry | null>(null)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

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
      setPage(1)
      setError("")
    } catch {
      setError("Could not load the case study bank.")
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, subjectFilter, semesterFilter, difficultyFilter, sourceFilter, creatorFilter])

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))
  const pagedEntries = entries.slice((page - 1) * pageSize, page * pageSize)

  function changePageSize(value: number) {
    setPageSize(value)
    setPage(1)
  }

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  useEffect(() => {
    getBankMeta().then(setMeta).catch(() => undefined)
  }, [])

  const filteredSubjects = meta.subjects.filter((subject) =>
    subject.toLowerCase().includes(subjectSearch.trim().toLowerCase()),
  )
  const filteredCreators = meta.creators.filter((creator) =>
    creator.toLowerCase().includes(facultySearch.trim().toLowerCase()),
  )

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (subjectPickerRef.current && !subjectPickerRef.current.contains(event.target as Node)) {
        setSubjectMenuOpen(false)
      }
      if (facultyPickerRef.current && !facultyPickerRef.current.contains(event.target as Node)) {
        setFacultyMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const isAdmin = isAdminRole(currentUser?.role)

  // Faculty never see a delete action in the Case Bank, even for cases they
  // authored themselves — only admins can remove entries from the shared bank,
  // and an Institute Admin only those created by their own faculty.
  const canDelete = useCallback(
    (entry: BankEntry) => isAdminRole(currentUser?.role) && entry.can_delete !== false,
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

  // An entry with a linked_case_id already has a real case behind it (e.g.
  // from bulk upload) — publishing it means publishing THAT case, not the
  // "publish this bank template into my own library" flow below, which
  // creates a brand-new duplicate case instead of touching the original.
  const [publishingLinkedId, setPublishingLinkedId] = useState<number | null>(null)

  async function publishLinkedCase(entry: BankEntry) {
    if (!entry.linked_case_id) return
    setPublishingLinkedId(entry.linked_case_id)
    setError("")
    try {
      await publishFacultyCase(entry.linked_case_id)
      setNotice(`Published "${entry.title}".`)
      void loadEntries()
    } catch (publishError: unknown) {
      setError(apiErrorDetail(publishError, "Publish failed."))
    } finally {
      setPublishingLinkedId(null)
    }
  }

  const [restoringId, setRestoringId] = useState<number | null>(null)

  async function handleRestore(entry: BankEntry) {
    const deletedBy = entry.case_deleted?.deleted_by_name || "its creator"
    if (
      !window.confirm(
        `Restore "${entry.title}" (deleted by ${deletedBy})? It goes back to ${entry.creator_name || "the creator"}'s Case Library with its content and status. Student attempts removed by the delete are not restored.`,
      )
    ) {
      return
    }
    setRestoringId(entry.id)
    setError("")
    try {
      await restoreBankEntryCase(entry.id)
      setNotice(`Restored "${entry.title}".`)
      void loadEntries()
    } catch (restoreError: unknown) {
      setError(apiErrorDetail(restoreError, "Could not restore that case."))
    } finally {
      setRestoringId(null)
    }
  }

  async function handleDelete(entry: BankEntry) {
    if (!window.confirm(`Remove "${entry.title}" from the bank?`)) return
    try {
      await deleteBankEntry(entry.id)
      setNotice(`"${entry.title}" removed from the bank.`)
      void loadEntries()
    } catch (deleteError: unknown) {
      setError(apiErrorDetail(deleteError, "Could not delete that entry."))
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
            {/* Case Bank is a pure browse/publish/assign view now — Generate
                with AI, Upload case study, and Bulk Upload all live only on
                My Case Library / Case Builder / Case Bank's own Bulk Upload
                (admin) elsewhere. Only Bulk Upload remains here, admin-only. */}
            {variant === "admin" ? (
              <button type="button" className={t.primaryBtn} onClick={() => setShowBulkUpload(true)}>
                <FileUp size={16} aria-hidden="true" /> Bulk Upload
              </button>
            ) : null}
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
          <div className="relative" ref={subjectPickerRef}>
            <input
              className={inputClass}
              value={subjectSearch}
              onChange={(event) => {
                setSubjectSearch(event.target.value)
                setSubjectFilter("")
                setSubjectMenuOpen(true)
              }}
              onFocus={() => setSubjectMenuOpen(true)}
              placeholder="All subjects"
              autoComplete="off"
            />
            {subjectMenuOpen ? (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-[#dde4ec] bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSubjectFilter("")
                    setSubjectSearch("")
                    setSubjectMenuOpen(false)
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-[#f5f7fa] ${
                    subjectFilter === "" ? "font-semibold text-[#1d4ed8]" : "text-[#17202a]"
                  }`}
                >
                  All subjects
                </button>
                {filteredSubjects.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[#667085]">No subject matches that search.</p>
                ) : (
                  filteredSubjects.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => {
                        setSubjectFilter(subject)
                        setSubjectSearch(subject)
                        setSubjectMenuOpen(false)
                      }}
                      className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-[#f5f7fa] ${
                        subject === subjectFilter ? "bg-[#eaf1fd] font-semibold text-[#1d4ed8]" : "text-[#17202a]"
                      }`}
                    >
                      {subject}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
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
          <div className="relative" ref={facultyPickerRef}>
            <input
              className={inputClass}
              value={facultySearch}
              onChange={(event) => {
                setFacultySearch(event.target.value)
                setCreatorFilter("")
                setFacultyMenuOpen(true)
              }}
              onFocus={() => setFacultyMenuOpen(true)}
              placeholder="All faculty"
              autoComplete="off"
            />
            {facultyMenuOpen ? (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-[#dde4ec] bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setCreatorFilter("")
                    setFacultySearch("")
                    setFacultyMenuOpen(false)
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-[#f5f7fa] ${
                    creatorFilter === "" ? "font-semibold text-[#1d4ed8]" : "text-[#17202a]"
                  }`}
                >
                  All faculty
                </button>
                {filteredCreators.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[#667085]">No faculty matches that search.</p>
                ) : (
                  filteredCreators.map((creator) => (
                    <button
                      key={creator}
                      type="button"
                      onClick={() => {
                        setCreatorFilter(creator)
                        setFacultySearch(creator)
                        setFacultyMenuOpen(false)
                      }}
                      className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-[#f5f7fa] ${
                        creator === creatorFilter ? "bg-[#eaf1fd] font-semibold text-[#1d4ed8]" : "text-[#17202a]"
                      }`}
                    >
                      {creator}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
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
            {pagedEntries.map((entry) => (
              <div key={entry.id}
                className="grid gap-2 py-4 lg:grid-cols-[1.5fr_0.75fr_0.55fr_0.7fr_0.85fr_1fr_1.5fr] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.linked_case_id ? (
                      <Link to={`${t.builderPath}/${entry.linked_case_id}`}
                        state={{ from: backTo, fromLabel: "Case Study Bank" }}
                        className={`text-left text-sm font-semibold ${t.accentText} hover:underline`}>
                        {entry.title}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => void openView(entry)}
                        className={`text-left text-sm font-semibold ${t.accentText} hover:underline`}>
                        {entry.title}
                      </button>
                    )}
                    {entry.case_deleted ? (
                      <span
                        title={`Deleted from the Case Library on ${formatDate(entry.case_deleted.deleted_at)}`}
                        className="rounded-full bg-[#fff5f5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b42318]"
                      >
                        Deleted by {entry.case_deleted.deleted_by_role === "faculty" ? "faculty" : "admin"}
                      </span>
                    ) : !entry.linked_case_published ? (
                      <span
                        title="Not published yet — only visible to admin"
                        className="rounded-full bg-[#fff7df] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#92702a]"
                      >
                        Draft
                      </span>
                    ) : null}
                  </div>
                  {entry.case_deleted ? (
                    <p className="mt-0.5 text-xs font-medium text-[#b42318]">
                      Deleted by {entry.case_deleted.deleted_by_name || "a removed user"}
                      {entry.case_deleted.deleted_by_role
                        ? ` (${roleLabel(entry.case_deleted.deleted_by_role)})`
                        : ""}{" "}
                      on {formatDate(entry.case_deleted.deleted_at)}
                    </p>
                  ) : null}
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
                  {entry.case_deleted ? (
                    canDelete(entry) ? (
                      <button type="button" title="Restore this case to its creator's Case Library"
                        onClick={() => void handleRestore(entry)}
                        disabled={restoringId === entry.id}
                        className={`${t.primaryBtn} !px-3.5 !py-2 whitespace-nowrap text-xs disabled:opacity-60`}>
                        <RotateCcw size={13} aria-hidden="true" />
                        {restoringId === entry.id ? "Restoring…" : "Restore"}
                      </button>
                    ) : null
                  ) : entry.linked_case_id && entry.linked_case_published ? (
                    <button type="button" title="Assign" onClick={() => setAssigning(entry)}
                      className={`${t.primaryBtn} !px-3.5 !py-2 whitespace-nowrap text-xs`}>
                      <Send size={13} aria-hidden="true" /> Assign
                    </button>
                  ) : entry.linked_case_id ? (
                    <button type="button" title="Publish this case" onClick={() => void publishLinkedCase(entry)}
                      disabled={publishingLinkedId === entry.linked_case_id}
                      className={`${t.primaryBtn} !px-3.5 !py-2 whitespace-nowrap text-xs disabled:opacity-60`}>
                      <Rocket size={13} aria-hidden="true" />
                      {publishingLinkedId === entry.linked_case_id ? "Publishing…" : "Publish"}
                    </button>
                  ) : (
                    <button type="button" title="Publish into my Case Library" onClick={() => void openPublish(entry)}
                      className={`${t.primaryBtn} !px-3.5 !py-2 whitespace-nowrap text-xs`}>
                      <Rocket size={13} aria-hidden="true" /> Publish
                    </button>
                  )}
                  <div className="flex items-center gap-0.5">
                    {entry.linked_case_id ? (
                      <Link to={`${t.builderPath}/${entry.linked_case_id}`}
                        state={{ from: backTo, fromLabel: "Case Study Bank" }}
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
        {entries.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-[#eef2f7] pt-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#667085]">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="h-9 rounded-md border border-[#dde4ec] bg-white px-2 text-sm font-medium text-[#17202a] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        <Pager page={page} totalPages={totalPages} total={entries.length} pageSize={pageSize} onPageChange={setPage} />
      </section>

      {viewing ? (
        <ViewCaseDialog entry={viewing} variant={variant} onClose={() => setViewing(null)}
          onPublish={() => { setPublishing(viewing); setViewing(null) }} />
      ) : null}
      {showBulkUpload ? (
        <BulkUploadCaseDialog
          onClose={() => setShowBulkUpload(false)}
          onDone={() => {
            setShowBulkUpload(false)
            setNotice("Bulk upload complete. New cases are saved as drafts for review before publishing.")
            void loadEntries()
          }}
        />
      ) : null}
      {publishing ? (
        <PublishCaseDialog entry={publishing} variant={variant} meta={meta}
          onClose={() => setPublishing(null)} onDone={handlePublished} />
      ) : null}
      {assigning && assigning.linked_case_id ? (
        <AssignToClassDialog
          caseStudy={{ id: assigning.linked_case_id, title: assigning.title }}
          onClose={() => setAssigning(null)}
          onAssigned={(message, hadNoEffect) => {
            setAssigning(null)
            if (hadNoEffect) {
              setError(message)
              setNotice("")
            } else {
              setNotice(message)
              setError("")
            }
          }}
        />
      ) : null}
    </div>
  )
}

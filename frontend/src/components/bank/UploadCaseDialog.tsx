import { useEffect, useState } from "react"

import { getBankMeta, uploadBankEntry, type BankMeta } from "../../api/bank"
import { getCurrentUser } from "../../utils/auth"
import {
  ModalShell,
  apiErrorDetail,
  bankTheme,
  errorBanner,
  inputClass,
  labelClass,
  secondaryBtn,
  textareaClass,
  type BankVariant,
} from "./shared"

/**
 * Global "Upload case study" dialog — the single popup used everywhere the app
 * offers a case-study upload (faculty Case Bank, admin Case Bank, faculty Case
 * Library, admin Case Import). Uploads land in the shared Case Study Bank with
 * the mapped subject / semester / difficulty fields.
 */
export default function UploadCaseDialog({ variant, meta, onClose, onDone }: {
  variant: BankVariant
  meta?: BankMeta
  onClose: () => void
  onDone: () => void
}) {
  const primaryBtn = bankTheme[variant].primaryBtn
  const [loadedMeta, setLoadedMeta] = useState<BankMeta>(
    meta ?? { subjects: [], semesters: [], difficulties: [], creators: [] },
  )
  const [title, setTitle] = useState("")
  const [brief, setBrief] = useState("")
  const [contentText, setContentText] = useState("")
  const [subject, setSubject] = useState("")
  const [semester, setSemester] = useState("")
  const [difficulty, setDifficulty] = useState("1")
  const [attachment, setAttachment] = useState<{ name: string; data: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!meta) {
      getBankMeta().then(setLoadedMeta).catch(() => undefined)
    }
  }, [meta])

  async function handleFile(file: File) {
    if (file.size > 4_000_000) {
      setError("File too large (max 4 MB).")
      return
    }
    setError("")
    if (/\.(txt|md|csv)$/i.test(file.name)) {
      const fileText = await file.text()
      setContentText((previous) => previous.trim() || fileText)
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const value = String(reader.result || "")
        resolve(value.includes(",") ? value.split(",")[1] : value)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setAttachment({ name: file.name, data: base64 })
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setError("")
    setIsSaving(true)
    try {
      await uploadBankEntry({
        title: title.trim(),
        brief: brief.trim() || undefined,
        content_text: contentText.trim() || undefined,
        subject: subject.trim() || undefined,
        semester_number: semester ? Number(semester) : null,
        difficulty: Number(difficulty),
        attachment_name: attachment?.name ?? null,
        attachment_data: attachment?.data ?? null,
      })
      onDone()
    } catch (uploadError: unknown) {
      setError(apiErrorDetail(uploadError, "Upload failed."))
      setIsSaving(false)
    }
  }

  const actingUser = getCurrentUser()

  return (
    <ModalShell title="Upload a case study to the bank" onClose={onClose} wide>
      {error ? <div className={errorBanner}>{error}</div> : null}
      {/* the bank attributes the entry to the CURRENT login token — surface it,
          since the newest login in any tab of this browser wins */}
      <p className="mb-4 rounded-md bg-[#f6f7fb] px-3 py-2 text-xs text-[#6b7280]">
        Will be added by:{" "}
        <span className="font-semibold text-[#111827]">
          {actingUser?.name ?? actingUser?.email ?? "your current login"}
        </span>
        {actingUser?.role ? <span className="capitalize"> ({actingUser.role})</span> : null}
        {" "}— if this isn't you, log in again before uploading.
      </p>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Credit Risk Review at a Retail Lender" />
        </div>
        <div>
          <label className={labelClass}>Document (optional — .txt/.md text is read in; any file is attached)</label>
          <label className="block cursor-pointer rounded-md border-2 border-dashed border-[#e6e8eb] px-4 py-5 text-center text-sm text-[#6b7280] transition hover:border-[#c9a227] hover:bg-[#fdfaf1]">
            <input type="file" className="hidden" accept=".txt,.md,.csv,.pdf,.docx"
              onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])} />
            {attachment ? `📎 ${attachment.name}` : "Click to choose a file (.pdf, .docx, .txt …)"}
          </label>
          {attachment ? (
            <button type="button" className="mt-1 text-xs font-semibold text-[#b42318]" onClick={() => setAttachment(null)}>
              Remove attachment
            </button>
          ) : null}
        </div>
        <div>
          <label className={labelClass}>Short overview / brief</label>
          <textarea className={textareaClass} value={brief}
            onChange={(e) => setBrief(e.target.value)} placeholder="One-paragraph overview shown in the bank listing…" />
        </div>
        <div>
          <label className={labelClass}>Case text (the situation students analyse)</label>
          <textarea className={`${textareaClass} min-h-[110px]`} value={contentText}
            onChange={(e) => setContentText(e.target.value)} placeholder="Paste or type the case body…" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Subject</label>
            <input className={inputClass} list="upload-bank-subjects" value={subject}
              onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Marketing Management" />
            <datalist id="upload-bank-subjects">
              {loadedMeta.subjects.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Semester</label>
            <select className={inputClass} value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">Not set</option>
              {loadedMeta.semesters.map((item) => <option key={item} value={item}>Semester {item}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Difficulty level</label>
            <select className={inputClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {loadedMeta.difficulties.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={secondaryBtn} onClick={onClose} disabled={isSaving}>Cancel</button>
        <button type="button" className={primaryBtn} onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Adding…" : "Add to bank"}
        </button>
      </div>
    </ModalShell>
  )
}

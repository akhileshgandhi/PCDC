import { AlertTriangle, Download, GraduationCap, KeyRound, Upload, UserPlus } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  adminAddStudent,
  adminBulkImportStudents,
  getAdminSections,
  type AdminAddStudentResult,
  type AdminSectionListItem,
} from "../../api/admin"
import AdminLayout from "../../layouts/AdminLayout"

export default function AdminStudents() {
  const [sections, setSections] = useState<AdminSectionListItem[]>([])
  const [loading, setLoading] = useState(true)

  const [sectionId, setSectionId] = useState("")
  const [name, setName] = useState("")
  const [scholar, setScholar] = useState("")
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [added, setAdded] = useState<AdminAddStudentResult[]>([])

  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [skipped, setSkipped] = useState<Array<{ row: number; name: string; reason: string }>>([])

  function loadSections() {
    return getAdminSections()
      .then((d) => setSections(d.items))
      .catch(() => undefined)
  }

  useEffect(() => {
    loadSections().finally(() => setLoading(false))
  }, [])

  const selectedSection = useMemo(
    () => sections.find((s) => String(s.id) === sectionId),
    [sections, sectionId],
  )

  async function submit() {
    if (!sectionId || !name.trim() || !scholar.trim()) {
      setError("Section, name and scholar number are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const result = await adminAddStudent({
        section_id: Number(sectionId),
        name: name.trim(),
        scholar_number: scholar.trim(),
        email: email.trim() || undefined,
      })
      setAdded((a) => [result, ...a])
      setName("")
      setScholar("")
      setEmail("")
      await loadSections()
    } catch {
      setError("Could not add this student. The email or scholar number may already exist.")
    } finally {
      setSaving(false)
    }
  }

  function downloadTemplate() {
    const csv = "name,scholar_number,email\nRiya Sharma,PIMR2024001,\n"
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "students-import-template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(file: File) {
    if (!sectionId) {
      setError("Choose a section before importing.")
      return
    }
    setImporting(true)
    setError("")
    try {
      const res = await adminBulkImportStudents(Number(sectionId), file)
      setAdded((a) => [...res.created, ...a])
      setSkipped(res.skipped)
      await loadSections()
    } catch {
      setError("Import failed. Check the file format and try again.")
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const field =
    "h-11 w-full rounded-md border border-[#dde4ec] bg-white px-3 text-sm outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
  const label = "grid gap-1.5 text-sm font-semibold text-[#17202a]"

  function sectionLabel(s: AdminSectionListItem) {
    return `${s.name} · ${s.course_name} · Sem ${s.semester_number} · ${s.batch_name} (${s.student_count})`
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-[#17202a]">Students</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
            Add students to the sections you created in Academic Setup. Create a single login, or
            import many at once, and hand out the credential slips.
          </p>
        </div>

        {loading ? (
          <section className="rounded-lg border border-[#eef2f7] bg-white p-8 text-center text-sm font-medium text-[#667085] shadow-sm">
            Loading…
          </section>
        ) : sections.length === 0 ? (
          <section className="rounded-lg border border-[#eef2f7] bg-white p-5 shadow-sm">
            <div className="rounded-lg border border-dashed border-[#dde4ec] px-5 py-12 text-center">
              <h3 className="text-base font-semibold text-[#17202a]">No sections yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-[#667085]">
                Create sections under Academic Setup first — students are always enrolled into a
                section.
              </p>
            </div>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-lg border border-[#eef2f7] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#17202a]">Add a student</h2>
              <p className="mt-1 text-sm text-[#667085]">
                A login is created and the student is enrolled into the chosen section.
              </p>
              <div className="mt-4 grid gap-4">
                <label className={label}>
                  <span>Section <span className="text-[#d92d20]">*</span></span>
                  <select
                    // Some browsers don't repaint a closed <select>'s displayed
                    // label when only an <option>'s text content changes (the
                    // student count in sectionLabel) without the value itself
                    // changing. Keying on the counts forces a clean remount so
                    // the visible label is never stale after adding students.
                    key={sections.map((s) => `${s.id}:${s.student_count}`).join(",")}
                    className={field}
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                  >
                    <option value="">Select section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {sectionLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  <span>Full name <span className="text-[#d92d20]">*</span></span>
                  <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya Sharma" />
                </label>
                <label className={label}>
                  <span>Scholar number <span className="text-[#d92d20]">*</span></span>
                  <input className={field} value={scholar} onChange={(e) => setScholar(e.target.value)} placeholder="PIMR2024001" />
                </label>
                <label className={label}>
                  Email (optional)
                  <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional — students log in with their scholar number" />
                </label>
                {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#102033] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1b3452] disabled:opacity-60"
                >
                  {saving ? "Adding…" : <><UserPlus size={16} aria-hidden="true" /> Add student</>}
                </button>
              </div>

              {/* Bulk import */}
              <div className="mt-6 border-t border-[#eef2f7] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#17202a]">Or import many</h3>
                    <p className="mt-0.5 text-xs text-[#667085]">
                      Upload a CSV to add students to the section selected above.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#0b5fff] hover:underline"
                  >
                    <Download size={14} aria-hidden="true" />
                    Template
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImport(f)
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={!sectionId || importing}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#102033] px-4 py-2.5 text-sm font-semibold text-[#102033] transition hover:bg-[#102033] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload size={15} aria-hidden="true" />
                  {importing ? "Importing…" : "Import CSV"}
                </button>
                {!sectionId ? (
                  <p className="mt-1.5 text-xs text-[#98a2b3]">Select a section first.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border border-[#eef2f7] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#17202a]">Credential slips</h2>
              <p className="mt-1 text-sm text-[#667085]">
                {selectedSection
                  ? `${selectedSection.name} currently has ${selectedSection.student_count} student(s). New logins below use the scholar number as the first password.`
                  : "Hand these to students. The scholar number is the first password; students set a new one on first sign-in."}
              </p>
              {skipped.length > 0 ? (
                <div className="mt-3 rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92702a]">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle size={15} aria-hidden="true" />
                    {skipped.length} row(s) skipped
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {skipped.slice(0, 8).map((s, i) => (
                      <li key={i}>
                        Row {s.row} ({s.name || "—"}): {s.reason}
                      </li>
                    ))}
                    {skipped.length > 8 ? <li>…and {skipped.length - 8} more</li> : null}
                  </ul>
                </div>
              ) : null}
              {added.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#98a2b3]">
                  Students you add in this session appear here with their login.
                </p>
              ) : (
                <div className="mt-4 grid gap-2">
                  {added.map((s, i) => (
                    <div key={i} className="rounded-md border border-[#eef2f7] bg-[#f9fafb] p-3">
                      <div className="flex items-center gap-2">
                        <KeyRound size={15} className="text-[#34c6a3]" aria-hidden="true" />
                        <p className="text-sm font-semibold text-[#17202a]">{s.name}</p>
                        <span className="text-xs text-[#98a2b3]">· {s.scholar_number}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#475467]">
                        Login: <span className="font-medium text-[#17202a]">{s.scholar_number}</span>
                        <span className="text-[#98a2b3]"> (scholar number)</span>
                      </p>
                      <p className="text-sm text-[#475467]">
                        Temporary password: <span className="font-mono font-medium text-[#17202a]">{s.password}</span>
                      </p>
                      {s.email ? (
                        <p className="text-sm text-[#475467]">
                          Email: <span className="font-medium text-[#17202a]">{s.email}</span>
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

import { isAxiosError } from "axios"
import { Download, FileUp, GraduationCap } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { updateAdminUserStatus } from "../../api/admin"
import {
  applyPromotions,
  downloadPromotionTemplate,
  getPromotionSection,
  getPromotionSections,
  importPromotions,
  type PromotionAction,
  type PromotionResult,
  type PromotionSection,
  type PromotionSectionDetail,
} from "../../api/promotion"
import ConfirmDialog from "../../components/ConfirmDialog"
import AdminLayout from "../../layouts/AdminLayout"
import { StatusBadge } from "./AdminUsers"

const ACTION_LABEL: Record<PromotionAction, string> = {
  promote: "Promote",
  repeat: "Repeat semester",
  graduate: "Graduate",
  exit: "Exit institute",
}

const fieldClass =
  "h-10 rounded-md border border-[#dde4ec] bg-white px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20 disabled:bg-[#f6f7fb] disabled:text-[#98a2b3]"

function detailOf(err: unknown, fallback: string) {
  const detail = isAxiosError(err) ? err.response?.data?.detail : undefined
  return typeof detail === "string" ? detail : fallback
}

function sectionLabel(s: PromotionSection) {
  return [s.institution_name, `${s.course_name} (${s.course_code})`, s.batch_name, `Semester ${s.semester_number}`, `Section ${s.name}`]
    .filter(Boolean)
    .join(" · ")
}

/** Promote, repeat, graduate or exit students: by section or by CSV. */
export default function AdminPromotion() {
  const [tab, setTab] = useState<"section" | "csv">("section")

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-[#17202a]">Semester Progression</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#667085]">
            Move students to their next semester, keep repeaters in their current section, and mark graduates or
            leavers. Students keep every case study they were given either way. Graduating or exiting makes the account
            inactive so they can't sign in. Nothing is deleted, and an admin can make them active again from All Users.
          </p>
        </div>
        <div className="flex gap-2">
          {(
            [
              ["section", "By section"],
              ["csv", "Bulk upload (CSV)"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                tab === value
                  ? "border-[#102033] bg-[#102033] text-white"
                  : "border-[#dde4ec] bg-white text-[#17202a] hover:border-[#102033]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "section" ? <BySection /> : <ByCsv />}
      </div>
    </AdminLayout>
  )
}

/* ------------------------------- By section ------------------------------- */

type RowPlan = { selected: boolean; action: PromotionAction; target: number | null }

function BySection() {
  const [sections, setSections] = useState<PromotionSection[]>([])
  const [sectionId, setSectionId] = useState("")
  const [detail, setDetail] = useState<PromotionSectionDetail | null>(null)
  const [plans, setPlans] = useState<Record<number, RowPlan>>({})
  const [bulkAction, setBulkAction] = useState<PromotionAction>("promote")
  const [bulkTarget, setBulkTarget] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<PromotionResult | null>(null)
  const [result, setResult] = useState<PromotionResult | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getPromotionSections()
      .then((d) => setSections(d.items))
      .catch(() => setError("Unable to load sections."))
  }, [])

  function loadSection(id: string) {
    setSectionId(id)
    setDetail(null)
    setPreview(null)
    setResult(null)
    setError("")
    if (!id) return
    setLoading(true)
    getPromotionSection(Number(id))
      .then((d) => {
        setDetail(d)
        setBulkAction(d.default_action)
        setBulkTarget(d.default_target_section_id)
        const next: Record<number, RowPlan> = {}
        d.students.forEach((s) => {
          next[s.student_id] = { selected: false, action: d.default_action, target: d.default_target_section_id }
        })
        setPlans(next)
      })
      .catch((err) => setError(detailOf(err, "Unable to load this section.")))
      .finally(() => setLoading(false))
  }

  const selectedIds = useMemo(
    () => Object.entries(plans).filter(([, p]) => p.selected).map(([id]) => Number(id)),
    [plans],
  )
  const allSelected = detail ? detail.students.length > 0 && selectedIds.length === detail.students.length : false

  function setPlan(id: number, patch: Partial<RowPlan>) {
    setPlans((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }))
    setPreview(null)
  }

  function applyToSelected() {
    setPlans((cur) => {
      const next = { ...cur }
      selectedIds.forEach((id) => {
        next[id] = { ...next[id], action: bulkAction, target: bulkAction === "promote" ? bulkTarget : null }
      })
      return next
    })
    setPreview(null)
  }

  function items() {
    return selectedIds.map((id) => ({
      student_id: id,
      action: plans[id].action,
      target_section_id: plans[id].action === "promote" ? plans[id].target : null,
    }))
  }

  async function runPreview() {
    if (selectedIds.length === 0) {
      setError("Select at least one student.")
      return
    }
    setBusy(true)
    setError("")
    setResult(null)
    try {
      setPreview(await applyPromotions(items(), true))
    } catch (err) {
      setError(detailOf(err, "Unable to check these changes."))
    } finally {
      setBusy(false)
    }
  }

  async function runApply() {
    setBusy(true)
    setError("")
    try {
      const done = await applyPromotions(items(), false)
      setPreview(null)
      setResult(done)
      const refreshed = await getPromotionSections()
      setSections(refreshed.items)
      // Reload the roster: promoted students have left this section.
      const d = await getPromotionSection(Number(sectionId))
      setDetail(d)
      const next: Record<number, RowPlan> = {}
      d.students.forEach((s) => {
        next[s.student_id] = { selected: false, action: d.default_action, target: d.default_target_section_id }
      })
      setPlans(next)
    } catch (err) {
      setError(detailOf(err, "Unable to apply these changes."))
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(userId: number, current: "active" | "inactive") {
    setError("")
    try {
      await updateAdminUserStatus(userId, current === "active" ? "inactive" : "active")
      const d = await getPromotionSection(Number(sectionId))
      setDetail(d)
    } catch (err) {
      setError(detailOf(err, "Unable to change this student's status."))
    }
  }

  const actionOptions = (isFinal: boolean) =>
    (Object.keys(ACTION_LABEL) as PromotionAction[]).map((a) => (
      <option key={a} value={a} disabled={(a === "promote" && isFinal) || (a === "graduate" && !isFinal)}>
        {ACTION_LABEL[a]}
      </option>
    ))

  const targetSelect = (value: number | null, onChange: (v: number | null) => void, disabled: boolean) => (
    <select
      className={`${fieldClass} min-w-40`}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{disabled ? "—" : "Choose section"}</option>
      {detail?.next_sections.map((n) => (
        <option key={n.id} value={n.id}>
          {n.semester_name} · Section {n.name}
          {n.batch_name ? ` (${n.batch_name})` : ""}
        </option>
      ))}
    </select>
  )

  return (
    <section className="space-y-4 rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
      <label className="grid gap-2 text-sm font-semibold text-[#17202a]">
        Section
        <select className={fieldClass} value={sectionId} onChange={(e) => loadSection(e.target.value)}>
          <option value="">Select a section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {sectionLabel(s)} ({s.student_count} students)
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
      {loading ? <p className="py-6 text-center text-sm text-[#667085]">Loading students...</p> : null}

      {detail && !loading ? (
        <>
          <div className="rounded-md border border-[#e0f2fe] bg-[#f0f9ff] px-3 py-2 text-sm text-[#075985]">
            {detail.is_final_semester
              ? `This is the final semester (${detail.semester_number} of ${detail.total_semesters}). Choose Graduate for students who completed, Repeat for those who did not.`
              : detail.next_sections.length
                ? `Promote moves students to Semester ${(detail.semester_number ?? 0) + 1}. Repeat keeps them in this section.`
                : `No section exists yet for Semester ${(detail.semester_number ?? 0) + 1}. Create one in Academic Setup → Sections before promoting.`}
          </div>

          {detail.students.length === 0 ? (
            <p className="rounded-md border border-dashed border-[#d0d5dd] py-8 text-center text-sm text-[#667085]">
              No active students in this section.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-2 rounded-md bg-[#f6f7fb] p-3">
                <span className="mr-auto self-center text-sm font-semibold text-[#17202a]">
                  {selectedIds.length} of {detail.students.length} selected
                </span>
                <select
                  className={fieldClass}
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value as PromotionAction)}
                  aria-label="Action for selected students"
                >
                  {actionOptions(detail.is_final_semester)}
                </select>
                {targetSelect(bulkTarget, setBulkTarget, bulkAction !== "promote")}
                <button
                  type="button"
                  onClick={applyToSelected}
                  disabled={selectedIds.length === 0}
                  className="h-10 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-semibold text-[#17202a] hover:border-[#102033] disabled:opacity-50"
                >
                  Set for selected
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          className="size-4"
                          aria-label="Select all"
                          checked={allSelected}
                          onChange={() =>
                            setPlans((cur) => {
                              const next = { ...cur }
                              Object.keys(next).forEach((id) => (next[Number(id)] = { ...next[Number(id)], selected: !allSelected }))
                              return next
                            })
                          }
                        />
                      </th>
                      <th className="px-3 py-3">Student</th>
                      <th className="px-3 py-3">Account</th>
                      <th className="px-3 py-3">Action</th>
                      <th className="px-3 py-3">Next-semester section</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef2f7]">
                    {detail.students.map((s) => {
                      const plan = plans[s.student_id]
                      if (!plan) return null
                      return (
                        <tr key={s.student_id}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              className="size-4"
                              aria-label={`Select ${s.name}`}
                              checked={plan.selected}
                              onChange={() => setPlan(s.student_id, { selected: !plan.selected })}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-[#17202a]">{s.name}</p>
                            <p className="text-xs text-[#667085]">{[s.email, s.college_id].filter(Boolean).join(" · ")}</p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={s.status} />
                              <button
                                type="button"
                                onClick={() => void toggleStatus(s.user_id, s.status)}
                                className="text-xs font-semibold text-[#0b5fff] hover:underline"
                              >
                                {s.status === "active" ? "Deactivate" : "Reactivate"}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <select
                              className={fieldClass}
                              value={plan.action}
                              onChange={(e) => setPlan(s.student_id, { action: e.target.value as PromotionAction, selected: true })}
                              aria-label={`Action for ${s.name}`}
                            >
                              {actionOptions(detail.is_final_semester)}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            {targetSelect(
                              plan.action === "promote" ? plan.target : null,
                              (v) => setPlan(s.student_id, { target: v, selected: true }),
                              plan.action !== "promote",
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void runPreview()}
                  disabled={busy || selectedIds.length === 0}
                  className="rounded-md bg-[#102033] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b3452] disabled:opacity-50"
                >
                  {busy && !preview ? "Checking..." : `Review ${selectedIds.length || ""} change${selectedIds.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          )}
        </>
      ) : null}

      {preview ? <ResultPanel result={preview} busy={busy} onApply={() => void runApply()} onCancel={() => setPreview(null)} /> : null}
      {result ? <ResultPanel result={result} /> : null}
    </section>
  )
}

/* --------------------------------- By CSV --------------------------------- */

function ByCsv() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PromotionResult | null>(null)
  const [result, setResult] = useState<PromotionResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function run(dryRun: boolean) {
    if (!file) {
      setError("Choose a CSV file first.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const data = await importPromotions(file, dryRun)
      if (dryRun) {
        setPreview(data)
        setResult(null)
      } else {
        setPreview(null)
        setResult(data)
      }
    } catch (err) {
      setError(detailOf(err, "Unable to read this file."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
      <div className="grid gap-3 text-sm text-[#475467] md:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <p className="font-semibold text-[#17202a]">One row per student</p>
          <p>
            <b>Email</b> or <b>CollegeID</b> identifies the student. <b>Action</b> is Promote, Repeat, Graduate or Exit.
            <b> TargetSection</b> is optional: the section name in the next semester (for example B). If it's blank,
            the student moves to the section with the same name, or the only one in their batch.
          </p>
          <p>You'll see a preview first. Nothing changes until you click Apply.</p>
        </div>
        <button
          type="button"
          onClick={() => void downloadPromotionTemplate()}
          className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-[#dde4ec] px-3 text-sm font-semibold text-[#17202a] hover:border-[#102033]"
        >
          <Download size={16} aria-hidden="true" /> Template
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[#98a2b3] px-4 py-2.5 text-sm font-semibold text-[#17202a] hover:border-[#102033]">
          <FileUp size={16} aria-hidden="true" />
          {file ? file.name : "Choose CSV file"}
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setPreview(null)
              setResult(null)
              setError("")
              e.target.value = ""
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => void run(true)}
          disabled={!file || busy}
          className="rounded-md bg-[#102033] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b3452] disabled:opacity-50"
        >
          {busy && !preview ? "Checking..." : "Preview"}
        </button>
      </div>

      {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
      {preview ? <ResultPanel result={preview} busy={busy} onApply={() => void run(false)} onCancel={() => setPreview(null)} /> : null}
      {result ? <ResultPanel result={result} /> : null}
    </section>
  )
}

/* ------------------------------ Shared results ------------------------------ */

function ResultPanel({
  result,
  busy,
  onApply,
  onCancel,
}: {
  result: PromotionResult
  busy?: boolean
  onApply?: () => void
  onCancel?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const summary = (Object.keys(ACTION_LABEL) as PromotionAction[])
    .filter((a) => result.counts[a])
    .map((a) => `${result.counts[a]} ${ACTION_LABEL[a].toLowerCase()}`)
    .join(", ")
  const deactivating = result.counts.graduate + result.counts.exit

  return (
    <div className="space-y-3 rounded-md border border-[#dde4ec] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={18} className="text-[#0f766e]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[#17202a]">
            {result.dry_run ? "Preview: " : "Done: "}
            {result.ok_count} {result.dry_run ? "ready" : "applied"}
            {summary ? ` (${summary})` : ""}
            {result.error_count ? ` · ${result.error_count} can't be ${result.dry_run ? "applied" : "done"}` : ""}
          </p>
        </div>
        {result.dry_run && onApply ? (
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || result.ok_count === 0}
              onClick={() => setConfirming(true)}
              className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59] disabled:opacity-50"
            >
              {busy ? "Applying..." : `Apply ${result.ok_count} change${result.ok_count === 1 ? "" : "s"}`}
            </button>
          </div>
        ) : null}
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
              {result.items.some((i) => i.row) ? <th className="px-3 py-2">Row</th> : null}
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef2f7]">
            {result.items.map((item, idx) => (
              <tr key={`${item.student_id ?? "x"}-${item.row ?? idx}`} className={item.ok ? "" : "bg-[#fff8f6]"}>
                {result.items.some((i) => i.row) ? <td className="px-3 py-2 tabular-nums text-[#667085]">{item.row ?? ""}</td> : null}
                <td className="px-3 py-2">
                  <p className="font-medium text-[#17202a]">{item.name ?? "—"}</p>
                  {item.email ? <p className="text-xs text-[#667085]">{item.email}</p> : null}
                </td>
                <td className="px-3 py-2 text-[#475467]">
                  {ACTION_LABEL[item.action as PromotionAction] ?? (item.action || "—")}
                </td>
                <td className={`px-3 py-2 ${item.ok ? "text-[#067647]" : "text-[#b42318]"}`}>{item.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirming && onApply ? (
        <ConfirmDialog
          title="Apply these changes?"
          message={
            `${result.ok_count} student(s) will be updated.` +
            (deactivating
              ? ` ${deactivating} account(s) will be made inactive and signed out. They are not deleted and can be reactivated from All Users.`
              : "")
          }
          confirmLabel="Apply"
          onConfirm={() => {
            setConfirming(false)
            onApply()
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  )
}

import { Check, CheckCircle2, ShieldCheck, X } from "lucide-react"
import { useEffect, useState } from "react"

import {
  approveTeachingSelection,
  getTeachingApprovals,
  rejectTeachingSelection,
  removeTeachingSelection,
  setTeachingApprovalSetting,
  type TeachingApprovalPending,
} from "../../api/admin"
import ConfirmDialog from "../../components/ConfirmDialog"
import AdminLayout from "../../layouts/AdminLayout"

export default function AdminTeachingApprovals() {
  const [requireApproval, setRequireApproval] = useState(true)
  const [pending, setPending] = useState<TeachingApprovalPending[]>([])
  const [approved, setApproved] = useState<TeachingApprovalPending[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [revoking, setRevoking] = useState<{ id: number; faculty_name: string; subject: string } | null>(null)

  function apply(data: { require_approval: boolean; pending: TeachingApprovalPending[]; approved: TeachingApprovalPending[] }) {
    setRequireApproval(data.require_approval)
    setPending(data.pending)
    setApproved(data.approved)
  }

  useEffect(() => {
    getTeachingApprovals()
      .then(apply)
      .finally(() => setLoading(false))
  }, [])

  function reload() {
    getTeachingApprovals().then(apply).catch(() => undefined)
  }

  async function decide(id: number, approve: boolean) {
    if (approve) await approveTeachingSelection(id)
    else await rejectTeachingSelection(id)
    reload()
  }

  async function confirmRevoke() {
    if (!revoking) return
    await removeTeachingSelection(revoking.id)
    setRevoking(null)
    reload()
  }

  async function toggle() {
    const next = !requireApproval
    setSaving(true)
    setRequireApproval(next) // optimistic
    try {
      await setTeachingApprovalSetting(next)
      setNotice(
        next
          ? "Faculty self-selections now require your approval."
          : "Faculty self-selections now take effect immediately.",
      )
    } catch {
      setRequireApproval(!next) // revert on failure
      setNotice("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-[#17202a]">Teaching Approvals</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#667085]">
            Faculty who chose their own sections and subjects appear here, grouped by person.
          </p>
        </div>

        {notice ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#027a48]">
            <CheckCircle2 size={17} aria-hidden="true" />
            {notice}
          </div>
        ) : null}

        {/* Setting */}
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#f5f7fa] text-[#667085]">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[#17202a]">
                  Require approval for faculty self-selection
                </h2>
                <p className="mt-1 max-w-xl text-sm text-[#667085]">
                  When on, anything a faculty member claims during onboarding waits here until you
                  approve it. When off, their choices take effect immediately.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`text-sm font-semibold ${requireApproval ? "text-[#17202a]" : "text-[#667085]"}`}>
                {loading ? "Loading…" : requireApproval ? "On" : "Off"}
              </span>
              <button
                type="button"
                role="switch"
                onClick={toggle}
                disabled={loading || saving}
                aria-checked={requireApproval}
                aria-label="Require approval for faculty self-selection"
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
                  requireApproval ? "bg-[#0f9d68]" : "bg-[#d0d5dd]"
                }`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-white shadow transition ${
                    requireApproval ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Pending approvals */}
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-[#17202a]">
            Pending approvals{" "}
            <span className="font-medium text-[#667085]">({countItems(pending)})</span>
          </h2>
          {loading ? (
            <p className="py-8 text-center text-sm font-medium text-[#667085]">Loading…</p>
          ) : pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#dde4ec] px-5 py-10 text-center">
              <h3 className="text-base font-semibold text-[#17202a]">Nothing to approve</h3>
              <p className="mt-1 text-sm text-[#667085]">
                Faculty self-selections will appear here as they onboard.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eef2f7]">
              {pending.map((person) => (
                <div key={person.faculty_id} className="py-4 first:pt-0">
                  <p className="font-semibold text-[#17202a]">{person.faculty_name}</p>
                  <div className="mt-3 grid gap-2">
                    {person.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#eef2f7] bg-[#f9fafb] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#17202a]">{it.subject}</p>
                          <p className="text-sm text-[#667085]">
                            {it.course_name} · {it.semester_name} · {it.section_name}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => decide(it.id, true)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#027a48] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#046c40]"
                          >
                            <Check size={15} aria-hidden="true" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(it.id, false)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#dde4ec] px-3 py-1.5 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff5f5]"
                          >
                            <X size={15} aria-hidden="true" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Approved */}
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-[#17202a]">
            Approved{" "}
            <span className="font-medium text-[#667085]">({countItems(approved)})</span>
          </h2>
          {loading ? (
            <p className="py-8 text-center text-sm font-medium text-[#667085]">Loading…</p>
          ) : approved.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#dde4ec] px-5 py-10 text-center">
              <h3 className="text-base font-semibold text-[#17202a]">No approved teaching yet</h3>
              <p className="mt-1 text-sm text-[#667085]">
                Approved (or auto-approved) faculty selections show here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eef2f7]">
              {approved.map((person) => (
                <div key={person.faculty_id} className="py-4 first:pt-0">
                  <p className="font-semibold text-[#17202a]">{person.faculty_name}</p>
                  <div className="mt-3 grid gap-2">
                    {person.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#eef2f7] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#17202a]">{it.subject}</p>
                          <p className="text-sm text-[#667085]">
                            {it.course_name} · {it.semester_name} · {it.section_name}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="rounded-full bg-[#ecfdf3] px-2.5 py-0.5 text-xs font-semibold text-[#027a48]">
                            Active
                          </span>
                          <button
                            type="button"
                            onClick={() => setRevoking({ id: it.id, faculty_name: person.faculty_name, subject: it.subject })}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#dde4ec] px-3 py-1.5 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff5f5]"
                          >
                            <X size={15} aria-hidden="true" />
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {revoking ? (
        <ConfirmDialog
          title="Revoke teaching access?"
          message={`Revoke ${revoking.faculty_name}'s access to teach "${revoking.subject}"? They'll lose this section/subject assignment immediately.`}
          confirmLabel="Revoke"
          onConfirm={confirmRevoke}
          onCancel={() => setRevoking(null)}
        />
      ) : null}
    </AdminLayout>
  )
}

function countItems(groups: TeachingApprovalPending[]): number {
  return groups.reduce((sum, g) => sum + g.items.length, 0)
}

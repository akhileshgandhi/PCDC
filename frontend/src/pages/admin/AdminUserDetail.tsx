import { ArrowLeft, KeyRound, ShieldCheck, ShieldOff, Trash2, UserCog } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  deleteAdminUser,
  getAdminUser,
  resetAdminUserPassword,
  updateAdminUserStatus,
  type AdminUser,
  type AdminUserDetail as AdminUserDetailData,
} from "../../api/admin"
import ConfirmDialog from "../../components/ConfirmDialog"
import AdminLayout from "../../layouts/AdminLayout"
import { EditUserDialog, StatusBadge, formatDate, titleCase } from "./AdminUsers"

export default function AdminUserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const userId = Number(id)

  const [user, setUser] = useState<AdminUserDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  function load() {
    setLoading(true)
    setLoadError(false)
    getAdminUser(userId)
      .then(setUser)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (Number.isFinite(userId)) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function handleSaved(updated: AdminUser) {
    setUser((current) => (current ? { ...current, ...updated } : current))
    setEditing(false)
    setNotice(`${updated.name} updated successfully.`)
  }

  async function handleStatusToggle() {
    if (!user) return
    const nextStatus = user.status === "active" ? "inactive" : "active"
    try {
      const updated = await updateAdminUserStatus(user.id, nextStatus)
      setUser((current) => (current ? { ...current, ...updated } : current))
      setNotice(`${updated.name} is now ${updated.status}.`)
    } catch {
      setError("Unable to update user status.")
    }
  }

  async function handlePasswordReset() {
    if (!user) return
    try {
      const result = await resetAdminUserPassword(user.id)
      if (result.status === "reset_email_sent") {
        setNotice(`Password reset link sent to ${user.name}.`)
      } else {
        setError(`Could not deliver the reset email to ${user.name}.`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Unable to send password reset.")
    }
  }

  async function handleDelete() {
    if (!user) return
    try {
      await deleteAdminUser(user.id)
      navigate("/admin/users")
    } catch {
      setError("Unable to delete user.")
    } finally {
      setConfirmingDelete(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#176b5a] transition hover:text-[#102033]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Users
        </Link>

        {notice ? (
          <div className="rounded-lg border border-[#bdebdc] bg-[#f0fcf8] px-4 py-3 text-sm font-medium text-[#176b5a]">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
            <p className="py-8 text-center text-sm font-medium text-[#667085]">Loading user…</p>
          </section>
        ) : loadError || !user ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-medium text-[#b42318]">Could not load this user.</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-md border border-[#dde4ec] px-4 py-2 text-sm font-semibold text-[#17202a] hover:bg-[#f5f7fa]"
            >
              Retry
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#e8f8f4] text-lg font-semibold text-[#176b5a]">
                    {initials(user.name)}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold text-[#17202a]">{user.name}</h1>
                      <StatusBadge status={user.status} />
                      <span className="text-[10px] font-medium uppercase text-[#98a2b3]" title="This is the account's enabled/disabled status, separate from any onboarding status shown elsewhere (e.g. People > Faculty).">
                        account
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#667085]">{user.email}</p>
                    <p className="mt-1 text-sm font-medium text-[#0f766e]">{titleCase(user.role)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold text-[#17202a] transition hover:border-[#34c6a3] hover:bg-[#e8f8f4]"
                  >
                    <UserCog size={15} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold text-[#17202a] transition hover:border-[#34c6a3] hover:bg-[#e8f8f4]"
                  >
                    <KeyRound size={15} aria-hidden="true" />
                    Reset password
                  </button>
                  <button
                    type="button"
                    onClick={handleStatusToggle}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold text-[#17202a] transition hover:border-[#34c6a3] hover:bg-[#e8f8f4]"
                  >
                    {user.status === "active" ? (
                      <ShieldOff size={15} aria-hidden="true" />
                    ) : (
                      <ShieldCheck size={15} aria-hidden="true" />
                    )}
                    {user.status === "active" ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-semibold text-[#b42318] transition hover:border-[#f3c4c4] hover:bg-[#fff5f5]"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-[#17202a]">Profile details</h2>
              <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Program" value={user.program} />
                <DetailField label="Specialization" value={user.specialization} />
                {user.role === "student" ? (
                  <>
                    <DetailField label="College ID" value={user.college_id} />
                    <DetailField
                      label="Admission Year"
                      value={user.admission_year ? String(user.admission_year) : null}
                    />
                    <DetailField label="Course" value={user.course_name} />
                    <DetailField label="Batch" value={user.batch_name} />
                    <DetailField label="Section" value={user.section_name} />
                  </>
                ) : null}
                {user.role === "faculty" ? (
                  <>
                    <DetailField label="Department" value={user.department} />
                    <DetailField label="Designation" value={user.designation} />
                    <DetailField label="Employee ID" value={user.employee_id} />
                    <DetailField
                      label="Experience"
                      value={user.experience_years != null ? `${user.experience_years} yrs` : null}
                    />
                    <DetailField
                      label="Sections teaching"
                      value={user.sections_teaching > 0 ? String(user.sections_teaching) : null}
                    />
                  </>
                ) : null}
                <DetailField
                  label="Last login"
                  value={user.last_login_at ? formatDate(user.last_login_at) : "Never"}
                />
                <DetailField label="Joined" value={formatDate(user.created_at)} />
              </div>
            </section>

            <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-[#17202a]">Login history</h2>
              {user.login_history.length === 0 ? (
                <p className="mt-3 text-sm text-[#667085]">No recorded logins yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                        <th className="py-2 pr-4">When</th>
                        <th className="py-2 pr-4">IP address</th>
                        <th className="py-2">Device</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2f7]">
                      {user.login_history.map((event) => (
                        <tr key={event.id}>
                          <td className="py-2.5 pr-4 text-[#17202a]">{formatDate(event.created_at)}</td>
                          <td className="py-2.5 pr-4 text-[#667085]">{event.ip_address || "—"}</td>
                          <td className="max-w-[320px] truncate py-2.5 text-[#667085]" title={event.user_agent || undefined}>
                            {event.user_agent || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {editing && user ? (
          <EditUserDialog user={user} onClose={() => setEditing(false)} onSaved={handleSaved} />
        ) : null}

        {confirmingDelete && user ? (
          <ConfirmDialog
            title="Delete user?"
            message={`Are you sure you want to delete ${user.name}? This cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        ) : null}
      </div>
    </AdminLayout>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#667085]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#17202a]">{value || "—"}</p>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

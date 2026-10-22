import { Building2, Check, Plus, ShieldCheck, UserPlus, X } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import { Navigate } from "react-router-dom"

import {
  createAdminUser,
  getAdminAccounts,
  getAdminInstitutions,
  onboardInstitution,
  setAdminInstitutions,
  updateAdminUserStatus,
  type AdminAccount,
  type AdminInstitution,
} from "../../api/admin"
import { useAdminScope } from "../../hooks/useAdminScope"
import AdminLayout from "../../layouts/AdminLayout"

const field =
  "h-11 w-full rounded-md border border-[#dde4ec] bg-white px-3 text-sm outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
const label = "grid gap-1.5 text-sm font-semibold text-[#17202a]"
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#102033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3452] disabled:opacity-60"
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md border border-[#dde4ec] bg-white px-4 py-2.5 text-sm font-semibold text-[#17202a] transition hover:border-[#34c6a3]"

function errorText(err: unknown, fallback: string) {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === "string" ? detail : fallback
}

type DrawerState =
  | { kind: "onboard" }
  | { kind: "add-admin" }
  | { kind: "edit-institutes"; admin: AdminAccount }
  | null

export default function AdminAdmins() {
  const scope = useAdminScope()
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [drawer, setDrawer] = useState<DrawerState>(null)

  const reload = useCallback(() => {
    setLoading(true)
    Promise.all([getAdminAccounts(), getAdminInstitutions()])
      .then(([accountData, institutionData]) => {
        setAdmins(accountData.items)
        setInstitutions(institutionData.items)
        setError("")
      })
      .catch((err) => setError(errorText(err, "Could not load admins.")))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (scope.isSuperadmin) reload()
  }, [scope.isSuperadmin, reload])

  if (!scope.loading && !scope.isSuperadmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  async function toggleStatus(admin: AdminAccount) {
    const next = admin.status === "active" ? "inactive" : "active"
    try {
      await updateAdminUserStatus(admin.id, next)
      setNotice(`${admin.name} is now ${next}.`)
      reload()
    } catch (err) {
      setError(errorText(err, "Could not change status."))
    }
  }

  function done(message: string) {
    setDrawer(null)
    setNotice(message)
    reload()
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#17202a]">Admins</h2>
              <p className="mt-1 max-w-2xl text-sm text-[#667085]">
                Each institute admin manages only the institutes linked to them — their programs,
                sections, faculty and students. Admins can also create their own institutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => setDrawer({ kind: "add-admin" })}>
                <UserPlus size={16} aria-hidden="true" /> Add admin
              </button>
              <button type="button" className={primaryButton} onClick={() => setDrawer({ kind: "onboard" })}>
                <Building2 size={16} aria-hidden="true" /> Add institute + admin
              </button>
            </div>
          </div>
          {notice ? (
            <p className="mt-4 rounded-md bg-[#ecfaf6] px-3 py-2 text-sm font-medium text-[#0b6b52]">{notice}</p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-lg border border-[#dde4ec] bg-white shadow-sm">
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-[#667085]">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#667085]">No admins yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-[#eef2f7] bg-[#f9fafb] text-xs font-semibold uppercase tracking-wide text-[#667085]">
                  <tr>
                    <th className="px-5 py-3">Admin</th>
                    <th className="px-5 py-3">Access</th>
                    <th className="px-5 py-3">Institutes</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f7]">
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[#17202a]">{admin.name}</p>
                        <p className="text-xs text-[#667085]">{admin.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        {admin.role === "superadmin" ? (
                          <Badge tone="dark">
                            <ShieldCheck size={12} aria-hidden="true" /> Central Admin
                          </Badge>
                        ) : admin.admin_unrestricted ? (
                          <Badge tone="neutral">All institutes</Badge>
                        ) : (
                          <Badge tone="green">Institute admin</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {admin.role === "superadmin" || admin.admin_unrestricted ? (
                          <span className="text-[#667085]">Every institute</span>
                        ) : admin.institutions.length === 0 ? (
                          <span className="text-[#98a2b3]">None yet</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {admin.institutions.map((institution) => (
                              <Badge key={institution.id} tone="neutral">
                                {institution.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={admin.status === "active" ? "text-[#0b6b52]" : "text-[#b42318]"}>
                          {admin.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          {admin.role === "admin" && !admin.admin_unrestricted ? (
                            <button
                              type="button"
                              className="rounded-md border border-[#dde4ec] px-3 py-1.5 text-xs font-semibold text-[#17202a] hover:border-[#34c6a3]"
                              onClick={() => setDrawer({ kind: "edit-institutes", admin })}
                            >
                              Institutes
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-md border border-[#dde4ec] px-3 py-1.5 text-xs font-semibold text-[#17202a] hover:border-[#34c6a3]"
                            onClick={() => toggleStatus(admin)}
                          >
                            {admin.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {drawer?.kind === "onboard" ? (
        <OnboardDrawer
          onClose={() => setDrawer(null)}
          onDone={(name, emailSent) =>
            done(
              emailSent
                ? `${name} created and its admin was emailed a set-password link.`
                : `${name} created. The invite email couldn't be sent — use "Reset password" on the admin from All Users.`,
            )
          }
        />
      ) : null}
      {drawer?.kind === "add-admin" ? (
        <AddAdminDrawer
          institutions={institutions}
          onClose={() => setDrawer(null)}
          onDone={(name) => done(`${name} was added as an admin.`)}
        />
      ) : null}
      {drawer?.kind === "edit-institutes" ? (
        <EditInstitutesDrawer
          admin={drawer.admin}
          institutions={institutions}
          onClose={() => setDrawer(null)}
          onDone={(name) => done(`Updated institutes for ${name}.`)}
        />
      ) : null}
    </AdminLayout>
  )
}

function Badge({ tone, children }: { tone: "dark" | "green" | "neutral"; children: ReactNode }) {
  const tones = {
    dark: "bg-[#102033] text-white",
    green: "bg-[#ecfaf6] text-[#0b6b52]",
    neutral: "bg-[#f2f4f7] text-[#344054]",
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

function Drawer({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => setShown(true), [])
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#102033]/45" onClick={onClose}>
      <div
        className={`flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-200 ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eef2f7] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#17202a]">{title}</h2>
            <p className="mt-1 text-sm text-[#667085]">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#667085] hover:text-[#17202a]">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-4 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function InstitutionPicker({
  institutions,
  selected,
  onChange,
}: {
  institutions: AdminInstitution[]
  selected: number[]
  onChange: (next: number[]) => void
}) {
  if (institutions.length === 0) {
    return <p className="text-sm font-normal text-[#98a2b3]">No institutes yet.</p>
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {institutions.map((institution) => {
        const active = selected.includes(institution.id)
        return (
          <button
            type="button"
            key={institution.id}
            onClick={() =>
              onChange(active ? selected.filter((id) => id !== institution.id) : [...selected, institution.id])
            }
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
              active
                ? "border-[#34c6a3] bg-[#eafaf5] font-semibold text-[#0b6b52]"
                : "border-[#dde4ec] bg-white font-normal text-[#344054] hover:border-[#b7c2d0]"
            }`}
          >
            <span className="truncate">{institution.name}</span>
            <span
              className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                active ? "border-[#34c6a3] bg-[#34c6a3] text-white" : "border-[#cdd5df]"
              }`}
            >
              {active ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function OnboardDrawer({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (institutionName: string, emailSent: boolean) => void
}) {
  const [institutionName, setInstitutionName] = useState("")
  const [institutionCode, setInstitutionCode] = useState("")
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!institutionName.trim() || !institutionCode.trim() || !adminName.trim() || !adminEmail.trim()) {
      setError("All fields are required.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      setError("Enter a valid email address.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const result = await onboardInstitution({
        institution_name: institutionName.trim(),
        institution_code: institutionCode.trim(),
        admin_name: adminName.trim(),
        admin_email: adminEmail.trim(),
      })
      onDone(result.institution.name, result.email_sent)
    } catch (err) {
      setError(errorText(err, "Could not create the institute."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title="Add institute + admin"
      description="Creates the institute and its admin together. The admin gets an email to set their password."
      onClose={onClose}
    >
      <label className={label}>
        Institute name
        <input className={field} value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="PIMR Indore" />
      </label>
      <label className={label}>
        Institute code
        <input className={field} value={institutionCode} onChange={(e) => setInstitutionCode(e.target.value)} placeholder="PIMR-IND" />
      </label>
      <label className={label}>
        Admin name
        <input className={field} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Neha Joshi" />
      </label>
      <label className={label}>
        Admin email
        <input type="email" className={field} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="neha.joshi@pimr.example" />
      </label>
      {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
      <button type="button" onClick={submit} disabled={saving} className={`${primaryButton} w-full py-3`}>
        {saving ? "Creating…" : <><Plus size={16} aria-hidden="true" /> Create institute and admin</>}
      </button>
    </Drawer>
  )
}

function AddAdminDrawer({
  institutions,
  onClose,
  onDone,
}: {
  institutions: AdminInstitution[]
  onClose: () => void
  onDone: (name: string) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await createAdminUser({ name: name.trim(), email: email.trim(), role: "admin", institution_ids: selected })
      onDone(name.trim())
    } catch (err) {
      setError(errorText(err, "Could not add the admin. The email may already be registered."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title="Add admin"
      description="Link them to existing institutes, or leave it empty — they can then create their own institute."
      onClose={onClose}
    >
      <label className={label}>
        Name
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Neha Joshi" />
      </label>
      <label className={label}>
        Email
        <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="neha.joshi@pimr.example" />
      </label>
      <div className={label}>
        <span>Institute(s)</span>
        <InstitutionPicker institutions={institutions} selected={selected} onChange={setSelected} />
      </div>
      {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
      <button type="button" onClick={submit} disabled={saving} className={`${primaryButton} w-full py-3`}>
        {saving ? "Adding…" : <><UserPlus size={16} aria-hidden="true" /> Add admin</>}
      </button>
    </Drawer>
  )
}

function EditInstitutesDrawer({
  admin,
  institutions,
  onClose,
  onDone,
}: {
  admin: AdminAccount
  institutions: AdminInstitution[]
  onClose: () => void
  onDone: (name: string) => void
}) {
  const [selected, setSelected] = useState<number[]>(admin.institutions.map((institution) => institution.id))
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setError("")
    try {
      await setAdminInstitutions(admin.id, selected)
      onDone(admin.name)
    } catch (err) {
      setError(errorText(err, "Could not update institutes."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={`Institutes for ${admin.name}`}
      description="This admin sees and manages only the institutes selected here."
      onClose={onClose}
    >
      <InstitutionPicker institutions={institutions} selected={selected} onChange={setSelected} />
      {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
      <button type="button" onClick={submit} disabled={saving} className={`${primaryButton} w-full py-3`}>
        {saving ? "Saving…" : "Save institutes"}
      </button>
    </Drawer>
  )
}

import { ChevronRight, Mail, Plus, Search, UserPlus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  createAdminUser,
  getAdminDepartments,
  getAdminFaculty,
  type AdminDepartment,
  type AdminFacultyRow,
  type FacultyState,
} from "../../api/admin"
import AdminLayout from "../../layouts/AdminLayout"

type FilterKey = "all" | FacultyState

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "awaiting", label: "Awaiting response" },
  { key: "active", label: "Active faculty" },
  { key: "needs_attention", label: "Needs attention" },
]

const STATE_BADGE: Record<FacultyState, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-[#ecfdf3] text-[#027a48]" },
  awaiting: { label: "Awaiting", className: "bg-[#fff7df] text-[#92702a]" },
  needs_attention: { label: "Needs attention", className: "bg-[#fff5f5] text-[#b42318]" },
}

export default function AdminFaculty() {
  const [items, setItems] = useState<AdminFacultyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [inviting, setInviting] = useState(false)
  const [notice, setNotice] = useState("")

  function load() {
    setLoading(true)
    getAdminFaculty()
      .then((data) => {
        setItems(data.items)
        setError("")
      })
      .catch(() => setError("Unable to load faculty."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    return {
      all: items.length,
      awaiting: items.filter((f) => f.state === "awaiting").length,
      active: items.filter((f) => f.state === "active").length,
      needs_attention: items.filter((f) => f.state === "needs_attention").length,
    }
  }, [items])

  const visible = useMemo(() => {
    return items.filter((f) => {
      if (filter !== "all" && f.state !== filter) return false
      if (search) {
        const term = search.toLowerCase()
        return (
          f.name.toLowerCase().includes(term) ||
          f.email.toLowerCase().includes(term) ||
          (f.department ?? "").toLowerCase().includes(term)
        )
      }
      return true
    })
  }, [items, filter, search])

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-[#17202a]">Faculty</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#667085]">
              Everyone teaching on the platform, and everyone invited but not yet joined.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNotice("Sent mail log isn't configured yet — tell me what it should show.")}
              className="inline-flex items-center gap-2 rounded-md border border-[#dde4ec] bg-white px-3 py-2.5 text-sm font-semibold text-[#17202a] transition hover:bg-[#f5f7fa]"
            >
              <Mail size={15} aria-hidden="true" />
              Sent mail
            </button>
            <button
              type="button"
              onClick={() => setInviting(true)}
              className="inline-flex items-center gap-2 rounded-md bg-[#102033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3452]"
            >
              <UserPlus size={16} aria-hidden="true" />
              Invite faculty
            </button>
          </div>
        </div>

        {notice ? (
          <div className="flex items-start justify-between gap-3 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1d4ed8]">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex h-11 flex-1 items-center gap-3 rounded-md border border-[#dde4ec] bg-[#f5f7fa] px-3 text-[#667085]">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search faculty</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or department"
                className="w-full bg-transparent text-sm text-[#17202a] outline-none placeholder:text-[#667085]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    filter === f.key
                      ? "bg-[#102033] text-white"
                      : "border border-[#dde4ec] bg-white text-[#17202a] hover:bg-[#f5f7fa]"
                  }`}
                >
                  {f.label}
                  <span
                    className={`grid min-w-5 place-items-center rounded-full px-1 text-xs font-bold ${
                      filter === f.key ? "bg-white/20 text-white" : "bg-[#eef2f7] text-[#475467]"
                    }`}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {error ? (
              <p className="py-8 text-center text-sm font-medium text-[#b42318]">{error}</p>
            ) : loading ? (
              <p className="py-10 text-center text-sm font-medium text-[#667085]">Loading faculty…</p>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#667085]">
                {items.length === 0 ? "No faculty yet. Invite one to get started." : "No faculty match this filter."}
              </p>
            ) : (
              <div className="divide-y divide-[#eef2f7]">
                {visible.map((f) => (
                  <Link
                    key={f.id}
                    to={`/admin/user/${f.id}`}
                    className="flex items-center gap-4 px-1 py-4 transition hover:bg-[#f9fafb]"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-md bg-[#102033] text-sm font-semibold text-white">
                      {initials(f.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#17202a]">{f.name}</p>
                      <p className="truncate text-sm text-[#667085]">
                        {f.email}
                        {f.department ? <span className="text-[#98a2b3]"> · {f.department}</span> : null}
                      </p>
                    </div>
                    <span className="hidden shrink-0 text-sm text-[#667085] sm:block">
                      {f.subject_count} {f.subject_count === 1 ? "subject" : "subjects"}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_BADGE[f.state].className}`}
                    >
                      {STATE_BADGE[f.state].label}
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-[#98a2b3]" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {inviting ? (
        <InviteFacultyDrawer
          onClose={() => setInviting(false)}
          onInvited={() => {
            setInviting(false)
            setNotice("Faculty invited.")
            load()
          }}
        />
      ) : null}
    </AdminLayout>
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

function InviteFacultyDrawer({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [department, setDepartment] = useState("")
  const [designation, setDesignation] = useState("")
  const [departments, setDepartments] = useState<AdminDepartment[]>([])
  const [shown, setShown] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setShown(true)
    getAdminDepartments().then((d) => setDepartments(d.items)).catch(() => undefined)
  }, [])

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await createAdminUser({
        name: name.trim(),
        email: email.trim(),
        role: "faculty",
        department: department || undefined,
        designation: designation.trim() || undefined,
      })
      onInvited()
    } catch {
      setError("Could not invite faculty. The email may already be registered.")
    } finally {
      setSaving(false)
    }
  }

  const field =
    "h-11 w-full rounded-md border border-[#dde4ec] bg-white px-3 text-sm outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
  const label = "grid gap-1.5 text-sm font-semibold text-[#17202a]"

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#102033]/45" onClick={onClose}>
      <div
        className={`flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-200 ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eef2f7] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#17202a]">Invite faculty</h2>
            <p className="mt-1 text-sm text-[#667085]">
              They'll appear under "Awaiting response" until they first sign in.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#667085] hover:text-[#17202a]">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-4 px-6 py-5">
          <label className={label}>
            <span>Name <span className="text-[#d92d20]">*</span></span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Prof. Anand Iyer" />
          </label>
          <label className={label}>
            <span>Email <span className="text-[#d92d20]">*</span></span>
            <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anand.iyer@pcdc.example" />
          </label>
          <label className={label}>
            Department
            <select className={field} value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Designation
            <input className={field} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Associate Professor" />
          </label>
          {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#102033] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1b3452] disabled:opacity-60"
          >
            {saving ? "Inviting…" : <><Plus size={16} aria-hidden="true" /> Invite faculty</>}
          </button>
        </div>
      </div>
    </div>
  )
}

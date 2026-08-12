import { Pencil, Plus, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  createAdminBatch,
  createAdminCourse,
  createAdminDepartment,
  createAdminInstitution,
  createAdminSection,
  createAdminSubject,
  deleteAdminBatch,
  deleteAdminCourse,
  deleteAdminDepartment,
  deleteAdminInstitution,
  deleteAdminSection,
  deleteAdminSemester,
  deleteAdminSubject,
  getAdminAcademicSummary,
  getAdminAllBatches,
  getAdminAllSemesters,
  getAdminCourseBatches,
  getAdminCourses,
  getAdminCourseSemesters,
  getAdminDepartments,
  getAdminInstitutions,
  getAdminSections,
  getAdminSubjects,
  updateAdminDepartment,
  updateAdminInstitution,
  updateAdminSubject,
  type AcademicSummary,
  type AdminBatch,
  type AdminCourse,
  type AdminDepartment,
  type AdminInstitution,
  type AdminSemester,
  type AdminSubject,
} from "../../api/admin"
import AdminLayout from "../../layouts/AdminLayout"

const TABS = [
  { key: "institutions", label: "Institutions" },
  { key: "departments", label: "Departments" },
  { key: "courses", label: "Courses" },
  { key: "batches", label: "Batches" },
  { key: "semesters", label: "Semesters" },
  { key: "sections", label: "Sections" },
  { key: "subjects", label: "Subjects" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const ADD_LABEL: Partial<Record<TabKey, string>> = {
  institutions: "Add institution",
  departments: "Add department",
  courses: "Add course",
  batches: "Add batch",
  sections: "Add section",
  subjects: "Add subject",
}

export default function AdminAcademicSetup() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "institutions"

  const [summary, setSummary] = useState<AcademicSummary | null>(null)
  const [creating, setCreating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function loadSummary() {
    getAdminAcademicSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }

  // Refetch the counts on mount and whenever the tab changes, so the badges
  // always reflect current data (not a stale first load).
  useEffect(() => {
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  function handleChanged() {
    loadSummary()
    setRefreshKey((key) => key + 1)
  }

  const count = (key: TabKey) => (summary ? summary[key] : undefined)

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-[#17202a]">Academic Setup</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#667085]">
              Departments, courses, batches, semesters, sections and subjects — the structure
              everything else hangs off.
            </p>
          </div>
          {ADD_LABEL[activeTab] ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-md bg-[#102033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3452]"
            >
              <Plus size={16} aria-hidden="true" />
              {ADD_LABEL[activeTab]}
            </button>
          ) : null}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const isActive = t.key === activeTab
            const c = count(t.key)
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => navigate(`/admin/academic/${t.key}`)}
                className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#102033] bg-[#102033] text-white"
                    : "border-[#dde4ec] bg-white text-[#17202a] hover:border-[#102033]"
                }`}
              >
                {t.label}
                {c !== undefined ? (
                  <span
                    className={`grid min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-[#eef2f7] text-[#475467]"
                    }`}
                  >
                    {c}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Active tab */}
        <div key={`${activeTab}-${refreshKey}`}>
          {activeTab === "institutions" ? <InstitutionsTab onChanged={handleChanged} /> : null}
          {activeTab === "departments" ? <DepartmentsTab onChanged={handleChanged} /> : null}
          {activeTab === "courses" ? <CoursesTab onChanged={handleChanged} /> : null}
          {activeTab === "batches" ? <BatchesTab onChanged={handleChanged} /> : null}
          {activeTab === "semesters" ? <SemestersTab onChanged={handleChanged} /> : null}
          {activeTab === "sections" ? <SectionsTab onChanged={handleChanged} /> : null}
          {activeTab === "subjects" ? <SubjectsTab onChanged={handleChanged} /> : null}
        </div>
      </div>

      {creating && activeTab === "institutions" ? (
        <InstitutionForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            handleChanged()
          }}
        />
      ) : null}
      {creating && activeTab === "departments" ? (
        <DepartmentForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            handleChanged()
          }}
        />
      ) : null}
      {creating && activeTab === "subjects" ? (
        <SubjectForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            handleChanged()
          }}
        />
      ) : null}
      {creating && activeTab === "courses" ? (
        <CourseForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            handleChanged()
          }}
        />
      ) : null}
      {creating && activeTab === "batches" ? (
        <BatchForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            handleChanged()
          }}
        />
      ) : null}
      {creating && activeTab === "sections" ? (
        <SectionForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            handleChanged()
          }}
        />
      ) : null}
    </AdminLayout>
  )
}

/* ---------------------------------- shared ---------------------------------- */

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#dde4ec] bg-white shadow-sm">
      <div className="border-b border-[#eef2f7] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#17202a]">{title}</h2>
        <p className="mt-1 text-sm text-[#667085]">{description}</p>
      </div>
      {children}
    </section>
  )
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active"
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-[#ecfdf3] text-[#027a48]" : "bg-[#f2f4f7] text-[#475467]"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  )
}

function Loading() {
  return <p className="px-5 py-10 text-center text-sm font-medium text-[#667085]">Loading…</p>
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-[#667085]">{text}</p>
}

// Right-side slide-over drawer used by all Academic Setup forms.
function Drawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    setShown(true)
  }, [])
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
            {subtitle ? <p className="mt-1 text-sm leading-5 text-[#667085]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-[#667085] transition hover:text-[#17202a]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// Required-field label with a red asterisk.
function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <span>
      {children} <span className="text-[#d92d20]">*</span>
    </span>
  )
}

// Full-width primary action for the drawer forms.
function DrawerSubmit({
  label,
  icon,
  saving,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  saving: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#102033] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1b3452] disabled:opacity-60"
    >
      {saving ? "Saving…" : (<>{icon}{label}</>)}
    </button>
  )
}

const fieldClass =
  "h-11 w-full rounded-md border border-[#dde4ec] bg-white px-3 text-sm outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
const labelClass = "grid gap-1.5 text-sm font-semibold text-[#17202a]"

/* ------------------------------- Institutions ------------------------------- */

function InstitutionsTab({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<AdminInstitution[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminInstitution | null>(null)

  useEffect(() => {
    getAdminInstitutions()
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(inst: AdminInstitution) {
    if (!window.confirm(`Delete institution "${inst.name}"? Its departments will be unassigned.`)) return
    await deleteAdminInstitution(inst.id)
    onChanged()
  }

  return (
    <Card title="Institutions" description="The colleges under the trust. Departments belong to an institution.">
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="No institutions yet. Add one to start." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                <th className="px-5 py-3">Institution</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Departments</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {items.map((inst) => (
                <tr key={inst.id}>
                  <td className="px-5 py-4 font-semibold text-[#17202a]">{inst.name}</td>
                  <td className="px-5 py-4">
                    <span className="rounded bg-[#eef2f7] px-2 py-0.5 text-xs font-semibold text-[#475467]">
                      {inst.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#475467]">{inst.department_count}</td>
                  <td className="px-5 py-4"><StatusBadge status={inst.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <IconButton label="Edit" onClick={() => setEditing(inst)}><Pencil size={15} /></IconButton>
                      <IconButton label="Delete" danger onClick={() => handleDelete(inst)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? (
        <InstitutionForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      ) : null}
    </Card>
  )
}

function InstitutionForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AdminInstitution
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [code, setCode] = useState(initial?.code ?? "")
  const [status, setStatus] = useState(initial?.status ?? "active")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name.trim() || !code.trim()) {
      setError("Name and code are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (initial) {
        await updateAdminInstitution(initial.id, { name: name.trim(), status: status as "active" | "inactive" })
      } else {
        await createAdminInstitution({ name: name.trim(), code: code.trim().toUpperCase() })
      }
      onSaved()
    } catch {
      setError("Could not save. The code may already exist.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={initial ? "Edit institution" : "Add institution"}
      subtitle="A college under the trust. Departments belong to an institution."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className={labelClass}>
          <ReqLabel>Institution name</ReqLabel>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="PIMR PG" />
        </label>
        <label className={labelClass}>
          <ReqLabel>Code</ReqLabel>
          <input
            className={fieldClass}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="PIMR-PG"
            disabled={Boolean(initial)}
          />
          <span className="text-xs font-normal text-[#667085]">Short, unique. e.g. PIMR-PG</span>
        </label>
        {initial ? (
          <label className={labelClass}>
            Status
            <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        ) : null}
        {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
        <DrawerSubmit
          label={initial ? "Save changes" : "Add institution"}
          icon={initial ? undefined : <Plus size={16} aria-hidden="true" />}
          saving={saving}
          onClick={submit}
        />
      </div>
    </Drawer>
  )
}

/* -------------------------------- Departments ------------------------------- */

function DepartmentsTab({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<AdminDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminDepartment | null>(null)

  useEffect(() => {
    getAdminDepartments()
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(dep: AdminDepartment) {
    if (!window.confirm(`Delete department "${dep.name}"? Its courses will be unassigned.`)) return
    await deleteAdminDepartment(dep.id)
    onChanged()
  }

  return (
    <Card title="Departments" description="The top level of the academic structure. Every course belongs to one.">
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="No departments yet. Add one to start organising courses." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Institution</th>
                <th className="px-5 py-3">Courses</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {items.map((dep) => (
                <tr key={dep.id}>
                  <td className="px-5 py-4 font-semibold text-[#17202a]">{dep.name}</td>
                  <td className="px-5 py-4">
                    <span className="rounded bg-[#eef2f7] px-2 py-0.5 text-xs font-semibold text-[#475467]">
                      {dep.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#475467]">{dep.institution_name ?? "—"}</td>
                  <td className="px-5 py-4 text-[#475467]">{dep.course_count}</td>
                  <td className="px-5 py-4"><StatusBadge status={dep.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <IconButton label="Edit" onClick={() => setEditing(dep)}><Pencil size={15} /></IconButton>
                      <IconButton label="Delete" danger onClick={() => handleDelete(dep)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? (
        <DepartmentForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      ) : null}
    </Card>
  )
}

function DepartmentForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AdminDepartment
  onClose: () => void
  onSaved: () => void
}) {
  const [institutionId, setInstitutionId] = useState<string>(
    initial?.institution_id ? String(initial.institution_id) : "",
  )
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([])
  const [name, setName] = useState(initial?.name ?? "")
  const [code, setCode] = useState(initial?.code ?? "")
  const [status, setStatus] = useState(initial?.status ?? "active")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAdminInstitutions().then((d) => setInstitutions(d.items)).catch(() => undefined)
  }, [])

  async function submit() {
    if (!institutionId) {
      setError("Please select an institution.")
      return
    }
    if (!name.trim() || !code.trim()) {
      setError("Name and code are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (initial) {
        await updateAdminDepartment(initial.id, {
          name: name.trim(),
          status: status as "active" | "inactive",
          institution_id: Number(institutionId),
        })
      } else {
        await createAdminDepartment({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          institution_id: Number(institutionId),
        })
      }
      onSaved()
    } catch {
      setError("Could not save. The code may already exist.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={initial ? "Edit department" : "Add department"}
      subtitle="Belongs to an institution. Every course belongs to a department."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className={labelClass}>
          <ReqLabel>Institution</ReqLabel>
          <select className={fieldClass} value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
            <option value="">Select institution</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <ReqLabel>Department name</ReqLabel>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Executive Programmes" />
        </label>
        <label className={labelClass}>
          <ReqLabel>Code</ReqLabel>
          <input
            className={fieldClass}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="EXEC"
            disabled={Boolean(initial)}
          />
          <span className="text-xs font-normal text-[#667085]">Short, unique. e.g. EXEC</span>
        </label>
        {initial ? (
          <label className={labelClass}>
            Status
            <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        ) : null}
        {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
        <DrawerSubmit
          label={initial ? "Save changes" : "Add department"}
          icon={initial ? undefined : <Plus size={16} aria-hidden="true" />}
          saving={saving}
          onClick={submit}
        />
      </div>
    </Drawer>
  )
}

/* --------------------------------- Subjects --------------------------------- */

function SubjectsTab({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<AdminSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminSubject | null>(null)

  useEffect(() => {
    getAdminSubjects()
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(subject: AdminSubject) {
    if (!window.confirm(`Delete subject "${subject.name}"?`)) return
    await deleteAdminSubject(subject.id)
    onChanged()
  }

  return (
    <Card title="Subjects" description="Defined per course and semester, so the same name can exist in different courses.">
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="No subjects yet. Add one to build the catalog." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {items.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-5 py-4 font-semibold text-[#17202a]">{subject.name}</td>
                  <td className="px-5 py-4 text-[#475467]">{subject.course_name ?? "—"}</td>
                  <td className="px-5 py-4 text-[#475467]">{subject.semester_name ?? "—"}</td>
                  <td className="px-5 py-4 text-[#0f766e]">{subject.code ?? "—"}</td>
                  <td className="px-5 py-4"><StatusBadge status={subject.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <IconButton label="Edit" onClick={() => setEditing(subject)}><Pencil size={15} /></IconButton>
                      <IconButton label="Delete" danger onClick={() => handleDelete(subject)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? (
        <SubjectForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      ) : null}
    </Card>
  )
}

function SubjectForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AdminSubject
  onClose: () => void
  onSaved: () => void
}) {
  const [courseId, setCourseId] = useState<string>(initial?.course_id ? String(initial.course_id) : "")
  const [semesterId, setSemesterId] = useState<string>(initial?.semester_id ? String(initial.semester_id) : "")
  const [name, setName] = useState(initial?.name ?? "")
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [semesters, setSemesters] = useState<AdminSemester[]>([])
  const [loadingDeps, setLoadingDeps] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAdminCourses().then((c) => setCourses(c.items)).catch(() => undefined)
  }, [])

  // Load the chosen course's semesters; keep the initial semester on first edit load.
  useEffect(() => {
    if (!courseId) {
      setSemesters([])
      setSemesterId("")
      return
    }
    setLoadingDeps(true)
    getAdminCourseSemesters(Number(courseId))
      .then((sem) => {
        setSemesters(sem.items)
        setSemesterId((current) =>
          sem.items.some((s) => String(s.id) === current) ? current : "",
        )
      })
      .catch(() => setError("Could not load semesters for this course."))
      .finally(() => setLoadingDeps(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  async function submit() {
    if (!courseId || !semesterId) {
      setError("Course and semester are required.")
      return
    }
    if (!name.trim()) {
      setError("Subject name is required.")
      return
    }
    setSaving(true)
    setError("")
    const payload = {
      name: name.trim(),
      course_id: Number(courseId),
      semester_id: Number(semesterId),
    }
    try {
      if (initial) await updateAdminSubject(initial.id, payload)
      else await createAdminSubject(payload)
      onSaved()
    } catch {
      setError("Could not save subject.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={initial ? "Edit subject" : "Add subject"}
      subtitle="Defined per course and semester, so the same name can exist in two courses."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className={labelClass}>
          <ReqLabel>Course</ReqLabel>
          <select className={fieldClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <ReqLabel>Semester</ReqLabel>
          <select
            className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#98a2b3]`}
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            disabled={!courseId || loadingDeps}
          >
            <option value="">
              {courseId ? (loadingDeps ? "Loading…" : "Select semester") : "Choose a course first"}
            </option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <ReqLabel>Subject name</ReqLabel>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Digital Marketing Strategy" />
        </label>
        {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
        <DrawerSubmit
          label={initial ? "Save changes" : "Add subject"}
          icon={initial ? undefined : <Plus size={16} aria-hidden="true" />}
          saving={saving}
          onClick={submit}
        />
      </div>
    </Drawer>
  )
}

/* ---------------------------------- Courses --------------------------------- */

function CoursesTab({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<AdminCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminCourses()
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(course: AdminCourse) {
    if (!window.confirm(`Delete course "${course.name}"? This removes its semesters, batches, and sections.`)) return
    await deleteAdminCourse(course.id)
    onChanged()
  }

  return (
    <Card title="Courses" description="Programs within a department. Manage batches, semesters and sections from a course.">
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="No courses yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Semesters</th>
                <th className="px-5 py-3">Sections</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {items.map((course) => (
                <tr key={course.id}>
                  <td className="px-5 py-4 font-semibold text-[#17202a]">{course.name}</td>
                  <td className="px-5 py-4">
                    <span className="rounded bg-[#eef2f7] px-2 py-0.5 text-xs font-semibold text-[#475467]">{course.code}</span>
                  </td>
                  <td className="px-5 py-4 text-[#475467]">{course.department_name ?? "—"}</td>
                  <td className="px-5 py-4 text-[#475467]">{course.total_semesters}</td>
                  <td className="px-5 py-4 text-[#475467]">{course.section_count}</td>
                  <td className="px-5 py-4"><StatusBadge status={course.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link to="/admin/courses" className="text-sm font-semibold text-[#0b5fff] hover:underline">
                        Manage
                      </Link>
                      <IconButton label="Delete" danger onClick={() => handleDelete(course)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function CourseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [totalSemesters, setTotalSemesters] = useState("2")
  const [durationYears, setDurationYears] = useState("1")
  const [departmentId, setDepartmentId] = useState("")
  const [departments, setDepartments] = useState<AdminDepartment[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAdminDepartments().then((d) => setDepartments(d.items)).catch(() => undefined)
  }, [])

  async function submit() {
    if (!departmentId) {
      setError("Please select a department.")
      return
    }
    if (!name.trim() || !code.trim()) {
      setError("Course name and code are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await createAdminCourse({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        total_semesters: Number(totalSemesters) || 1,
        duration_years: Number(durationYears) || 1,
        department_id: Number(departmentId),
      })
      onSaved()
    } catch {
      setError("Could not create course. The code may already exist.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title="Add course"
      subtitle="Programmes within a department. Adding a course creates its semesters automatically."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className={labelClass}>
          <ReqLabel>Department</ReqLabel>
          <select className={fieldClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <ReqLabel>Course name</ReqLabel>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="MBA — Human Resources" />
        </label>
        <label className={labelClass}>
          <ReqLabel>Code</ReqLabel>
          <input className={fieldClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MBA-HR" />
        </label>
        <div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <ReqLabel>Total semesters</ReqLabel>
              <input type="number" min={1} className={fieldClass} value={totalSemesters} onChange={(e) => setTotalSemesters(e.target.value)} />
            </label>
            <label className={labelClass}>
              <ReqLabel>Duration (years)</ReqLabel>
              <input type="number" min={1} className={fieldClass} value={durationYears} onChange={(e) => setDurationYears(e.target.value)} />
            </label>
          </div>
          <p className="mt-1.5 text-xs text-[#667085]">Semesters are created automatically.</p>
        </div>
        {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
        <DrawerSubmit label="Add course" icon={<Plus size={16} aria-hidden="true" />} saving={saving} onClick={submit} />
      </div>
    </Drawer>
  )
}

/* -------------------------- Batches / Semesters / Sections ------------------- */

function BatchesTab({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof getAdminAllBatches>>["items"]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getAdminAllBatches().then((d) => setItems(d.items)).finally(() => setLoading(false))
  }, [])
  async function handleDelete(b: { id: number; name: string }) {
    if (!window.confirm(`Delete batch "${b.name}"? Its sections and enrolments will be removed.`)) return
    await deleteAdminBatch(b.id)
    onChanged()
  }
  return (
    <Card title="Batches" description="Student cohorts within a course. Add batches from a course's page.">
      {loading ? <Loading /> : items.length === 0 ? <Empty text="No batches yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                <th className="px-5 py-3">Batch</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Years</th>
                <th className="px-5 py-3">Sections</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {items.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-4 font-semibold text-[#17202a]">{b.name}</td>
                  <td className="px-5 py-4 text-[#475467]">{b.course_name}</td>
                  <td className="px-5 py-4 text-[#475467]">{b.start_year}–{b.end_year}</td>
                  <td className="px-5 py-4 text-[#475467]">{b.section_count}</td>
                  <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <IconButton label="Delete" danger onClick={() => handleDelete(b)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function BatchForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [courseId, setCourseId] = useState("")
  const [name, setName] = useState("")
  const [startYear, setStartYear] = useState("")
  const [endYear, setEndYear] = useState("")
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAdminCourses().then((c) => setCourses(c.items)).catch(() => undefined)
  }, [])

  async function submit() {
    if (!courseId) {
      setError("Please select a course.")
      return
    }
    if (!name.trim() || !startYear || !endYear) {
      setError("Batch name, start year and end year are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await createAdminBatch(Number(courseId), {
        name: name.trim(),
        start_year: Number(startYear),
        end_year: Number(endYear),
      })
      onSaved()
    } catch {
      setError("Could not create batch.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title="Add batch"
      subtitle="The intake year group moving through a course together."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className={labelClass}>
          <ReqLabel>Course</ReqLabel>
          <select className={fieldClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <ReqLabel>Batch name</ReqLabel>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="2025–2027" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            <ReqLabel>Start year</ReqLabel>
            <input type="number" className={fieldClass} value={startYear} onChange={(e) => setStartYear(e.target.value)} placeholder="2025" />
          </label>
          <label className={labelClass}>
            <ReqLabel>End year</ReqLabel>
            <input type="number" className={fieldClass} value={endYear} onChange={(e) => setEndYear(e.target.value)} placeholder="2027" />
          </label>
        </div>
        {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
        <DrawerSubmit label="Add batch" icon={<Plus size={16} aria-hidden="true" />} saving={saving} onClick={submit} />
      </div>
    </Drawer>
  )
}

function SemestersTab({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof getAdminAllSemesters>>["items"]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getAdminAllSemesters().then((d) => setItems(d.items)).finally(() => setLoading(false))
  }, [])
  async function handleDelete(s: { id: number; name: string }) {
    if (!window.confirm(`Delete "${s.name}"? Its sections and subjects will be removed.`)) return
    await deleteAdminSemester(s.id)
    onChanged()
  }
  return (
    <Card
      title="Semesters"
      description="Created automatically with each course. Sections and subjects both hang off a semester."
    >
      {loading ? <Loading /> : items.length === 0 ? <Empty text="No semesters yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Sections</th>
                <th className="px-5 py-3">Subjects</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-4 font-semibold text-[#17202a]">{s.name}</td>
                  <td className="px-5 py-4 font-medium text-[#0f766e]">
                    {s.course_name} ({s.course_code})
                  </td>
                  <td className="px-5 py-4 text-[#475467]">{s.section_count}</td>
                  <td className="px-5 py-4 text-[#475467]">{s.subject_count}</td>
                  <td className="px-5 py-4"><StatusBadge status="active" /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <IconButton label="Delete" danger onClick={() => handleDelete(s)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function SectionsTab({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof getAdminSections>>["items"]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getAdminSections().then((d) => setItems(d.items)).finally(() => setLoading(false))
  }, [])
  async function handleDelete(s: { id: number; name: string }) {
    if (!window.confirm(`Delete section "${s.name}"? Its enrolments and faculty links will be removed.`)) return
    await deleteAdminSection(s.id)
    onChanged()
  }
  return (
    <Card title="Sections" description="Class sections. Assign faculty and enroll students from the Sections manager.">
      {loading ? <Loading /> : items.length === 0 ? <Empty text="No sections yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#eef2f7] text-left text-xs font-semibold uppercase text-[#667085]">
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Batch</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-4 font-semibold text-[#17202a]">{s.name}</td>
                  <td className="px-5 py-4 text-[#0f766e]">{s.course_name}</td>
                  <td className="px-5 py-4 text-[#475467]">{s.semester_name}</td>
                  <td className="px-5 py-4 text-[#475467]">{s.batch_name}</td>
                  <td className="px-5 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link to="/admin/sections" className="text-sm font-semibold text-[#0b5fff] hover:underline">
                        Manage
                      </Link>
                      <IconButton label="Delete" danger onClick={() => handleDelete(s)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function SectionForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [courseId, setCourseId] = useState("")
  const [semesterId, setSemesterId] = useState("")
  const [batchId, setBatchId] = useState("")
  const [name, setName] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [semesters, setSemesters] = useState<AdminSemester[]>([])
  const [batches, setBatches] = useState<AdminBatch[]>([])
  const [loadingDeps, setLoadingDeps] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAdminCourses().then((c) => setCourses(c.items)).catch(() => undefined)
  }, [])

  // When the course changes, load its semesters and batches, and reset picks.
  useEffect(() => {
    setSemesterId("")
    setBatchId("")
    setSemesters([])
    setBatches([])
    if (!courseId) return
    const id = Number(courseId)
    setLoadingDeps(true)
    Promise.all([getAdminCourseSemesters(id), getAdminCourseBatches(id)])
      .then(([sem, bat]) => {
        setSemesters(sem.items)
        setBatches(bat.items)
      })
      .catch(() => setError("Could not load semesters/batches for this course."))
      .finally(() => setLoadingDeps(false))
  }, [courseId])

  async function submit() {
    if (!courseId || !semesterId || !batchId) {
      setError("Course, semester and batch are required.")
      return
    }
    if (!name.trim()) {
      setError("Section name is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await createAdminSection(Number(courseId), {
        semester_id: Number(semesterId),
        batch_id: Number(batchId),
        name: name.trim(),
        academic_year: academicYear.trim() || undefined,
      })
      onSaved()
    } catch {
      setError("Could not create section. It may already exist.")
    } finally {
      setSaving(false)
    }
  }

  const depPlaceholder = courseId
    ? loadingDeps
      ? "Loading…"
      : "Select"
    : "Choose a course first"

  return (
    <Drawer
      title="Add section"
      subtitle="A class of students in one semester of one batch. Faculty teach sections."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className={labelClass}>
          <ReqLabel>Course</ReqLabel>
          <select className={fieldClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <ReqLabel>Semester</ReqLabel>
          <select
            className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#98a2b3]`}
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            disabled={!courseId || loadingDeps}
          >
            <option value="">{depPlaceholder}</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <ReqLabel>Batch</ReqLabel>
          <select
            className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#98a2b3]`}
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            disabled={!courseId || loadingDeps}
          >
            <option value="">{depPlaceholder}</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <ReqLabel>Section name</ReqLabel>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="MBA-MKT S1-C" />
        </label>
        <label className={labelClass}>
          Academic year
          <input className={fieldClass} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2025-26" />
        </label>
        {error ? <p className="rounded-md bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</p> : null}
        <DrawerSubmit label="Add section" icon={<Plus size={16} aria-hidden="true" />} saving={saving} onClick={submit} />
      </div>
    </Drawer>
  )
}

/* ------------------------------- tiny helpers ------------------------------- */

function IconButton({
  children,
  label,
  danger,
  onClick,
}: {
  children: React.ReactNode
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid size-8 place-items-center rounded-md border border-[#dde4ec] transition ${
        danger ? "text-[#b42318] hover:bg-[#fff5f5]" : "text-[#475467] hover:bg-[#f5f7fa]"
      }`}
    >
      {children}
    </button>
  )
}


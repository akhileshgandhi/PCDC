import {
  KeyRound,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldOff,
  ShieldCheck,
  Trash2,
  UserCog,
  Eye,
} from "lucide-react"
import type { FormEvent, ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import {
  createAdminUser,
  deleteAdminUser,
  getAdminCourseBatches,
  getAdminCourses,
  getAdminCourseSections,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserRole,
  updateAdminUserStatus,
  type AdminBatch,
  type AdminCourse,
  type AdminSection,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
} from "../../api/admin"
import AdminLayout from "../../layouts/AdminLayout"

const roles: Array<{ label: string; value: "" | AdminUserRole }> = [
  { label: "All Roles", value: "" },
  { label: "Student", value: "student" },
  { label: "Faculty", value: "faculty" },
  { label: "Admin", value: "admin" },
]

const statuses: Array<{ label: string; value: "" | AdminUserStatus }> = [
  { label: "All Status", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
]

const pageSize = 25

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("")
  const [tab, setTab] = useState<"all" | "faculty" | "student">("all")
  const [status, setStatus] = useState("")
  const [program, setProgram] = useState("")
  const [batch, setBatch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [showAddUser, setShowAddUser] = useState(searchParams.get("action") === "add")
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showingStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const showingEnd = Math.min(page * pageSize, total)

  async function loadUsers(nextPage = page) {
    setIsLoading(true)
    try {
      const effectiveRole = tab === "all" ? role : tab
      const data = await getAdminUsers({
        search,
        role: effectiveRole,
        status,
        program,
        batch,
        page: nextPage,
        page_size: pageSize,
      })
      setUsers(data.items)
      setTotal(data.total)
      setPage(data.page)
      setError("")
    } catch {
      setError("Unable to load users right now.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, role, status, program, batch])

  useEffect(() => {
    setShowAddUser(searchParams.get("action") === "add")
  }, [searchParams])

  const activeCount = useMemo(
    () => users.filter((user) => user.status === "active").length,
    [users],
  )

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    loadUsers(1)
  }

  function closeAddUser() {
    setSearchParams({})
    setShowAddUser(false)
  }

  async function handleUserCreated(message: string) {
    setNotice(message)
    closeAddUser()
    await loadUsers(1)
  }

  async function handleUserUpdated(updated: AdminUser) {
    setUsers((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )
    setEditingUser(null)
    setNotice(`${updated.name} updated successfully.`)
  }

  async function handleDeleteUser(user: AdminUser) {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This cannot be undone.`)) {
      return
    }
    try {
      await deleteAdminUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setTotal((prev) => prev - 1)
      setNotice(`${user.name} has been deleted.`)
    } catch {
      setError("Unable to delete user.")
    }
  }

  async function handleStatusToggle(user: AdminUser) {
    const nextStatus = user.status === "active" ? "inactive" : "active"
    try {
      const updated = await updateAdminUserStatus(user.id, nextStatus)
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setNotice(`${updated.name} is now ${updated.status}.`)
    } catch {
      setError("Unable to update user status.")
    }
  }

  async function handlePasswordReset(user: AdminUser) {
    try {
      await resetAdminUserPassword(user.id)
      setNotice(`Password reset email queued for ${user.name}.`)
    } catch {
      setError("Unable to queue password reset.")
    }
  }

  async function handleRoleChange(user: AdminUser, nextRole: AdminUserRole) {
    if (nextRole === user.role) {
      return
    }
    try {
      const updated = await updateAdminUserRole(user.id, nextRole)
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setNotice(`${updated.name} role changed to ${titleCase(updated.role)}.`)
    } catch {
      setError("Unable to update user role.")
    }
  }

  const gridClass =
    tab === "faculty"
      ? "lg:grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_0.8fr_0.7fr_1.3fr]"
      : tab === "student"
        ? "lg:grid-cols-[1.5fr_1fr_1fr_0.9fr_0.8fr_0.7fr_1.3fr]"
        : "lg:grid-cols-[1.6fr_0.9fr_0.9fr_1fr_0.7fr_1.1fr_1.3fr]"

  const nameColumn: UserColumn = {
    label: "Name",
    render: (user) => (
      <div className="min-w-0">
        <Link
          to={`/admin/user/${user.id}`}
          className="truncate text-sm font-semibold text-[#17202a] transition hover:text-[#176b5a]"
        >
          {user.name}
        </Link>
        <p className="mt-1 truncate text-sm text-[#667085]">{user.email}</p>
        <p className="mt-2 text-xs text-[#667085] lg:hidden">
          {titleCase(user.role)}
          {user.program ? ` · ${user.program}` : ""}
        </p>
      </div>
    ),
  }
  const programColumn: UserColumn = {
    label: "Program",
    render: (user) => (
      <span className="text-sm font-medium text-[#17202a]">{user.program || "-"}</span>
    ),
  }
  const courseSectionColumn: UserColumn = {
    label: "Course / Section",
    render: (user) => (
      <span className="text-sm text-[#667085]">
        {user.course_name && user.section_name
          ? `${user.course_name} · ${user.section_name}`
          : user.course_name || "-"}
      </span>
    ),
  }
  const statusColumn: UserColumn = {
    label: "Status",
    render: (user) => <StatusBadge status={user.status} />,
  }
  const lastLoginColumn: UserColumn = {
    label: "Last Login",
    render: (user) => (
      <span className="text-sm text-[#667085]">
        {user.last_login_at ? formatDate(user.last_login_at) : "Never"}
      </span>
    ),
  }

  let columns: UserColumn[]
  if (tab === "faculty") {
    columns = [
      {
        label: "Faculty",
        render: (user) => (
          <div className="min-w-0">
            <Link
              to={`/admin/user/${user.id}`}
              className="truncate text-sm font-semibold text-[#17202a] transition hover:text-[#176b5a]"
            >
              {user.name}
            </Link>
            <p className="mt-1 truncate text-sm text-[#667085]">{user.email}</p>
          </div>
        ),
      },
      {
        label: "Department",
        render: (user) => (
          <span className="text-sm text-[#17202a]">{user.department || "-"}</span>
        ),
      },
      {
        label: "Designation",
        render: (user) => (
          <span className="text-sm text-[#17202a]">{user.designation || "-"}</span>
        ),
      },
      {
        label: "Employee ID",
        render: (user) => (
          <span className="text-sm font-medium text-[#17202a]">{user.employee_id || "-"}</span>
        ),
      },
      {
        label: "Experience",
        render: (user) => (
          <span className="text-sm text-[#667085]">
            {user.experience_years != null ? `${user.experience_years} yrs` : "-"}
          </span>
        ),
      },
      {
        label: "Teaching",
        render: (user) => (
          <span className={`text-sm font-medium ${user.sections_teaching > 0 ? "text-[#176b5a]" : "text-[#667085]"}`}>
            {user.sections_teaching > 0 ? `${user.sections_teaching} section${user.sections_teaching !== 1 ? "s" : ""}` : "—"}
          </span>
        ),
      },
      statusColumn,
      lastLoginColumn,
    ]
  } else if (tab === "student") {
    columns = [
      {
        label: "Student",
        render: (user) => (
          <div className="min-w-0">
            <Link
              to={`/admin/user/${user.id}`}
              className="truncate text-sm font-semibold text-[#17202a] transition hover:text-[#176b5a]"
            >
              {user.name}
            </Link>
            <p className="mt-1 truncate text-sm text-[#667085]">{user.email}</p>
          </div>
        ),
      },
      {
        label: "Department",
        render: (user) => (
          <span className="text-sm text-[#17202a]">{user.department || "-"}</span>
        ),
      },
      {
        label: "College ID",
        render: (user) => (
          <span className="text-sm font-medium text-[#17202a]">{user.college_id || "-"}</span>
        ),
      },
      programColumn,
      {
        label: "Batch",
        render: (user) => (
          <span className="text-sm text-[#667085]">
            {user.batch_name || (user.admission_year ? `${user.admission_year}` : "-")}
          </span>
        ),
      },
      statusColumn,
    ]
  } else {
    columns = [
      nameColumn,
      {
        label: "Role",
        render: (user) => (
          <select
            value={user.role}
            onChange={(event) => handleRoleChange(user, event.target.value as AdminUserRole)}
            className="h-10 rounded-md border border-[#dde4ec] bg-white px-2 text-sm font-medium outline-none"
            aria-label={`Change role for ${user.name}`}
          >
            {roles
              .filter((option) => option.value)
              .map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        ),
      },
      programColumn,
      courseSectionColumn,
      statusColumn,
      lastLoginColumn,
    ]
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#17202a]">
                Users
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                Manage every account in the closed PCDC system.
              </p>
            </div>

          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <StatPill label="Loaded" value={users.length} />
            <StatPill label="Active" value={activeCount} />
            <StatPill label="Total" value={total} />
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "all", label: "All Users" },
              { key: "faculty", label: "Faculty" },
              { key: "student", label: "Students" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                tab === item.key
                  ? "bg-[#102033] text-white shadow-sm"
                  : "border border-[#dde4ec] bg-white text-[#17202a] hover:border-[#34c6a3]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="rounded-lg border border-[#dde4ec] bg-white p-4 shadow-sm">
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-3 xl:grid-cols-[1fr_150px_150px_160px_130px_auto]"
          >
            <label className="flex h-11 items-center gap-3 rounded-md border border-[#dde4ec] bg-white px-3 text-[#667085] transition focus-within:border-[#34c6a3] focus-within:ring-2 focus-within:ring-[#34c6a3]/20">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search users</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email..."
                className="w-full bg-transparent text-sm font-medium text-[#17202a] outline-none placeholder:text-[#667085]"
              />
            </label>

            {tab === "all" ? (
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                aria-label="Role"
              >
                {roles.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="hidden xl:block" aria-hidden="true" />
            )}

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              aria-label="Status"
            >
              {statuses.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              value={program}
              onChange={(event) => setProgram(event.target.value)}
              placeholder="Program"
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            />

            <input
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
              placeholder="Batch"
              inputMode="numeric"
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            />

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#102033] px-4 text-sm font-semibold text-white transition hover:bg-[#1b3452]"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Apply
            </button>
          </form>
        </section>

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

        <section className="overflow-hidden rounded-lg border border-[#dde4ec] bg-white shadow-sm">
          <div className={`hidden gap-4 border-b border-[#dde4ec] bg-[#f5f7fa] px-5 py-3 text-xs font-semibold uppercase text-[#667085] lg:grid ${gridClass}`}>
            {columns.map((column) => (
              <span key={column.label}>{column.label}</span>
            ))}
            <span>Actions</span>
          </div>

          {isLoading ? (
            <div className="px-5 py-12 text-center text-sm font-medium text-[#667085]">
              Loading users...
            </div>
          ) : users.length > 0 ? (
            <div className="divide-y divide-[#dde4ec]">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  columns={columns}
                  gridClass={gridClass}
                  onStatusToggle={handleStatusToggle}
                  onPasswordReset={handlePasswordReset}
                  onEdit={setEditingUser}
                  onDelete={handleDeleteUser}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <h2 className="text-lg font-semibold text-[#17202a]">No users found.</h2>
              <p className="mt-2 text-sm text-[#667085]">
                Adjust filters or add the first account for this cohort.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-[#dde4ec] px-5 py-4 text-sm text-[#667085] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {showingStart}-{showingEnd} of {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => loadUsers(page - 1)}
                className="rounded-md border border-[#dde4ec] px-3 py-2 font-semibold text-[#17202a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => loadUsers(page + 1)}
                className="rounded-md border border-[#dde4ec] px-3 py-2 font-semibold text-[#17202a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {showAddUser ? (
        <AddUserDialog
          initialRole={tab === "faculty" ? "faculty" : "student"}
          onClose={closeAddUser}
          onCreated={handleUserCreated}
        />
      ) : null}

      {editingUser ? (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={handleUserUpdated}
        />
      ) : null}
    </AdminLayout>
  )
}

interface UserColumn {
  label: string
  render: (user: AdminUser) => ReactNode
}

interface UserRowProps {
  user: AdminUser
  columns: UserColumn[]
  gridClass: string
  onStatusToggle: (user: AdminUser) => void
  onPasswordReset: (user: AdminUser) => void
  onEdit: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
}

function UserRow({
  user,
  columns,
  gridClass,
  onStatusToggle,
  onPasswordReset,
  onEdit,
  onDelete,
}: UserRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  return (
    <article className={`grid gap-4 px-5 py-4 lg:items-center ${gridClass}`}>
      {columns.map((column) => (
        <div key={column.label} className="min-w-0">
          {column.render(user)}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onStatusToggle(user)}
          className="inline-flex size-9 items-center justify-center rounded-md border border-[#dde4ec] text-[#102033] transition hover:border-[#34c6a3] hover:bg-[#e8f8f4]"
          aria-label={user.status === "active" ? `Deactivate ${user.name}` : `Reactivate ${user.name}`}
          title={user.status === "active" ? "Deactivate" : "Reactivate"}
        >
          {user.status === "active" ? (
            <ShieldOff size={16} aria-hidden="true" />
          ) : (
            <ShieldCheck size={16} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onPasswordReset(user)}
          className="inline-flex size-9 items-center justify-center rounded-md border border-[#dde4ec] text-[#102033] transition hover:border-[#34c6a3] hover:bg-[#e8f8f4]"
          aria-label={`Reset password for ${user.name}`}
          title="Reset password"
        >
          <KeyRound size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(user)}
          className="inline-flex size-9 items-center justify-center rounded-md border border-[#dde4ec] text-[#102033] transition hover:border-[#34c6a3] hover:bg-[#e8f8f4]"
          aria-label={`Edit ${user.name}`}
          title="Edit"
        >
          <UserCog size={16} aria-hidden="true" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-[#dde4ec] text-[#102033] transition hover:border-[#34c6a3] hover:bg-[#e8f8f4]"
            aria-label={`More actions for ${user.name}`}
            title="More"
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-10 z-20 min-w-[180px] rounded-md border border-[#dde4ec] bg-white py-1 shadow-lg">
              <Link
                to={`/admin/user/${user.id}`}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#17202a] hover:bg-[#f5f7fa]"
                onClick={() => setMenuOpen(false)}
              >
                <Eye size={15} aria-hidden="true" />
                View Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(user)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#b42318] hover:bg-[#fff5f5]"
              >
                <Trash2 size={15} aria-hidden="true" />
                Delete User
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

interface AddUserDialogProps {
  onClose: () => void
  onCreated: (message: string) => void
  initialRole?: AdminUserRole
}

function AddUserDialog({ onClose, onCreated, initialRole }: AddUserDialogProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<AdminUserRole>(initialRole ?? "student")
  const [program, setProgram] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [admissionYear, setAdmissionYear] = useState("")
  const [department, setDepartment] = useState("")
  const [designation, setDesignation] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [experienceYears, setExperienceYears] = useState("")
  const [collegeId, setCollegeId] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [batches, setBatches] = useState<AdminBatch[]>([])
  const [sections, setSections] = useState<AdminSection[]>([])
  const [courseId, setCourseId] = useState("")
  const [batchId, setBatchId] = useState("")
  const [sectionId, setSectionId] = useState("")

  useEffect(() => {
    if (role !== "student") return
    let isMounted = true
    getAdminCourses()
      .then((data) => {
        if (isMounted) setCourses(data.items)
      })
      .catch(() => {
        if (isMounted) setCourses([])
      })
    return () => {
      isMounted = false
    }
  }, [role])

  useEffect(() => {
    setBatchId("")
    setSectionId("")
    setBatches([])
    setSections([])
    if (!courseId) return
    let isMounted = true
    Promise.all([
      getAdminCourseBatches(Number(courseId)),
      getAdminCourseSections(Number(courseId)),
    ])
      .then(([batchData, sectionData]) => {
        if (isMounted) {
          setBatches(batchData.items)
          setSections(sectionData.items)
        }
      })
      .catch(() => {
        if (isMounted) {
          setBatches([])
          setSections([])
        }
      })
    return () => {
      isMounted = false
    }
  }, [courseId])

  const sectionsForBatch = sections.filter(
    (section) => batches.find((batch) => String(batch.id) === batchId)?.name === section.batch_name,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError("")
    try {
      const result = await createAdminUser({
        name,
        email,
        role,
        program: program || undefined,
        specialization: specialization || undefined,
        admission_year: admissionYear ? Number(admissionYear) : undefined,
        section_id: role === "student" && sectionId ? Number(sectionId) : undefined,
        department: (role === "faculty" || role === "student") && department ? department : undefined,
        designation: role === "faculty" && designation ? designation : undefined,
        employee_id: role === "faculty" && employeeId ? employeeId : undefined,
        experience_years: role === "faculty" && experienceYears ? Number(experienceYears) : undefined,
        college_id: role === "student" && collegeId ? collegeId : undefined,
      })
      onCreated(`Created ${result.user.name}; welcome email queued.`)
    } catch {
      setError("Unable to create user. Check email uniqueness and required fields.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102033]/45 p-4">
      <div className="w-full max-w-xl">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg bg-white p-5 shadow-xl sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#17202a]">Add User</h2>
              <p className="mt-1 text-sm text-[#667085]">
                Account creation queues onboarding email automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Name">
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              />
            </Field>
            <Field label="Role">
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as AdminUserRole)}
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              >
                {roles
                  .filter((option) => option.value)
                  .map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Program">
                <input
                  value={program}
                  onChange={(event) => setProgram(event.target.value)}
                  className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                />
              </Field>
              <Field label="Batch">
                <input
                  value={admissionYear}
                  onChange={(event) => setAdmissionYear(event.target.value)}
                  inputMode="numeric"
                  className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                />
              </Field>
            </div>
            <Field label="Specialization">
              <input
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              />
            </Field>
            {role === "faculty" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department">
                  <input
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
                <Field label="Designation">
                  <input
                    value={designation}
                    onChange={(event) => setDesignation(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
                <Field label="Employee ID">
                  <input
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
                <Field label="Experience (Years)">
                  <input
                    value={experienceYears}
                    onChange={(event) => setExperienceYears(event.target.value)}
                    inputMode="numeric"
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
              </div>
            ) : null}
            {role === "student" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Department">
                    <input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                    />
                  </Field>
                  <Field label="College ID">
                    <input
                      value={collegeId}
                      onChange={(event) => setCollegeId(event.target.value)}
                      className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Course">
                    <select
                      value={courseId}
                      onChange={(event) => setCourseId(event.target.value)}
                      className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                    >
                      <option value="">No course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Batch">
                    <select
                      value={batchId}
                      onChange={(event) => setBatchId(event.target.value)}
                      disabled={!courseId}
                      className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Select batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Section">
                    <select
                      value={sectionId}
                      onChange={(event) => setSectionId(event.target.value)}
                      disabled={!batchId}
                      className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Select section</option>
                      {sectionsForBatch.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name} ({section.semester_name})
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-[#f3c4c4] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#dde4ec] px-4 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-[#34c6a3] px-4 py-3 text-sm font-semibold text-[#102033] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EditUserDialogProps {
  user: AdminUser
  onClose: () => void
  onSaved: (updated: AdminUser) => void
}

function EditUserDialog({ user, onClose, onSaved }: EditUserDialogProps) {
  const [name, setName] = useState(user.name)
  const [program, setProgram] = useState(user.program || "")
  const [specialization, setSpecialization] = useState(user.specialization || "")
  const [admissionYear, setAdmissionYear] = useState(
    user.admission_year ? String(user.admission_year) : "",
  )
  const [department, setDepartment] = useState(user.department || "")
  const [designation, setDesignation] = useState(user.designation || "")
  const [employeeId, setEmployeeId] = useState(user.employee_id || "")
  const [experienceYears, setExperienceYears] = useState(
    user.experience_years != null ? String(user.experience_years) : "",
  )
  const [collegeId, setCollegeId] = useState(user.college_id || "")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError("")
    try {
      const updated = await updateAdminUser(user.id, {
        name: name !== user.name ? name : undefined,
        program: program !== (user.program || "") ? program : undefined,
        specialization:
          specialization !== (user.specialization || "") ? specialization : undefined,
        admission_year:
          admissionYear !== (user.admission_year ? String(user.admission_year) : "")
            ? admissionYear
              ? Number(admissionYear)
              : 0
            : undefined,
        department: department !== (user.department || "") ? department : undefined,
        designation: designation !== (user.designation || "") ? designation : undefined,
        employee_id: employeeId !== (user.employee_id || "") ? employeeId : undefined,
        experience_years:
          experienceYears !== (user.experience_years != null ? String(user.experience_years) : "")
            ? experienceYears
              ? Number(experienceYears)
              : 0
            : undefined,
        college_id: collegeId !== (user.college_id || "") ? collegeId : undefined,
      })
      onSaved(updated)
    } catch {
      setError("Unable to update user.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102033]/45 p-4">
      <div className="w-full max-w-xl">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg bg-white p-5 shadow-xl sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#17202a]">Edit User</h2>
              <p className="mt-1 text-sm text-[#667085]">
                {user.email} · {titleCase(user.role)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Name">
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Program">
                <input
                  value={program}
                  onChange={(event) => setProgram(event.target.value)}
                  className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                />
              </Field>
              <Field label="Specialization">
                <input
                  value={specialization}
                  onChange={(event) => setSpecialization(event.target.value)}
                  className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                />
              </Field>
            </div>

            {user.role === "faculty" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department">
                  <input
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
                <Field label="Designation">
                  <input
                    value={designation}
                    onChange={(event) => setDesignation(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
                <Field label="Employee ID">
                  <input
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
                <Field label="Experience (Years)">
                  <input
                    value={experienceYears}
                    onChange={(event) => setExperienceYears(event.target.value)}
                    inputMode="numeric"
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
              </div>
            ) : null}

            {user.role === "student" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department">
                  <input
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
                <Field label="College ID">
                  <input
                    value={collegeId}
                    onChange={(event) => setCollegeId(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
                <Field label="Admission Year">
                  <input
                    value={admissionYear}
                    onChange={(event) => setAdmissionYear(event.target.value)}
                    inputMode="numeric"
                    className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
                  />
                </Field>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-[#f3c4c4] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#dde4ec] px-4 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-[#34c6a3] px-4 py-3 text-sm font-semibold text-[#102033] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  children: ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#17202a]">{label}</span>
      {children}
    </label>
  )
}

interface StatusBadgeProps {
  status: AdminUserStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const className =
    status === "active" ? "bg-[#ecfdf3] text-[#027a48]" : "bg-[#f2f4f7] text-[#475467]"

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {titleCase(status)}
    </span>
  )
}

interface StatPillProps {
  label: string
  value: number
}

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="rounded-full border border-[#dde4ec] bg-[#f5f7fa] px-4 py-2 text-sm">
      <span className="font-semibold text-[#17202a]">{label}:</span>{" "}
      <span className="font-semibold text-[#176b5a]">{value}</span>
    </div>
  )
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

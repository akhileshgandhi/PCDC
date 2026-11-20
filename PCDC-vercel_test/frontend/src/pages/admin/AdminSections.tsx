import { AlertTriangle, Plus, Upload, Users as UsersIcon } from "lucide-react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import {
  assignAdminSectionFaculty,
  bulkEnrollAdminSectionStudents,
  createAdminBatch,
  createAdminSection,
  enrollAdminSectionStudents,
  getAdminCourseBatches,
  getAdminCourseSemesters,
  getAdminCourses,
  getAdminSection,
  getAdminSectionEligibleStudents,
  getAdminSections,
  getAdminUsers,
  removeAdminSectionFaculty,
  removeAdminSectionStudent,
  type AdminBatch,
  type AdminCourse,
  type AdminEligibleStudent,
  type AdminSectionDetail,
  type AdminSectionListItem,
  type AdminSemester,
  type AdminUser,
} from "../../api/admin"
import { specializationLabel } from "../../utils/specialization"
import { ListToolbar, Pager } from "../../components/common/ListControls"
import { useListControls } from "../../hooks/useListControls"
import AdminLayout from "../../layouts/AdminLayout"

export default function AdminSections() {
  // Arriving via a "Manage" link from Academic Setup with ?courseId=&batchId=
  // narrows straight to that section's own batch instead of dumping the
  // admin into every section ever created — the admin still picks Manage
  // Faculty or Manage Students themselves from there.
  const [searchParams] = useSearchParams()

  const [sections, setSections] = useState<AdminSectionListItem[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [courseId, setCourseId] = useState(searchParams.get("courseId") ?? "")
  const [batchId, setBatchId] = useState(searchParams.get("batchId") ?? "")
  const [status, setStatus] = useState("")
  const [batches, setBatches] = useState<AdminBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [showAddSection, setShowAddSection] = useState(false)
  const [manageFacultySectionId, setManageFacultySectionId] = useState<number | null>(null)
  const [manageStudentsSectionId, setManageStudentsSectionId] = useState<number | null>(null)

  async function loadSections() {
    setIsLoading(true)
    try {
      const data = await getAdminSections({
        course_id: courseId ? Number(courseId) : undefined,
        batch_id: batchId ? Number(batchId) : undefined,
        status: status || undefined,
      })
      setSections(data.items)
      setError("")
    } catch {
      setError("Unable to load sections right now.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getAdminCourses()
      .then((data) => setCourses(data.items))
      .catch(() =>
        setError("Unable to load specializations — \"New Section\" needs at least one to work."),
      )
  }, [])

  // Skips the batch reset on the very first run — a ?courseId=&batchId=
  // pair arriving from a "Manage" link must survive this effect's first
  // pass, not get wiped before the batch list even loads.
  const isFirstCourseEffect = useRef(true)
  useEffect(() => {
    if (!isFirstCourseEffect.current) setBatchId("")
    isFirstCourseEffect.current = false
    if (!courseId) {
      setBatches([])
      return
    }
    getAdminCourseBatches(Number(courseId))
      .then((data) => setBatches(data.items))
      .catch(() => setError("Could not load batches for this specialization."))
  }, [courseId])

  useEffect(() => {
    loadSections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, batchId, status])

  const list = useListControls(
    sections,
    (s, q) =>
      s.name.toLowerCase().includes(q) ||
      s.course_name.toLowerCase().includes(q) ||
      s.semester_name.toLowerCase().includes(q) ||
      s.batch_name.toLowerCase().includes(q),
  )

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#17202a]">Sections</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                Assign faculty and enroll students into every class section across all specializations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSection(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3b82f6]"
            >
              <Plus size={17} aria-hidden="true" />
              New Section
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
              aria-label="Filter by specialization"
            >
              <option value="">All Specializations</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {specializationLabel(course)}
                </option>
              ))}
            </select>
            <select
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              disabled={!courseId}
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Filter by batch"
            >
              <option value="">All Batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </section>

        {notice ? (
          <div className="rounded-lg border border-[#a6f4c5] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#067647]">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-8 text-center text-sm font-medium text-[#667085] shadow-sm">
            Loading sections...
          </section>
        ) : sections.length === 0 ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#17202a]">No sections found.</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Adjust filters or create the first class section for a specialization.
            </p>
          </section>
        ) : (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
            <ListToolbar
              query={list.query}
              onQueryChange={list.setQuery}
              pageSize={list.pageSize}
              onPageSizeChange={list.setPageSize}
              placeholder="Search sections..."
            />
            {list.paged.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-[#667085]">No sections match that search.</p>
            ) : (
              <div className="space-y-3">
                {list.paged.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    onManageFaculty={() => setManageFacultySectionId(section.id)}
                    onManageStudents={() => setManageStudentsSectionId(section.id)}
                  />
                ))}
              </div>
            )}
            <Pager page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPageChange={list.setPage} />
          </section>
        )}
      </div>

      {showAddSection ? (
        <NewSectionDialog
          courses={courses}
          defaultCourseId={courseId}
          onClose={() => setShowAddSection(false)}
          onCreated={async () => {
            setShowAddSection(false)
            setNotice("Section created.")
            await loadSections()
          }}
        />
      ) : null}

      {manageFacultySectionId ? (
        <ManageFacultyDialog
          sectionId={manageFacultySectionId}
          onClose={() => setManageFacultySectionId(null)}
          onChanged={loadSections}
        />
      ) : null}

      {manageStudentsSectionId ? (
        <ManageStudentsDialog
          sectionId={manageStudentsSectionId}
          onClose={() => setManageStudentsSectionId(null)}
          onChanged={loadSections}
        />
      ) : null}
    </AdminLayout>
  )
}

interface SectionCardProps {
  section: AdminSectionListItem
  onManageFaculty: () => void
  onManageStudents: () => void
}

function SectionCard({ section, onManageFaculty, onManageStudents }: SectionCardProps) {
  return (
    <article className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#17202a]">
            {section.course_name} · {section.semester_name} · {section.batch_name} ·{" "}
            {section.name}
          </h3>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-[#667085]">Faculty:</span>
            {section.faculty.length === 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#b42318]">
                <AlertTriangle size={13} aria-hidden="true" />
                Unassigned
              </span>
            ) : (
              <span className="text-[#17202a]">
                {section.faculty
                  .map((faculty) => `${faculty.faculty_name} (${faculty.subject})`)
                  .join(", ")}
              </span>
            )}
          </p>
          <p className="mt-1 flex items-center gap-4 text-sm text-[#667085]">
            <span className="inline-flex items-center gap-1">
              <UsersIcon size={14} aria-hidden="true" />
              {section.student_count} students enrolled
            </span>
            <span>{section.cases_assigned_count} cases assigned</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onManageFaculty}
            className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold text-[#0c1f3d] transition hover:border-[#2563eb]"
          >
            Manage Faculty
          </button>
          <button
            type="button"
            onClick={onManageStudents}
            className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold text-[#0c1f3d] transition hover:border-[#2563eb]"
          >
            Manage Students
          </button>
        </div>
      </div>
    </article>
  )
}

interface NewSectionDialogProps {
  courses: AdminCourse[]
  defaultCourseId?: string
  onClose: () => void
  onCreated: () => void
}

function NewSectionDialog({ courses, defaultCourseId, onClose, onCreated }: NewSectionDialogProps) {
  // Arriving with a specialization already decided by the page's own filter
  // (e.g. via a "Manage" link) locks it in — no dropdown, nothing to
  // reselect. Only when no filter is active does it fall back to a normal
  // dropdown defaulting to the first specialization.
  const fixedCourse = courses.find((course) => String(course.id) === defaultCourseId) ?? null
  const [courseId, setCourseId] = useState(
    fixedCourse ? String(fixedCourse.id) : courses[0] ? String(courses[0].id) : "",
  )
  const [batches, setBatches] = useState<AdminBatch[]>([])
  const [semesters, setSemesters] = useState<AdminSemester[]>([])
  const [batchId, setBatchId] = useState("")
  const [semesterId, setSemesterId] = useState("")
  const [name, setName] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [batchName, setBatchName] = useState("")
  const [startYear, setStartYear] = useState("")
  const [endYear, setEndYear] = useState("")
  const [creatingBatch, setCreatingBatch] = useState(false)

  useEffect(() => {
    if (!courseId) {
      setBatches([])
      setSemesters([])
      return
    }
    Promise.all([getAdminCourseBatches(Number(courseId)), getAdminCourseSemesters(Number(courseId))])
      .then(([batchData, semesterData]) => {
        setBatches(batchData.items)
        setSemesters(semesterData.items)
        setBatchId(batchData.items[0] ? String(batchData.items[0].id) : "")
        setSemesterId(semesterData.items[0] ? String(semesterData.items[0].id) : "")
      })
      .catch(() => setError("Could not load batches/semesters for this specialization."))
  }, [courseId])

  async function reloadBatches(selectId?: number) {
    if (!courseId) return
    const batchData = await getAdminCourseBatches(Number(courseId))
    setBatches(batchData.items)
    const pick = selectId ?? batchData.items[0]?.id
    setBatchId(pick ? String(pick) : "")
  }

  async function handleCreateBatch() {
    if (!courseId || !batchName.trim() || !startYear || !endYear) {
      setError("Enter a batch name, start year, and end year.")
      return
    }
    if (Number(endYear) < Number(startYear)) {
      setError("End year must not be before start year.")
      return
    }
    setCreatingBatch(true)
    setError("")
    try {
      const created = await createAdminBatch(Number(courseId), {
        name: batchName.trim(),
        start_year: Number(startYear),
        end_year: Number(endYear),
      })
      await reloadBatches(created.id)
      setShowBatchForm(false)
      setBatchName("")
      setStartYear("")
      setEndYear("")
    } catch {
      setError("Unable to create batch. Check the details and try again.")
    } finally {
      setCreatingBatch(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!courseId) {
      setError("Select a specialization first.")
      return
    }
    if (!batchId) {
      setError("This specialization has no batch yet. Create a batch below before adding a section.")
      return
    }
    if (!semesterId) {
      setError("This specialization has no semesters set up. Check the specialization configuration.")
      return
    }
    setIsSaving(true)
    setError("")
    try {
      await createAdminSection(Number(courseId), {
        semester_id: Number(semesterId),
        batch_id: Number(batchId),
        name,
        academic_year: academicYear || undefined,
      })
      onCreated()
    } catch {
      setError("Unable to create section. It may already exist.")
    } finally {
      setIsSaving(false)
    }
  }

  if (courses.length === 0) {
    return (
      <Modal title="Create New Section" onClose={onClose}>
        <p className="rounded-md border border-[#f5d9a8] bg-[#fff8ec] px-3 py-2 text-sm font-medium text-[#8a5a00]">
          No specializations found yet. A section always belongs to one — add a specialization
          under Academic Setup first, then come back here.
        </p>
      </Modal>
    )
  }

  return (
    <Modal title="Create New Section" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <DialogField label="Specialization">
          {fixedCourse ? (
            <p className="flex h-11 w-full items-center rounded-md border border-[#dde4ec] bg-[#f5f7fa] px-3 text-sm font-semibold text-[#17202a]">
              {specializationLabel(fixedCourse)}
            </p>
          ) : (
            <select
              required
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {specializationLabel(course)}
                </option>
              ))}
            </select>
          )}
        </DialogField>
        <div className="grid gap-4 sm:grid-cols-2">
          <DialogField label="Batch">
            {batches.length === 0 ? (
              <div className="grid gap-2">
                <p className="rounded-md border border-[#f5d9a8] bg-[#fff8ec] px-3 py-2 text-sm font-medium text-[#8a5a00]">
                  This specialization has no batch yet. A section needs a batch — create one to continue.
                </p>
                {showBatchForm ? (
                  <div className="grid gap-2 rounded-md border border-[#dde4ec] p-3">
                    <input
                      value={batchName}
                      onChange={(event) => setBatchName(event.target.value)}
                      placeholder="Batch name (e.g. 2025-2027)"
                      className="h-10 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={startYear}
                        onChange={(event) => setStartYear(event.target.value)}
                        placeholder="Start year"
                        className="h-10 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                      />
                      <input
                        type="number"
                        value={endYear}
                        onChange={(event) => setEndYear(event.target.value)}
                        placeholder="End year"
                        className="h-10 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateBatch}
                      disabled={creatingBatch}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={14} aria-hidden="true" />
                      {creatingBatch ? "Creating..." : "Create Batch"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowBatchForm(true)}
                    className="inline-flex w-fit items-center gap-1 rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold text-[#0c1f3d] transition hover:border-[#2563eb]"
                  >
                    <Plus size={14} aria-hidden="true" />
                    Create Batch
                  </button>
                )}
              </div>
            ) : (
              <select
                required
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
              >
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            )}
          </DialogField>
          <DialogField label="Semester">
            <select
              required
              value={semesterId}
              onChange={(event) => setSemesterId(event.target.value)}
              disabled={semesters.length === 0}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </DialogField>
        </div>
        <DialogField label="Section Name">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. MBA-II-A"
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </DialogField>
        <DialogField label="Academic Year (optional)">
          <input
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            placeholder="e.g. 2025-26"
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </DialogField>
        {error ? <DialogError message={error} /> : null}
        <DialogActions onClose={onClose} isSaving={isSaving} submitLabel="Create Section" />
      </form>
    </Modal>
  )
}

interface ManageFacultyDialogProps {
  sectionId: number
  onClose: () => void
  onChanged: () => Promise<void>
}

function ManageFacultyDialog({ sectionId, onClose, onChanged }: ManageFacultyDialogProps) {
  const [section, setSection] = useState<AdminSectionDetail | null>(null)
  const [facultyOptions, setFacultyOptions] = useState<AdminUser[]>([])
  const [facultyId, setFacultyId] = useState("")
  const [facultySearch, setFacultySearch] = useState("")
  const [facultyMenuOpen, setFacultyMenuOpen] = useState(false)
  const facultyPickerRef = useRef<HTMLDivElement>(null)
  const [subject, setSubject] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const filteredFaculty = facultyOptions.filter((faculty) =>
    faculty.name.toLowerCase().includes(facultySearch.trim().toLowerCase()),
  )

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (facultyPickerRef.current && !facultyPickerRef.current.contains(event.target as Node)) {
        setFacultyMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  async function loadSection() {
    try {
      const data = await getAdminSection(sectionId)
      setSection(data)
    } catch {
      setError("Could not load this section. Try closing and reopening it.")
    }
  }

  useEffect(() => {
    loadSection()
    getAdminUsers({ role: "faculty", page_size: 100 })
      .then((data) => setFacultyOptions(data.items))
      .catch(() => setError("Could not load the faculty list."))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId])

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!facultyId || !subject.trim()) return
    setIsSaving(true)
    setError("")
    try {
      await assignAdminSectionFaculty(sectionId, { faculty_id: Number(facultyId), subject: subject.trim() })
      setFacultyId("")
      setFacultySearch("")
      setSubject("")
      await loadSection()
      await onChanged()
    } catch {
      setError("Unable to assign faculty.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove(facultyId: number) {
    setRemovingId(facultyId)
    setError("")
    try {
      await removeAdminSectionFaculty(sectionId, facultyId)
      await loadSection()
      await onChanged()
    } catch {
      setError("Unable to remove faculty.")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Modal title={section ? `Faculty for: ${section.name} · ${section.semester_name}` : "Faculty"} onClose={onClose}>
      {!section ? (
        error ? (
          <DialogError message={error} />
        ) : (
          <p className="text-sm text-[#667085]">Loading...</p>
        )
      ) : (
        <div className="grid gap-4">
          <div className="space-y-2">
            {section.faculty.length === 0 ? (
              <p className="text-sm text-[#667085]">No faculty assigned yet.</p>
            ) : (
              section.faculty.map((faculty) => (
                <div
                  key={faculty.id}
                  className="flex items-center justify-between rounded-md border border-[#dde4ec] px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-semibold text-[#17202a]">{faculty.faculty_name}</span>{" "}
                    <span className="text-[#667085]">· {faculty.subject}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(faculty.faculty_id)}
                    disabled={removingId === faculty.faculty_id}
                    className="text-sm font-semibold text-[#b42318] disabled:opacity-60"
                  >
                    {removingId === faculty.faculty_id ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAssign} className="grid gap-3 border-t border-[#dde4ec] pt-4">
            <p className="text-sm font-semibold text-[#17202a]">Add faculty</p>
            <div className="relative" ref={facultyPickerRef}>
              <input
                value={facultySearch}
                onChange={(event) => {
                  setFacultySearch(event.target.value)
                  setFacultyId("")
                  setFacultyMenuOpen(true)
                }}
                onFocus={() => setFacultyMenuOpen(true)}
                placeholder="Search faculty..."
                autoComplete="off"
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
              />
              {facultyMenuOpen ? (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-[#dde4ec] bg-white shadow-lg">
                  {filteredFaculty.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-[#667085]">
                      {facultyOptions.length === 0 ? "No faculty found." : "No faculty matches that search."}
                    </p>
                  ) : (
                    filteredFaculty.map((faculty) => (
                      <button
                        key={faculty.id}
                        type="button"
                        onClick={() => {
                          setFacultyId(String(faculty.id))
                          setFacultySearch(faculty.name)
                          setFacultyMenuOpen(false)
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-[#f5f7fa] ${
                          String(faculty.id) === facultyId ? "bg-[#eaf1fd] font-semibold text-[#1d4ed8]" : "text-[#17202a]"
                        }`}
                      >
                        {faculty.name}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject they teach in this section"
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} aria-hidden="true" />
              {isSaving ? "Adding..." : "Add to Section"}
            </button>
          </form>
          {error ? <DialogError message={error} /> : null}
        </div>
      )}
    </Modal>
  )
}

interface ManageStudentsDialogProps {
  sectionId: number
  onClose: () => void
  onChanged: () => Promise<void>
}

function ManageStudentsDialog({ sectionId, onClose, onChanged }: ManageStudentsDialogProps) {
  const [section, setSection] = useState<AdminSectionDetail | null>(null)
  const [studentOptions, setStudentOptions] = useState<AdminEligibleStudent[]>([])
  const [studentId, setStudentId] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [studentMenuOpen, setStudentMenuOpen] = useState(false)
  const studentPickerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredStudents = studentOptions.filter((student) => {
    const term = studentSearch.trim().toLowerCase()
    return student.name.toLowerCase().includes(term) || student.email.toLowerCase().includes(term)
  })

  // The enrolled-students list (not the "add student" picker above) gets its
  // own search + pagination — a large section's roster was one long scroll.
  const enrolledList = useListControls(
    section?.students ?? [],
    (student, q) => student.name.toLowerCase().includes(q) || student.email.toLowerCase().includes(q),
    10,
  )

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (studentPickerRef.current && !studentPickerRef.current.contains(event.target as Node)) {
        setStudentMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  async function loadSection() {
    try {
      const data = await getAdminSection(sectionId)
      setSection(data)
    } catch {
      setError("Could not load this section. Try closing and reopening it.")
    }
  }

  async function loadEligibleStudents() {
    try {
      const data = await getAdminSectionEligibleStudents(sectionId)
      setStudentOptions(data.items)
    } catch {
      setError("Could not load eligible students.")
    }
  }

  useEffect(() => {
    loadSection()
    loadEligibleStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId])

  async function handleEnroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!studentId) return
    setIsSaving(true)
    setError("")
    try {
      await enrollAdminSectionStudents(sectionId, [Number(studentId)])
      setStudentId("")
      setStudentSearch("")
      await loadSection()
      await loadEligibleStudents()
      await onChanged()
    } catch {
      setError("Unable to enroll student.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove(studentId: number) {
    setRemovingId(studentId)
    setError("")
    try {
      await removeAdminSectionStudent(sectionId, studentId)
      await loadSection()
      await loadEligibleStudents()
      await onChanged()
    } catch {
      setError("Unable to remove student.")
    } finally {
      setRemovingId(null)
    }
  }

  async function handleBulkUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setIsUploading(true)
    setError("")
    setNotice("")
    try {
      const result = await bulkEnrollAdminSectionStudents(sectionId, file)
      setNotice(
        `Enrolled ${result.enrolled_count} student(s)${
          result.error_count > 0 ? `; ${result.error_count} row(s) failed` : ""
        }.`,
      )
      await loadSection()
      await loadEligibleStudents()
      await onChanged()
    } catch {
      setError("Unable to import this CSV file.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Modal
      title={section ? `Students in: ${section.name} · ${section.semester_name} (${section.students.length} enrolled)` : "Students"}
      onClose={onClose}
      wide
    >
      {!section ? (
        error ? (
          <DialogError message={error} />
        ) : (
          <p className="text-sm text-[#667085]">Loading...</p>
        )
      ) : (
        <div className="grid gap-4">
          <form onSubmit={handleEnroll} className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1" ref={studentPickerRef}>
              <input
                value={studentSearch}
                onChange={(event) => {
                  setStudentSearch(event.target.value)
                  setStudentId("")
                  setStudentMenuOpen(true)
                }}
                onFocus={() => setStudentMenuOpen(true)}
                disabled={studentOptions.length === 0}
                placeholder={
                  studentOptions.length === 0
                    ? "No eligible students for this specialization/batch"
                    : "Search and add student..."
                }
                autoComplete="off"
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {studentMenuOpen && studentOptions.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-[#dde4ec] bg-white shadow-lg">
                  {filteredStudents.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-[#667085]">No student matches that search.</p>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => {
                          setStudentId(String(student.id))
                          setStudentSearch(`${student.name} (${student.email})`)
                          setStudentMenuOpen(false)
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-[#f5f7fa] ${
                          String(student.id) === studentId ? "bg-[#eaf1fd] font-semibold text-[#1d4ed8]" : "text-[#17202a]"
                        }`}
                      >
                        {student.name} <span className="text-[#667085]">({student.email})</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={isSaving || !studentId}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} aria-hidden="true" />
              {isSaving ? "Adding..." : "Add"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleBulkUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#dde4ec] px-4 py-3 text-sm font-semibold text-[#17202a] transition hover:border-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={15} aria-hidden="true" />
              {isUploading ? "Importing..." : "Bulk Enroll CSV"}
            </button>
          </form>

          {notice ? (
            <div className="rounded-md border border-[#a6f4c5] bg-[#ecfdf3] px-3 py-2 text-sm font-medium text-[#067647]">
              {notice}
            </div>
          ) : null}
          {error ? <DialogError message={error} /> : null}

          {section.students.length === 0 ? (
            <p className="text-sm text-[#667085]">No students enrolled yet.</p>
          ) : (
            <div>
              <ListToolbar
                query={enrolledList.query}
                onQueryChange={enrolledList.setQuery}
                pageSize={enrolledList.pageSize}
                onPageSizeChange={enrolledList.setPageSize}
                placeholder="Search enrolled students..."
              />
              {enrolledList.paged.length === 0 ? (
                <p className="text-sm text-[#667085]">No enrolled student matches that search.</p>
              ) : (
                <div className="space-y-2">
                  {enrolledList.paged.map((student) => (
                    <div
                      key={student.student_id}
                      className="flex items-center justify-between rounded-md border border-[#dde4ec] px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-semibold text-[#17202a]">{student.name}</span>{" "}
                        <span className="text-[#667085]">· {student.email}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(student.student_id)}
                        disabled={removingId === student.student_id}
                        className="text-sm font-semibold text-[#b42318] disabled:opacity-60"
                      >
                        {removingId === student.student_id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Pager
                page={enrolledList.page}
                totalPages={enrolledList.totalPages}
                total={enrolledList.total}
                pageSize={enrolledList.pageSize}
                onPageChange={enrolledList.setPage}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

function Modal({ title, onClose, children, wide }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1f3d]/45 p-4">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="w-full rounded-lg bg-white p-5 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#17202a]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold"
            >
              Close
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

interface DialogFieldProps {
  label: string
  children: ReactNode
}

function DialogField({ label, children }: DialogFieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#17202a]">{label}</span>
      {children}
    </label>
  )
}

function DialogError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-[#f3c4c4] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">
      {message}
    </div>
  )
}

interface DialogActionsProps {
  onClose: () => void
  isSaving: boolean
  submitLabel: string
}

function DialogActions({ onClose, isSaving, submitLabel }: DialogActionsProps) {
  return (
    <div className="mt-2 flex justify-end gap-2">
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
        className="rounded-md bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </div>
  )
}

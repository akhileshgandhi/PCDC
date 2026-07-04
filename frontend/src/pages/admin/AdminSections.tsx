import { AlertTriangle, Plus, Upload, Users as UsersIcon } from "lucide-react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import {
  assignAdminSectionFaculty,
  bulkEnrollAdminSectionStudents,
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
import AdminLayout from "../../layouts/AdminLayout"

export default function AdminSections() {
  const [sections, setSections] = useState<AdminSectionListItem[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [courseId, setCourseId] = useState("")
  const [batchId, setBatchId] = useState("")
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
    getAdminCourses().then((data) => setCourses(data.items))
  }, [])

  useEffect(() => {
    setBatchId("")
    if (!courseId) {
      setBatches([])
      return
    }
    getAdminCourseBatches(Number(courseId)).then((data) => setBatches(data.items))
  }, [courseId])

  useEffect(() => {
    loadSections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, batchId, status])

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#17202a]">Sections</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                Assign faculty and enroll students into every class section across all courses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSection(true)}
              disabled={courses.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#34c6a3] px-4 py-3 text-sm font-semibold text-[#102033] shadow-sm transition hover:bg-[#5dd7bb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} aria-hidden="true" />
              New Section
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              aria-label="Filter by course"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <select
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              disabled={!courseId}
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="h-11 rounded-md border border-[#dde4ec] bg-white px-3 text-sm font-medium outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
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

        {isLoading ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-8 text-center text-sm font-medium text-[#667085] shadow-sm">
            Loading sections...
          </section>
        ) : sections.length === 0 ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#17202a]">No sections found.</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Adjust filters or create the first class section for a course.
            </p>
          </section>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                onManageFaculty={() => setManageFacultySectionId(section.id)}
                onManageStudents={() => setManageStudentsSectionId(section.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddSection ? (
        <NewSectionDialog
          courses={courses}
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
            className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold text-[#102033] transition hover:border-[#34c6a3]"
          >
            Manage Faculty
          </button>
          <button
            type="button"
            onClick={onManageStudents}
            className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm font-semibold text-[#102033] transition hover:border-[#34c6a3]"
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
  onClose: () => void
  onCreated: () => void
}

function NewSectionDialog({ courses, onClose, onCreated }: NewSectionDialogProps) {
  const [courseId, setCourseId] = useState(courses[0] ? String(courses[0].id) : "")
  const [batches, setBatches] = useState<AdminBatch[]>([])
  const [semesters, setSemesters] = useState<AdminSemester[]>([])
  const [batchId, setBatchId] = useState("")
  const [semesterId, setSemesterId] = useState("")
  const [name, setName] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!courseId) {
      setBatches([])
      setSemesters([])
      return
    }
    Promise.all([getAdminCourseBatches(Number(courseId)), getAdminCourseSemesters(Number(courseId))]).then(
      ([batchData, semesterData]) => {
        setBatches(batchData.items)
        setSemesters(semesterData.items)
        setBatchId(batchData.items[0] ? String(batchData.items[0].id) : "")
        setSemesterId(semesterData.items[0] ? String(semesterData.items[0].id) : "")
      },
    )
  }, [courseId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!courseId || !batchId || !semesterId) return
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

  return (
    <Modal title="Create New Section" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <DialogField label="Course">
          <select
            required
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </DialogField>
        <div className="grid gap-4 sm:grid-cols-2">
          <DialogField label="Batch">
            <select
              required
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              disabled={batches.length === 0}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </DialogField>
          <DialogField label="Semester">
            <select
              required
              value={semesterId}
              onChange={(event) => setSemesterId(event.target.value)}
              disabled={semesters.length === 0}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
          />
        </DialogField>
        <DialogField label="Academic Year (optional)">
          <input
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            placeholder="e.g. 2025-26"
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
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
  const [subject, setSubject] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  async function loadSection() {
    const data = await getAdminSection(sectionId)
    setSection(data)
  }

  useEffect(() => {
    loadSection()
    getAdminUsers({ role: "faculty", page_size: 100 }).then((data) => setFacultyOptions(data.items))
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
        <p className="text-sm text-[#667085]">Loading...</p>
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
            <select
              value={facultyId}
              onChange={(event) => setFacultyId(event.target.value)}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            >
              <option value="">Search faculty...</option>
              {facultyOptions.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject they teach in this section"
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#34c6a3] px-4 py-2 text-sm font-semibold text-[#102033] disabled:cursor-not-allowed disabled:opacity-60"
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
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadSection() {
    const data = await getAdminSection(sectionId)
    setSection(data)
  }

  async function loadEligibleStudents() {
    const data = await getAdminSectionEligibleStudents(sectionId)
    setStudentOptions(data.items)
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
        <p className="text-sm text-[#667085]">Loading...</p>
      ) : (
        <div className="grid gap-4">
          <form onSubmit={handleEnroll} className="flex flex-wrap items-center gap-3">
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              disabled={studentOptions.length === 0}
              className="h-11 flex-1 rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {studentOptions.length === 0
                  ? "No eligible students for this course/batch"
                  : "Search and add student..."}
              </option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.email})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSaving || !studentId}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#34c6a3] px-4 py-3 text-sm font-semibold text-[#102033] disabled:cursor-not-allowed disabled:opacity-60"
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
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#dde4ec] px-4 py-3 text-sm font-semibold text-[#17202a] transition hover:border-[#34c6a3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={15} aria-hidden="true" />
              {isUploading ? "Importing..." : "Bulk Enroll CSV"}
            </button>
          </form>

          {notice ? (
            <div className="rounded-md border border-[#bdebdc] bg-[#f0fcf8] px-3 py-2 text-sm font-medium text-[#176b5a]">
              {notice}
            </div>
          ) : null}
          {error ? <DialogError message={error} /> : null}

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {section.students.length === 0 ? (
              <p className="text-sm text-[#667085]">No students enrolled yet.</p>
            ) : (
              section.students.map((student) => (
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
              ))
            )}
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102033]/45 p-4">
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
        className="rounded-md bg-[#34c6a3] px-4 py-3 text-sm font-semibold text-[#102033] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </div>
  )
}

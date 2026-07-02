import {
  ChevronRight,
  GraduationCap,
  Plus,
  Users as UsersIcon,
} from "lucide-react"
import type { FormEvent, ReactNode } from "react"
import { useEffect, useState } from "react"

import {
  advanceBatchSemester,
  assignAdminSectionFaculty,
  createAdminBatch,
  createAdminCourse,
  createAdminSection,
  enrollAdminSectionStudents,
  getAdminCourseBatches,
  getAdminCourses,
  getAdminCourseSections,
  getAdminCourseSemesters,
  getAdminSection,
  getAdminUsers,
  type AdminBatch,
  type AdminCourse,
  type AdminSection,
  type AdminSectionDetail,
  type AdminSemester,
  type AdminUser,
} from "../../api/admin"
import AdminLayout from "../../layouts/AdminLayout"

export default function AdminCourses() {
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)

  async function loadCourses() {
    setIsLoading(true)
    try {
      const data = await getAdminCourses()
      setCourses(data.items)
      setError("")
    } catch {
      setError("Unable to load courses right now.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#17202a]">Courses</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                Manage courses, batches, and class sections. Assign faculty and students to
                sections so case assignment and roster visibility work correctly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCourse(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#34c6a3] px-4 py-3 text-sm font-semibold text-[#102033] shadow-sm transition hover:bg-[#5dd7bb]"
            >
              <Plus size={17} aria-hidden="true" />
              Add Course
            </button>
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
            Loading courses...
          </section>
        ) : courses.length === 0 ? (
          <section className="rounded-lg border border-[#dde4ec] bg-white p-10 text-center shadow-sm">
            <GraduationCap className="mx-auto text-[#667085]" size={32} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#17202a]">No courses yet.</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Add a course to start building batches and class sections.
            </p>
          </section>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => setSelectedCourseId(course.id)}
                className={`rounded-lg border bg-white p-5 text-left shadow-sm transition hover:border-[#34c6a3] ${
                  selectedCourseId === course.id ? "border-[#34c6a3] ring-2 ring-[#34c6a3]/20" : "border-[#dde4ec]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-[#17202a]">{course.name}</h3>
                    <p className="mt-1 text-sm text-[#667085]">
                      {course.code} · {course.total_semesters} semesters · {course.duration_years}{" "}
                      years
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-[#667085]" aria-hidden="true" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatPill label="Batches" value={course.batch_count} />
                  <StatPill label="Sections" value={course.section_count} />
                  <StatPill label="Students" value={course.student_count} />
                  <StatPill label="Faculty" value={course.faculty_count} />
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedCourse ? (
          <CourseDetail
            course={selectedCourse}
            onClose={() => setSelectedCourseId(null)}
            onNotice={setNotice}
            onRefresh={loadCourses}
          />
        ) : null}
      </div>

      {showAddCourse ? (
        <AddCourseDialog
          onClose={() => setShowAddCourse(false)}
          onCreated={async () => {
            setShowAddCourse(false)
            setNotice("Course created.")
            await loadCourses()
          }}
        />
      ) : null}
    </AdminLayout>
  )
}

interface CourseDetailProps {
  course: AdminCourse
  onClose: () => void
  onNotice: (message: string) => void
  onRefresh: () => Promise<void>
}

function CourseDetail({ course, onClose, onNotice, onRefresh }: CourseDetailProps) {
  const [batches, setBatches] = useState<AdminBatch[]>([])
  const [sections, setSections] = useState<AdminSection[]>([])
  const [semesters, setSemesters] = useState<AdminSemester[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddBatch, setShowAddBatch] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)

  async function loadDetail() {
    setIsLoading(true)
    try {
      const [batchData, sectionData, semesterData] = await Promise.all([
        getAdminCourseBatches(course.id),
        getAdminCourseSections(course.id),
        getAdminCourseSemesters(course.id),
      ])
      setBatches(batchData.items)
      setSections(sectionData.items)
      setSemesters(semesterData.items)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id])

  async function handleAdvanceSemester(batch: AdminBatch) {
    if (!window.confirm(`Advance all active students in "${batch.name}" to their next semester's section?`)) {
      return
    }
    try {
      const result = await advanceBatchSemester(batch.id)
      onNotice(
        `Advanced ${result.advanced_count} student(s). ${result.flagged_count} flagged (no next-semester section).`,
      )
      await Promise.all([loadDetail(), onRefresh()])
    } catch {
      onNotice("")
    }
  }

  return (
    <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#17202a]">{course.name}</h2>
          <p className="mt-1 text-sm text-[#667085]">Batches, sections, faculty, and students.</p>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-[#667085]">
          Close
        </button>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm font-medium text-[#667085]">Loading...</p>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#17202a]">Batches</h3>
              <button
                type="button"
                onClick={() => setShowAddBatch(true)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#176b5a]"
              >
                <Plus size={15} aria-hidden="true" />
                Add Batch
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {batches.length === 0 ? (
                <p className="text-sm text-[#667085]">No batches yet.</p>
              ) : (
                batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between rounded-md border border-[#dde4ec] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#17202a]">{batch.name}</p>
                      <p className="text-xs text-[#667085]">
                        {batch.start_year}-{batch.end_year} · {batch.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdvanceSemester(batch)}
                      className="rounded-md border border-[#dde4ec] px-2 py-1 text-xs font-semibold text-[#102033] transition hover:border-[#34c6a3]"
                    >
                      Advance Semester
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#17202a]">Class Sections</h3>
              <button
                type="button"
                onClick={() => setShowAddSection(true)}
                disabled={batches.length === 0}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#176b5a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={15} aria-hidden="true" />
                Add Section
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {sections.length === 0 ? (
                <p className="text-sm text-[#667085]">No sections yet.</p>
              ) : (
                sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setSelectedSectionId(section.id)}
                    className="flex w-full items-center justify-between rounded-md border border-[#dde4ec] px-3 py-2 text-left transition hover:border-[#34c6a3]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#17202a]">
                        {section.name}{" "}
                        <span className="font-normal text-[#667085]">
                          · {section.semester_name} · {section.batch_name}
                        </span>
                      </p>
                      <p className="mt-1 flex items-center gap-3 text-xs text-[#667085]">
                        <span className="inline-flex items-center gap-1">
                          <UsersIcon size={13} aria-hidden="true" />
                          {section.student_count} students
                        </span>
                        <span>{section.faculty_count} faculty</span>
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#667085]" aria-hidden="true" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAddBatch ? (
        <AddBatchDialog
          courseId={course.id}
          onClose={() => setShowAddBatch(false)}
          onCreated={async () => {
            setShowAddBatch(false)
            await Promise.all([loadDetail(), onRefresh()])
          }}
        />
      ) : null}

      {showAddSection ? (
        <AddSectionDialog
          courseId={course.id}
          batches={batches}
          semesters={semesters}
          onClose={() => setShowAddSection(false)}
          onCreated={async () => {
            setShowAddSection(false)
            await Promise.all([loadDetail(), onRefresh()])
          }}
        />
      ) : null}

      {selectedSectionId ? (
        <SectionDetailDialog
          sectionId={selectedSectionId}
          onClose={() => setSelectedSectionId(null)}
          onChanged={async () => {
            await Promise.all([loadDetail(), onRefresh()])
          }}
        />
      ) : null}
    </section>
  )
}

interface AddCourseDialogProps {
  onClose: () => void
  onCreated: () => void
}

function AddCourseDialog({ onClose, onCreated }: AddCourseDialogProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [totalSemesters, setTotalSemesters] = useState("4")
  const [durationYears, setDurationYears] = useState("2")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError("")
    try {
      await createAdminCourse({
        name,
        code,
        total_semesters: Number(totalSemesters),
        duration_years: Number(durationYears),
      })
      onCreated()
    } catch {
      setError("Unable to create course. Check that the code is unique.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Add Course" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <DialogField label="Course Name">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
          />
        </DialogField>
        <DialogField label="Course Code">
          <input
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
          />
        </DialogField>
        <div className="grid gap-4 sm:grid-cols-2">
          <DialogField label="Total Semesters">
            <input
              required
              type="number"
              min={1}
              value={totalSemesters}
              onChange={(event) => setTotalSemesters(event.target.value)}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            />
          </DialogField>
          <DialogField label="Duration (years)">
            <input
              required
              type="number"
              min={1}
              value={durationYears}
              onChange={(event) => setDurationYears(event.target.value)}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            />
          </DialogField>
        </div>
        {error ? <DialogError message={error} /> : null}
        <DialogActions onClose={onClose} isSaving={isSaving} submitLabel="Create Course" />
      </form>
    </Modal>
  )
}

interface AddBatchDialogProps {
  courseId: number
  onClose: () => void
  onCreated: () => void
}

function AddBatchDialog({ courseId, onClose, onCreated }: AddBatchDialogProps) {
  const [name, setName] = useState("")
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()))
  const [endYear, setEndYear] = useState(String(new Date().getFullYear() + 2))
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError("")
    try {
      await createAdminBatch(courseId, {
        name,
        start_year: Number(startYear),
        end_year: Number(endYear),
      })
      onCreated()
    } catch {
      setError("Unable to create batch.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Add Batch" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <DialogField label="Batch Name">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. MBA 2024-26"
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
          />
        </DialogField>
        <div className="grid gap-4 sm:grid-cols-2">
          <DialogField label="Start Year">
            <input
              required
              type="number"
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            />
          </DialogField>
          <DialogField label="End Year">
            <input
              required
              type="number"
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            />
          </DialogField>
        </div>
        {error ? <DialogError message={error} /> : null}
        <DialogActions onClose={onClose} isSaving={isSaving} submitLabel="Create Batch" />
      </form>
    </Modal>
  )
}

interface AddSectionDialogProps {
  courseId: number
  batches: AdminBatch[]
  semesters: AdminSemester[]
  onClose: () => void
  onCreated: () => void
}

function AddSectionDialog({
  courseId,
  batches,
  semesters,
  onClose,
  onCreated,
}: AddSectionDialogProps) {
  const [name, setName] = useState("")
  const [semesterId, setSemesterId] = useState(semesters[0] ? String(semesters[0].id) : "")
  const [batchId, setBatchId] = useState(batches[0] ? String(batches[0].id) : "")
  const [academicYear, setAcademicYear] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError("")
    try {
      await createAdminSection(courseId, {
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
    <Modal title="Add Class Section" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <DialogField label="Section Name">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. MBA-II-A"
            className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
          />
        </DialogField>
        <div className="grid gap-4 sm:grid-cols-2">
          <DialogField label="Semester">
            <select
              required
              value={semesterId}
              onChange={(event) => setSemesterId(event.target.value)}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            >
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </DialogField>
          <DialogField label="Batch">
            <select
              required
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
            >
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </DialogField>
        </div>
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

interface SectionDetailDialogProps {
  sectionId: number
  onClose: () => void
  onChanged: () => Promise<void>
}

function SectionDetailDialog({ sectionId, onClose, onChanged }: SectionDetailDialogProps) {
  const [section, setSection] = useState<AdminSectionDetail | null>(null)
  const [facultyOptions, setFacultyOptions] = useState<AdminUser[]>([])
  const [studentOptions, setStudentOptions] = useState<AdminUser[]>([])
  const [facultyId, setFacultyId] = useState("")
  const [subject, setSubject] = useState("")
  const [studentId, setStudentId] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function loadSection() {
    const data = await getAdminSection(sectionId)
    setSection(data)
  }

  useEffect(() => {
    loadSection()
    getAdminUsers({ role: "faculty", page_size: 100 }).then((data) => setFacultyOptions(data.items))
    getAdminUsers({ role: "student", page_size: 100 }).then((data) => setStudentOptions(data.items))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId])

  async function handleAssignFaculty(event: FormEvent<HTMLFormElement>) {
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

  async function handleEnrollStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!studentId) return
    setIsSaving(true)
    setError("")
    try {
      await enrollAdminSectionStudents(sectionId, [Number(studentId)])
      setStudentId("")
      await loadSection()
      await onChanged()
    } catch {
      setError("Unable to enroll student.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title={section ? `${section.name} · ${section.semester_name}` : "Section"} onClose={onClose} wide>
      {!section ? (
        <p className="text-sm text-[#667085]">Loading...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-[#17202a]">Faculty</h3>
            <div className="mt-3 space-y-2">
              {section.faculty.length === 0 ? (
                <p className="text-sm text-[#667085]">No faculty assigned yet.</p>
              ) : (
                section.faculty.map((faculty) => (
                  <div
                    key={faculty.id}
                    className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-[#17202a]">{faculty.faculty_name}</span>{" "}
                    <span className="text-[#667085]">· {faculty.subject}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleAssignFaculty} className="mt-4 grid gap-3">
              <select
                value={facultyId}
                onChange={(event) => setFacultyId(event.target.value)}
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              >
                <option value="">Select faculty</option>
                {facultyOptions.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Subject (e.g. Financial Management)"
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#34c6a3] px-4 py-2 text-sm font-semibold text-[#102033] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={15} aria-hidden="true" />
                Assign Faculty
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#17202a]">
              Students ({section.students.length})
            </h3>
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
              {section.students.length === 0 ? (
                <p className="text-sm text-[#667085]">No students enrolled yet.</p>
              ) : (
                section.students.map((student) => (
                  <div
                    key={student.student_id}
                    className="rounded-md border border-[#dde4ec] px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-[#17202a]">{student.name}</span>{" "}
                    <span className="text-[#667085]">· {student.email}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleEnrollStudent} className="mt-4 grid gap-3">
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="h-11 w-full rounded-md border border-[#dde4ec] px-3 text-sm outline-none focus:border-[#34c6a3] focus:ring-2 focus:ring-[#34c6a3]/20"
              >
                <option value="">Select student</option>
                {studentOptions.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#34c6a3] px-4 py-2 text-sm font-semibold text-[#102033] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={15} aria-hidden="true" />
                Enroll Student
              </button>
            </form>
          </div>
        </div>
      )}
      {error ? <DialogError message={error} /> : null}
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
            <h2 className="text-2xl font-semibold text-[#17202a]">{title}</h2>
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

interface StatPillProps {
  label: string
  value: number
}

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="rounded-full border border-[#dde4ec] bg-[#f5f7fa] px-3 py-1.5 text-xs">
      <span className="font-semibold text-[#17202a]">{label}:</span>{" "}
      <span className="font-semibold text-[#176b5a]">{value}</span>
    </div>
  )
}

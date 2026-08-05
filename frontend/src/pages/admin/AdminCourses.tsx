import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Plus,
  Trash2,
  Upload,
  Users as UsersIcon,
  X,
} from "lucide-react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import {
  advanceBatchSemester,
  assignAdminSectionFaculty,
  bulkEnrollAdminSectionStudents,
  createAdminBatch,
  createAdminCourse,
  createAdminSection,
  deleteAdminCourse,
  enrollAdminSectionStudents,
  getAdminCourseBatches,
  getAdminCourses,
  getAdminCourseSections,
  getAdminCourseSemesters,
  getAdminSection,
  getAdminUsers,
  removeAdminSectionFaculty,
  removeAdminSectionStudent,
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
              <div
                key={course.id}
                className={`rounded-lg border bg-white p-5 shadow-sm transition hover:border-[#34c6a3] ${
                  selectedCourseId === course.id ? "border-[#34c6a3] ring-2 ring-[#34c6a3]/20" : "border-[#dde4ec]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCourseId(course.id)}
                    className="flex-1 text-left"
                  >
                    <h3 className="text-xl font-semibold text-[#17202a]">{course.name}</h3>
                    <p className="mt-1 text-sm text-[#667085]">
                      {course.code} · {course.total_semesters} semesters · {course.duration_years}{" "}
                      years
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Delete course "${course.name}"? This will remove all batches, sections, faculty assignments, and unlink enrolled students.`)) return
                        try {
                          await deleteAdminCourse(course.id)
                          setNotice(`Course "${course.name}" deleted.`)
                          if (selectedCourseId === course.id) setSelectedCourseId(null)
                          await loadCourses()
                        } catch (err: any) {
                          setError(err?.response?.data?.detail || "Unable to delete course.")
                        }
                      }}
                      className="rounded-md p-1.5 text-[#667085] transition hover:bg-[#fff5f5] hover:text-[#b42318]"
                      title="Delete course"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={20} className="text-[#667085]" aria-hidden="true" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCourseId(course.id)}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  <StatPill label="Batches" value={course.batch_count} />
                  <StatPill label="Sections" value={course.section_count} />
                  <StatPill label="Students" value={course.student_count} />
                  <StatPill label="Faculty" value={course.faculty_count} />
                </button>
              </div>
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
  const [expandedSemesters, setExpandedSemesters] = useState<Set<number>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [sectionDetails, setSectionDetails] = useState<Record<number, AdminSectionDetail>>({})

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
      // Auto-expand first semester
      if (semesterData.items.length > 0) {
        setExpandedSemesters(new Set([semesterData.items[0].id]))
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id])

  async function loadSectionDetail(sectionId: number) {
    const data = await getAdminSection(sectionId)
    setSectionDetails((prev) => ({ ...prev, [sectionId]: data }))
  }

  function toggleSemester(semesterId: number) {
    setExpandedSemesters((prev) => {
      const next = new Set(prev)
      if (next.has(semesterId)) {
        next.delete(semesterId)
      } else {
        next.add(semesterId)
      }
      return next
    })
  }

  function toggleSection(sectionId: number) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
        if (!sectionDetails[sectionId]) {
          loadSectionDetail(sectionId)
        }
      }
      return next
    })
  }

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

  async function handleSectionChanged(sectionId: number) {
    await loadSectionDetail(sectionId)
    await Promise.all([loadDetail(), onRefresh()])
  }

  const getSectionsForSemester = (semester: AdminSemester) =>
    sections.filter((s) => s.semester_number === semester.semester_number)

  return (
    <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#17202a]">{course.name}</h2>
          <p className="mt-1 text-sm text-[#667085]">
            {course.code} · {course.total_semesters} semesters · {course.duration_years} years
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-[#667085] hover:text-[#17202a]">
          Close
        </button>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm font-medium text-[#667085]">Loading...</p>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Batches Row */}
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#dde4ec] bg-[#f5f7fa] p-3">
            <span className="text-sm font-semibold text-[#17202a]">Batches:</span>
            {batches.map((batch) => (
              <div key={batch.id} className="inline-flex items-center gap-2 rounded-full border border-[#dde4ec] bg-white px-3 py-1.5 text-xs">
                <span className="font-semibold text-[#17202a]">{batch.name}</span>
                <span className="text-[#667085]">{batch.start_year}-{batch.end_year}</span>
                <button
                  type="button"
                  onClick={() => handleAdvanceSemester(batch)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#176b5a] hover:bg-[#e8f8f4]"
                  title="Advance semester"
                >
                  ↑
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowAddBatch(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#34c6a3] px-3 py-1.5 text-xs font-semibold text-[#176b5a] hover:bg-[#e8f8f4]"
            >
              <Plus size={12} /> Add Batch
            </button>
          </div>

          {/* Semester Accordion */}
          {semesters.map((semester) => {
            const semSections = getSectionsForSemester(semester)
            const isExpanded = expandedSemesters.has(semester.id)
            return (
              <div key={semester.id} className="rounded-lg border border-[#dde4ec]">
                <button
                  type="button"
                  onClick={() => toggleSemester(semester.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#f5f7fa]"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="text-sm font-semibold text-[#17202a]">{semester.name}</span>
                    <span className="text-xs text-[#667085]">
                      ({semSections.length} section{semSections.length !== 1 ? "s" : ""} ·{" "}
                      {semSections.reduce((sum, s) => sum + s.student_count, 0)} students ·{" "}
                      {semSections.reduce((sum, s) => sum + s.faculty_count, 0)} faculty)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAddSection(true)
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[#dde4ec] px-2 py-1 text-xs font-semibold text-[#176b5a] hover:border-[#34c6a3]"
                  >
                    <Plus size={12} /> Section
                  </button>
                </button>

                {isExpanded ? (
                  <div className="border-t border-[#dde4ec] p-4 space-y-3">
                    {semSections.length === 0 ? (
                      <p className="text-sm text-[#667085]">No sections in this semester yet.</p>
                    ) : (
                      semSections.map((section) => (
                        <SectionCard
                          key={section.id}
                          section={section}
                          detail={sectionDetails[section.id] ?? null}
                          isExpanded={expandedSections.has(section.id)}
                          onToggle={() => toggleSection(section.id)}
                          onChanged={() => handleSectionChanged(section.id)}
                          onNotice={onNotice}
                        />
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
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
    </section>
  )
}

/* ─── Section Card with inline management ─── */

interface SectionCardProps {
  section: AdminSection
  detail: AdminSectionDetail | null
  isExpanded: boolean
  onToggle: () => void
  onChanged: () => Promise<void>
  onNotice: (message: string) => void
}

function SectionCard({ section, detail, isExpanded, onToggle, onChanged, onNotice }: SectionCardProps) {
  const [facultyOptions, setFacultyOptions] = useState<AdminUser[]>([])
  const [facultyId, setFacultyId] = useState("")
  const [subject, setSubject] = useState("")
  const [showFacultyForm, setShowFacultyForm] = useState(false)
  const [showStudentForm, setShowStudentForm] = useState(false)
  const [studentOptions, setStudentOptions] = useState<AdminUser[]>([])
  const [studentId, setStudentId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<string>("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showFacultyForm && facultyOptions.length === 0) {
      getAdminUsers({ role: "faculty", page_size: 100 }).then((data) => setFacultyOptions(data.items))
    }
  }, [showFacultyForm, facultyOptions.length])

  useEffect(() => {
    if (showStudentForm && studentOptions.length === 0) {
      getAdminUsers({ role: "student", page_size: 100 }).then((data) => setStudentOptions(data.items))
    }
  }, [showStudentForm, studentOptions.length])

  async function handleAssignFaculty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!facultyId || !subject.trim()) return
    setIsSaving(true)
    try {
      await assignAdminSectionFaculty(section.id, { faculty_id: Number(facultyId), subject: subject.trim() })
      setFacultyId("")
      setSubject("")
      setShowFacultyForm(false)
      await onChanged()
    } catch {
      onNotice("Unable to assign faculty.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEnrollStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!studentId) return
    setIsSaving(true)
    try {
      await enrollAdminSectionStudents(section.id, [Number(studentId)])
      setStudentId("")
      setShowStudentForm(false)
      await onChanged()
      onNotice("Student enrolled.")
    } catch {
      onNotice("Unable to enroll student.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBulkImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setIsImporting(true)
    setImportResult("")
    try {
      const result = await bulkEnrollAdminSectionStudents(section.id, file)
      setImportResult(`Enrolled ${result.enrolled_count} student(s)${result.error_count > 0 ? `, ${result.error_count} error(s)` : ""}`)
      await onChanged()
    } catch {
      setImportResult("Import failed.")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="rounded-lg border border-[#dde4ec] bg-white">
      {/* Section Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#f9fafb]"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={14} className="text-[#667085]" /> : <ChevronRight size={14} className="text-[#667085]" />}
          <span className="text-sm font-semibold text-[#17202a]">{section.name}</span>
          <span className="text-xs text-[#667085]">· {section.batch_name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#667085]">
          <span className="flex items-center gap-1">
            <UsersIcon size={12} /> {section.student_count} students
          </span>
          <span>{section.faculty_count} faculty</span>
        </div>
      </button>

      {/* Expanded Section Content */}
      {isExpanded ? (
        <div className="border-t border-[#dde4ec] p-4 space-y-4">
          {!detail ? (
            <p className="text-sm text-[#667085]">Loading section details...</p>
          ) : (
            <>
              {/* Faculty Section */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#17202a]">
                    Faculty ({detail.faculty.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowFacultyForm(!showFacultyForm)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b5a] hover:text-[#102033]"
                  >
                    <Plus size={12} /> Assign Faculty
                  </button>
                </div>
                {detail.faculty.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.faculty.map((f) => (
                      <span key={f.id} className="inline-flex items-center gap-1 rounded-full border border-[#dde4ec] bg-[#f5f7fa] px-3 py-1 text-xs">
                        <span className="font-semibold text-[#17202a]">{f.faculty_name}</span>
                        <span className="text-[#667085]">— {f.subject}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Remove ${f.faculty_name} from this section?`)) return
                            try {
                              await removeAdminSectionFaculty(section.id, f.faculty_id)
                              await onChanged()
                            } catch {
                              onNotice("Unable to remove faculty.")
                            }
                          }}
                          className="ml-1 rounded-full p-0.5 text-[#667085] hover:bg-[#fff5f5] hover:text-[#b42318]"
                          title="Remove faculty"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-[#b42318]">⚠ No faculty assigned</p>
                )}
                {showFacultyForm ? (
                  <form onSubmit={handleAssignFaculty} className="mt-3 flex flex-wrap gap-2">
                    <select
                      value={facultyId}
                      onChange={(e) => setFacultyId(e.target.value)}
                      className="h-9 rounded-md border border-[#dde4ec] px-2 text-xs outline-none focus:border-[#34c6a3]"
                    >
                      <option value="">Select faculty</option>
                      {facultyOptions.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject"
                      className="h-9 rounded-md border border-[#dde4ec] px-2 text-xs outline-none focus:border-[#34c6a3]"
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="h-9 rounded-md bg-[#34c6a3] px-3 text-xs font-semibold text-[#102033] disabled:opacity-60"
                    >
                      Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFacultyForm(false)}
                      className="h-9 rounded-md border border-[#dde4ec] px-3 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </form>
                ) : null}
              </div>

              {/* Students Section */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#17202a]">
                    Students ({detail.students.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleBulkImport}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={isImporting}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b5a] hover:text-[#102033] disabled:opacity-60"
                    >
                      <Upload size={12} /> {isImporting ? "Importing..." : "Import CSV"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStudentForm(!showStudentForm)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b5a] hover:text-[#102033]"
                    >
                      <Plus size={12} /> Add Student
                    </button>
                  </div>
                </div>
                {importResult ? (
                  <p className="mt-1 text-xs font-medium text-[#176b5a]">{importResult}</p>
                ) : null}
                {detail.students.length > 0 ? (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-[#dde4ec]">
                    <table className="w-full text-xs">
                      <thead className="bg-[#f5f7fa]">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-[#667085]">Name</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#667085]">Email</th>
                          <th className="w-8 px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dde4ec]">
                        {detail.students.map((s) => (
                          <tr key={s.student_id}>
                            <td className="px-3 py-2 font-medium text-[#17202a]">{s.name}</td>
                            <td className="px-3 py-2 text-[#667085]">{s.email}</td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm(`Remove ${s.name} from this section?`)) return
                                  try {
                                    await removeAdminSectionStudent(section.id, s.student_id)
                                    await onChanged()
                                  } catch {
                                    onNotice("Unable to remove student.")
                                  }
                                }}
                                className="rounded p-0.5 text-[#667085] hover:bg-[#fff5f5] hover:text-[#b42318]"
                                title="Remove student"
                              >
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-[#667085]">No students enrolled yet.</p>
                )}
                {showStudentForm ? (
                  <form onSubmit={handleEnrollStudent} className="mt-3 flex flex-wrap gap-2">
                    <select
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="h-9 rounded-md border border-[#dde4ec] px-2 text-xs outline-none focus:border-[#34c6a3]"
                    >
                      <option value="">Select student</option>
                      {studentOptions.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="h-9 rounded-md bg-[#34c6a3] px-3 text-xs font-semibold text-[#102033] disabled:opacity-60"
                    >
                      Enroll
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStudentForm(false)}
                      className="h-9 rounded-md border border-[#dde4ec] px-3 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </form>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
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

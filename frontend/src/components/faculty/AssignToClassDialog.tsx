import type { FormEvent } from "react"
import { useEffect, useState } from "react"

import {
  assignCaseToSections,
  assignCaseToStudents,
  getFacultySections,
  getFacultyStudents,
  type FacultySection,
  type FacultyStudent,
} from "../../api/faculty"

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

interface AssignToClassDialogProps {
  caseStudy: { id: number; title: string }
  onClose: () => void
  // hadNoEffect is true when nothing was actually assigned (every matched
  // student already has this case, from a prior assignment or attempt) —
  // callers should show this as a warning, not a plain success notice, so
  // "0 students" doesn't get lost inside an otherwise-reassuring message.
  onAssigned: (message: string, hadNoEffect?: boolean) => void
}

type AssignMode = "sections" | "students"

export default function AssignToClassDialog({ caseStudy, onClose, onAssigned }: AssignToClassDialogProps) {
  const [mode, setMode] = useState<AssignMode>("sections")
  const [sections, setSections] = useState<FacultySection[]>([])
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([])
  const [students, setStudents] = useState<FacultyStudent[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const [studentSearch, setStudentSearch] = useState("")
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [dueDate, setDueDate] = useState("")
  const [instructions, setInstructions] = useState("")
  const [isLoadingSections, setIsLoadingSections] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true
    getFacultySections()
      .then((data) => {
        if (isMounted) setSections(data.items)
      })
      .catch(() => {
        if (isMounted) setError("Unable to load your sections.")
      })
      .finally(() => {
        if (isMounted) setIsLoadingSections(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Lazy-load the roster the first time the faculty switches to "specific students".
  useEffect(() => {
    if (mode !== "students" || studentsLoaded) return
    let isMounted = true
    setIsLoadingStudents(true)
    getFacultyStudents()
      .then((data) => {
        if (isMounted) {
          setStudents(data.items)
          setStudentsLoaded(true)
        }
      })
      .catch(() => {
        if (isMounted) setError("Unable to load your students.")
      })
      .finally(() => {
        if (isMounted) setIsLoadingStudents(false)
      })
    return () => {
      isMounted = false
    }
  }, [mode, studentsLoaded])

  function toggleSection(sectionId: number) {
    setSelectedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    )
  }

  function toggleStudent(studentId: number) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    )
  }

  const filteredStudents = students.filter((student) => {
    if (!studentSearch) return true
    const term = studentSearch.toLowerCase()
    return (
      student.name.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term) ||
      student.section_name.toLowerCase().includes(term)
    )
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (dueDate && dueDate < todayDateString()) {
      setError("Due date can't be in the past.")
      return
    }
    if (mode === "sections") {
      if (selectedSectionIds.length === 0) {
        setError("Select at least one section.")
        return
      }
      setIsSaving(true)
      try {
        const result = await assignCaseToSections(caseStudy.id, {
          section_ids: selectedSectionIds,
          due_date: dueDate || undefined,
          instructions: instructions || undefined,
        })
        const totalNew = result.assignments.reduce((sum, item) => sum + item.newly_assigned, 0)
        const totalMatched = result.assignments.reduce((sum, item) => sum + item.matched_students, 0)
        if (totalNew === 0) {
          onAssigned(
            totalMatched === 0
              ? `No students found in the selected section(s) — nothing was assigned.`
              : `Nothing new to assign: every student in the selected section(s) already has "${caseStudy.title}" assigned or has already attempted it.`,
            true,
          )
        } else {
          onAssigned(
            `Assigned "${caseStudy.title}" to ${result.assignments.length} section(s); ${totalNew} student(s) newly notified.`,
          )
        }
      } catch {
        setError("Unable to assign this case. It may already be assigned or not published.")
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (selectedStudentIds.length === 0) {
      setError("Select at least one student.")
      return
    }
    setIsSaving(true)
    try {
      const result = await assignCaseToStudents(caseStudy.id, {
        student_ids: selectedStudentIds,
        due_date: dueDate || undefined,
        instructions: instructions || undefined,
      })
      if (result.newly_assigned === 0) {
        onAssigned(
          `Nothing new to assign: the selected student(s) already have "${caseStudy.title}" assigned or have already attempted it.`,
          true,
        )
      } else {
        onAssigned(
          `Assigned "${caseStudy.title}" to ${result.newly_assigned} student(s)` +
            (result.skipped ? ` (${result.skipped} already assigned/attempted).` : "."),
        )
      }
    } catch {
      setError("Unable to assign this case. It may already be assigned or not published.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1d3a]/45 p-4">
      <div className="w-full max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg bg-white p-5 shadow-xl sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#111827]">Assign to Class</h2>
              <p className="mt-1 text-sm text-[#6b7280]">{caseStudy.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#e6e8eb] px-3 py-2 text-sm font-semibold"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {/* Scope: whole class (sections) vs specific students (single/group) */}
            <div className="grid grid-cols-2 gap-1 rounded-md border border-[#e6e8eb] bg-[#f6f7fb] p-1">
              <button
                type="button"
                onClick={() => setMode("sections")}
                className={`rounded px-3 py-2 text-sm font-semibold transition ${
                  mode === "sections" ? "bg-white text-[#0b1d3a] shadow-sm" : "text-[#6b7280]"
                }`}
              >
                Whole class
              </button>
              <button
                type="button"
                onClick={() => setMode("students")}
                className={`rounded px-3 py-2 text-sm font-semibold transition ${
                  mode === "students" ? "bg-white text-[#0b1d3a] shadow-sm" : "text-[#6b7280]"
                }`}
              >
                Specific students
              </button>
            </div>

            {mode === "sections" ? (
              <div>
                <p className="text-sm font-semibold text-[#111827]">Select Section(s)</p>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-[#e6e8eb] p-3">
                  {isLoadingSections ? (
                    <p className="text-sm text-[#6b7280]">Loading sections...</p>
                  ) : sections.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">
                      You have no sections yet. Ask an admin to assign you to a class section.
                    </p>
                  ) : (
                    sections.map((section) => (
                      <label key={section.id} className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedSectionIds.includes(section.id)}
                          onChange={() => toggleSection(section.id)}
                          className="size-4"
                        />
                        <span>
                          {section.name} · {section.semester_name} · {section.batch_name} (
                          {section.student_count} students)
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#111827]">
                    Select Student(s){" "}
                    {selectedStudentIds.length > 0 ? (
                      <span className="font-medium text-[#6b7280]">
                        · {selectedStudentIds.length} selected
                      </span>
                    ) : null}
                  </p>
                </div>
                <input
                  type="search"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Search name, email, or section…"
                  className="mt-2 h-10 w-full rounded-md border border-[#e6e8eb] px-3 text-sm outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
                />
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-md border border-[#e6e8eb] p-2">
                  {isLoadingStudents ? (
                    <p className="p-2 text-sm text-[#6b7280]">Loading students...</p>
                  ) : filteredStudents.length === 0 ? (
                    <p className="p-2 text-sm text-[#6b7280]">
                      {students.length === 0
                        ? "No students enrolled in your sections yet."
                        : "No students match your search."}
                    </p>
                  ) : (
                    filteredStudents.map((student) => (
                      <label
                        key={student.student_id}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-[#f6f7fb]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.student_id)}
                          onChange={() => toggleStudent(student.student_id)}
                          className="size-4"
                        />
                        <span className="min-w-0">
                          <span className="font-medium text-[#111827]">{student.name}</span>{" "}
                          <span className="text-[#9ca3af]">· {student.section_name}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  Pick one student, or several for a group. Only your own students are shown.
                </p>
              </div>
            )}

            <label className="grid gap-2 text-sm font-semibold text-[#111827]">
              Due Date (optional)
              <input
                type="date"
                min={todayDateString()}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-11 rounded-md border border-[#e6e8eb] px-3 text-sm outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#111827]">
              Instructions to Class (optional)
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={3}
                placeholder="e.g. Complete this before Thursday's session"
                className="rounded-md border border-[#e6e8eb] px-3 py-2 text-sm outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              />
            </label>
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
              className="rounded-md border border-[#e6e8eb] px-4 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-[#c9a227] px-4 py-3 text-sm font-semibold text-[#0b1d3a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Assigning..."
                : mode === "sections"
                  ? "Assign to Selected Sections"
                  : `Assign to ${selectedStudentIds.length || ""} Student${selectedStudentIds.length === 1 ? "" : "s"}`.trim()}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

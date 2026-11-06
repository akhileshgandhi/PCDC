import type { FormEvent } from "react"
import { useEffect, useState } from "react"

import {
  getFacultySections,
  getFacultyStudents,
  type FacultySection,
  type FacultyStudent,
} from "../../api/faculty"
import { assignSimulationToSections, assignSimulationToStudents } from "../../api/jobsim"
import { getCurrentUser, isAdminRole } from "../../utils/auth"

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

interface AssignSimulationDialogProps {
  simulation: { id: number; title: string }
  onClose: () => void
  // hadNoEffect: nobody new got the simulation (show it as a warning).
  onAssigned: (message: string, hadNoEffect?: boolean) => void
}

type AssignMode = "sections" | "students"

/** Assign a published simulation to whole sections or specific students,
 * the same way case studies are assigned. */
export default function AssignSimulationDialog({ simulation, onClose, onAssigned }: AssignSimulationDialogProps) {
  const isAdmin = isAdminRole(getCurrentUser()?.role)
  const [mode, setMode] = useState<AssignMode>("sections")
  const [sections, setSections] = useState<FacultySection[]>([])
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([])
  const [students, setStudents] = useState<FacultyStudent[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const [studentSearch, setStudentSearch] = useState("")
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [dueDate, setDueDate] = useState("")
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

  useEffect(() => {
    if (mode !== "students" || studentsLoaded) return
    let isMounted = true
    setIsLoadingStudents(true)
    getFacultyStudents()
      .then((data) => {
        if (!isMounted) return
        // A student in two of your sections appears once.
        const seen = new Set<number>()
        setStudents(data.items.filter((s) => (seen.has(s.student_id) ? false : (seen.add(s.student_id), true))))
        setStudentsLoaded(true)
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

  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const filteredStudents = students.filter((student) => {
    if (!studentSearch) return true
    const term = studentSearch.toLowerCase()
    return (
      student.name.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term) ||
      student.section_name.toLowerCase().includes(term)
    )
  })

  function messageFrom(err: unknown, fallback: string) {
    const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
    return typeof detail === "string" ? detail : fallback
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (dueDate && dueDate < todayDateString()) {
      setError("Due date can't be in the past.")
      return
    }
    if (mode === "sections" && selectedSectionIds.length === 0) {
      setError("Select at least one section.")
      return
    }
    if (mode === "students" && selectedStudentIds.length === 0) {
      setError("Select at least one student.")
      return
    }
    setIsSaving(true)
    try {
      if (mode === "sections") {
        const result = await assignSimulationToSections(simulation.id, selectedSectionIds, dueDate || undefined)
        const totalNew = result.assignments.reduce((sum, item) => sum + item.newly_assigned, 0)
        const totalMatched = result.assignments.reduce((sum, item) => sum + item.matched_students, 0)
        if (totalNew === 0) {
          onAssigned(
            totalMatched === 0
              ? "No students found in the selected section(s). The section is assigned, so students added to it later will see the simulation."
              : "Assignment saved. Every student in the selected section(s) already had this simulation.",
            true,
          )
        } else {
          onAssigned(`Assigned "${simulation.title}" to ${result.assignments.length} section(s); ${totalNew} student(s) newly notified.`)
        }
      } else {
        const result = await assignSimulationToStudents(simulation.id, selectedStudentIds, dueDate || undefined)
        if (result.newly_assigned === 0) {
          onAssigned("Assignment saved. The selected student(s) already had this simulation.", true)
        } else {
          onAssigned(
            `Assigned "${simulation.title}" to ${result.newly_assigned} student(s)` +
              (result.skipped ? ` (${result.skipped} already had it).` : "."),
          )
        }
      }
    } catch (err) {
      setError(messageFrom(err, "Unable to assign this simulation."))
    } finally {
      setIsSaving(false)
    }
  }

  const tab = (value: AssignMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`rounded px-3 py-2 text-sm font-semibold transition ${
        mode === value ? "bg-white text-[#0b1d3a] shadow-sm" : "text-[#6b7280]"
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1d3a]/45 p-4">
      <div className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="w-full rounded-lg bg-white p-5 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#111827]">Assign simulation</h2>
              <p className="mt-1 text-sm text-[#6b7280]">{simulation.title}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-md border border-[#e6e8eb] px-3 py-2 text-sm font-semibold">
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid grid-cols-2 gap-1 rounded-md border border-[#e6e8eb] bg-[#f6f7fb] p-1">
              {tab("sections", "Whole class")}
              {tab("students", "Specific students")}
            </div>

            {mode === "sections" ? (
              <div>
                <p className="text-sm font-semibold text-[#111827]">Select Section(s)</p>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-[#e6e8eb] p-3">
                  {isLoadingSections ? (
                    <p className="text-sm text-[#6b7280]">Loading sections...</p>
                  ) : sections.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">
                      {isAdmin
                        ? "Your institutes have no class sections yet. Create them in Academic Setup."
                        : "You have no sections yet. Ask an admin to assign you to a class section."}
                    </p>
                  ) : (
                    sections.map((section) => (
                      <label key={section.id} className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedSectionIds.includes(section.id)}
                          onChange={() => setSelectedSectionIds((c) => toggle(c, section.id))}
                          className="size-4"
                        />
                        <span>
                          {section.name} · {section.semester_name} · {section.batch_name}
                          {section.institution_name ? ` · ${section.institution_name}` : ""} ({section.student_count} students)
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  Select Student(s){" "}
                  {selectedStudentIds.length > 0 ? (
                    <span className="font-medium text-[#6b7280]">· {selectedStudentIds.length} selected</span>
                  ) : null}
                </p>
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
                      {students.length === 0 ? "No students enrolled in your sections yet." : "No students match your search."}
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
                          onChange={() => setSelectedStudentIds((c) => toggle(c, student.student_id))}
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
                  Pick one student, or several for a group. {isAdmin ? "Only students in your institutes are shown." : "Only your own students are shown."}
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
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-[#f3c4c4] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">{error}</div>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-[#e6e8eb] px-4 py-3 text-sm font-semibold">
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
                  : `Assign to ${selectedStudentIds.length || ""} Student${selectedStudentIds.length === 1 ? "" : "s"}`.replace("  ", " ")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

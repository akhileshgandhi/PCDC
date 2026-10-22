import { ArrowLeft, Download, Printer } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"

import {
  getFacultyReportCaseStudents,
  getFacultyReportCases,
  getFacultyTeaching,
  type FacultyReportCase,
  type FacultyReportStudent,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"
import { scoreColorHexOrNeutral } from "../../utils/scoreColor"

const assignmentStatusLabels: Record<string, string> = {
  pending: "Not Started",
  active: "In Progress",
  completed: "Completed",
  expired: "Expired",
}

export default function FacultyReports() {
  const [sections, setSections] = useState<Array<{ id: number; name: string }>>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [sectionFilter, setSectionFilter] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("")

  const [cases, setCases] = useState<FacultyReportCase[]>([])
  const [isLoadingCases, setIsLoadingCases] = useState(true)
  const [error, setError] = useState("")

  const [selectedCase, setSelectedCase] = useState<FacultyReportCase | null>(null)
  const [students, setStudents] = useState<FacultyReportStudent[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)

  // Populate the Section/Subject filters from what this faculty actually
  // teaches, rather than a second round-trip — "My Teaching" already has it.
  useEffect(() => {
    getFacultyTeaching()
      .then((data) => {
        const active = data.selections.filter((s) => s.status === "active")
        const sectionMap = new Map<number, string>()
        active.forEach((s) => sectionMap.set(s.section_id, s.section_name))
        setSections([...sectionMap.entries()].map(([id, name]) => ({ id, name })))
        setSubjects([...new Set(active.map((s) => s.subject))].sort())
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let isMounted = true
    setIsLoadingCases(true)
    getFacultyReportCases({
      section_id: sectionFilter ? Number(sectionFilter) : undefined,
      subject: subjectFilter || undefined,
    })
      .then((data) => {
        if (isMounted) {
          setCases(data.items)
          setError("")
        }
      })
      .catch(() => {
        if (isMounted) setError("Unable to load report data right now.")
      })
      .finally(() => {
        if (isMounted) setIsLoadingCases(false)
      })
    return () => {
      isMounted = false
    }
  }, [sectionFilter, subjectFilter])

  function openCaseReport(caseItem: FacultyReportCase) {
    setSelectedCase(caseItem)
    setIsLoadingStudents(true)
    getFacultyReportCaseStudents(caseItem.case_id, {
      section_id: sectionFilter ? Number(sectionFilter) : undefined,
    })
      .then((data) => {
        setStudents(data.items)
        setError("")
      })
      .catch(() => setError("Unable to load the student report for this case."))
      .finally(() => setIsLoadingStudents(false))
  }

  function closeCaseReport() {
    setSelectedCase(null)
    setStudents([])
  }

  const generatedOn = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date()),
    [],
  )

  function handleExportCsv() {
    if (selectedCase) {
      const rows: Array<Array<string | number>> = [
        ["Name", "Email", "Section", "Status", "Score", "Grade", "Last Activity"],
        ...students.map((s) => [
          s.student_name,
          s.student_email,
          s.section_name,
          assignmentStatusLabels[s.assignment_status] ?? s.assignment_status,
          s.total_score ?? "",
          s.grade ?? "",
          s.attempted_at ? formatDate(s.attempted_at) : "Never",
        ]),
      ]
      downloadCsv(`${slugify(selectedCase.title)}-student-report.csv`, rows)
      return
    }
    const rows: Array<Array<string | number>> = [
      ["Case Study", "Subject", "Section", "Semester", "Assigned", "Completed", "Completion %"],
      ...cases.map((c) => [
        c.title,
        c.subject,
        c.section_name,
        c.semester_name,
        c.total_assigned,
        c.completed_count,
        c.completion_rate,
      ]),
    ]
    downloadCsv("published-case-reports.csv", rows)
  }

  function handlePrint() {
    window.print()
  }

  const hasData = selectedCase ? students.length > 0 : cases.length > 0
  const isLoading = selectedCase ? isLoadingStudents : isLoadingCases

  return (
    <FacultyLayout>
      <div className="space-y-5">
        {/* Controls — hidden when printing */}
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6 print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#111827]">Reports</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Published case studies assigned to your sections. Open a case to see each
                student's result. Export to CSV or print to PDF.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!hasData}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-[#e6e8eb] bg-white px-4 text-sm font-semibold text-[#0b1d3a] transition hover:border-[#c9a227] hover:bg-[#fff7df] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} aria-hidden="true" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!hasData}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#0b1d3a] px-4 text-sm font-semibold text-white transition hover:bg-[#17315c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={16} aria-hidden="true" />
                Print / PDF
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[240px_240px]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Section
              </span>
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="h-11 w-full rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Subject
              </span>
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className="h-11 w-full rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318] print:hidden">
            {error}
          </div>
        ) : null}

        {selectedCase ? (
          <button
            type="button"
            onClick={closeCaseReport}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b1d3a] transition hover:text-[#c9a227] print:hidden"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to case list
          </button>
        ) : null}

        {isLoading ? (
          <section className="rounded-lg border border-[#e6e8eb] bg-white p-8 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            Loading report data...
          </section>
        ) : !hasData ? (
          <section className="rounded-lg border border-[#e6e8eb] bg-white p-10 text-center shadow-sm print:hidden">
            <h2 className="text-lg font-semibold text-[#111827]">No data to report.</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              {selectedCase
                ? "No students in your sections are assigned this case."
                : "No published cases are assigned to your sections yet."}
            </p>
          </section>
        ) : (
          <article className="rounded-lg border border-[#e6e8eb] bg-white shadow-sm print:border-0 print:shadow-none">
            <header className="border-b border-[#e6e8eb] px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
                PCDC Case Studio · Faculty Report
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#0b1d3a]">
                {selectedCase ? selectedCase.title : "Published Case Reports"}
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                {selectedCase
                  ? `${selectedCase.subject} · ${selectedCase.section_name}`
                  : sectionFilter || subjectFilter
                    ? [
                        sections.find((s) => String(s.id) === sectionFilter)?.name,
                        subjectFilter,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "All Sections · All Subjects"}{" "}
                · Generated {generatedOn}
              </p>
            </header>

            {selectedCase ? (
              <ReportTable
                head={["Name", "Section", "Status", "Score", "Grade", "Last Activity", "Actions"]}
                rows={students.map((s) => [
                  <div key="name">
                    <p className="font-semibold text-[#111827]">{s.student_name}</p>
                    <p className="text-xs text-[#6b7280]">{s.student_email}</p>
                  </div>,
                  s.section_name,
                  assignmentStatusLabels[s.assignment_status] ?? s.assignment_status,
                  s.total_score !== null ? (
                    <span key="score" style={{ color: scoreTone(s.total_score) }} className="font-semibold">
                      {s.total_score}<span className="text-xs font-medium text-[#9ca3af]">/100</span>
                    </span>
                  ) : (
                    <span key="score" className="text-[#9ca3af]">—</span>
                  ),
                  s.grade ? (
                    <span key="grade" className="inline-flex rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">
                      {s.grade}
                    </span>
                  ) : (
                    <span key="grade" className="text-xs text-[#9ca3af]">—</span>
                  ),
                  s.attempted_at ? formatDate(s.attempted_at) : "Never",
                  s.attempt_id ? (
                    <Link
                      key="action"
                      to={`/faculty/attempts/${s.attempt_id}`}
                      className="text-xs font-semibold text-[#0b1d3a] hover:text-[#c9a227] print:hidden"
                    >
                      View report
                    </Link>
                  ) : (
                    <span key="action" className="text-xs text-[#9ca3af] print:hidden">—</span>
                  ),
                ])}
              />
            ) : (
              <ReportTable
                head={["Case Study", "Subject", "Section", "Semester", "Assigned", "Completion", "Actions"]}
                rows={cases.map((c) => [
                  <div key="title">
                    <p className="font-semibold text-[#111827]">{c.title}</p>
                    <p className="text-xs text-[#6b7280]">{c.difficulty_label}</p>
                  </div>,
                  c.subject,
                  c.section_name,
                  c.semester_name,
                  c.total_assigned,
                  `${c.completed_count}/${c.total_assigned} (${c.completion_rate}%)`,
                  <button
                    key="action"
                    type="button"
                    onClick={() => openCaseReport(c)}
                    className="text-xs font-semibold text-[#0b1d3a] hover:text-[#c9a227] print:hidden"
                  >
                    View report
                  </button>,
                ])}
              />
            )}

            <footer className="border-t border-[#e6e8eb] px-6 py-4 text-xs text-[#9ca3af]">
              {selectedCase ? `${students.length} student(s)` : `${cases.length} case(s)`} · PCDC —
              Prestige Capability Development Centre
            </footer>
          </article>
        )}
      </div>
    </FacultyLayout>
  )
}

interface ReportTableProps {
  head: string[]
  rows: ReactNode[][]
}

function ReportTable({ head, rows }: ReportTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#e6e8eb] bg-[#f6f7fb] text-left text-xs font-semibold uppercase text-[#6b7280]">
            {head.map((h) => (
              <th key={h} className="px-6 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#eef0f2] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-6 py-4 align-top text-[#374151]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const scoreTone = scoreColorHexOrNeutral

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const str = String(value ?? "")
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

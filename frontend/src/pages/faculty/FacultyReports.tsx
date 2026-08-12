import { Download, Printer } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import {
  getFacultyAnalyticsSummary,
  getFacultyStudents,
  type FacultyAnalyticsSummary,
  type FacultyStudent,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"
import { scoreColorHexOrNeutral } from "../../utils/scoreColor"

type ReportType = "section_summary" | "student_performance"

const statusLabels: Record<string, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  inactive: "Inactive",
  not_started: "Not Started",
}

export default function FacultyReports() {
  const [reportType, setReportType] = useState<ReportType>("section_summary")
  const [sectionFilter, setSectionFilter] = useState("")
  const [summary, setSummary] = useState<FacultyAnalyticsSummary | null>(null)
  const [students, setStudents] = useState<FacultyStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    async function load() {
      setIsLoading(true)
      try {
        const [analytics, roster] = await Promise.all([
          getFacultyAnalyticsSummary(),
          getFacultyStudents(),
        ])
        if (isMounted) {
          setSummary(analytics)
          setStudents(roster.items)
          setError("")
        }
      } catch {
        if (isMounted) setError("Unable to load report data right now.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const sections = summary?.sections ?? []

  const filteredSections = useMemo(() => {
    if (!sectionFilter) return sections
    return sections.filter((s) => String(s.section_id) === sectionFilter)
  }, [sections, sectionFilter])

  const filteredStudents = useMemo(() => {
    if (!sectionFilter) return students
    return students.filter((s) => String(s.section_id) === sectionFilter)
  }, [students, sectionFilter])

  const generatedOn = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date()),
    [],
  )

  function handleExportCsv() {
    let rows: Array<Array<string | number>> = []
    let filename = "report.csv"

    if (reportType === "section_summary") {
      filename = "section-summary-report.csv"
      rows = [
        [
          "Section",
          "Course",
          "Semester",
          "Students",
          "Avg Score",
          "Cases Assigned",
          "Completed",
          "Total Assigned",
          "Completion %",
        ],
        ...filteredSections.map((s) => [
          s.section_name,
          s.course_name,
          s.semester_name,
          s.student_count,
          s.average_score,
          s.cases_assigned,
          s.completed_count,
          s.total_assigned,
          s.completion_rate,
        ]),
      ]
    } else {
      filename = "student-performance-report.csv"
      rows = [
        [
          "Name",
          "Email",
          "Section",
          "Avg Score",
          "Cases Completed",
          "Cases Assigned",
          "Status",
          "Last Active",
        ],
        ...filteredStudents.map((s) => [
          s.name,
          s.email,
          s.section_name,
          s.last_activity_at ? s.average_score : "",
          s.completed_count,
          s.assigned_count,
          statusLabels[s.status] ?? s.status,
          s.last_activity_at ? formatDate(s.last_activity_at) : "Never",
        ]),
      ]
    }

    downloadCsv(filename, rows)
  }

  function handlePrint() {
    window.print()
  }

  const hasData =
    reportType === "section_summary" ? filteredSections.length > 0 : filteredStudents.length > 0

  return (
    <FacultyLayout>
      <div className="space-y-5">
        {/* Controls — hidden when printing */}
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6 print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#111827]">Reports</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Generate section and student performance reports. Export to CSV or print to PDF.
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
                Report Type
              </span>
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value as ReportType)}
                className="h-11 w-full rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              >
                <option value="section_summary">Section Summary</option>
                <option value="student_performance">Student Performance</option>
              </select>
            </label>
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
                  <option key={s.section_id} value={s.section_id}>
                    {s.section_name}
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

        {isLoading ? (
          <section className="rounded-lg border border-[#e6e8eb] bg-white p-8 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            Loading report data...
          </section>
        ) : !hasData ? (
          <section className="rounded-lg border border-[#e6e8eb] bg-white p-10 text-center shadow-sm print:hidden">
            <h2 className="text-lg font-semibold text-[#111827]">No data to report.</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              {sections.length === 0
                ? "Reports appear once an admin assigns you to a class section."
                : "No records for the selected section. Try All Sections."}
            </p>
          </section>
        ) : (
          <article className="rounded-lg border border-[#e6e8eb] bg-white shadow-sm print:border-0 print:shadow-none">
            {/* Report header — printed */}
            <header className="border-b border-[#e6e8eb] px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
                PCDC Case Studio · Faculty Report
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#0b1d3a]">
                {reportType === "section_summary"
                  ? "Section Summary Report"
                  : "Student Performance Report"}
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                {sectionFilter
                  ? sections.find((s) => String(s.section_id) === sectionFilter)?.section_name
                  : "All Sections"}{" "}
                · Generated {generatedOn}
              </p>
            </header>

            {reportType === "section_summary" ? (
              <ReportTable
                head={[
                  "Section",
                  "Students",
                  "Avg Score",
                  "Cases Assigned",
                  "Completion",
                ]}
                rows={filteredSections.map((s) => [
                  <div key="sec">
                    <p className="font-semibold text-[#111827]">{s.section_name}</p>
                    <p className="text-xs text-[#6b7280]">
                      {s.course_name} · {s.semester_name}
                    </p>
                  </div>,
                  s.student_count,
                  <span key="avg" style={{ color: scoreTone(s.average_score) }} className="font-semibold">
                    {s.average_score}
                  </span>,
                  s.cases_assigned,
                  `${s.completed_count}/${s.total_assigned} (${s.completion_rate}%)`,
                ])}
              />
            ) : (
              <ReportTable
                head={["Name", "Section", "Avg Score", "Completed", "Status", "Last Active"]}
                rows={filteredStudents.map((s) => [
                  <div key="name">
                    <p className="font-semibold text-[#111827]">{s.name}</p>
                    <p className="text-xs text-[#6b7280]">{s.email}</p>
                  </div>,
                  s.section_name,
                  s.last_activity_at ? (
                    <span key="avg" style={{ color: scoreTone(s.average_score) }} className="font-semibold">
                      {s.average_score}
                    </span>
                  ) : (
                    <span key="avg" className="text-[#9ca3af]">—</span>
                  ),
                  `${s.completed_count}/${s.assigned_count}`,
                  statusLabels[s.status] ?? s.status,
                  s.last_activity_at ? formatDate(s.last_activity_at) : "Never",
                ])}
              />
            )}

            <footer className="border-t border-[#e6e8eb] px-6 py-4 text-xs text-[#9ca3af]">
              {reportType === "section_summary"
                ? `${filteredSections.length} section(s)`
                : `${filteredStudents.length} student(s)`}{" "}
              · PCDC — Prestige Capability Development Centre
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

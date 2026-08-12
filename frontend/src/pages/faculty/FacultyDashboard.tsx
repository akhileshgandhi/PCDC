import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock3,
  FileBarChart,
  FolderKanban,
  PenTool,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
  getFacultyDashboardSummary,
  getFacultySections,
  type FacultyDashboardSummary,
  type FacultySection,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"
import { getCurrentUser } from "../../utils/auth"

const defaultSummary: FacultyDashboardSummary = {
  active_students: 0,
  simulations_running: 0,
  pending_reviews: 0,
  capability_alerts: 0,
}

const quickLinks = [
  {
    label: "Case Library",
    description: "Manage drafts, published cases, and archived material.",
    to: "/faculty/case-library",
    icon: BookOpen,
  },
  {
    label: "Case Builder",
    description: "Create or edit AI-assisted case studies, including the rubric.",
    to: "/faculty/case-builder",
    icon: PenTool,
  },
  {
    label: "Students",
    description: "Review roster, levels, and activity signals.",
    to: "/faculty/students",
    icon: Users,
  },
  {
    label: "Analytics",
    description: "Compare cohort capability movement and case performance.",
    to: "/faculty/analytics",
    icon: FolderKanban,
  },
  {
    label: "Reports",
    description: "Prepare summaries for reviews and accreditation.",
    to: "/faculty/reports",
    icon: FileBarChart,
  },
]

export default function FacultyDashboard() {
  const [summary, setSummary] = useState<FacultyDashboardSummary>(defaultSummary)
  const [sections, setSections] = useState<FacultySection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const currentUser = getCurrentUser()
  const firstName = currentUser?.name?.split(" ")[0] ?? "Faculty"

  useEffect(() => {
    let isMounted = true

    async function loadSummary() {
      try {
        const [summaryData, sectionsData] = await Promise.all([
          getFacultyDashboardSummary(),
          getFacultySections(),
        ])
        if (isMounted) {
          setSummary(summaryData)
          setSections(sectionsData.items)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load faculty summary right now.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      isMounted = false
    }
  }, [])

  const totalSectionStudents = sections.reduce((sum, section) => sum + section.student_count, 0)

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="rounded-lg bg-[#0b1d3a] p-6 text-white shadow-md sm:p-8">
            <div className="inline-flex rounded-full bg-[#c9a227] px-3 py-1 text-xs font-semibold text-[#0b1d3a]">
              Faculty workspace
            </div>
            <h2 className="mt-7 text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back, {firstName}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/82 sm:text-base">
              Track active student work, keep case studies moving, and review
              capability signals before they become coaching gaps.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/faculty/case-builder"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-5 py-3 text-sm font-semibold text-[#0b1d3a] shadow-sm transition hover:bg-[#e0b84e]"
              >
                New Case Study
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                to="/faculty/case-library"
                className="inline-flex items-center justify-center rounded-md border border-[#c9a227] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Review Case Library
              </Link>
            </div>
          </div>

          <article className="rounded-lg border border-[#e6e8eb] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Review Queue</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <QueueMetric
                label="Pending"
                value={summary.pending_reviews}
                to="/faculty/reports"
                description="Attempts submitted or awaiting defense that you haven't reviewed yet."
              />
              <QueueMetric
                label="Alerts"
                value={summary.capability_alerts}
                to="/faculty/analytics"
                description="Students whose capability score has dropped below 60 and may need coaching."
              />
            </div>
          </article>
        </section>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="My Sections"
            value={sections.length}
            icon={FolderKanban}
            isLoading={isLoading}
            to="#my-sections"
          />
          <SummaryCard
            label="My Students"
            value={totalSectionStudents}
            icon={Users}
            isLoading={isLoading}
            to="/faculty/students"
          />
          <SummaryCard
            label="Simulations Running"
            value={summary.simulations_running}
            icon={Clock3}
            isLoading={isLoading}
            to="/faculty/case-library"
          />
          <SummaryCard
            label="Pending Reviews"
            value={summary.pending_reviews}
            icon={BookOpen}
            isLoading={isLoading}
            to="/faculty/reports"
          />
          <SummaryCard
            label="Capability Alerts"
            value={summary.capability_alerts}
            icon={AlertTriangle}
            isLoading={isLoading}
            to="/faculty/analytics"
          />
        </section>

        <section id="my-sections" className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm scroll-mt-24">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">My Sections</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Class sections you teach. Assign cases from the case library to reach every
              enrolled student at once.
            </p>
          </div>
          {isLoading ? (
            <p className="text-sm text-[#6b7280]">Loading sections...</p>
          ) : sections.length === 0 ? (
            <p className="text-sm text-[#6b7280]">
              No sections assigned yet. Ask an admin to assign you to a class section.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-lg border border-[#e6e8eb] bg-[#f9fafb] p-4"
                >
                  <p className="text-sm font-semibold text-[#111827]">{section.name}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {section.course_name} · {section.semester_name} · {section.batch_name}
                  </p>
                  {section.subjects ? (
                    <p className="mt-1 text-xs text-[#6b7280]">{section.subjects}</p>
                  ) : null}
                  <p className="mt-3 text-sm font-semibold text-[#0b1d3a]">
                    {section.student_count} students
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">Faculty Modules</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              The build order follows the spec so downstream analytics inherit
              stable case and rubric data.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-lg border border-[#e6e8eb] bg-white p-4 shadow-sm transition hover:border-[#c9a227] hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-md bg-[#fff7df] text-[#92702a]">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#111827]">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[#6b7280]">
                        {item.description}
                      </span>
                    </span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </FacultyLayout>
  )
}

interface SummaryCardProps {
  label: string
  value: number
  icon: LucideIcon
  isLoading: boolean
  to: string
}

function SummaryCard({ label, value, icon: Icon, isLoading, to }: SummaryCardProps) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c9a227] hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-[#eef3f8] text-[#0b1d3a]">
          <Icon size={19} aria-hidden="true" />
        </div>
        <span className="rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-semibold text-[#6b7280]">
          Live
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[#6b7280]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#111827]">
        {isLoading ? "..." : value}
      </p>
    </Link>
  )
}

interface QueueMetricProps {
  label: string
  value: number
  to: string
  description: string
}

function QueueMetric({ label, value, to, description }: QueueMetricProps) {
  return (
    <Link
      to={to}
      title={description}
      className="block rounded-md bg-[#f6f7fb] p-4 text-center transition hover:-translate-y-0.5 hover:bg-[#eef3f8] hover:shadow-sm"
    >
      <p className="text-3xl font-semibold text-[#0b1d3a]">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase text-[#6b7280]">{label}</p>
      <p className="mt-1 text-[11px] leading-4 text-[#9ca3af]">{description}</p>
    </Link>
  )
}

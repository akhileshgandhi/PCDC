import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock3,
  FileBarChart,
  FolderKanban,
  PenTool,
  SlidersHorizontal,
  Table2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
  getFacultyDashboardSummary,
  getFacultyProfile,
  getFacultySections,
  type FacultyDashboardSummary,
  type FacultySection,
} from "../../api/faculty"
import FacultyInsights from "../../components/dashboard/FacultyInsights"
import CountUp from "../../components/common/CountUp"
import Reveal from "../../components/common/Reveal"
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
    label: "My Case Library",
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
  // Full name from the token right away; swapped for "Title Full Name" once the profile loads.
  const [greetingName, setGreetingName] = useState(currentUser?.name?.trim() || "Faculty")

  useEffect(() => {
    let isMounted = true

    getFacultyProfile()
      .then((profile) => {
        if (isMounted && profile.display_name) setGreetingName(profile.display_name)
      })
      .catch(() => undefined)

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
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Reveal index={0} className="rounded-2xl">
          <div className="rounded-2xl bg-[#0c1f3d] p-8 text-white shadow-lg shadow-slate-900/10 sm:p-10">
            <div className="inline-flex rounded-full bg-[#2563eb] px-3 py-1 text-xs font-semibold text-white">
              Faculty workspace
            </div>
            <h2 className="mt-7 text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back, {greetingName}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/82 sm:text-base">
              Track active student work, keep case studies moving, and review
              capability signals before they become coaching gaps.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Link
                to="/faculty/case-builder"
                className="group rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition hover:border-[#2563eb]/50 hover:bg-white/[0.1]"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-[#2563eb]/25 text-[#93c5fd]">
                  <BookOpen size={19} aria-hidden="true" />
                </span>
                <p className="mt-4 font-semibold text-white">New Case Study</p>
                <p className="mt-1 text-xs text-white/60">Start authoring a new case for your students.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#93c5fd] transition group-hover:text-white">
                  Get started
                  <ArrowRight size={15} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>

              <Link
                to="/faculty/simulations/new"
                className="group rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition hover:border-[#2563eb]/50 hover:bg-white/[0.1]"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-[#2563eb]/25 text-[#93c5fd]">
                  <Table2 size={19} aria-hidden="true" />
                </span>
                <p className="mt-4 font-semibold text-white">New Simulation</p>
                <p className="mt-1 text-xs text-white/60">Design a job simulation with the AI builder.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#93c5fd] transition group-hover:text-white">
                  Get started
                  <ArrowRight size={15} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </div>
          </Reveal>

          <Reveal index={1}>
          <article className="rounded-2xl border border-[#e6e8eb] bg-white p-6 shadow-md shadow-blue-500/[0.06] transition hover:shadow-lg hover:shadow-blue-500/20">
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
          </Reveal>
        </section>

        {error ? (
          <div className="rounded-xl border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <Reveal index={0}>
            <SummaryCard
              label="My Sections"
              value={sections.length}
              icon={FolderKanban}
              isLoading={isLoading}
              to="#my-sections"
            />
          </Reveal>
          <Reveal index={1}>
            <SummaryCard
              label="My Students"
              value={totalSectionStudents}
              icon={Users}
              isLoading={isLoading}
              to="/faculty/students"
            />
          </Reveal>
          <Reveal index={2}>
            <SummaryCard
              label="Simulations Running"
              value={summary.simulations_running}
              icon={Clock3}
              isLoading={isLoading}
              to="/faculty/case-library"
            />
          </Reveal>
          <Reveal index={3}>
            <SummaryCard
              label="Pending Reviews"
              value={summary.pending_reviews}
              icon={BookOpen}
              isLoading={isLoading}
              to="/faculty/reports"
            />
          </Reveal>
          <Reveal index={4}>
            <SummaryCard
              label="Capability Alerts"
              value={summary.capability_alerts}
              icon={AlertTriangle}
              isLoading={isLoading}
              to="/faculty/analytics"
            />
          </Reveal>
        </section>

        <FacultyInsights />

        <section id="my-sections" className="rounded-2xl border border-[#e6e8eb] bg-white p-6 shadow-md shadow-blue-500/[0.06] scroll-mt-24">
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section, index) => (
                <Reveal key={section.id} index={index}>
                  <div className="rounded-xl border border-[#e6e8eb] bg-[#f9fafb] p-5 transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#2563eb] hover:bg-white hover:shadow-lg hover:shadow-blue-500/20">
                    <p className="text-sm font-semibold text-[#111827]">{section.name}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      {section.course_name} · {section.semester_name} · {section.batch_name}
                    </p>
                    {section.subjects ? (
                      <p className="mt-1 text-xs text-[#6b7280]">{section.subjects}</p>
                    ) : null}
                    <p className="mt-3 text-sm font-semibold text-[#0c1f3d]">
                      <CountUp value={section.student_count} /> students
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#e6e8eb] bg-white p-6 shadow-md shadow-blue-500/[0.06]">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">Faculty Modules</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              The build order follows the spec so downstream analytics inherit
              stable case and rubric data.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((item, index) => {
              const Icon = item.icon

              return (
                <Reveal key={item.label} index={index}>
                  <Link
                    to={item.to}
                    className="block rounded-xl border border-[#e6e8eb] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#2563eb] hover:shadow-lg hover:shadow-blue-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-[#dbeafe] text-[#1d4ed8]">
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
                </Reveal>
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
      className="block rounded-2xl border border-[#e6e8eb] bg-white p-6 shadow-md shadow-blue-500/[0.06] transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#2563eb] hover:shadow-lg hover:shadow-blue-500/20"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-[#dbeafe] text-[#0c1f3d]">
          <Icon size={19} aria-hidden="true" />
        </div>
        <span className="rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-semibold text-[#6b7280]">
          Live
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[#6b7280]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#111827]">
        <CountUp value={value} isLoading={isLoading} />
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
      className="block rounded-xl bg-[#f6f7fb] p-5 text-center transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#dbeafe] hover:shadow-md hover:shadow-blue-500/20"
    >
      <p className="text-3xl font-semibold text-[#0c1f3d]"><CountUp value={value} /></p>
      <p className="mt-1 text-xs font-semibold uppercase text-[#6b7280]">{label}</p>
      <p className="mt-1 text-[11px] leading-4 text-[#9ca3af]">{description}</p>
    </Link>
  )
}

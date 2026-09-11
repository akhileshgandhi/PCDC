import axios from "axios"
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  ChevronRight,
  Compass,
  Lightbulb,
  MessageCircle,
  Rocket,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import {
  getStudentAchievements,
  getStudentActiveEngagements,
  getStudentCareerPathway,
  getStudentDashboardSummary,
  getStudentProfile,
  getStudentRecentEvaluations,
  type StudentAchievements,
  type StudentActiveEngagements,
  type StudentCareerPathway,
  type StudentDashboardSummary,
  type StudentProfile,
  type StudentRecentEvaluation,
} from "../../api/student"
import CapabilityMatrix, { type MatrixFilter } from "../../components/student/CapabilityMatrix"
import DashboardLayout from "../../layouts/DashboardLayout"
import { getCurrentUser } from "../../utils/auth"

interface CoachItem {
  name: string
  description: string
  icon: LucideIcon
}

const defaultSummary: StudentDashboardSummary = {
  overall_capability_score: 0,
  capability_scores: [],
  pending_simulations: 0,
  completed_simulations: 0,
  current_level: null,
  level_label: null,
  hero_message:
    "Your next challenge is designed to strengthen strategic judgment and risk awareness. Keep sharpening.",
  active_case: null,
  active_case_count: 0,
  upcoming_session: null,
}

const defaultActiveEngagements: StudentActiveEngagements = {
  active_case_study: null,
  simulations: { groups: [] },
  concept_study: { status: "coming_soon", groups: ["Think", "Lead", "Execute", "Grow"] },
}

function describeDashboardError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Unable to connect to the server. Check your connection and try again."
    }
    if (error.response.status === 404) {
      return "Your student profile hasn't been set up yet. Contact an administrator to get started."
    }
    const detail = error.response.data?.detail
    if (typeof detail === "string") {
      return detail
    }
    return `Unable to load your dashboard right now (error ${error.response.status}).`
  }
  return "Unable to load your dashboard right now."
}

function formatSessionTime(scheduledAt: string) {
  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) return scheduledAt
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

const coaches: CoachItem[] = [
  { name: "Capability Coach", description: "Strengthen core thinking", icon: Sparkles },
  { name: "Leadership Coach", description: "Lead with impact", icon: Users },
  { name: "Communication Coach", description: "Refine executive voice", icon: MessageCircle },
  { name: "Career Coach", description: "Navigate your path", icon: Compass },
  { name: "Startup Mentor", description: "Build with conviction", icon: Rocket },
  { name: "Reflection Coach", description: "Deepen self-awareness", icon: Lightbulb },
]

function formatEvaluationDate(value: string | null): string {
  if (!value) return ""
  const parsed = new Date(value.replace(" ", "T"))
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10)
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    parsed,
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState<StudentDashboardSummary>(defaultSummary)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [activeEngagements, setActiveEngagements] = useState<StudentActiveEngagements>(
    defaultActiveEngagements,
  )
  // Simulations/Concepts browsing isn't built yet (see the "Coming soon" cards
  // below), so the matrix never actually filters to anything but case studies.
  const activeMatrixFilter: MatrixFilter = "case_study"
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [recentEvaluations, setRecentEvaluations] = useState<StudentRecentEvaluation[]>([])
  const [achievements, setAchievements] = useState<StudentAchievements | null>(null)
  const [careerPathway, setCareerPathway] = useState<StudentCareerPathway | null>(null)
  const currentUser = getCurrentUser()
  const firstName = currentUser?.name?.split(" ")[0] ?? "Student"

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        const [
          summaryData,
          profileData,
          activeEngagementsData,
          recentEvaluationsData,
          achievementsData,
          careerPathwayData,
        ] = await Promise.all([
          getStudentDashboardSummary(),
          getStudentProfile(),
          getStudentActiveEngagements(),
          getStudentRecentEvaluations().catch(() => []),
          getStudentAchievements().catch(() => null),
          getStudentCareerPathway().catch(() => null),
        ])
        if (isMounted) {
          setSummary(summaryData)
          setProfile(profileData)
          setActiveEngagements(activeEngagementsData)
          setRecentEvaluations(recentEvaluationsData)
          setAchievements(achievementsData)
          setCareerPathway(careerPathwayData)
          setError("")
        }
      } catch (err) {
        if (isMounted) {
          setError(describeDashboardError(err))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const identityLine = profile
    ? [profile.course_name, profile.semester_name, profile.batch_name, profile.section_name]
        .filter(Boolean)
        .join(" · ")
    : ""

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="rounded-lg bg-[#081d3a] p-6 text-white shadow-md sm:p-8">
            <div className="inline-flex rounded-full bg-[#c9a227] px-3 py-1 text-xs font-semibold text-white">
              Current Status: Active
            </div>
            <h2 className="mt-7 text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back, {firstName}
            </h2>
            {identityLine ? (
              <p className="mt-2 text-sm font-medium text-white/70">
                {identityLine}
                {profile?.mentor_name ? ` · Mentor: ${profile.mentor_name}` : ""}
              </p>
            ) : null}
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/82 sm:text-base">
              {summary.hero_message}
            </p>
            {summary.upcoming_session ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90">
                <CalendarClock size={16} aria-hidden="true" className="shrink-0 text-[#c9a227]" />
                Next {titleCase(summary.upcoming_session.session_type)} with{" "}
                {summary.upcoming_session.mentor_name}: {formatSessionTime(summary.upcoming_session.scheduled_at)}
              </div>
            ) : null}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to={
                  summary.active_case
                    ? `/student/case-studies/${summary.active_case.case_id}/attempt`
                    : "/student/case-studies"
                }
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e0b84e]"
              >
                {summary.active_case
                  ? summary.active_case.started
                    ? "Continue Active Case"
                    : "Start Active Case"
                  : "Browse Case Studies"}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                to="/student/capability-profile"
                className="inline-flex items-center justify-center rounded-md border border-[#c9a227] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View Capability Profile
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-[#e6e8eb] bg-white p-6 shadow-sm">
            <div className="mx-auto grid size-36 place-items-center rounded-full border-[10px] border-[#e6e8eb] border-t-[#92702a]">
              <div className="text-center">
                <div className="text-3xl font-semibold">
                  {isLoading ? "--" : summary.overall_capability_score}
                </div>
                <div className="text-xs font-semibold text-[#111827]">Overall Score</div>
              </div>
            </div>
            <div className="mt-5 text-center">
              <h3 className="text-xl font-semibold">
                {isLoading || summary.current_level === null
                  ? "Level --"
                  : `Level ${summary.current_level}`}
              </h3>
              {summary.level_label ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#92702a]">
                  {summary.level_label}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Active Engagements</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Card title="Active Case Study" className="border-sky-100 bg-sky-50">
              <p className="mb-4 text-sm font-medium text-[#6b7280]">
                Apply strategic thinking to real business challenges.
              </p>
              <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
                {isLoading ? (
                  <p className="text-sm font-medium text-[#6b7280]">Loading...</p>
                ) : summary.active_case_count > 0 ? (
                  <>
                    <div className="text-4xl font-semibold text-[#081d3a]">
                      {summary.active_case_count}
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#6b7280]">
                      Active Case {summary.active_case_count === 1 ? "Study" : "Studies"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-[#6b7280]">No active studies.</p>
                )}
              </div>
              <Link
                to="/student/case-studies"
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#081d3a] px-4 py-3 text-sm font-semibold text-[#081d3a] transition hover:bg-[#081d3a] hover:text-white"
              >
                Browse Case Studies
              </Link>
            </Card>

            <Card title="Simulations" className="border-teal-100 bg-teal-50" comingSoon>
              <p className="flex-1 text-sm font-medium text-[#6b7280]">
                Practice high-stakes decisions in realistic simulated scenarios.
              </p>
              <ComingSoonButton label="Browse Simulations" />
            </Card>

            <Card title="Academic Fundamentals" className="border-rose-100 bg-rose-50" comingSoon>
              <p className="flex-1 text-sm font-medium text-[#6b7280]">
                Strengthen your grasp of core business concepts.
              </p>
              <ComingSoonButton label="Browse Concepts" />
            </Card>

            <Card title="Career Compass" className="border-orange-100 bg-orange-50" comingSoon>
              <div className="flex-1 py-2 text-center">
                <Compass size={28} aria-hidden="true" className="mx-auto text-[#92702a]" />
                <p className="mt-3 text-sm font-medium text-[#6b7280]">
                  Explore roles and pathways aligned to your strengths.
                </p>
              </div>
              <ComingSoonButton label="Explore Career Compass" />
            </Card>
          </div>
        </section>

        <section id="capability-matrix" className="scroll-mt-24 rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Capability Matrix</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Real-time performance across core executive competencies.
              </p>
            </div>
            <Link
              to="/student/capability-profile"
              className="hidden items-center gap-2 text-sm font-semibold text-[#92702a] sm:inline-flex"
            >
              Details
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <CapabilityMatrix
            filter={activeMatrixFilter}
            simulationGroups={activeEngagements.simulations.groups}
            conceptGroups={activeEngagements.concept_study.groups}
          />
        </section>

        <section className="grid gap-5">
          <Card title="AI Coaches">
            <div className="divide-y divide-[#e6e8eb]">
              {coaches.map((coach) => {
                const Icon = coach.icon

                return (
                  <Link
                    to="/student/ai-coach"
                    key={coach.name}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-[#e8eef7] text-[#081d3a]">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{coach.name}</span>
                      <span className="block truncate text-xs text-[#6b7280]">
                        {coach.description}
                      </span>
                    </span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
            <Link
              to="/student/ai-coach"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold"
            >
              View All Coaches
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </Card>

        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card title="Recent Evaluations">
            {recentEvaluations.length > 0 ? (
              <div className="divide-y divide-[#e6e8eb]">
                {recentEvaluations.map((evaluation, index) => (
                  <div key={`${evaluation.title}-${index}`} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{evaluation.title}</h3>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {formatEvaluationDate(evaluation.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">{evaluation.score}</p>
                      <p className="text-xs font-semibold text-[#16a34a]">{evaluation.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[#6b7280]">
                {isLoading ? "Loading evaluations..." : "No evaluations yet. Complete a case study to see your results here."}
              </p>
            )}
          </Card>

          <Card title="Achievements">
            {achievements ? (
              <>
                <p className="text-sm text-[#6b7280]">
                  {achievements.earned_count} of {achievements.badges.length} badges earned
                </p>
                {achievements.earned_count > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {achievements.badges
                      .filter((badge) => badge.earned)
                      .map((badge) => (
                        <div
                          key={badge.key}
                          title={badge.description}
                          className="flex flex-col items-center gap-1.5 rounded-lg border border-[#f4e4c1] bg-[#fffaf0] p-3 text-center"
                        >
                          <div className="grid size-9 place-items-center rounded-full bg-[#f4e4c1] text-[#92702a]">
                            <Trophy size={16} aria-hidden="true" />
                          </div>
                          <span className="text-xs font-semibold leading-tight text-[#111827]">
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-semibold uppercase text-[#16a34a]">
                            Earned
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg bg-[#f6f7fb] p-4 text-center text-sm text-[#6b7280]">
                    Complete a case study to earn your first badge.
                  </p>
                )}
                <div className="mt-5 rounded-lg bg-[#f6f7fb] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Next Milestone</span>
                    <span className="font-semibold">
                      {achievements.next_milestone.current} / {achievements.next_milestone.target}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6b7280]">{achievements.next_milestone.label}</p>
                  <div className="mt-4 h-2 rounded-full bg-[#e6e8eb]">
                    <div
                      className="h-2 rounded-full bg-[#081d3a] transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (achievements.next_milestone.current /
                            Math.max(1, achievements.next_milestone.target)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-[#6b7280]">
                {isLoading ? "Loading achievements..." : "No achievements yet."}
              </p>
            )}
            <Link
              to="/student/achievements"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold"
            >
              View All Achievements
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </Card>

          <Card title="Career Pathway">
            {careerPathway ? (
              <>
                <div className="flex items-center gap-3">
                  <BriefcaseBusiness size={22} aria-hidden="true" />
                  <div>
                    <p className="text-xs text-[#6b7280]">Current Pathway</p>
                    <h3 className="font-semibold">{careerPathway.pathway_name}</h3>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-[#6b7280]">
                    <span>Capabilities developed</span>
                    <span className="font-semibold text-[#111827]">
                      {careerPathway.progress.developed}/{careerPathway.progress.total}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#e6e8eb]">
                    <div
                      className="h-2 rounded-full bg-[#c9a227] transition-all"
                      style={{
                        width: `${
                          careerPathway.progress.total
                            ? (careerPathway.progress.developed / careerPathway.progress.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {careerPathway.focus_areas.length > 0 ? (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase text-[#6b7280]">Focus Areas</p>
                    <div className="mt-2 space-y-2">
                      {careerPathway.focus_areas.map((focus) => (
                        <div
                          key={focus.capability}
                          className="flex items-center justify-between rounded-md bg-[#f6f7fb] px-3 py-2 text-sm"
                        >
                          <span className="truncate">{focus.capability}</span>
                          <span className="text-xs font-semibold text-[#6b7280]">
                            {focus.score}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {careerPathway.recommended_cases.length > 0 ? (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase text-[#6b7280]">
                      Recommended Next
                    </p>
                    <div className="mt-2 space-y-2">
                      {careerPathway.recommended_cases.map((item) => (
                        <div
                          key={item.title}
                          className="flex items-center justify-between rounded-md bg-[#f6f7fb] px-3 py-2 text-sm"
                        >
                          <span className="truncate">{item.title}</span>
                          <span className="ml-2 shrink-0 text-xs font-semibold text-[#6b7280]">
                            {item.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="py-6 text-center text-sm text-[#6b7280]">
                {isLoading ? "Loading pathway..." : "No pathway data yet."}
              </p>
            )}
            <Link
              to="/student/career-pathway"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold"
            >
              View Full Pathway
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  )
}

interface CardProps {
  title: string
  children: ReactNode
  className?: string
  comingSoon?: boolean
}

function Card({ title, children, className, comingSoon }: CardProps) {
  return (
    <article className={`flex h-full flex-col rounded-lg border p-5 shadow-sm ${className ?? "border-[#e6e8eb] bg-white"}`}>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {comingSoon ? (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Coming soon
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </article>
  )
}

// Simulations/Concepts/Career Compass have no module built yet — rather than
// link somewhere fake or silently do nothing, this is a disabled, clearly
// "not yet available" action instead of a real navigation target.
function ComingSoonButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      title="This module isn't available yet."
      className="mt-auto inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-[#d0d5dd] px-4 py-3 text-sm font-semibold text-[#98a2b3]"
    >
      {label} — Coming soon
    </button>
  )
}


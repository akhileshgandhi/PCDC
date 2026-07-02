import {
  ArrowRight,
  Award,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Flame,
  Lightbulb,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"

import {
  getStudentDashboardSummary,
  getStudentProfile,
  type StudentDashboardSummary,
  type StudentProfile,
} from "../../api/student"
import DashboardLayout from "../../layouts/DashboardLayout"
import { getCurrentUser } from "../../utils/auth"

interface CoachItem {
  name: string
  description: string
  icon: LucideIcon
}

interface EvaluationItem {
  title: string
  date: string
  score: number
  status: string
}

interface PathwayItem {
  title: string
  level: string
}

const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  Communication: MessageCircle,
  Leadership: Users,
  "Problem Solving": Target,
  "Decision Making": BriefcaseBusiness,
  Innovation: Lightbulb,
  "Strategic Thinking": CheckCircle2,
  Entrepreneurship: BarChart3,
  Professionalism: ShieldCheck,
}

const defaultSummary: StudentDashboardSummary = {
  overall_capability_score: 0,
  capability_scores: [],
  pending_simulations: 0,
  completed_simulations: 0,
  current_level: null,
  upcoming_session: null,
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

const coaches: CoachItem[] = [
  { name: "Capability Coach", description: "Strengthen core thinking", icon: Sparkles },
  { name: "Leadership Coach", description: "Lead with impact", icon: Users },
  { name: "Communication Coach", description: "Refine executive voice", icon: MessageCircle },
  { name: "Career Coach", description: "Navigate your path", icon: Compass },
  { name: "Reflection Coach", description: "Deepen self-awareness", icon: Lightbulb },
]

const evaluations: EvaluationItem[] = [
  { title: "Q2 Pricing Strategy Challenge", date: "Jun 20, 2025", score: 76, status: "Good" },
  { title: "Leadership Conflict Simulation", date: "Jun 15, 2025", score: 69, status: "Improving" },
  { title: "Startup Opportunity Assessment", date: "Jun 10, 2025", score: 81, status: "Excellent" },
]

const pathwayItems: PathwayItem[] = [
  { title: "Market Entry Case", level: "Level 3" },
  { title: "Problem Structuring Drill", level: "Level 3" },
  { title: "Executive Communication Practice", level: "Level 2" },
]

const attemptStages = ["Briefing", "Analysis", "AI Discussion", "Solution", "Defense", "Evaluation"]

export default function Dashboard() {
  const [summary, setSummary] = useState<StudentDashboardSummary>(defaultSummary)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const currentUser = getCurrentUser()
  const firstName = currentUser?.name?.split(" ")[0] ?? "Student"

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        const [summaryData, profileData] = await Promise.all([
          getStudentDashboardSummary(),
          getStudentProfile(),
        ])
        if (isMounted) {
          setSummary(summaryData)
          setProfile(profileData)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load your dashboard right now.")
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
              Your next challenge is designed to strengthen strategic judgment
              and risk awareness. Keep sharpening.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e0b84e]"
              >
                Continue Active Case
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-[#c9a227] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View Capability Profile
              </button>
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
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Capability Matrix</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Real-time performance across core executive competencies.
              </p>
            </div>
            <button
              type="button"
              className="hidden items-center gap-2 text-sm font-semibold text-[#92702a] sm:inline-flex"
            >
              Details
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(isLoading ? [] : summary.capability_scores).map((metric) => {
              const Icon = CAPABILITY_ICONS[metric.capability] ?? Sparkles

              return (
                <article
                  key={metric.capability}
                  className="rounded-lg border border-[#e6e8eb] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-8 place-items-center rounded-md bg-[#f6f7fb] text-[#081d3a]">
                      <Icon size={17} aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{metric.capability}</h3>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-2xl font-semibold">{metric.score}</span>
                    <span className="pb-1 text-xs text-[#6b7280]">/ 100</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-[#e6e8eb]">
                    <div
                      className="h-2 rounded-full bg-[#081d3a]"
                      style={{ width: `${Math.min(100, Math.max(0, metric.score))}%` }}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card title="Active Case Study">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Q3 Market Entry Strategy</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>Business Strategy</Badge>
                  <Badge>Level 3</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6b7280]">Current Stage</p>
                <p className="mt-1 text-sm font-semibold text-[#16a34a]">AI Discussion</p>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {attemptStages.map((stage, index) => (
                  <div key={stage} className="text-center">
                    <div
                      className={`mx-auto grid size-7 place-items-center rounded-full border text-xs font-semibold ${
                        index === 2
                          ? "border-[#c9a227] bg-[#c9a227] text-white"
                          : "border-[#d1d5db] bg-white text-[#6b7280]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <p className="mt-2 text-[10px] leading-tight text-[#6b7280]">{stage}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Clock3 size={17} aria-hidden="true" />
                  45 min
                </span>
                <span className="font-medium">Progress 50%</span>
              </div>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e0b84e]"
              >
                Continue Attempt
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </Card>

          <Card title="AI Coaches">
            <div className="divide-y divide-[#e6e8eb]">
              {coaches.map((coach) => {
                const Icon = coach.icon

                return (
                  <button
                    type="button"
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
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold"
            >
              View All Coaches
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </Card>

          <Card title="Mentor Support">
            <div className="flex items-center gap-3">
              <div className="grid size-14 place-items-center rounded-lg bg-[#f4e4c1] text-lg font-semibold text-[#081d3a]">
                AR
              </div>
              <div>
                <h3 className="font-semibold">Dr. Ananya Rao</h3>
                <p className="text-xs font-semibold uppercase text-[#92702a]">
                  Assigned Executive Mentor
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-[#f6f7fb] p-4">
              {summary.upcoming_session ? (
                <>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays size={17} aria-hidden="true" />
                    {formatSessionTime(summary.upcoming_session.scheduled_at)}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {summary.upcoming_session.session_type} with{" "}
                    {summary.upcoming_session.mentor_name}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-[#6b7280]">
                  {isLoading ? "Loading session details..." : "No upcoming session scheduled"}
                </p>
              )}
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-md border border-[#081d3a] px-4 py-3 text-sm font-semibold transition hover:bg-[#081d3a] hover:text-white"
            >
              View Mentor Feedback
            </button>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card title="Recent Evaluations">
            <div className="divide-y divide-[#e6e8eb]">
              {evaluations.map((evaluation) => (
                <div key={evaluation.title} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{evaluation.title}</h3>
                    <p className="mt-1 text-xs text-[#6b7280]">{evaluation.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold">{evaluation.score}</p>
                    <p className="text-xs font-semibold text-[#16a34a]">{evaluation.status}</p>
                  </div>
                  <div className="h-2 w-11 rounded-full bg-[#081d3a]" />
                </div>
              ))}
            </div>
            <CardLink label="View All Evaluations" />
          </Card>

          <Card title="Achievements">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Achievement icon={ShieldCheck} label="Critical Thinker" />
              <Achievement icon={Trophy} label="AI-Aware Learner" />
              <Achievement icon={Award} label="Consistent Performer" />
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#f59e0b]">
              <Flame size={17} aria-hidden="true" />
              5 Day Streak
            </div>
            <div className="mt-5 rounded-lg bg-[#f6f7fb] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Next Milestone</span>
                <span className="font-semibold">2 / 3</span>
              </div>
              <p className="mt-1 text-xs text-[#6b7280]">Complete 3 Level-3 cases</p>
              <div className="mt-4 h-2 rounded-full bg-[#e6e8eb]">
                <div className="h-2 w-2/3 rounded-full bg-[#081d3a]" />
              </div>
            </div>
          </Card>

          <Card title="Career Pathway">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness size={22} aria-hidden="true" />
              <div>
                <p className="text-xs text-[#6b7280]">Current Pathway</p>
                <h3 className="font-semibold">Management Consulting</h3>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {pathwayItems.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-md bg-[#f6f7fb] px-3 py-3 text-sm"
                >
                  <span>{item.title}</span>
                  <span className="text-xs font-semibold text-[#6b7280]">{item.level}</span>
                </div>
              ))}
            </div>
            <CardLink label="View Full Pathway" />
          </Card>
        </section>
      </div>
    </DashboardLayout>
  )
}

interface CardProps {
  title: string
  children: ReactNode
}

function Card({ title, children }: CardProps) {
  return (
    <article className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </article>
  )
}

interface BadgeProps {
  children: ReactNode
}

function Badge({ children }: BadgeProps) {
  return (
    <span className="rounded-md bg-[#fff7df] px-3 py-1 text-xs font-semibold text-[#92702a]">
      {children}
    </span>
  )
}

interface AchievementProps {
  icon: LucideIcon
  label: string
}

function Achievement({ icon: Icon, label }: AchievementProps) {
  return (
    <div>
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff7df] text-[#92702a]">
        <Icon size={24} aria-hidden="true" />
      </div>
      <p className="mt-3 text-xs font-semibold leading-5">{label}</p>
      <p className="mt-1 text-xs text-[#16a34a]">Earned</p>
    </div>
  )
}

interface CardLinkProps {
  label: string
}

function CardLink({ label }: CardLinkProps) {
  return (
    <button
      type="button"
      className="mt-5 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold"
    >
      {label}
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  )
}

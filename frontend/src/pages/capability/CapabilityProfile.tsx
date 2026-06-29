import { ArrowRight, CalendarDays, LineChart, MessageSquare, Target } from "lucide-react"
import { Link } from "react-router-dom"

import CapabilityCard, {
  type CapabilityScore,
} from "../../components/capability/CapabilityCard"
import CapabilityHistoryTable, {
  type CapabilityHistoryRow,
} from "../../components/capability/CapabilityHistoryTable"
import CapabilityRadar from "../../components/capability/CapabilityRadar"
import DashboardLayout from "../../layouts/DashboardLayout"

interface CapabilityProfileData {
  overall_score: number
  level: number
  level_name: string
  points_to_next: number
  last_updated: string
  case_count: number
  capabilities: CapabilityScore[]
  recent_cases: CapabilityHistoryRow[]
}

const mockCapabilityProfile: CapabilityProfileData = {
  overall_score: 72,
  level: 3,
  level_name: "Strategic Decision Making",
  points_to_next: 240,
  last_updated: "2025-06-20",
  case_count: 5,
  capabilities: [
    { name: "Analytical Thinking", score: 78, previous: 74.8, trend: 3.2 },
    { name: "Critical Thinking", score: 74, previous: 72.9, trend: 1.5 },
    { name: "Strategic Thinking", score: 68, previous: 68.8, trend: -0.8 },
    { name: "Decision Making", score: 71, previous: 68.1, trend: 4.1 },
    { name: "Communication", score: 74, previous: 74, trend: 0 },
    { name: "Leadership", score: 65, previous: 63.7, trend: 2.0 },
    { name: "Innovation", score: 61, previous: 61.7, trend: -1.2 },
    { name: "Risk Assessment", score: 69, previous: 65.4, trend: 5.5 },
  ],
  recent_cases: [
    {
      title: "Q3 Market Entry Strategy",
      date: "Jun 20, 2025",
      score: 76,
      strongest: "Analytical Thinking",
      weakest: "Risk Assessment",
    },
    {
      title: "IPL Franchise Turnaround",
      date: "Jun 15, 2025",
      score: 69,
      strongest: "Communication",
      weakest: "Strategic Thinking",
    },
    {
      title: "Startup Opportunity Assessment",
      date: "Jun 10, 2025",
      score: 81,
      strongest: "Decision Making",
      weakest: "Leadership",
    },
  ],
}

const recommendedActions = [
  {
    title: "Improve Strategic Thinking",
    description: "Your score dropped 0.8% this month",
    recommendation: "Recommended: Level 5 Geopolitics case",
    icon: Target,
    to: "/student/case-studies/2",
  },
  {
    title: "Build on Decision Making strength",
    description: "+4.1% growth - keep the momentum",
    recommendation: "Recommended: Level 4 Business case",
    icon: LineChart,
    to: "/student/case-studies/4",
  },
  {
    title: "Schedule Mentor Session",
    description: "Your mentor has a note about Risk Awareness",
    recommendation: "Dr. Ananya Rao - Tomorrow 11:00 AM",
    icon: MessageSquare,
    to: "/student/dashboard",
  },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

export default function CapabilityProfile() {
  return (
    <DashboardLayout>
      <div className="space-y-5">
        <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#111827]">My Capability Profile</h1>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                Track your growth across all executive competencies.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#6B7280]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#F6F7F9] px-4 py-2">
                <CalendarDays size={16} aria-hidden="true" />
                Last updated: {formatDate(mockCapabilityProfile.last_updated)}
              </span>
              <span className="rounded-full bg-[#F6F7F9] px-4 py-2">
                Based on {mockCapabilityProfile.case_count} case studies
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,60%)_minmax(360px,40%)]">
          <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">Capability Radar</h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Current scores compared with previous month.
                </p>
              </div>
              <div className="flex gap-4 text-xs font-semibold">
                <span className="inline-flex items-center gap-2 text-[#C9A227]">
                  <span className="h-0.5 w-8 bg-[#C9A227]" />
                  Current
                </span>
                <span className="inline-flex items-center gap-2 text-[#0B1D3A]">
                  <span className="h-0.5 w-8 border-t-2 border-dashed border-[#0B1D3A]" />
                  Previous Month
                </span>
              </div>
            </div>

            <CapabilityRadar capabilities={mockCapabilityProfile.capabilities} />

            <div className="mt-5 rounded-xl bg-[#F6F7F9] p-5">
              <p className="text-sm font-semibold text-[#6B7280]">Overall Capability Score</p>
              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-5xl font-semibold text-[#111827]">
                    {mockCapabilityProfile.overall_score}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#0B1D3A]">
                    Level {mockCapabilityProfile.level} - {mockCapabilityProfile.level_name}
                  </p>
                </div>
                <div className="w-full max-w-sm">
                  <div className="h-2 rounded-full bg-[#E6EBEB]">
                    <div className="h-2 w-[72%] rounded-full bg-[#C9A227]" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#6B7280]">
                    Progress to Level 4: {mockCapabilityProfile.points_to_next} pts needed
                  </p>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            {mockCapabilityProfile.capabilities.map((capability) => (
              <CapabilityCard key={capability.name} capability={capability} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#111827]">Recent Case Study Performance</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              How recent attempts contributed to your capability profile.
            </p>
          </div>
          <CapabilityHistoryTable rows={mockCapabilityProfile.recent_cases} />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#111827]">Recommended Next Steps</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Suggested actions based on your current growth pattern.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {recommendedActions.map((action) => {
              const Icon = action.icon

              return (
                <article
                  key={action.title}
                  className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#FFF7DF] text-[#92702A]">
                      <Icon size={19} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#111827]">{action.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{action.description}</p>
                      <p className="mt-2 text-sm font-semibold text-[#0B1D3A]">
                        {action.recommendation}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={action.to}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#92702A] transition hover:text-[#0B1D3A]"
                  >
                    View Case
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

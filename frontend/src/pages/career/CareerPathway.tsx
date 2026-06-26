import {
  BarChart3,
  Briefcase,
  ClipboardList,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Rocket,
  Settings,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"

import CareerTrackCard, { type CareerTrack } from "../../components/career/CareerTrackCard"
import PathwayBanner from "../../components/career/PathwayBanner"
import ProgressTimeline, { type CareerMilestone } from "../../components/career/ProgressTimeline"
import DashboardLayout from "../../layouts/DashboardLayout"

const focusAreas = [
  "Strategic Thinking",
  "Decision Making",
  "Communication",
  "Analytical Thinking",
]

const milestones: CareerMilestone[] = [
  {
    name: "Foundation",
    status: "Done",
    capabilities: ["Business Basics", "Case Reading", "Structured Notes"],
    caseStudies: 2,
    score: "60%+",
  },
  {
    name: "Analysis",
    status: "Done",
    capabilities: ["Analytical Thinking", "Market Sizing", "Insight Synthesis"],
    caseStudies: 3,
    score: "70%+",
  },
  {
    name: "Decision",
    status: "In Progress",
    capabilities: ["Decision Making", "Trade-off Analysis", "Risk Awareness"],
    caseStudies: 5,
    score: "75%+",
  },
  {
    name: "Strategy",
    status: "Locked",
    capabilities: ["Strategic Thinking", "Competitive Positioning", "Implementation Clarity"],
    caseStudies: 0,
    score: "82%+",
  },
  {
    name: "Executive",
    status: "Locked",
    capabilities: ["Executive Presence", "Board Communication", "Leadership Judgement"],
    caseStudies: 0,
    score: "88%+",
  },
]

const recommendedActivities = [
  {
    icon: ClipboardList,
    title: "Market Entry Case",
    meta: "Level 3 · Business · 45 min",
    develops: "Strategic Thinking",
  },
  {
    icon: Target,
    title: "Problem Structuring Drill",
    meta: "Level 3 · Exercise · 20 min",
    develops: "Analytical Thinking",
  },
  {
    icon: MessageSquare,
    title: "Executive Communication",
    meta: "Level 2 · Exercise · 15 min",
    develops: "Communication",
  },
]

const careerTracks: CareerTrack[] = [
  { name: "Management Consulting", icon: Briefcase, match: 85, current: true },
  { name: "Finance", icon: TrendingUp, match: 71 },
  { name: "Marketing", icon: Megaphone, match: 68 },
  { name: "Human Resources", icon: Users, match: 62 },
  { name: "Operations", icon: Settings, match: 74 },
  { name: "Entrepreneurship", icon: Rocket, match: 79 },
  { name: "Family Business", icon: Home, match: 66 },
  { name: "Sales Leadership", icon: Target, match: 70 },
  { name: "Business Analytics", icon: BarChart3, match: 77 },
  { name: "General Management", icon: LayoutDashboard, match: 80 },
]

export default function CareerPathway() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Career Pathway</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Your personalised development roadmap toward Management Consulting.
          </p>
        </div>

        <PathwayBanner readiness={72} focusAreas={focusAreas} />
        <ProgressTimeline milestones={milestones} />

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#111827]">Next Recommended Activities</h2>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {recommendedActivities.map((activity) => {
              const Icon = activity.icon

              return (
                <article
                  key={activity.title}
                  className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm"
                >
                  <div className="grid size-11 place-items-center rounded-md bg-[#081d3a] text-white">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-[#111827]">{activity.title}</h3>
                  <p className="mt-1 text-sm text-[#6b7280]">{activity.meta}</p>
                  <p className="mt-3 text-sm text-[#111827]">
                    Develops: <span className="font-semibold">{activity.develops}</span>
                  </p>
                  <button
                    type="button"
                    className="mt-4 rounded-md bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#081d3a]"
                  >
                    Start
                  </button>
                </article>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">Explore Other Pathways</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {careerTracks.map((track) => (
              <CareerTrackCard key={track.name} track={track} />
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

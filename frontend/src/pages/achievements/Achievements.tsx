import { Award, Brain, Cpu, Flame, Lightbulb, Medal, Star, TrendingUp, Trophy } from "lucide-react"

import BadgeCard, { type EarnedBadge } from "../../components/achievements/BadgeCard"
import Leaderboard, { type LeaderboardRow } from "../../components/achievements/Leaderboard"
import MilestoneTimeline, {
  type AchievementMilestone,
} from "../../components/achievements/MilestoneTimeline"
import DashboardLayout from "../../layouts/DashboardLayout"

const earnedBadges: EarnedBadge[] = [
  {
    id: 1,
    name: "Critical Thinker",
    icon: Brain,
    earnedAt: "Jun 15, 2025",
    description: "Scored 80%+ in 3 analytical case studies",
    color: "#C9A227",
  },
  {
    id: 2,
    name: "AI-Aware Learner",
    icon: Cpu,
    earnedAt: "Jun 10, 2025",
    description: "Used AI discussion in 5 case attempts",
    color: "#0B1D3A",
  },
  {
    id: 3,
    name: "Consistent Performer",
    icon: Award,
    earnedAt: "Jun 05, 2025",
    description: "Completed cases 5 days in a row",
    color: "#16A34A",
  },
  {
    id: 4,
    name: "First Attempt",
    icon: Star,
    earnedAt: "May 28, 2025",
    description: "Completed your very first case study",
    color: "#7C3AED",
  },
  {
    id: 5,
    name: "Deep Thinker",
    icon: Lightbulb,
    earnedAt: "May 20, 2025",
    description: "Submitted initial analysis over 400 words",
    color: "#DC2626",
  },
  {
    id: 6,
    name: "Level Up",
    icon: TrendingUp,
    earnedAt: "May 15, 2025",
    description: "Advanced from Level 2 to Level 3",
    color: "#059669",
  },
]

const lockedBadges = [
  { name: "Strategic Leader", hint: "Score 85%+ in 3 leadership cases" },
  { name: "Entrepreneur", hint: "Complete 5 entrepreneurship cases" },
  { name: "Mentor's Pick", hint: "Receive a commendation from your mentor" },
  { name: "Top Performer", hint: "Reach top 3 in cohort ranking" },
]

const milestones: AchievementMilestone[] = [
  { date: "Jun 20", title: "Reached Level 3 - Strategic Decision Making", status: "done" },
  { date: "Jun 15", title: "Completed 5 case studies", status: "done" },
  { date: "Jun 10", title: "First 80%+ score", status: "done" },
  { date: "May 28", title: "First case study completed", status: "done" },
  { date: "Pending", title: "Complete 10 case studies (6/10)", status: "pending" },
  { date: "Pending", title: "Reach Level 4 (240 pts needed)", status: "pending" },
]

const leaderboard: LeaderboardRow[] = [
  { rank: 1, name: "Priya M.", score: 84, level: 4, cases: 9 },
  { rank: 2, name: "Rahul K.", score: 81, level: 4, cases: 8 },
  { rank: 3, name: "Anika S.", score: 79, level: 4, cases: 8 },
  { rank: 4, name: "Dev P.", score: 78, level: 3, cases: 7 },
  { rank: 5, name: "Meera J.", score: 76, level: 3, cases: 7 },
  { rank: 6, name: "Kabir R.", score: 75, level: 3, cases: 6 },
  { rank: 7, name: "Ishaan V.", score: 73, level: 3, cases: 6 },
  { rank: 8, name: "You (Sanjay)", score: 72, level: 3, cases: 5, self: true },
  { rank: 9, name: "Nisha A.", score: 70, level: 3, cases: 5 },
  { rank: 10, name: "Arjun B.", score: 69, level: 2, cases: 5 },
]

const stats = [
  { label: "Badges Earned", value: "7", icon: Trophy },
  { label: "Current Streak", value: "5 days", icon: Flame },
  { label: "Total Points", value: "1,240", icon: Star },
  { label: "Cohort Rank", value: "#8 of 45", icon: Medal },
]

export default function Achievements() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Achievements</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Your milestones, badges, and recognition.</p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon

            return (
              <article
                key={stat.label}
                className="rounded-lg border border-[#e6e8eb] bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-md bg-[#081d3a] text-white">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#6b7280]">{stat.label}</p>
                    <p className="mt-1 text-xl font-semibold text-[#111827]">{stat.value}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">Earned Badges</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {earnedBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">Locked Badges</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {lockedBadges.map((badge) => (
              <BadgeCard key={badge.name} badge={badge} locked />
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <MilestoneTimeline milestones={milestones} />
          <Leaderboard rows={leaderboard} />
        </div>
      </div>
    </DashboardLayout>
  )
}

import type { LucideIcon } from "lucide-react"
import {
  Award,
  Brain,
  Compass,
  Flame,
  Layers,
  Medal,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react"
import { useEffect, useState } from "react"

import { getStudentAchievements, type StudentAchievements } from "../../api/student"
import BadgeCard, { type EarnedBadge } from "../../components/achievements/BadgeCard"
import Leaderboard, { type LeaderboardRow } from "../../components/achievements/Leaderboard"
import MilestoneTimeline, {
  type AchievementMilestone,
} from "../../components/achievements/MilestoneTimeline"
import DashboardLayout from "../../layouts/DashboardLayout"

const badgeStyle: Record<string, { icon: LucideIcon; color: string }> = {
  first_case: { icon: Star, color: "#7C3AED" },
  high_scorer: { icon: Award, color: "#C9A227" },
  consistent: { icon: Medal, color: "#16A34A" },
  capability_master: { icon: Brain, color: "#0B1D3A" },
  level_up: { icon: TrendingUp, color: "#059669" },
  difficulty_climber: { icon: Flame, color: "#DC2626" },
  domain_explorer: { icon: Compass, color: "#2563EB" },
  well_rounded: { icon: Layers, color: "#0891B2" },
}

function styleFor(key: string) {
  return badgeStyle[key] ?? { icon: Trophy, color: "#0B1D3A" }
}

export default function Achievements() {
  const [data, setData] = useState<StudentAchievements | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getStudentAchievements()
      .then((result) => {
        if (active) setData(result)
      })
      .catch(() => {
        if (active) setError("Unable to load achievements right now.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const earnedBadges: EarnedBadge[] = (data?.badges ?? [])
    .filter((badge) => badge.earned)
    .map((badge, index) => ({
      id: index,
      name: badge.label,
      icon: styleFor(badge.key).icon,
      color: styleFor(badge.key).color,
      earnedAt: "",
      description: badge.description,
    }))

  const lockedBadges = (data?.badges ?? [])
    .filter((badge) => !badge.earned)
    .map((badge) => ({ name: badge.label, hint: badge.description }))

  const stats = [
    { label: "Badges Earned", value: String(data?.stats.badges_earned ?? 0), icon: Trophy },
    { label: "Current Streak", value: `${data?.stats.streak_days ?? 0} days`, icon: Flame },
    { label: "Total Points", value: String(data?.stats.total_points ?? 0), icon: Star },
    {
      label: "Cohort Rank",
      value: data?.stats.cohort_rank
        ? `#${data.stats.cohort_rank} of ${data.stats.cohort_size}`
        : "—",
      icon: Medal,
    },
  ]

  const milestones: AchievementMilestone[] = (data?.milestones ?? []).map((milestone) => ({
    date: milestone.date,
    title: milestone.title,
    status: milestone.status,
  }))

  const leaderboard: LeaderboardRow[] = (data?.leaderboard ?? []).map((row) => ({
    rank: row.rank,
    name: row.name,
    score: row.score,
    level: row.level,
    cases: row.cases,
    self: row.self,
  }))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Achievements</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Your milestones, badges, and recognition.</p>
        </div>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg border border-[#e6e8eb] bg-white p-8 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            Loading achievements...
          </div>
        ) : (
          <>
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
                        <p className="text-xs font-semibold uppercase text-[#6b7280]">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-xl font-semibold text-[#111827]">{stat.value}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#111827]">Earned Badges</h2>
              {earnedBadges.length > 0 ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {earnedBadges.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-[#e6e8eb] bg-white p-6 text-center text-sm text-[#6b7280]">
                  No badges earned yet. Complete a case study to start earning.
                </p>
              )}
            </section>

            {lockedBadges.length > 0 ? (
              <section>
                <h2 className="text-lg font-semibold text-[#111827]">Locked Badges</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {lockedBadges.map((badge) => (
                    <BadgeCard key={badge.name} badge={badge} locked />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <MilestoneTimeline milestones={milestones} />
              <Leaderboard rows={leaderboard} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

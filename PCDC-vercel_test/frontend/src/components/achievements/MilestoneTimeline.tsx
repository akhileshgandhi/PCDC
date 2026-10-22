import { CheckCircle2, Circle } from "lucide-react"

export interface AchievementMilestone {
  date: string
  title: string
  status: "done" | "pending"
}

interface MilestoneTimelineProps {
  milestones: AchievementMilestone[]
}

export default function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">Milestones Timeline</h2>
      <div className="mt-5 space-y-4">
        {milestones.map((milestone) => {
          const done = milestone.status === "done"

          return (
            <div key={`${milestone.date}-${milestone.title}`} className="flex gap-3">
              <div className={done ? "text-[#16a34a]" : "text-[#9ca3af]"}>
                {done ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827]">{milestone.title}</p>
                <p className="mt-1 text-xs text-[#6b7280]">{milestone.date}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

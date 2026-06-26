import { CheckCircle2, Lock, Radio } from "lucide-react"
import { useState } from "react"

export type MilestoneStatus = "Done" | "In Progress" | "Locked"

export interface CareerMilestone {
  name: string
  status: MilestoneStatus
  capabilities: string[]
  caseStudies: number
  score: string
}

interface ProgressTimelineProps {
  milestones: CareerMilestone[]
}

const statusStyles: Record<MilestoneStatus, string> = {
  Done: "border-[#16a34a] bg-[#16a34a] text-white",
  "In Progress": "border-[#c9a227] bg-[#c9a227] text-[#081d3a]",
  Locked: "border-[#d1d5db] bg-white text-[#6b7280]",
}

export default function ProgressTimeline({ milestones }: ProgressTimelineProps) {
  const [activeMilestone, setActiveMilestone] = useState(2)
  const active = milestones[activeMilestone]

  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Progress Timeline</h2>
          <p className="text-sm text-[#6b7280]">Five readiness milestones toward the pathway goal.</p>
        </div>
        <span className="rounded-md bg-[#f6f7fb] px-3 py-2 text-xs font-semibold text-[#081d3a]">
          {active.status}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {milestones.map((milestone, index) => {
          const isActive = activeMilestone === index
          const Icon =
            milestone.status === "Done" ? CheckCircle2 : milestone.status === "Locked" ? Lock : Radio

          return (
            <button
              key={milestone.name}
              type="button"
              onClick={() => setActiveMilestone(index)}
              className={`relative rounded-lg border p-4 text-left transition ${
                isActive
                  ? "border-[#c9a227] bg-[#fff9e8] shadow-sm"
                  : "border-[#e6e8eb] bg-white hover:border-[#c9a227]/60"
              }`}
            >
              <div
                className={`grid size-10 place-items-center rounded-full border ${statusStyles[milestone.status]}`}
              >
                <Icon size={18} aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-semibold text-[#111827]">{milestone.name}</p>
              <p className="mt-1 text-xs text-[#6b7280]">{milestone.status}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-5 rounded-lg border border-[#e6e8eb] bg-[#f6f7fb] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-[#111827]">{active.name}</h3>
            <p className="mt-1 text-sm text-[#6b7280]">Required capability score: {active.score}</p>
          </div>
          <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#081d3a]">
            {active.caseStudies} case studies completed
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {active.capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded-md border border-[#e6e8eb] bg-white px-3 py-2 text-xs font-medium text-[#111827]"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react"

import { scoreColorClass } from "../../utils/scoreColor"

export interface CapabilityScore {
  name: string
  score: number
  attempts: number
}

interface CapabilityCardProps {
  capability: CapabilityScore
}

const iconMap: Record<string, LucideIcon> = {
  "Decision Making": BriefcaseBusiness,
  "Strategic Thinking": CheckCircle2,
  Communication: MessageCircle,
  Leadership: Users,
  Innovation: Lightbulb,
  Entrepreneurship: Rocket,
  "Problem Solving": Target,
  Professionalism: ShieldCheck,
}

export default function CapabilityCard({ capability }: CapabilityCardProps) {
  const Icon = iconMap[capability.name] ?? BarChart3

  return (
    <article className="rounded-lg border border-[#E6EBEB] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[#F6F7F9] text-[#0B1D3A]">
          <Icon size={18} aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold leading-5 text-[#111827]">{capability.name}</h3>
      </div>

      <div className="mt-5">
        <p className={`text-2xl font-semibold ${scoreColorClass(capability.score)}`}>
          {capability.score}
          <span className="text-sm font-medium text-[#6B7280]"> / 100</span>
        </p>
        <div className="mt-3 h-2 rounded-full bg-[#E6EBEB]">
          <div
            className="h-2 rounded-full bg-[#0B1D3A]"
            style={{ width: `${capability.score}%` }}
          />
        </div>
        <p className="mt-3 text-xs font-semibold text-[#6B7280]">
          {capability.attempts > 0
            ? `Based on ${capability.attempts} case attempt${capability.attempts === 1 ? "" : "s"}`
            : "No attempts yet"}
        </p>
      </div>
    </article>
  )
}

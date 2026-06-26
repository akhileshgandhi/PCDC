import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  ShieldCheck,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface CapabilityScore {
  name: string
  score: number
  previous: number
  trend: number
}

interface CapabilityCardProps {
  capability: CapabilityScore
}

const iconMap: Record<string, LucideIcon> = {
  "Analytical Thinking": BarChart3,
  "Critical Thinking": Target,
  "Strategic Thinking": CheckCircle2,
  "Decision Making": BriefcaseBusiness,
  Communication: MessageCircle,
  Leadership: Users,
  Innovation: Lightbulb,
  "Risk Assessment": ShieldCheck,
}

function trendDisplay(trend: number) {
  if (trend > 0) {
    return { label: `Up +${trend.toFixed(1)}% this month`, className: "text-[#16A34A]" }
  }

  if (trend < 0) {
    return { label: `Down ${trend.toFixed(1)}% this month`, className: "text-[#EF4444]" }
  }

  return { label: "Stable", className: "text-[#6B7280]" }
}

export default function CapabilityCard({ capability }: CapabilityCardProps) {
  const Icon = iconMap[capability.name] ?? BarChart3
  const trend = trendDisplay(capability.trend)

  return (
    <article className="rounded-lg border border-[#E6EBEB] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[#F6F7F9] text-[#0B1D3A]">
          <Icon size={18} aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold leading-5 text-[#111827]">{capability.name}</h3>
      </div>

      <div className="mt-5">
        <p className="text-2xl font-semibold text-[#111827]">
          {capability.score}
          <span className="text-sm font-medium text-[#6B7280]"> / 100</span>
        </p>
        <div className="mt-3 h-2 rounded-full bg-[#E6EBEB]">
          <div
            className="h-2 rounded-full bg-[#0B1D3A]"
            style={{ width: `${capability.score}%` }}
          />
        </div>
        <p className={`mt-3 text-xs font-semibold ${trend.className}`}>{trend.label}</p>
      </div>
    </article>
  )
}

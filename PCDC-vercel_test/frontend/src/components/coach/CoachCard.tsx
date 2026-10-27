import {
  ArrowRight,
  BookOpen,
  Brain,
  Compass,
  MessageSquare,
  Rocket,
  Users,
  type LucideIcon,
} from "lucide-react"

import { AISH_NAME, AishAvatar } from "../aish/Aish"

export interface Coach {
  id: string
  name: string
  tagline: string
  description: string
  /** Focus areas shown as tags on the card. */
  focus: string[]
  icon: keyof typeof iconMap
  color: string
  system_prompt: string
}

interface CoachCardProps {
  coach: Coach
  isActive: boolean
  onSelect: (coach: Coach) => void
}

const iconMap = {
  Brain,
  Users,
  MessageSquare,
  Compass,
  Rocket,
  BookOpen,
} satisfies Record<string, LucideIcon>

export default function CoachCard({ coach, isActive, onSelect }: CoachCardProps) {
  const Icon = iconMap[coach.icon]

  return (
    <article
      className={`rounded-xl border bg-white p-5 shadow-sm transition ${
        isActive ? "border-[#C9A227] ring-2 ring-[#C9A227]/20" : "border-[#E6EBEB]"
      }`}
    >
      {/* Aish's face with this coach's icon as a badge — same Aish, six hats. */}
      <div className="relative w-fit">
        <AishAvatar size={52} />
        <span
          className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full text-white ring-2 ring-white"
          style={{ backgroundColor: coach.color }}
        >
          <Icon size={13} aria-hidden="true" />
        </span>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#92702A]">
        {AISH_NAME}
      </p>
      <h2 className="mt-0.5 text-lg font-semibold text-[#111827]">{coach.name}</h2>
      <p className="mt-1 text-sm font-semibold text-[#6B7280]">{coach.tagline}</p>
      <p className="mt-4 min-h-20 text-sm leading-6 text-[#6B7280]">{coach.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Focus areas">
        {coach.focus.map((area) => (
          <span
            key={area}
            className="rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${coach.color}14`, color: coach.color }}
          >
            {area}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect(coach)}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
          isActive
            ? "bg-[#C9A227] text-white"
            : "border border-[#0B1D3A] text-[#0B1D3A] hover:bg-[#0B1D3A] hover:text-white"
        }`}
      >
        {isActive ? "Active" : "Start Session"}
        {!isActive ? <ArrowRight size={16} aria-hidden="true" /> : null}
      </button>
    </article>
  )
}

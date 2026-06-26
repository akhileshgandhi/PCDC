import type { LucideIcon } from "lucide-react"
import { Lock } from "lucide-react"

export interface EarnedBadge {
  id: number
  name: string
  icon: LucideIcon
  earnedAt: string
  description: string
  color: string
}

interface BadgeCardProps {
  badge: EarnedBadge | { name: string; hint: string }
  locked?: boolean
}

export default function BadgeCard({ badge, locked = false }: BadgeCardProps) {
  if (locked) {
    return (
      <article className="relative rounded-lg border border-[#e6e8eb] bg-[#f3f4f6] p-5 text-center text-[#6b7280]">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#e5e7eb]">
          <Lock size={22} aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-semibold text-[#374151]">{badge.name}</h3>
        <p className="mt-2 text-sm">{"hint" in badge ? badge.hint : ""}</p>
      </article>
    )
  }

  const earnedBadge = badge as EarnedBadge
  const Icon = earnedBadge.icon

  return (
    <article className="rounded-lg border border-[#e6e8eb] bg-white p-5 text-center shadow-sm">
      <div
        className="mx-auto grid size-14 place-items-center rounded-full text-white"
        style={{ backgroundColor: earnedBadge.color }}
      >
        <Icon size={25} aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-semibold text-[#111827]">{earnedBadge.name}</h3>
      <p className="mt-1 text-xs font-medium text-[#6b7280]">Earned {earnedBadge.earnedAt}</p>
      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{earnedBadge.description}</p>
    </article>
  )
}

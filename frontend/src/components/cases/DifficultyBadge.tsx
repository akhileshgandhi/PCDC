interface DifficultyBadgeProps {
  level: number
}

export default function DifficultyBadge({ level }: DifficultyBadgeProps) {
  return (
    <span className="rounded-full border border-[#0B1D3A] px-3 py-1 text-xs font-semibold text-[#0B1D3A]">
      Level {level}
    </span>
  )
}

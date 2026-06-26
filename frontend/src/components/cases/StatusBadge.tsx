export type CaseStatus = "available" | "in_progress" | "completed"

interface StatusBadgeProps {
  status: CaseStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "available") {
    return null
  }

  if (status === "completed") {
    return (
      <span className="rounded-full bg-[#16A34A] px-3 py-1 text-xs font-semibold text-white">
        Completed ✓
      </span>
    )
  }

  return (
    <span className="rounded-full bg-[#C9A227] px-3 py-1 text-xs font-semibold text-[#111827]">
      In Progress
    </span>
  )
}

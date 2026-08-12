// Single source of truth for score → color mapping, so the same score always
// reads the same across student and faculty portals (green >=80, amber >=60, red below).
export function scoreColorHex(score: number): string {
  if (score >= 80) return "#16a34a"
  if (score >= 60) return "#c9a227"
  return "#dc2626"
}

// Same thresholds, but treats a zero/missing score as "no data yet" rather than red.
export function scoreColorHexOrNeutral(score: number): string {
  if (score <= 0) return "#9ca3af"
  return scoreColorHex(score)
}

export function scoreColorClass(score: number): string {
  if (score >= 80) return "text-[#16a34a]"
  if (score >= 60) return "text-[#c9a227]"
  return "text-[#dc2626]"
}

/** Shared display formatters used across admin, faculty and student pages. */

/** "case_study_ready" → "Case Study Ready" */
export function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

/** Short date with time, e.g. "Nov 20, 3:45 PM". */
export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

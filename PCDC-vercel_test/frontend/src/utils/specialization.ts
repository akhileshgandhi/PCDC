/**
 * Specializations (the `courses` table) can share a display name across
 * programs — e.g. "Business Administration" under both PGDM and BBA, or "NA"
 * under several. Anywhere a user picks one, show enough to tell them apart.
 */
export interface SpecializationLike {
  name: string
  code?: string | null
  department_name?: string | null
}

/** "Business Administration (BBA_BA) – BBA" */
export function specializationLabel(course: SpecializationLike): string {
  const code = course.code?.trim()
  const program = course.department_name?.trim()
  return `${course.name}${code ? ` (${code})` : ""}${program ? ` – ${program}` : ""}`
}

/** "Business Administration (BBA_BA)" — for places already grouped by program. */
export function specializationShortLabel(course: SpecializationLike): string {
  const code = course.code?.trim()
  return code ? `${course.name} (${code})` : course.name
}

const NO_PROGRAM = "Other"

/** Group specializations under their program, programs and names sorted. */
export function groupByProgram<T extends SpecializationLike>(courses: T[]): Array<{ program: string; items: T[] }> {
  const groups = new Map<string, T[]>()
  for (const course of courses) {
    const program = course.department_name?.trim() || NO_PROGRAM
    const list = groups.get(program)
    if (list) list.push(course)
    else groups.set(program, [course])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === NO_PROGRAM ? 1 : b === NO_PROGRAM ? -1 : a.localeCompare(b)))
    .map(([program, items]) => ({
      program,
      items: [...items].sort((x, y) => x.name.localeCompare(y.name)),
    }))
}

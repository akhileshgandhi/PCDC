import { useEffect, useMemo, useState } from "react"

import {
  getAdminCourses,
  getAdminDepartments,
  getAdminInstitutions,
  type AdminCourse,
  type AdminDepartment,
  type AdminInstitution,
  type AdminSectionListItem,
} from "../../api/admin"

export interface StudentPlacement {
  institutionId: string
  departmentId: string
  sectionId: string
}

export const emptyPlacement: StudentPlacement = { institutionId: "", departmentId: "", sectionId: "" }

/**
 * Institute -> Program -> Section pickers for a student. A student is still
 * enrolled through a section (it fixes their specialization, batch and
 * semester); Institute and Program narrow the section list and show where the
 * student belongs. Picking a section directly fills Institute and Program in.
 */
export default function StudentPlacementFields({
  sections,
  value,
  onChange,
  fieldClass,
  labelClass,
  sectionKey,
}: {
  sections: AdminSectionListItem[]
  value: StudentPlacement
  onChange: (next: StudentPlacement) => void
  fieldClass: string
  labelClass: string
  /** Optional key for the section <select> (forces a repaint when counts change). */
  sectionKey?: string
}) {
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([])
  const [departments, setDepartments] = useState<AdminDepartment[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>([])

  useEffect(() => {
    getAdminInstitutions().then((d) => setInstitutions(d.items)).catch(() => undefined)
    getAdminDepartments().then((d) => setDepartments(d.items)).catch(() => undefined)
    getAdminCourses().then((d) => setCourses(d.items)).catch(() => undefined)
  }, [])

  const placementOf = useMemo(() => {
    const departmentOfCourse = new Map(courses.map((c) => [c.id, c.department_id]))
    const institutionOfDepartment = new Map(departments.map((d) => [d.id, d.institution_id]))
    return (section: AdminSectionListItem) => {
      const departmentId = departmentOfCourse.get(section.course_id) ?? null
      const institutionId = departmentId !== null ? institutionOfDepartment.get(departmentId) ?? null : null
      return {
        departmentId: departmentId !== null ? String(departmentId) : "",
        institutionId: institutionId !== null ? String(institutionId) : "",
      }
    }
  }, [courses, departments])

  // An existing selection (e.g. the student's current section) fills in its
  // Institute and Program once the structure has loaded.
  useEffect(() => {
    if (!value.sectionId || (value.institutionId && value.departmentId)) return
    const section = sections.find((s) => String(s.id) === value.sectionId)
    if (!section) return
    const found = placementOf(section)
    if (found.departmentId) onChange({ ...value, ...found })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementOf, sections, value.sectionId])

  // Only one institute to choose from: select it.
  useEffect(() => {
    if (institutions.length === 1 && !value.institutionId) {
      onChange({ ...value, institutionId: String(institutions[0].id) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutions])

  const programOptions = departments.filter(
    (d) => !value.institutionId || String(d.institution_id) === value.institutionId,
  )
  const sectionOptions = sections.filter((s) => {
    const found = placementOf(s)
    if (value.departmentId) return found.departmentId === value.departmentId
    if (value.institutionId) return found.institutionId === value.institutionId
    return true
  })

  function sectionLabel(s: AdminSectionListItem) {
    return `${s.name} · ${s.course_name} · Sem ${s.semester_number} · ${s.batch_name} (${s.student_count})`
  }

  return (
    <>
      <label className={labelClass}>
        <span>Institute <span className="text-[#d92d20]">*</span></span>
        <select
          className={fieldClass}
          value={value.institutionId}
          onChange={(e) => onChange({ institutionId: e.target.value, departmentId: "", sectionId: "" })}
        >
          <option value="">Select institute</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span>Program <span className="text-[#d92d20]">*</span></span>
        <select
          className={fieldClass}
          value={value.departmentId}
          onChange={(e) => onChange({ ...value, departmentId: e.target.value, sectionId: "" })}
        >
          <option value="">Select program</option>
          {programOptions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span>Section <span className="text-[#d92d20]">*</span></span>
        <select
          key={sectionKey}
          className={fieldClass}
          value={value.sectionId}
          onChange={(e) => {
            const section = sections.find((s) => String(s.id) === e.target.value)
            onChange(section ? { ...placementOf(section), sectionId: e.target.value } : { ...value, sectionId: "" })
          }}
        >
          <option value="">{sectionOptions.length ? "Select section" : "No sections in this program yet"}</option>
          {sectionOptions.map((s) => (
            <option key={s.id} value={s.id}>{sectionLabel(s)}</option>
          ))}
        </select>
        <span className="text-xs font-normal text-[#667085]">
          The section sets the student's specialization, batch and semester.
        </span>
      </label>
    </>
  )
}

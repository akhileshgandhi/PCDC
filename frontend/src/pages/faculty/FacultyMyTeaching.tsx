import { CheckCircle2, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  addFacultyTeachingBulk,
  getFacultyTeaching,
  removeFacultyTeaching,
  type FacultyTeachingResponse,
  type FacultyTeachingSelection,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"
import { getCurrentUser } from "../../utils/auth"

const firstName = getCurrentUser()?.name?.split(" ")[0] ?? ""

interface Block {
  sectionId: number
  sectionName: string
  batchName: string
  courseName: string
  semesterName: string
  institutionId: number
  institutionName: string
  departmentId: number
  departmentName: string
  subjects: string[]
}

const keyOf = (sectionId: number, subject: string) => `${sectionId}::${subject}`

export default function FacultyMyTeaching() {
  const navigate = useNavigate()
  const [data, setData] = useState<FacultyTeachingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [instFilter, setInstFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")

  function load() {
    setLoading(true)
    getFacultyTeaching()
      .then((res) => {
        setData(res)
        setChecked(new Set(res.selections.map((s) => keyOf(s.section_id, s.subject))))
        setError("")
      })
      .catch(() => setError("Unable to load your teaching."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // Flatten the admin hierarchy into per-section blocks.
  const blocks = useMemo<Block[]>(() => {
    if (!data) return []
    const out: Block[] = []
    for (const inst of data.options) {
      for (const dept of inst.departments) {
        for (const course of dept.courses) {
          for (const sem of course.semesters) {
            for (const section of sem.sections) {
              out.push({
                sectionId: section.id,
                sectionName: section.name,
                batchName: section.batch_name,
                courseName: course.name,
                semesterName: sem.name,
                institutionId: inst.id,
                institutionName: inst.name,
                departmentId: dept.id,
                departmentName: dept.name,
                subjects: sem.subjects,
              })
            }
          }
        }
      }
    }
    return out
  }, [data])

  const institutions = useMemo(() => {
    const map = new Map<number, string>()
    blocks.forEach((b) => map.set(b.institutionId, b.institutionName))
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [blocks])

  const departments = useMemo(() => {
    const map = new Map<number, string>()
    blocks
      .filter((b) => instFilter === "all" || String(b.institutionId) === instFilter)
      .forEach((b) => map.set(b.departmentId, b.departmentName))
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [blocks, instFilter])

  const existing = useMemo(() => {
    const map = new Map<string, FacultyTeachingSelection>()
    data?.selections.forEach((s) => map.set(keyOf(s.section_id, s.subject), s))
    return map
  }, [data])

  // Blocks after department + search filtering (search can match section/course/subject).
  const visibleBlocks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return blocks
      .filter((b) => instFilter === "all" || String(b.institutionId) === instFilter)
      .filter((b) => deptFilter === "all" || String(b.departmentId) === deptFilter)
      .map((b) => {
        if (!term) return b
        const headerMatch =
          b.sectionName.toLowerCase().includes(term) || b.courseName.toLowerCase().includes(term)
        const subjects = headerMatch
          ? b.subjects
          : b.subjects.filter((s) => s.toLowerCase().includes(term))
        return { ...b, subjects }
      })
      .filter((b) => b.subjects.length > 0)
  }, [blocks, instFilter, deptFilter, search])

  const shownKeys = useMemo(
    () => visibleBlocks.flatMap((b) => b.subjects.map((s) => keyOf(b.sectionId, s))),
    [visibleBlocks],
  )
  const allShownChecked = shownKeys.length > 0 && shownKeys.every((k) => checked.has(k))

  const existingKeys = useMemo(() => new Set(existing.keys()), [existing])
  const toAdd = useMemo(() => [...checked].filter((k) => !existingKeys.has(k)), [checked, existingKeys])
  const toRemove = useMemo(
    () => [...existingKeys].filter((k) => !checked.has(k)),
    [checked, existingKeys],
  )
  const hasChanges = toAdd.length > 0 || toRemove.length > 0

  function toggle(key: string) {
    setChecked((c) => {
      const next = new Set(c)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSection(b: Block) {
    const keys = b.subjects.map((s) => keyOf(b.sectionId, s))
    const allOn = keys.every((k) => checked.has(k))
    setChecked((c) => {
      const next = new Set(c)
      keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)))
      return next
    })
  }

  function toggleAllShown() {
    setChecked((c) => {
      const next = new Set(c)
      shownKeys.forEach((k) => (allShownChecked ? next.delete(k) : next.add(k)))
      return next
    })
  }

  async function save() {
    if (!hasChanges) return
    setSaving(true)
    setNotice("")
    try {
      if (toAdd.length > 0) {
        await addFacultyTeachingBulk(
          toAdd.map((k) => {
            const [sid, subject] = splitKey(k)
            return { section_id: sid, subject }
          }),
        )
      }
      for (const k of toRemove) {
        const sel = existing.get(k)
        if (sel) await removeFacultyTeaching(sel.id)
      }
      const added = toAdd.length
      const removed = toRemove.length
      setNotice(
        `Saved — ${added} added${removed ? `, ${removed} removed` : ""}.` +
          (data?.require_approval && added ? " Pending admin approval." : ""),
      )
      load()
    } catch {
      setError("Could not save your selections.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FacultyLayout>
      <div className="space-y-5 pb-24">
        {/* Welcome / onboarding intro */}
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-[#111827]">
                Welcome to PCDC{firstName ? `, ${firstName}` : ""}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                One thing before you start: tick the subjects you teach. Everything else — your
                students, your case assignments, your analytics — follows from this.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/faculty/dashboard")}
              className="rounded-md border border-[#e6e8eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#f6f7fb]"
            >
              I'll do this later
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Step n={1} title="Tick what you teach" desc="Find your sections below and check off each subject." />
            <Step
              n={2}
              title={data?.require_approval ? "Your program office confirms" : "Selections apply instantly"}
              desc={
                data?.require_approval
                  ? "They approve your selections, usually the same day."
                  : "Approval is off, so your choices take effect immediately."
              }
            />
            <Step n={3} title="Add your students" desc="Create logins and hand out credential slips." />
          </div>
        </section>

        {notice ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#027a48]">
            <CheckCircle2 size={17} aria-hidden="true" />
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {/* Your current teaching */}
        {data && data.selections.length > 0 ? (
          <section className="overflow-hidden rounded-lg border border-[#e6e8eb] bg-white shadow-sm">
            <div className="border-b border-[#e6e8eb] px-5 py-4">
              <h2 className="text-lg font-semibold text-[#111827]">
                Your teaching{" "}
                <span className="font-medium text-[#6b7280]">({data.selections.length})</span>
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Subjects you've claimed. Pending ones are awaiting your program office's approval.
              </p>
            </div>
            <div className="divide-y divide-[#eef0f2]">
              {data.selections.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111827]">{s.subject}</p>
                    <p className="truncate text-xs text-[#6b7280]">
                      {s.course_name} · {s.semester_name} · {s.section_name} · {s.batch_name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      s.status === "active"
                        ? "bg-[#ecfdf3] text-[#027a48]"
                        : "bg-[#fff7df] text-[#92702a]"
                    }`}
                  >
                    {s.status === "active" ? "Active" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* What do you teach */}
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#111827]">What do you teach?</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Tick every subject you take. You can pick several at once, across different sections.
          </p>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex h-11 flex-1 items-center gap-3 rounded-md border border-[#e6e8eb] bg-white px-3 text-[#6b7280]">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a section, course or subject"
                className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#6b7280]"
              />
            </label>
            <select
              value={instFilter}
              onChange={(e) => {
                setInstFilter(e.target.value)
                setDeptFilter("all")
              }}
              className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
            >
              <option value="all">All institutions</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleAllShown}
              disabled={shownKeys.length === 0}
              className="shrink-0 rounded-md border border-[#0b1d3a] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white disabled:opacity-50"
            >
              {allShownChecked ? "Clear all shown" : `Select all ${shownKeys.length} shown`}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="py-10 text-center text-sm font-medium text-[#6b7280]">Loading…</p>
            ) : visibleBlocks.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#6b7280]">
                {blocks.length === 0
                  ? "Nothing has been configured yet. Ask your admin to set up courses and subjects."
                  : "No sections match your search."}
              </p>
            ) : (
              visibleBlocks.map((b) => {
                const keys = b.subjects.map((s) => keyOf(b.sectionId, s))
                const allOn = keys.every((k) => checked.has(k))
                return (
                  <div key={b.sectionId} className="overflow-hidden rounded-lg border border-[#e6e8eb]">
                    <div className="flex items-center justify-between gap-3 border-b border-[#e6e8eb] bg-[#f6f7fb] px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827]">{b.sectionName}</p>
                        <p className="truncate text-xs text-[#6b7280]">
                          {b.courseName} · {b.semesterName} · {b.batchName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSection(b)}
                        className="shrink-0 text-sm font-semibold text-[#0b1d3a] transition hover:text-[#c9a227]"
                      >
                        {allOn ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    <div className="divide-y divide-[#eef0f2]">
                      {b.subjects.map((subj) => {
                        const key = keyOf(b.sectionId, subj)
                        const sel = existing.get(key)
                        return (
                          <label
                            key={subj}
                            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#f9fafb]"
                          >
                            <input
                              type="checkbox"
                              className="size-4"
                              checked={checked.has(key)}
                              onChange={() => toggle(key)}
                            />
                            <span className="flex-1 font-medium text-[#111827]">{subj}</span>
                            {sel ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  sel.status === "active"
                                    ? "bg-[#ecfdf3] text-[#027a48]"
                                    : "bg-[#fff7df] text-[#92702a]"
                                }`}
                              >
                                {sel.status === "active" ? "Active" : "Pending"}
                              </span>
                            ) : null}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* Sticky save bar */}
      {hasChanges ? (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e6e8eb] bg-white/95 backdrop-blur lg:pl-64">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="text-sm text-[#6b7280]">
              <span className="font-semibold text-[#111827]">{toAdd.length}</span> to add
              {toRemove.length ? (
                <>
                  {" · "}
                  <span className="font-semibold text-[#b42318]">{toRemove.length}</span> to remove
                </>
              ) : null}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => data && setChecked(new Set(existingKeys))}
                className="rounded-md border border-[#e6e8eb] px-4 py-2.5 text-sm font-semibold text-[#111827]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-md bg-[#0b1d3a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#17315c] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save selections"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FacultyLayout>
  )
}

function splitKey(key: string): [number, string] {
  const idx = key.indexOf("::")
  return [Number(key.slice(0, idx)), key.slice(idx + 2)]
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <article className="rounded-lg border border-[#e6e8eb] bg-[#f9fafb] p-4">
      <span className="grid size-7 place-items-center rounded-full bg-[#0b1d3a] text-xs font-bold text-white">
        {n}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-[#111827]">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[#6b7280]">{desc}</p>
    </article>
  )
}

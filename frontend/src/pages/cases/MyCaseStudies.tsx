import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { getCaseStudies, toCaseDomain, toCaseStatus } from "../../api/cases"
import CaseCard, { type CaseStudy } from "../../components/cases/CaseCard"
import type { CaseDomain } from "../../components/cases/DomainTag"
import type { CaseStatus } from "../../components/cases/StatusBadge"
import DashboardLayout from "../../layouts/DashboardLayout"

const domains = [
  "All Domains",
  "Geopolitics",
  "Sports",
  "Business",
  "Social",
  "Science",
  "Technology",
  "Environment",
  "Healthcare",
] as const

const difficulties = [
  "All Levels",
  "Level 1",
  "Level 2",
  "Level 3",
  "Level 4",
  "Level 5",
  "Level 6",
  "Level 7",
] as const

const statusTabs = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
] as const

type DomainFilter = (typeof domains)[number]
type DifficultyFilter = (typeof difficulties)[number]
type StatusFilter = (typeof statusTabs)[number]["value"]

export default function MyCaseStudies() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("All Domains")
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("All Levels")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadCases() {
      setIsLoading(true)
      try {
        const data = await getCaseStudies()
        const mappedCases = data.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          domain: toCaseDomain(item.domain),
          case_code: item.case_code,
          subject: item.subject,
          difficulty_label: item.difficulty_label,
          total_marks: item.total_marks,
          written_marks: item.written_marks,
          rapid_fire_marks: item.rapid_fire_marks,
          reading_time_minutes: item.reading_time_minutes,
          answer_writing_time_minutes: item.answer_writing_time_minutes,
          rapid_fire_time_minutes: item.rapid_fire_time_minutes,
          difficulty: item.difficulty,
          estimated_minutes: item.estimated_minutes,
          status: toCaseStatus(item.status),
          career_tracks: item.tags
            .filter((tag) => tag.tag_type === "career_track")
            .map((tag) => titleCase(tag.tag_value)),
          capabilities: item.tags
            .filter((tag) => tag.tag_type === "capability")
            .map((tag) => titleCase(tag.tag_value)),
          assignment_source: item.assignment_source,
          due_date: item.due_date,
        }))
        if (isMounted) {
          setCaseStudies(mappedCases)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load assigned case studies right now.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCases()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredCaseStudies = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const selectedDifficulty =
      difficultyFilter === "All Levels" ? null : Number(difficultyFilter.replace("Level ", ""))

    return caseStudies.filter((caseStudy) => {
      const matchesDomain =
        domainFilter === "All Domains" || caseStudy.domain === (domainFilter as CaseDomain)
      const matchesDifficulty =
        selectedDifficulty === null || caseStudy.difficulty === selectedDifficulty
      const matchesStatus =
        statusFilter === "all" || caseStudy.status === (statusFilter as CaseStatus)
      const matchesSearch =
        normalizedSearch.length === 0 ||
        caseStudy.title.toLowerCase().includes(normalizedSearch) ||
        caseStudy.description.toLowerCase().includes(normalizedSearch)

      return matchesDomain && matchesDifficulty && matchesStatus && matchesSearch
    })
  }, [caseStudies, difficultyFilter, domainFilter, searchQuery, statusFilter])

  const availableCount = caseStudies.filter((caseStudy) => caseStudy.status === "available").length
  const activeCount = caseStudies.filter((caseStudy) => caseStudy.status === "in_progress").length
  const completedCount = caseStudies.filter((caseStudy) => caseStudy.status === "completed").length

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <section className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">
                My Case Studies
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
                Work through case studies assigned by your faculty or mentor.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatPill label="Available" value={String(availableCount)} />
              <StatPill label="In Progress" value={String(activeCount)} />
              <StatPill label="Completed" value={String(completedCount)} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E6EBEB] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[220px_180px_auto] xl:flex-1">
              <label className="sr-only" htmlFor="domain-filter">
                Domain
              </label>
              <select
                id="domain-filter"
                value={domainFilter}
                onChange={(event) => setDomainFilter(event.target.value as DomainFilter)}
                className="h-11 rounded-lg border border-[#E6EBEB] bg-white px-3 text-sm font-medium text-[#111827] outline-none transition focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="difficulty-filter">
                Difficulty
              </label>
              <select
                id="difficulty-filter"
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value as DifficultyFilter)}
                className="h-11 rounded-lg border border-[#E6EBEB] bg-white px-3 text-sm font-medium text-[#111827] outline-none transition focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
              >
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>

              <div className="flex rounded-lg border border-[#E6EBEB] bg-[#F6F7F9] p-1 sm:col-span-2 lg:col-span-1">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                      statusFilter === tab.value
                        ? "bg-[#0B1D3A] text-white shadow-sm"
                        : "text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex h-11 w-full items-center gap-3 rounded-lg border border-[#E6EBEB] bg-white px-3 text-[#6B7280] transition focus-within:border-[#C9A227] focus-within:ring-2 focus-within:ring-[#C9A227]/20 xl:max-w-xs">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search case studies</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search case studies..."
                className="w-full bg-transparent text-sm font-medium text-[#111827] outline-none placeholder:text-[#6B7280]"
              />
            </label>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <section className="rounded-xl border border-[#E6EBEB] bg-white px-5 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-[#6B7280]">Loading assigned cases...</p>
          </section>
        ) : filteredCaseStudies.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCaseStudies.map((caseStudy) => (
              <CaseCard key={caseStudy.id} caseStudy={caseStudy} />
            ))}
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-[#E6EBEB] bg-white px-5 py-16 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">
              No assigned case studies match your filters.
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Cases assigned by your faculty or mentor will appear here.
            </p>
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}

interface StatPillProps {
  label: string
  value: string
}

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="rounded-full border border-[#E6EBEB] bg-[#F6F7F9] px-4 py-2 text-sm">
      <span className="font-semibold text-[#111827]">{label}:</span>{" "}
      <span className="font-semibold text-[#0B1D3A]">{value}</span>
    </div>
  )
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

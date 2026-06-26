import { Search } from "lucide-react"
import { useMemo, useState } from "react"

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

const mockCaseStudies: CaseStudy[] = [
  {
    id: 1,
    title: "Q3 Market Entry Strategy",
    description:
      "A consumer electronics company faces declining market share in Southeast Asia. As the Strategy Head, develop a market re-entry plan.",
    domain: "Business",
    difficulty: 3,
    estimated_minutes: 45,
    status: "in_progress",
    career_tracks: ["Consulting", "Marketing"],
    capabilities: ["Strategic Thinking", "Decision Making"],
  },
  {
    id: 2,
    title: "India-China Border Tensions: Economic Impact",
    description:
      "Analyse the cascading economic impact of geopolitical tensions on Indian manufacturing and supply chain strategy.",
    domain: "Geopolitics",
    difficulty: 5,
    estimated_minutes: 90,
    status: "available",
    career_tracks: ["Consulting", "General Management"],
    capabilities: ["Analytical Thinking", "Risk Assessment"],
  },
  {
    id: 3,
    title: "IPL Franchise Turnaround",
    description:
      "A mid-table IPL franchise is losing fan engagement and sponsorship revenue. Design a 3-year revival strategy.",
    domain: "Sports",
    difficulty: 2,
    estimated_minutes: 30,
    status: "completed",
    career_tracks: ["Marketing", "General Management"],
    capabilities: ["Innovation", "Communication"],
  },
  {
    id: 4,
    title: "Rural Healthcare Delivery Model",
    description:
      "Design a financially sustainable last-mile healthcare delivery model for tier-3 Indian cities.",
    domain: "Healthcare",
    difficulty: 4,
    estimated_minutes: 60,
    status: "available",
    career_tracks: ["Entrepreneurship", "General Management"],
    capabilities: ["Innovation", "Decision Making"],
  },
  {
    id: 5,
    title: "EV Adoption Barriers in India",
    description:
      "Identify and prioritise the key barriers to EV adoption and recommend a policy + product strategy.",
    domain: "Technology",
    difficulty: 4,
    estimated_minutes: 60,
    status: "available",
    career_tracks: ["Consulting", "Analytics"],
    capabilities: ["Analytical Thinking", "Strategic Thinking"],
  },
  {
    id: 6,
    title: "Water Scarcity in Marathwada",
    description:
      "Develop a multi-stakeholder intervention plan for the water crisis in Maharashtra's Marathwada region.",
    domain: "Environment",
    difficulty: 6,
    estimated_minutes: 120,
    status: "available",
    career_tracks: ["General Management", "Entrepreneurship"],
    capabilities: ["Systems Thinking", "Risk Assessment"],
  },
]

type DomainFilter = (typeof domains)[number]
type DifficultyFilter = (typeof difficulties)[number]
type StatusFilter = (typeof statusTabs)[number]["value"]

export default function MyCaseStudies() {
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("All Domains")
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("All Levels")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCaseStudies = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const selectedDifficulty =
      difficultyFilter === "All Levels" ? null : Number(difficultyFilter.replace("Level ", ""))

    return mockCaseStudies.filter((caseStudy) => {
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
  }, [difficultyFilter, domainFilter, searchQuery, statusFilter])

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
                Browse and attempt case studies assigned to your career track.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatPill label="Available" value="12" />
              <StatPill label="In Progress" value="1" />
              <StatPill label="Completed" value="4" />
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

        {filteredCaseStudies.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCaseStudies.map((caseStudy) => (
              <CaseCard key={caseStudy.id} caseStudy={caseStudy} />
            ))}
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-[#E6EBEB] bg-white px-5 py-16 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">
              No case studies match your filters.
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">Try adjusting the filters above.</p>
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

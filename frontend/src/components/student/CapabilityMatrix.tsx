import { useEffect, useState } from "react"

import {
  getStudentDashboardCapabilities,
  type SimulationGroup,
  type StudentCapabilityMatrix,
} from "../../api/student"

export type MatrixFilter = "case_study" | "simulation" | "concept_study"

interface CapabilityMatrixItem {
  name: string
  score: number
  attempts?: number
}

interface CapabilityMatrixCategory {
  id: string
  label: string
  score: number | null
  items: CapabilityMatrixItem[] | null
}

function averageScore(items: CapabilityMatrixItem[]): number {
  if (items.length === 0) return 0
  return Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
}

function buildCategories(
  filter: MatrixFilter,
  simulationGroups: SimulationGroup[],
  conceptGroups: string[],
  caseStudyMatrix: StudentCapabilityMatrix | null,
): CapabilityMatrixCategory[] {
  if (filter === "simulation") {
    return simulationGroups.map((group) => ({
      id: group.name.toLowerCase(),
      label: group.name,
      score: averageScore(group.capabilities),
      items: group.capabilities,
    }))
  }
  if (filter === "concept_study") {
    return conceptGroups.map((name) => ({
      id: name.toLowerCase(),
      label: name,
      score: null,
      items: null,
    }))
  }
  return (caseStudyMatrix?.categories ?? []).map((category) => ({
    id: category.id,
    label: category.label,
    score: category.score,
    items: category.items,
  }))
}

interface CapabilityMatrixProps {
  filter: MatrixFilter
  simulationGroups: SimulationGroup[]
  conceptGroups: string[]
}

export default function CapabilityMatrix({
  filter,
  simulationGroups,
  conceptGroups,
}: CapabilityMatrixProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [caseStudyMatrix, setCaseStudyMatrix] = useState<StudentCapabilityMatrix | null>(null)
  const [isLoadingCaseStudy, setIsLoadingCaseStudy] = useState(true)

  useEffect(() => {
    let isMounted = true
    getStudentDashboardCapabilities()
      .then((data) => {
        if (isMounted) setCaseStudyMatrix(data)
      })
      .catch(() => {
        if (isMounted) setCaseStudyMatrix(null)
      })
      .finally(() => {
        if (isMounted) setIsLoadingCaseStudy(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const categories = buildCategories(filter, simulationGroups, conceptGroups, caseStudyMatrix)
  const showCaseStudySkeleton = filter === "case_study" && isLoadingCaseStudy

  useEffect(() => {
    setActiveCategory(null)
  }, [filter])

  function handleBoxClick(categoryId: string) {
    setActiveCategory((prev) => (prev === categoryId ? null : categoryId))
  }

  const activeData = categories.find((category) => category.id === activeCategory) ?? null

  if (showCaseStudySkeleton) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="animate-pulse rounded-lg border border-[#e6e8eb] bg-white p-5 text-center shadow-sm"
          >
            <div className="mx-auto h-4 w-32 rounded bg-[#e6e8eb]" />
            <div className="mx-auto mt-4 h-8 w-12 rounded bg-[#e6e8eb]" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => {
          const isActive = category.id === activeCategory
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleBoxClick(category.id)}
              aria-expanded={isActive}
              className={`rounded-lg border p-5 text-center shadow-sm transition ${
                isActive
                  ? "border-[#c9a227] bg-[#fff7df]"
                  : "border-[#e6e8eb] bg-white hover:border-[#c9a227]"
              }`}
            >
              <h3 className="text-sm font-medium text-[#111827]">{category.label}</h3>
              {category.score !== null ? (
                <>
                  <p className="mt-3 text-3xl font-bold text-[#081d3a]">{category.score}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">avg score</p>
                </>
              ) : (
                <p className="mt-3 text-xs font-semibold uppercase text-[#6b7280]">TBD</p>
              )}
            </button>
          )
        })}
      </div>

      {activeData ? (
        <div className="mt-4 rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#111827]">{activeData.label}</h3>
            {activeData.score !== null ? (
              <span className="text-lg font-bold text-[#081d3a]">{activeData.score}</span>
            ) : null}
          </div>
          {activeData.items ? (
            <div className="mt-4 space-y-3">
              {activeData.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3"
                  title={
                    item.attempts !== undefined
                      ? `Based on ${item.attempts} case attempt${item.attempts === 1 ? "" : "s"}`
                      : undefined
                  }
                >
                  <span className="w-40 shrink-0 text-sm font-medium text-[#111827] sm:w-48">
                    {item.name}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-[#e6e8eb]">
                    <div
                      className="h-2 rounded-full bg-[#c9a227]"
                      style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold text-[#111827]">
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm font-medium text-[#6b7280]">Coming Soon</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

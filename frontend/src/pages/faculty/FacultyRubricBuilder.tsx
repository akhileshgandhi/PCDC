import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"

import {
  getFacultyCaseRubric,
  saveFacultyCaseRubric,
  type FacultyCaseRubricResponse,
  type FacultyRubric,
  type RubricCriterion,
  type RubricCriterionKey,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"

const defaultWeights: Record<RubricCriterionKey, number> = {
  thinking_depth: 30,
  logic: 20,
  creativity: 15,
  practicality: 15,
  risk_awareness: 10,
  reflection: 10,
}

const defaultCriteria: RubricCriterion[] = [
  { key: "thinking_depth", label: "Thinking Depth" },
  { key: "logic", label: "Logic" },
  { key: "creativity", label: "Creativity" },
  { key: "practicality", label: "Practicality" },
  { key: "risk_awareness", label: "Risk Awareness" },
  { key: "reflection", label: "Reflection" },
]

export default function FacultyRubricBuilder() {
  const { caseId } = useParams()
  const numericCaseId = caseId ? Number(caseId) : null
  const [rubricData, setRubricData] = useState<FacultyCaseRubricResponse | null>(null)
  const [rubric, setRubric] = useState<FacultyRubric>({
    weights: defaultWeights,
    case_specific_criteria: [],
  })
  const [newCriterion, setNewCriterion] = useState("")
  const [isLoading, setIsLoading] = useState(Boolean(numericCaseId))
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState("")
  const [isDirty, setIsDirty] = useState(false)

  const criteria = rubricData?.criteria.length ? rubricData.criteria : defaultCriteria
  const totalWeight = useMemo(
    () => Object.values(rubric.weights).reduce((sum, value) => sum + Number(value || 0), 0),
    [rubric.weights],
  )
  const canSave = totalWeight === 100 && !isSaving
  const criteriaLimitReached = rubric.case_specific_criteria.length >= 2

  useEffect(() => {
    let isMounted = true

    async function loadRubric() {
      if (!numericCaseId) {
        setErrors(["Open Rubric Builder from a specific case."])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const data = await getFacultyCaseRubric(numericCaseId)
        if (isMounted) {
          setRubricData(data)
          setRubric(data.rubric)
          setErrors([])
          setIsDirty(false)
        }
      } catch {
        if (isMounted) {
          setErrors(["Unable to load this case rubric."])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadRubric()

    return () => {
      isMounted = false
    }
  }, [numericCaseId])

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) {
        return
      }
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [isDirty])

  function updateWeight(key: RubricCriterionKey, rawValue: string) {
    const value = Math.max(0, Math.min(100, Number(rawValue) || 0))
    setRubric((current) => ({
      ...current,
      weights: { ...current.weights, [key]: value },
    }))
    setNotice("")
    setIsDirty(true)
  }

  function resetDefaults() {
    setRubric((current) => ({ ...current, weights: defaultWeights }))
    setNotice("")
    setIsDirty(true)
  }

  function addCriterion() {
    const value = newCriterion.trim()
    if (!value || criteriaLimitReached) {
      return
    }
    setRubric((current) => ({
      ...current,
      case_specific_criteria: [...current.case_specific_criteria, value],
    }))
    setNewCriterion("")
    setNotice("")
    setIsDirty(true)
  }

  function removeCriterion(index: number) {
    setRubric((current) => ({
      ...current,
      case_specific_criteria: current.case_specific_criteria.filter((_, itemIndex) => itemIndex !== index),
    }))
    setNotice("")
    setIsDirty(true)
  }

  async function saveRubric() {
    if (!numericCaseId || totalWeight !== 100) {
      return
    }
    setIsSaving(true)
    setNotice("")
    try {
      const data = await saveFacultyCaseRubric(numericCaseId, rubric)
      setRubricData(data)
      setRubric(data.rubric)
      setErrors([])
      setNotice("Rubric saved.")
      setIsDirty(false)
    } catch {
      setErrors(["Unable to save rubric. Check weights and criteria."])
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              to={numericCaseId ? `/faculty/case-builder/${numericCaseId}` : "/faculty/case-library"}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#6b7280] transition hover:text-[#111827]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Case Builder
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-md bg-[#eef4ff] text-[#3538cd]">
                <SlidersHorizontal size={22} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-3xl font-semibold text-[#111827]">Rubric Builder</h1>
                <p className="mt-1 text-sm font-medium text-[#6b7280]">
                  {rubricData ? rubricData.case_title : "Weighted evaluation criteria"}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={saveRubric}
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-3 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            Save Rubric
          </button>
        </div>

        <Feedback errors={errors} notice={notice} />

        {isLoading ? (
          <section className="rounded-lg border border-[#e6e8eb] bg-white p-8 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            Loading rubric builder...
          </section>
        ) : rubricData ? (
          <>
            {rubricData.case_status === "published" && rubricData.active_attempts > 0 ? (
              <section className="rounded-lg border border-[#facc15] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <p>
                    {rubricData.active_attempts} students have an active attempt on this case.
                    Rubric changes affect future evaluations for this case.
                  </p>
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-[#111827]">Default Criteria</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Adjust emphasis while keeping the shared scoring vocabulary fixed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetDefaults}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#0b1d3a] px-3 py-2 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Reset to Default
                </button>
              </div>

              <div className="grid gap-4">
                {criteria.map((criterion) => (
                  <WeightControl
                    key={criterion.key}
                    criterion={criterion}
                    value={rubric.weights[criterion.key]}
                    onChange={(value) => updateWeight(criterion.key, value)}
                  />
                ))}
              </div>

              <div
                className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
                  totalWeight === 100
                    ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]"
                    : "border-[#f3c4c4] bg-[#fff5f5] text-[#b42318]"
                }`}
              >
                Total: {totalWeight}% {totalWeight === 100 ? "ready to save" : "must equal 100%"}
              </div>
            </section>

            <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-2xl font-semibold text-[#111827]">Case-Specific Criteria</h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Add up to two qualitative checks for this case.
                </p>
              </div>

              <div className="grid gap-3">
                {rubric.case_specific_criteria.map((criterion, index) => (
                  <div
                    key={`${criterion}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-[#e6e8eb] px-3 py-3"
                  >
                    <p className="text-sm font-medium text-[#111827]">{criterion}</p>
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="grid size-9 shrink-0 place-items-center rounded-md text-[#b42318] transition hover:bg-[#fff5f5]"
                      aria-label="Remove criterion"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={newCriterion}
                  onChange={(event) => setNewCriterion(event.target.value)}
                  disabled={criteriaLimitReached}
                  maxLength={160}
                  placeholder={
                    criteriaLimitReached
                      ? "Maximum of 2 criteria reached"
                      : "Add a short qualitative criterion"
                  }
                  className="h-11 min-w-0 flex-1 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20 disabled:cursor-not-allowed disabled:bg-[#f9fafb]"
                />
                <button
                  type="button"
                  onClick={addCriterion}
                  disabled={!newCriterion.trim() || criteriaLimitReached}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#0b1d3a] px-4 py-3 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add Criterion
                </button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </FacultyLayout>
  )
}

interface WeightControlProps {
  criterion: RubricCriterion
  value: number
  onChange: (value: string) => void
}

function WeightControl({ criterion, value, onChange }: WeightControlProps) {
  return (
    <div className="grid gap-2 rounded-md border border-[#e6e8eb] p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`weight-${criterion.key}`} className="text-sm font-semibold text-[#111827]">
          {criterion.label}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`weight-${criterion.key}`}
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-20 rounded-md border border-[#e6e8eb] bg-white px-2 text-right text-sm font-semibold outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
          />
          <span className="text-sm font-semibold text-[#6b7280]">%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full accent-[#0b1d3a]"
        aria-label={`${criterion.label} weight`}
      />
    </div>
  )
}

interface FeedbackProps {
  errors: string[]
  notice: string
}

function Feedback({ errors, notice }: FeedbackProps) {
  if (errors.length > 0) {
    return (
      <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
        {errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
      </div>
    )
  }

  if (notice) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#027a48]">
        <CheckCircle2 size={17} aria-hidden="true" />
        {notice}
      </div>
    )
  }

  return null
}

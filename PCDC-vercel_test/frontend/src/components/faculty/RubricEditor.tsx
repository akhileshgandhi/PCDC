import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  getFacultyCaseRubric,
  saveFacultyCaseRubric,
  type FacultyCaseRubricResponse,
  type FacultyRubric,
  type RubricCriterion,
  type RubricCriterionKey,
} from "../../api/faculty"

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

interface RubricEditorProps {
  caseId: number | null
}

// Inline rubric editor embedded in the Case Builder (right after Capabilities).
// Loads and saves this case's rubric via its own endpoint.
export default function RubricEditor({ caseId }: RubricEditorProps) {
  const [rubricData, setRubricData] = useState<FacultyCaseRubricResponse | null>(null)
  const [rubric, setRubric] = useState<FacultyRubric>({
    weights: defaultWeights,
    case_specific_criteria: [],
  })
  const [newCriterion, setNewCriterion] = useState("")
  const [isLoading, setIsLoading] = useState(Boolean(caseId))
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState("")

  const criteria = rubricData?.criteria.length ? rubricData.criteria : defaultCriteria
  const totalWeight = useMemo(
    () => Object.values(rubric.weights).reduce((sum, value) => sum + Number(value || 0), 0),
    [rubric.weights],
  )
  const canSave = totalWeight === 100 && !isSaving && Boolean(caseId)
  const criteriaLimitReached = rubric.case_specific_criteria.length >= 2

  useEffect(() => {
    let isMounted = true
    async function loadRubric() {
      if (!caseId) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const data = await getFacultyCaseRubric(caseId)
        if (isMounted) {
          setRubricData(data)
          setRubric(data.rubric)
          setErrors([])
        }
      } catch {
        if (isMounted) setErrors(["Unable to load this case rubric."])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadRubric()
    return () => {
      isMounted = false
    }
  }, [caseId])

  function updateWeight(key: RubricCriterionKey, rawValue: string) {
    const value = Math.max(0, Math.min(100, Number(rawValue) || 0))
    setRubric((current) => ({ ...current, weights: { ...current.weights, [key]: value } }))
    setNotice("")
  }

  function resetDefaults() {
    setRubric((current) => ({ ...current, weights: defaultWeights }))
    setNotice("")
  }

  function addCriterion() {
    const value = newCriterion.trim()
    if (!value || criteriaLimitReached) return
    setRubric((current) => ({
      ...current,
      case_specific_criteria: [...current.case_specific_criteria, value],
    }))
    setNewCriterion("")
    setNotice("")
  }

  function removeCriterion(index: number) {
    setRubric((current) => ({
      ...current,
      case_specific_criteria: current.case_specific_criteria.filter((_, i) => i !== index),
    }))
    setNotice("")
  }

  async function saveRubric() {
    if (!caseId || totalWeight !== 100) return
    setIsSaving(true)
    setNotice("")
    try {
      const data = await saveFacultyCaseRubric(caseId, rubric)
      setRubricData(data)
      setRubric(data.rubric)
      setErrors([])
      setNotice("Rubric saved.")
    } catch {
      setErrors(["Unable to save rubric. Check weights and criteria."])
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111827]">Evaluation Rubric</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            How this case is scored. Weights must total 100%. Add up to two case-specific checks.
          </p>
        </div>
        <button
          type="button"
          onClick={saveRubric}
          disabled={!canSave}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Save Rubric
        </button>
      </div>

      {errors.length > 0 ? (
        <div className="mb-4 rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#027a48]">
          <CheckCircle2 size={16} aria-hidden="true" />
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <p className="py-6 text-center text-sm font-medium text-[#6b7280]">Loading rubric…</p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
              Scoring weights
            </h3>
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b1d3a] transition hover:text-[#c9a227]"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset to default
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
            className={`mt-4 rounded-lg border px-4 py-2.5 text-sm font-semibold ${
              totalWeight === 100
                ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]"
                : "border-[#f3c4c4] bg-[#fff5f5] text-[#b42318]"
            }`}
          >
            {totalWeight === 100 ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={15} /> Total: 100% — ready to save
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <AlertTriangle size={15} /> Total: {totalWeight}% — must equal 100%
              </span>
            )}
          </div>

          <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
            Case-specific criteria
          </h3>
          <div className="grid gap-2">
            {rubric.case_specific_criteria.map((criterion, index) => (
              <div
                key={`${criterion}-${index}`}
                className="flex items-center justify-between gap-3 rounded-md border border-[#e6e8eb] px-3 py-2.5"
              >
                <p className="text-sm font-medium text-[#111827]">{criterion}</p>
                <button
                  type="button"
                  onClick={() => removeCriterion(index)}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-[#b42318] transition hover:bg-[#fff5f5]"
                  aria-label="Remove criterion"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#0b1d3a] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} aria-hidden="true" />
              Add
            </button>
          </div>
        </>
      )}
    </section>
  )
}

interface WeightControlProps {
  criterion: RubricCriterion
  value: number
  onChange: (value: string) => void
}

function WeightControl({ criterion, value, onChange }: WeightControlProps) {
  return (
    <div className="grid gap-2 rounded-md border border-[#e6e8eb] p-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`weight-${criterion.key}`} className="text-sm font-semibold text-[#111827]">
          {criterion.label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id={`weight-${criterion.key}`}
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-16 rounded-md border border-[#e6e8eb] bg-white px-2 text-right text-sm font-semibold outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
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

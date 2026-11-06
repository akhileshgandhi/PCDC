import { isAxiosError } from "axios"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

import {
  CELL_FORMATS,
  checkJobsimTask,
  evaluateJobsimCell,
  type CellEvaluation,
  type CellFormat,
  type CheckResult,
} from "../../api/jobsim"

interface AnswerCellProps {
  attemptId: number
  taskId: number
  label?: string
  initialInput?: string
  initialFormat?: CellFormat
  disabled?: boolean
  /** Called after a check so the task list can update its status. */
  onChecked?: (result: CheckResult) => void
  /** Called on every edit so the workspace can autosave the cell. */
  onInputChange?: (input: string, format: CellFormat) => void
}

function errorText(error: unknown, fallback: string) {
  const detail = isAxiosError(error) ? error.response?.data?.detail : undefined
  return typeof detail === "string" ? detail : fallback
}

/**
 * One spreadsheet answer cell. The student types a value or a formula
 * (=SUM(C2:C100)) and picks a format; the server evaluates it on Enter or
 * when the cell loses focus and shows the formatted result or an Excel error.
 * Check Answer marks it on the server. The expected answer never reaches the
 * browser.
 */
export default function AnswerCell({
  attemptId,
  taskId,
  label = "Your answer cell",
  initialInput = "",
  initialFormat = "general",
  disabled = false,
  onChecked,
  onInputChange,
}: AnswerCellProps) {
  const [input, setInput] = useState(initialInput)
  const [format, setFormat] = useState<CellFormat>(initialFormat)
  const [evaluation, setEvaluation] = useState<CellEvaluation | null>(null)
  const [verdict, setVerdict] = useState<CheckResult | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState("")
  const inputId = `answer-cell-${taskId}`

  // A resumed cell shows the value of the saved input straight away.
  useEffect(() => {
    if (initialInput.trim()) void evaluate(initialInput, initialFormat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function evaluate(nextInput = input, nextFormat = format) {
    if (!nextInput.trim()) {
      setEvaluation(null)
      return
    }
    setIsEvaluating(true)
    setError("")
    try {
      setEvaluation(await evaluateJobsimCell(attemptId, nextInput, nextFormat))
    } catch (err) {
      setError(errorText(err, "Couldn't calculate this cell. Try again."))
    } finally {
      setIsEvaluating(false)
    }
  }

  async function check() {
    setIsChecking(true)
    setError("")
    try {
      const result = await checkJobsimTask(attemptId, taskId, input, format)
      setVerdict(result)
      onChecked?.(result)
    } catch (err) {
      setError(errorText(err, "Couldn't check your answer. Try again."))
    } finally {
      setIsChecking(false)
    }
  }

  const isError = evaluation?.value_type === "error"

  return (
    <div className="rounded-lg border border-[#E6EBEB] bg-white p-3">
      <label htmlFor={inputId} className="text-xs font-semibold text-[#6B7280]">
        {label}
      </label>
      <div className="mt-1.5">
        <input
          id={inputId}
          value={input}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setInput(event.target.value)
            setVerdict(null)
            onInputChange?.(event.target.value, format)
          }}
          onBlur={() => void evaluate()}
          onKeyDown={(event) => {
            if (event.key === "Enter") void evaluate()
          }}
          placeholder="=SUM(C2:C100) or a value"
          className="w-full rounded-md border-2 border-[#C9A227] bg-[#FFF8E6] px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-[#C9A227]/30 disabled:opacity-60"
        />
      </div>

      <div
        className="mt-2 flex items-center justify-between gap-3 rounded-md bg-[#F6F7F9] px-3 py-2 text-sm"
        aria-live="polite"
      >
        <span className="text-[#6B7280]">Shows</span>
        {isEvaluating ? (
          <Loader2 size={14} className="animate-spin text-[#6B7280]" aria-label="Calculating" />
        ) : (
          <span
            className={`min-w-0 truncate font-mono font-semibold ${isError ? "text-[#B42318]" : "text-[#111827]"}`}
            title={evaluation?.display}
          >
            {evaluation?.display || "—"}
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <select
          aria-label="Cell format"
          value={format}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value as CellFormat
            setFormat(next)
            setVerdict(null)
            onInputChange?.(input, next)
            void evaluate(input, next)
          }}
          className="min-w-0 flex-1 rounded-md border border-[#E6EBEB] bg-white px-3 py-2 text-sm"
        >
          {CELL_FORMATS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void check()}
          disabled={disabled || isChecking || !input.trim()}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#C9A227] px-4 py-2 text-sm font-semibold text-[#0B1D3A] transition hover:bg-[#E0B84E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isChecking ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
          Check Answer
        </button>
      </div>

      {isError && evaluation?.message ? (
        <p className="mt-1 text-xs text-[#B42318]">{evaluation.message}</p>
      ) : null}
      {verdict ? (
        <p
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            verdict.status === "correct" ? "bg-[#ECFDF3] text-[#067647]" : "bg-[#FFF5F5] text-[#B42318]"
          }`}
        >
          {verdict.status === "correct" ? (
            <CheckCircle2 size={14} aria-hidden="true" />
          ) : (
            <XCircle size={14} aria-hidden="true" />
          )}
          {verdict.message}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-[#B42318]">{error}</p> : null}
    </div>
  )
}

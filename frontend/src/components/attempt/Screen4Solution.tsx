import { ArrowRight } from "lucide-react"

export interface SolutionState {
  recommendation: string
  reasoning: string
  implementation: string
  risks: string
}

interface Screen4SolutionProps {
  solution: SolutionState
  onSolutionChange: (field: keyof SolutionState, value: string) => void
  onNext: () => void
}

const fields: Array<{
  key: keyof SolutionState
  label: string
  placeholder: string
}> = [
  {
    key: "recommendation",
    label: "Recommendation",
    placeholder: "What is your primary recommendation?",
  },
  {
    key: "reasoning",
    label: "Reasoning",
    placeholder: "Why this approach over alternatives?",
  },
  {
    key: "implementation",
    label: "Implementation Plan",
    placeholder: "How would you execute this? Key steps + timeline",
  },
  {
    key: "risks",
    label: "Risks & Mitigations",
    placeholder: "What could go wrong and how would you handle it?",
  },
]

export default function Screen4Solution({
  solution,
  onSolutionChange,
  onNext,
}: Screen4SolutionProps) {
  const isReady = fields.every((field) => solution[field.key].trim().length > 0)

  return (
    <section className="mx-auto max-w-[720px] rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
        Your Final Recommendation
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-[#0B1D3A]">Submit Your Solution</h2>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">
        Structure your solution using the sections below. Be specific and justify your
        recommendations.
      </p>

      <div className="mt-6 space-y-5">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#111827]">
              {field.label}
            </span>
            <textarea
              value={solution[field.key]}
              onChange={(event) => onSolutionChange(field.key, event.target.value)}
              rows={4}
              placeholder={field.placeholder}
              className="mt-2 w-full rounded-xl border border-[#E6EBEB] px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!isReady}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition ${
          isReady
            ? "bg-[#C9A227] text-white hover:bg-[#B08D20]"
            : "cursor-not-allowed bg-[#D1D5DB] text-white"
        }`}
      >
        Submit Solution
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  )
}

import { ArrowRight } from "lucide-react"
import { useState } from "react"

interface ReflectionStepProps {
  questions: string[]
  isSubmitting: boolean
  onSubmit: (reflectionText: string) => void
}

export default function ReflectionStep({ questions, isSubmitting, onSubmit }: ReflectionStepProps) {
  const [reflectionText, setReflectionText] = useState("")
  const isReady = reflectionText.trim().length > 0

  return (
    <section className="mx-auto max-w-[720px] rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
        Almost Done
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-[#0B1D3A]">Reflect on Your Attempt</h2>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">
        Before you see your evaluation, take a moment to reflect on your approach.
      </p>

      {questions.length > 0 ? (
        <div className="mt-6 rounded-lg bg-[#F6F7F9] p-4">
          <h3 className="text-sm font-semibold text-[#111827]">Consider:</h3>
          <ol className="mt-3 space-y-2 text-sm text-[#6B7280]">
            {questions.map((question, index) => (
              <li key={question}>
                {index + 1}. {question}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <textarea
        value={reflectionText}
        onChange={(event) => setReflectionText(event.target.value)}
        rows={8}
        placeholder="What did you learn from this case? What would you do differently?"
        className="mt-6 w-full rounded-xl border border-[#E6EBEB] px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
      />

      <button
        type="button"
        onClick={() => onSubmit(reflectionText.trim())}
        disabled={!isReady || isSubmitting}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition ${
          isReady && !isSubmitting
            ? "bg-[#C9A227] text-white hover:bg-[#B08D20]"
            : "cursor-not-allowed bg-[#D1D5DB] text-white"
        }`}
      >
        {isSubmitting ? "Submitting..." : "Submit Reflection & See Results"}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  )
}

import { ArrowRight } from "lucide-react"

interface Screen2AnalysisProps {
  analysisText: string
  wordCount: number
  onAnalysisChange: (value: string) => void
  onNext: () => void
}

const prompts = [
  "What do you think is happening?",
  "What are the possible causes?",
  "What assumptions are you making?",
  "What information is missing?",
  "What would be your tentative solution?",
]

export default function Screen2Analysis({
  analysisText,
  wordCount,
  onAnalysisChange,
  onNext,
}: Screen2AnalysisProps) {
  const isReady = wordCount >= 200
  const progressPercent = Math.min((wordCount / 200) * 100, 100)

  return (
    <section className="mx-auto max-w-[720px] rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
        Think First
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-[#0B1D3A]">Initial Analysis</h2>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">
        Before accessing AI assistance, submit your initial analysis. Minimum 200 words required.
      </p>

      <div className="mt-6 rounded-lg bg-[#F6F7F9] p-4">
        <h3 className="text-sm font-semibold text-[#111827]">Answer these questions:</h3>
        <ul className="mt-3 space-y-2 text-sm text-[#6B7280]">
          {prompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
      </div>

      <textarea
        value={analysisText}
        onChange={(event) => onAnalysisChange(event.target.value)}
        rows={12}
        placeholder="Write your initial analysis here..."
        className="mt-6 w-full rounded-xl border border-[#E6EBEB] px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
      />

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className={isReady ? "text-[#16A34A]" : "text-[#F59E0B]"}>
            Word count: {wordCount} / 200 minimum
          </span>
          <span className="text-[#6B7280]">{Math.round(progressPercent)}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[#E6EBEB]">
          <div
            className={`h-2 rounded-full transition-all ${isReady ? "bg-[#16A34A]" : "bg-[#C9A227]"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
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
        Submit Analysis & Unlock AI
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-[#6B7280]">
        Once submitted, you cannot edit your analysis. AI access will be unlocked immediately.
      </p>
    </section>
  )
}

import { ArrowRight } from "lucide-react"
import type { WrittenQuestion } from "../../api/cases"
import CountdownTimer from "./CountdownTimer"

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length
}

function marksLabel(marks: number | null | undefined): string {
  if (marks == null) return ""
  return ` · ${marks} ${marks === 1 ? "mark" : "marks"}`
}

const DEFAULT_MIN = 100
const INITIAL_ANALYSIS_MIN = 200

const INITIAL_ANALYSIS_PROMPTS = [
  "What do you think is happening?",
  "What are the possible causes?",
  "What assumptions are you making?",
  "What information is missing?",
  "What would be your tentative solution?",
]

interface Screen2AnalysisProps {
  questions: WrittenQuestion[]
  answers: string[]
  initialSummary: string
  onInitialSummaryChange: (value: string) => void
  reflectionQuestions: string[]
  remainingSeconds?: number | null
  onAnswerChange: (index: number, value: string) => void
  onNext: () => void
}

export default function Screen2Analysis({
  questions,
  answers,
  initialSummary,
  onInitialSummaryChange,
  reflectionQuestions,
  remainingSeconds,
  onAnswerChange,
  onNext,
}: Screen2AnalysisProps) {
  // Use written_questions if available, otherwise fall back to reflectionQuestions as plain prompts
  const hasStructured = questions.length > 0

  if (hasStructured) {
    const wordCounts = questions.map((_, i) => countWords(answers[i] || ""))
    const summaryWords = countWords(initialSummary)
    const summaryReady = summaryWords >= INITIAL_ANALYSIS_MIN
    const questionsReady = questions.every(
      (q, i) =>
        wordCounts[i] >= (q.word_limit_min ?? DEFAULT_MIN) &&
        (q.word_limit_max == null || wordCounts[i] <= q.word_limit_max),
    )
    const isReady = summaryReady && questionsReady
    const summaryProgress = Math.min((summaryWords / INITIAL_ANALYSIS_MIN) * 100, 100)

    return (
      <section className="mx-auto max-w-[720px] space-y-5">
        <div className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Think First</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#0B1D3A]">Initial Analysis</h2>
            </div>
            {remainingSeconds != null ? (
              <CountdownTimer seconds={remainingSeconds} label="Writing time" onExpire={onNext} />
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
            First write your initial analysis of the case below, then answer the structured
            questions. After submitting, the Rapid Fire round begins.
          </p>
        </div>

        {/* Ungraded initial analysis — comes before the structured questions. */}
        <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Initial Analysis
            </p>
            <span className="rounded-full bg-[#F6F7F9] px-2 py-0.5 text-xs font-semibold text-[#6B7280]">
              Not marked
            </span>
          </div>
          <p className="mt-2 text-sm text-[#6B7280]">
            Think through the case and address each of these. Minimum {INITIAL_ANALYSIS_MIN}–300
            words.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#374151]">
            {INITIAL_ANALYSIS_PROMPTS.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>

          <textarea
            value={initialSummary}
            onChange={(e) => onInitialSummaryChange(e.target.value)}
            rows={10}
            placeholder="Write your initial analysis here..."
            className="mt-4 w-full rounded-xl border border-[#E6EBEB] px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
          />
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={summaryReady ? "text-[#16A34A]" : "text-[#F59E0B]"}>
                {summaryWords} / {INITIAL_ANALYSIS_MIN} words minimum
              </span>
              <span className="text-[#6B7280]">{Math.round(summaryProgress)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-[#E6EBEB]">
              <div
                className={`h-1.5 rounded-full transition-all ${summaryReady ? "bg-[#16A34A]" : "bg-[#C9A227]"}`}
                style={{ width: `${summaryProgress}%` }}
              />
            </div>
          </div>
        </article>

        <div className="rounded-xl border border-[#E6EBEB] bg-white px-6 py-4 shadow-sm">
          <h3 className="text-lg font-semibold text-[#0B1D3A]">Structured Written Questions</h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            These are marked. Minimum word counts apply per question.
          </p>
        </div>

        {questions.map((q, i) => {
          const wc = wordCounts[i]
          const minWords = q.word_limit_min ?? DEFAULT_MIN
          const maxWords = q.word_limit_max
          const met = wc >= minWords
          const overMax = maxWords != null && wc > maxWords
          const progress = Math.min((wc / minWords) * 100, 100)

          return (
            <article key={q.question_number} className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Question {q.question_number}
                {marksLabel(q.marks)}
              </p>
              <h3 className="text-base font-semibold text-[#0B1D3A]">{q.question_text}</h3>
              {q.instructions && (
                <p className="mt-1 text-sm text-[#6B7280]">{q.instructions}</p>
              )}

              <div className="mt-2 flex gap-3 text-xs font-medium text-[#6B7280]">
                <span>Min: {minWords} words</span>
                {maxWords != null && <span>Max: {maxWords} words</span>}
              </div>

              <textarea
                value={answers[i] || ""}
                onChange={(e) => onAnswerChange(i, e.target.value)}
                rows={8}
                placeholder="Write your answer here..."
                className="mt-3 w-full rounded-xl border border-[#E6EBEB] px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
              />

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={met ? "text-[#16A34A]" : overMax ? "text-[#B91C1C]" : "text-[#F59E0B]"}>
                    {wc} / {minWords} words minimum
                    {overMax && ` (over ${maxWords} max)`}
                  </span>
                  <span className="text-[#6B7280]">{Math.round(progress)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#E6EBEB]">
                  <div
                    className={`h-1.5 rounded-full transition-all ${met ? "bg-[#16A34A]" : "bg-[#C9A227]"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </article>
          )
        })}

        <div className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <button
            type="button"
            onClick={onNext}
            disabled={!isReady}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition ${
              isReady
                ? "bg-[#C9A227] text-white hover:bg-[#B08D20]"
                : "cursor-not-allowed bg-[#D1D5DB] text-white"
            }`}
          >
            Submit &amp; Start Rapid Fire
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-[#6B7280]">
            Once submitted, you cannot edit your answers. The Rapid Fire round begins immediately.
          </p>
        </div>
      </section>
    )
  }

  // Fallback: single textarea with reflection questions as prompts
  const combinedText = answers[0] || ""
  const wc = countWords(combinedText)
  const isReady = wc >= 200
  const progress = Math.min((wc / 200) * 100, 100)
  const prompts = reflectionQuestions.length > 0 ? reflectionQuestions : [
    "What do you think is happening?",
    "What are the possible causes?",
    "What assumptions are you making?",
    "What information is missing?",
    "What would be your tentative solution?",
  ]

  return (
    <section className="mx-auto max-w-[720px] rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Think First</p>
          <h2 className="mt-3 text-3xl font-semibold text-[#0B1D3A]">Initial Analysis</h2>
        </div>
        {remainingSeconds != null ? (
          <CountdownTimer seconds={remainingSeconds} label="Writing time" onExpire={onNext} />
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">
        Submit your written answers. Minimum 200 words required. The Rapid Fire round begins after you submit.
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
        value={combinedText}
        onChange={(e) => onAnswerChange(0, e.target.value)}
        rows={12}
        placeholder="Write your initial analysis here..."
        className="mt-6 w-full rounded-xl border border-[#E6EBEB] px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
      />

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className={isReady ? "text-[#16A34A]" : "text-[#F59E0B]"}>
            Word count: {wc} / 200 minimum
          </span>
          <span className="text-[#6B7280]">{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[#E6EBEB]">
          <div
            className={`h-2 rounded-full transition-all ${isReady ? "bg-[#16A34A]" : "bg-[#C9A227]"}`}
            style={{ width: `${progress}%` }}
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
        Submit &amp; Start Rapid Fire
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-[#6B7280]">
        Once submitted, you cannot edit your answers. The Rapid Fire round begins immediately.
      </p>
    </section>
  )
}

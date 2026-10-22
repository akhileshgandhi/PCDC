import { ArrowRight } from "lucide-react"
import { useState } from "react"

interface Screen5DefenseProps {
  questions: string[]
  defenseAnswers: string[]
  currentDefenseQ: number
  onSubmitAnswer: (answer: string) => void
  onComplete: () => void
}

export default function Screen5Defense({
  questions,
  defenseAnswers,
  currentDefenseQ,
  onSubmitAnswer,
  onComplete,
}: Screen5DefenseProps) {
  const [answer, setAnswer] = useState("")
  const isLastQuestion = currentDefenseQ === questions.length - 1
  const isReady = answer.trim().length > 0

  function handleSubmit() {
    const trimmed = answer.trim()
    if (!trimmed) return

    onSubmitAnswer(trimmed)
    setAnswer("")

    if (isLastQuestion) {
      onComplete()
    }
  }

  return (
    <section className="mx-auto max-w-[720px] rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
        Defend Your Solution
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-[#0B1D3A]">AI Challenge</h2>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">
        The AI will now challenge your recommendation. Answer each question before the next one
        appears.
      </p>

      <div className="mt-6 rounded-xl bg-[#F6F7F9] p-5">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold">
          <span className="text-[#0B1D3A]">
            Question {currentDefenseQ + 1} of {questions.length}
          </span>
          <span className="text-[#6B7280]">{defenseAnswers.length} answered</span>
        </div>
        <blockquote className="mt-4 border-l-4 border-[#C9A227] pl-4 text-lg font-medium leading-8 text-[#111827]">
          {questions[currentDefenseQ]}
        </blockquote>
      </div>

      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        rows={8}
        placeholder="Write your answer..."
        className="mt-6 w-full rounded-xl border border-[#E6EBEB] px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isReady}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition ${
          isReady
            ? "bg-[#C9A227] text-white hover:bg-[#B08D20]"
            : "cursor-not-allowed bg-[#D1D5DB] text-white"
        }`}
      >
        {isLastQuestion ? "Submit Defense & Get Evaluation" : "Submit Answer - Next Question"}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  )
}

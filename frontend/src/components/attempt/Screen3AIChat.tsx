import { ArrowRight, CheckCircle, Loader2, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import type { RapidFireQuestion } from "../../api/cases"
import CountdownTimer from "./CountdownTimer"

function marksLabel(marks: number | null | undefined): string {
  if (marks == null) return ""
  return ` · ${marks} ${marks === 1 ? "mark" : "marks"}`
}

interface Screen3AIChatProps {
  rapidFireQuestions: RapidFireQuestion[]
  remainingSeconds?: number | null
  isGenerating?: boolean
  onSubmit: (answers: string) => void
  isSubmitting: boolean
}

export default function Screen3AIChat({
  rapidFireQuestions,
  remainingSeconds,
  isGenerating = false,
  onSubmit,
  isSubmitting,
}: Screen3AIChatProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() => rapidFireQuestions.map(() => ""))
  const [submitted, setSubmitted] = useState(false)

  // Questions arrive asynchronously (AI-generated on entry); size the answers
  // array to match once they load.
  useEffect(() => {
    setAnswers((prev) =>
      prev.length === rapidFireQuestions.length
        ? prev
        : rapidFireQuestions.map((_, i) => prev[i] ?? ""),
    )
  }, [rapidFireQuestions])

  const total = rapidFireQuestions.length
  const currentAnswer = answers[currentQ] ?? ""
  const isLast = currentQ === total - 1
  const allDone = submitted || total === 0

  function submitAll() {
    const allAnswers = rapidFireQuestions
      .map((q, i) => `Q${q.sequence}: ${q.question_text}\nA: ${answers[i] || ""}`)
      .join("\n\n")
    setSubmitted(true)
    onSubmit(allAnswers)
  }

  function handleExpire() {
    if (submitted || total === 0) return
    submitAll()
  }

  function handleAnswerChange(value: string) {
    setAnswers((prev) => {
      const next = [...prev]
      next[currentQ] = value
      return next
    })
  }

  function handleNext() {
    if (isLast) {
      submitAll()
    } else {
      setCurrentQ((q) => q + 1)
    }
  }

  return (
    // Fills the full width of its grid column (equal split with the Case
    // Reference panel) instead of capping to a fixed max-width, per the
    // "use whole space" layout request.
    <section className="w-full space-y-5">
      <div className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Rapid Fire Round
          </p>
          {remainingSeconds != null && !allDone ? (
            <CountdownTimer
              seconds={remainingSeconds}
              label="Rapid fire time"
              onExpire={handleExpire}
              hidden
            />
          ) : null}
        </div>

        {isGenerating && total === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center text-[#6B7280]">
            <Loader2 size={32} className="animate-spin text-[#C9A227]" />
            <p className="text-sm font-medium text-[#0B1D3A]">
              Preparing your rapid fire questions…
            </p>
            <p className="text-xs text-[#9CA3AF]">
              The AI is generating questions from your analysis. Your timer starts once
              they appear.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center text-[#9CA3AF]">
            <Zap size={32} />
            <p className="text-sm">Rapid fire questions aren't ready yet.</p>
            <button
              type="button"
              onClick={() => onSubmit("No rapid fire questions")}
              disabled={isSubmitting}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#C9A227] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B08D20]"
            >
              Continue to Evaluation
              <ArrowRight size={15} />
            </button>
          </div>
        ) : allDone ? (
          <div className="mt-4 flex flex-col items-center gap-4 py-10 text-center">
            {isSubmitting ? (
              <Loader2 size={56} className="animate-spin text-[#C9A227]" aria-hidden="true" />
            ) : (
              <CheckCircle size={56} className="text-[#16A34A]" aria-hidden="true" />
            )}
            <h3 className="text-3xl font-bold text-[#0B1D3A]">All questions answered!</h3>
            <p
              className={`text-lg font-medium ${
                isSubmitting ? "animate-pulse text-[#C9A227]" : "text-[#16A34A]"
              }`}
            >
              {isSubmitting ? "AI is evaluating your performance…" : "Your answers have been submitted. Evaluation is ready."}
            </p>
            <div className="mt-4 w-full space-y-3 text-left">
              {rapidFireQuestions.map((q, i) => (
                <div key={q.sequence} className="rounded-lg border border-[#E6EBEB] p-4">
                  <p className="text-xs font-semibold uppercase text-[#C9A227]">
                    Q{q.sequence}
                    {marksLabel(q.marks)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#111827]">{q.question_text}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{answers[i] || "No answer"}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-5 flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                Question {currentQ + 1} of {total}
                {marksLabel(rapidFireQuestions[currentQ].marks)}
              </span>
              <div className="flex gap-1.5">
                {rapidFireQuestions.map((_, i) => (
                  <span
                    key={i}
                    className={`size-2.5 rounded-full transition-colors ${
                      i < currentQ ? "bg-[#16A34A]" : i === currentQ ? "bg-[#C9A227]" : "bg-[#E6EBEB]"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-[#F6F7F9] p-5">
              <p className="text-base font-semibold text-[#0B1D3A]">
                {rapidFireQuestions[currentQ].question_text}
              </p>
            </div>
            <textarea
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              rows={6}
              placeholder="Type your answer here..."
              className="mt-4 w-full rounded-xl border border-[#E6EBEB] px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
            />
            <button
              type="button"
              onClick={handleNext}
              disabled={!currentAnswer.trim()}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition ${
                currentAnswer.trim()
                  ? "bg-[#C9A227] text-white hover:bg-[#B08D20]"
                  : "cursor-not-allowed bg-[#D1D5DB] text-white"
              }`}
            >
              {isLast ? "Submit All Answers" : "Next Question"}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

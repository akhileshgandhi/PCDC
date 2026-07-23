import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import {
  getAttemptDetail,
  getCaseDetail,
  sendAttemptAiMessage,
  startCaseAttempt,
  submitAttemptDefense,
  submitAttemptReflection,
  submitAttemptSolution,
  submitInitialAnalysis,
  type AttemptEvaluation,
} from "../../api/cases"
import ProgressBar from "../../components/attempt/ProgressBar"
import ReflectionStep from "../../components/attempt/ReflectionStep"
import Screen1Briefing from "../../components/attempt/Screen1Briefing"
import Screen2Analysis from "../../components/attempt/Screen2Analysis"
import Screen3AIChat, { type ChatMessage } from "../../components/attempt/Screen3AIChat"
import Screen4Solution, { type SolutionState } from "../../components/attempt/Screen4Solution"
import Screen5Defense from "../../components/attempt/Screen5Defense"
import Screen6Evaluation, { type EvaluationData } from "../../components/attempt/Screen6Evaluation"

const STATUS_STAGE: Record<string, number> = {
  analysis_submitted: 1,
  ai_discussion: 3,
  solution_submitted: 5,
  defense_complete: 6,
  evaluated: 6,
}

const emptySolution: SolutionState = {
  recommendation: "",
  reasoning: "",
  implementation: "",
  risks: "",
}

function countWords(value: string) {
  const words = value.trim().match(/\S+/g)
  return words ? words.length : 0
}

function formatSolution(solution: SolutionState) {
  return [
    `Recommendation:\n${solution.recommendation}`,
    `Reasoning:\n${solution.reasoning}`,
    `Implementation Plan:\n${solution.implementation}`,
    `Risks & Mitigations:\n${solution.risks}`,
  ].join("\n\n")
}

function formatDefense(questions: string[], answers: string[]) {
  return questions
    .map((question, index) => `Q${index + 1}: ${question}\nA${index + 1}: ${answers[index] || ""}`)
    .join("\n\n")
}

function toEvaluationData(evaluation: AttemptEvaluation): EvaluationData {
  return {
    total_score: evaluation.total_score,
    thinking_depth: evaluation.thinking_depth,
    logic_score: evaluation.logic_score,
    creativity_score: evaluation.creativity_score,
    practicality_score: evaluation.practicality_score,
    risk_awareness_score: evaluation.risk_awareness_score,
    reflection_score: evaluation.reflection_score,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    blind_spots: evaluation.blind_spots,
    next_case: null,
  }
}

export default function CaseAttempt() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [actionError, setActionError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [caseTitle, setCaseTitle] = useState("")
  const [reflectionPrompts, setReflectionPrompts] = useState<string[]>([])
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [currentScreen, setCurrentScreen] = useState(1)
  const [needsReflection, setNeedsReflection] = useState(false)

  const [analysisText, setAnalysisText] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [solution, setSolution] = useState<SolutionState>(emptySolution)
  const [defenseQuestions, setDefenseQuestions] = useState<string[]>([])
  const [defenseAnswers, setDefenseAnswers] = useState<string[]>([])
  const [currentDefenseQ, setCurrentDefenseQ] = useState(0)
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setElapsedTime((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!id) return
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const detail = await getCaseDetail(id!)
        if (!isMounted) return
        setCaseTitle(detail.case.title)
        setReflectionPrompts(detail.case.reflection_questions)

        let resolvedAttemptId = detail.attempt.attempt_id
        let status = detail.attempt.status

        if (!detail.attempt.exists) {
          const started = await startCaseAttempt(id!)
          resolvedAttemptId = started.attempt_id
          status = started.status
        }

        if (!resolvedAttemptId) {
          throw new Error("Could not resolve attempt")
        }
        setAttemptId(resolvedAttemptId)

        const attemptDetail = await getAttemptDetail(resolvedAttemptId)
        if (!isMounted) return

        setAnalysisText(attemptDetail.initial_analysis || "")
        setWordCount(countWords(attemptDetail.initial_analysis || ""))
        const discussionMessages = attemptDetail.conversations
          .filter((entry) => entry.stage === "discussion")
          .map((entry) => ({ role: entry.role, text: entry.message }))
        setChatMessages(
          discussionMessages.length === 0 && status !== "analysis_submitted"
            ? [
                {
                  role: "ai",
                  text: "Let's discuss your analysis — what part of your thinking would you like to pressure-test first?",
                },
              ]
            : discussionMessages,
        )

        const defenseAiEntry = attemptDetail.conversations.find(
          (entry) => entry.stage === "defense" && entry.role === "ai",
        )
        if (defenseAiEntry) {
          try {
            const parsed = JSON.parse(defenseAiEntry.message)
            if (Array.isArray(parsed)) {
              setDefenseQuestions(parsed.map((question) => String(question)))
            }
          } catch {
            // ignore malformed defense-question payloads
          }
        }

        if (attemptDetail.evaluation) {
          setEvaluation(toEvaluationData(attemptDetail.evaluation))
        }
        setNeedsReflection(status === "defense_complete")
        setCurrentScreen(STATUS_STAGE[status || "analysis_submitted"] || 1)
        setLoadError("")
      } catch {
        if (isMounted) {
          setLoadError("Unable to load this case attempt. It may not be assigned to you.")
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [id])

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(id ? `/student/case-studies/${id}` : "/student/case-studies")
  }

  function handleAnalysisChange(value: string) {
    setAnalysisText(value)
    setWordCount(countWords(value))
  }

  async function handleAnalysisNext() {
    if (!attemptId) return
    setIsSubmitting(true)
    try {
      const result = await submitInitialAnalysis(attemptId, analysisText)
      if (result.opening_message) {
        setChatMessages([{ role: "ai", text: result.opening_message }])
      }
      setActionError("")
      setCurrentScreen(3)
    } catch {
      setActionError("Unable to submit your analysis right now. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSendMessage(message: string) {
    if (!attemptId) return
    setChatMessages((messages) => [...messages, { role: "student", text: message }])
    try {
      const result = await sendAttemptAiMessage(attemptId, message)
      setChatMessages((messages) => [...messages, { role: "ai", text: result.response }])
      setActionError("")
    } catch {
      setActionError("The AI did not respond. Please try sending your message again.")
    }
  }

  function handleSolutionChange(field: keyof SolutionState, value: string) {
    setSolution((currentSolution) => ({ ...currentSolution, [field]: value }))
  }

  async function handleSolutionNext() {
    if (!attemptId) return
    setIsSubmitting(true)
    try {
      const result = await submitAttemptSolution(attemptId, formatSolution(solution))
      setDefenseQuestions(result.defense_questions)
      setActionError("")
      setCurrentScreen(5)
    } catch {
      setActionError("Unable to submit your solution right now. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDefenseAnswer(answer: string) {
    if (!attemptId) return
    const updatedAnswers = [...defenseAnswers, answer]
    setDefenseAnswers(updatedAnswers)

    const isLastQuestion = currentDefenseQ === defenseQuestions.length - 1
    if (!isLastQuestion) {
      setCurrentDefenseQ((questionIndex) =>
        Math.min(questionIndex + 1, defenseQuestions.length - 1),
      )
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitAttemptDefense(
        attemptId,
        formatDefense(defenseQuestions, updatedAnswers),
      )
      setEvaluation(toEvaluationData(result))
      setNeedsReflection(true)
      setActionError("")
      setCurrentScreen(6)
    } catch {
      setActionError("Unable to submit your defense right now. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReflectionSubmit(reflectionText: string) {
    if (!attemptId) return
    setIsSubmitting(true)
    try {
      const result = await submitAttemptReflection(attemptId, reflectionText)
      setEvaluation(toEvaluationData(result))
      setNeedsReflection(false)
      setActionError("")
    } catch {
      setActionError("Unable to submit your reflection right now. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F6F7F9]">
        <p className="text-sm font-medium text-[#6B7280]">Loading your attempt...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
        <main className="mx-auto max-w-[720px] px-4 py-10 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1D3A] transition hover:text-[#C9A227]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-5 py-8 text-center text-sm font-medium text-[#B91C1C]">
            {loadError}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <ProgressBar currentScreen={currentScreen} elapsedTime={elapsedTime} title={caseTitle} />
      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={goBack}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1D3A] transition hover:text-[#C9A227] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:ring-offset-2 focus:ring-offset-[#F6F7F9]"
          aria-label="Go back to the previous page"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>

        {actionError ? (
          <div className="mb-5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">
            {actionError}
          </div>
        ) : null}

        {currentScreen === 1 ? <Screen1Briefing onNext={() => setCurrentScreen(2)} /> : null}
        {currentScreen === 2 ? (
          <Screen2Analysis
            analysisText={analysisText}
            wordCount={wordCount}
            onAnalysisChange={handleAnalysisChange}
            onNext={handleAnalysisNext}
          />
        ) : null}
        {currentScreen === 3 ? (
          <Screen3AIChat
            analysisText={analysisText}
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
            onNext={() => setCurrentScreen(4)}
          />
        ) : null}
        {currentScreen === 4 ? (
          <Screen4Solution
            solution={solution}
            onSolutionChange={handleSolutionChange}
            onNext={handleSolutionNext}
          />
        ) : null}
        {currentScreen === 5 ? (
          <Screen5Defense
            questions={defenseQuestions}
            defenseAnswers={defenseAnswers}
            currentDefenseQ={currentDefenseQ}
            onSubmitAnswer={handleDefenseAnswer}
            onComplete={() => undefined}
          />
        ) : null}
        {currentScreen === 6 && needsReflection ? (
          <ReflectionStep
            questions={reflectionPrompts}
            isSubmitting={isSubmitting}
            onSubmit={handleReflectionSubmit}
          />
        ) : null}
        {currentScreen === 6 && !needsReflection && evaluation ? (
          <Screen6Evaluation evaluation={evaluation} />
        ) : null}
      </main>
    </div>
  )
}

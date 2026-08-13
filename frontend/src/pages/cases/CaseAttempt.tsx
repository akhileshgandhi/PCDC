import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import {
  getAttemptDetail,
  getCaseDetail,
  saveAnalysisDraft,
  submitInitialAnalysis,
  submitRapidFireAnswers,
  submitAttemptReflection,
  startAttemptPhase,
  startRapidFireRound,
  startCaseAttempt,
  type AttemptEvaluation,
  type AttemptPhase,
  type RapidFireQuestion,
  type WrittenQuestion,
} from "../../api/cases"
import ProgressBar from "../../components/attempt/ProgressBar"
import ReflectionStep from "../../components/attempt/ReflectionStep"
import Screen1Briefing from "../../components/attempt/Screen1Briefing"
import Screen2Analysis from "../../components/attempt/Screen2Analysis"
import Screen3AIChat, { type ChatMessage } from "../../components/attempt/Screen3AIChat"
import Screen6Evaluation, { type EvaluationData } from "../../components/attempt/Screen6Evaluation"

const STATUS_STAGE: Record<string, number> = {
  analysis_submitted: 1,
  ai_discussion: 3,
  solution_submitted: 3,
  defense_complete: 4,
  evaluated: 4,
}

function countWords(value: string) {
  const words = value.trim().match(/\S+/g)
  return words ? words.length : 0
}

function isExpiredError(error: unknown): boolean {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return typeof detail === "string" && detail.toLowerCase().includes("expired")
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
    improvement_areas: evaluation.improvement_areas,
    question_scores: evaluation.question_scores || [],
    rapid_fire_score: evaluation.rapid_fire_score,
    rapid_fire_feedback: evaluation.rapid_fire_feedback,
    overall_grade: evaluation.overall_grade,
    grade_comment: evaluation.grade_comment,
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
  const [caseSections, setCaseSections] = useState<{
    situation: string
    background: string
    data: string
    characters: string
    constraints: string
    objectives: string
    timeline: string
  }>({ situation: "", background: "", data: "", characters: "", constraints: "", objectives: "", timeline: "" })
  const [reflectionPrompts, setReflectionPrompts] = useState<string[]>([])
  const [writtenQuestions, setWrittenQuestions] = useState<WrittenQuestion[]>([])
  const [rapidFireQuestions, setRapidFireQuestions] = useState<RapidFireQuestion[]>([])
  const [rapidFireLoading, setRapidFireLoading] = useState(false)
  const [readingSeconds, setReadingSeconds] = useState<number | null>(null)
  const [writingSeconds, setWritingSeconds] = useState<number | null>(null)
  const [rapidFireSeconds, setRapidFireSeconds] = useState<number | null>(null)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [currentScreen, setCurrentScreen] = useState(1)
  const [needsReflection, setNeedsReflection] = useState(false)

  // Per-question answers for Stage 2
  const [writtenAnswers, setWrittenAnswers] = useState<string[]>([])
  // Ungraded free-text initial analysis written before the structured questions
  const [initialSummary, setInitialSummary] = useState("")
  // Combined analysisText kept for evaluation context
  const [analysisText, setAnalysisText] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!id) return
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const detail = await getCaseDetail(id!)
        if (!isMounted) return
        setCaseTitle(detail.case.title)
        setCaseSections({
          situation: detail.case.situation || "",
          background: detail.case.background || "",
          data: detail.case.data || "",
          characters: detail.case.characters || "",
          constraints: detail.case.constraints || "",
          objectives: detail.case.objectives || "",
          timeline: detail.case.timeline || "",
        })
        setReflectionPrompts(detail.case.reflection_questions)
        const qs = detail.case.written_questions || []
        setWrittenQuestions(qs)
        // Rapid fire questions are AI-generated live when the student enters the
        // rapid fire round (see the phase effect), not read from the case here.

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

        const storedAnalysis = attemptDetail.initial_analysis || ""
        setAnalysisText(storedAnalysis)
        const qs2 = detail.case.written_questions || []
        let draft: { summary?: string; answers?: string[] } | null = null
        if (attemptDetail.analysis_draft) {
          try {
            draft = JSON.parse(attemptDetail.analysis_draft)
          } catch {
            draft = null
          }
        }
        setInitialSummary(draft?.summary || attemptDetail.initial_summary || "")
        setWrittenAnswers(qs2.map((_, i) => draft?.answers?.[i] || ""))
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

        if (attemptDetail.evaluation) {
          setEvaluation(toEvaluationData(attemptDetail.evaluation))
        }
        if (status === "expired") {
          setExpired(true)
        }
        setNeedsReflection(status === "defense_complete")
        // "analysis_submitted" is the pre-submit status (oddly named — it means
        // the analysis step is still pending). It has no entry in STATUS_STAGE,
        // so it used to always fall back to screen 1 even if the student had
        // already moved past Reading into Analysis. writing_started_at is
        // stamped the moment they enter Analysis, so use it to resume there.
        const fallbackScreen = attemptDetail.writing_started_at ? 2 : 1
        setCurrentScreen(STATUS_STAGE[status || "analysis_submitted"] || fallbackScreen)
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

  // Server-side timing: on entering each phase, stamp/resume its start time and
  // fetch the authoritative seconds remaining (refresh-proof).
  useEffect(() => {
    if (!attemptId) return
    const phaseByScreen: Record<number, AttemptPhase | undefined> = {
      1: "reading",
      2: "writing",
      3: "rapid_fire",
    }
    const phase = phaseByScreen[currentScreen]
    if (!phase) return
    let active = true

    if (phase === "rapid_fire") {
      // Rapid fire: AI generates the questions live and starts the timer in one
      // server call (idempotent — a refresh returns the same questions/timer).
      setRapidFireLoading(true)
      startRapidFireRound(attemptId)
        .then((res) => {
          if (!active) return
          if (res.timing.expired) {
            setExpired(true)
            return
          }
          setRapidFireQuestions(res.questions)
          setRapidFireSeconds(res.timing.remaining_seconds)
        })
        .catch(() => {
          if (active) setActionError("Unable to load the rapid fire round. Please retry.")
        })
        .finally(() => {
          if (active) setRapidFireLoading(false)
        })
      return () => {
        active = false
      }
    }

    startAttemptPhase(attemptId, phase)
      .then((res) => {
        if (!active) return
        if (res.expired) {
          setExpired(true)
          return
        }
        if (phase === "reading") setReadingSeconds(res.remaining_seconds)
        else setWritingSeconds(res.remaining_seconds)
      })
      .catch(() => {
        /* timing is best-effort; a failure just hides the timer */
      })
    return () => {
      active = false
    }
  }, [currentScreen, attemptId])

  // Autosave the in-progress analysis draft so a reload never wipes typed
  // work again — debounced so it doesn't fire on every keystroke.
  useEffect(() => {
    if (currentScreen !== 2 || !attemptId) return
    const timer = window.setTimeout(() => {
      saveAnalysisDraft(attemptId, { summary: initialSummary, answers: writtenAnswers }).catch(
        () => undefined,
      )
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [currentScreen, attemptId, initialSummary, writtenAnswers])

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(id ? `/student/case-studies/${id}` : "/student/case-studies")
  }

  function handleAnalysisChange(index: number, value: string) {
    setWrittenAnswers((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  async function handleAnalysisNext() {
    if (!attemptId) return
    setIsSubmitting(true)
    try {
      // Concatenate per-question answers into a single string for storage
      const combined = writtenQuestions
        .map((q, i) => `Q${q.question_number}: ${q.question_text}\n\n${writtenAnswers[i] || ""}`)
        .join("\n\n---\n\n")
      const submissionText = combined || writtenAnswers.join("\n\n")
      setAnalysisText(submissionText)
      // Only send the ungraded initial analysis when structured questions exist
      // (in the fallback path the single textarea already IS the analysis).
      const summaryToSend = writtenQuestions.length > 0 ? initialSummary : undefined
      const result = await submitInitialAnalysis(attemptId, submissionText, summaryToSend)
      if (result.opening_message) {
        setChatMessages([{ role: "ai", text: result.opening_message }])
      }
      setActionError("")
      setCurrentScreen(3)
    } catch (error) {
      if (isExpiredError(error)) {
        setExpired(true)
      } else {
        const detail = (error as any)?.response?.data?.detail
        setActionError(
          typeof detail === "string"
            ? detail
            : "Unable to submit your analysis right now. Please try again.",
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRapidFireSubmit(rapidFireAnswers: string) {
    if (!attemptId) return
    setIsSubmitting(true)
    try {
      const result = await submitRapidFireAnswers(attemptId, rapidFireAnswers)
      setEvaluation(toEvaluationData(result))
      setActionError("")
      setCurrentScreen(4)
    } catch (error) {
      if (isExpiredError(error)) {
        setExpired(true)
      } else {
        setActionError("Unable to submit your answers right now. Please try again.")
      }
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

  if (expired) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
        <main className="mx-auto max-w-[720px] px-4 py-12 sm:px-6">
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-[#B91C1C]">Time&apos;s up</h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#7F1D1D]">
              This attempt has expired because a timed phase ran out. You get one
              attempt per case study, and it cannot be resumed from where you left off.
            </p>
            <button
              type="button"
              onClick={() => navigate("/student/case-studies")}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0B1D3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#132a4f]"
            >
              Back to My Case Studies
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <ProgressBar currentScreen={currentScreen} title={caseTitle} />
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

        {currentScreen === 1 ? (
          <Screen1Briefing
            caseTitle={caseTitle}
            situation={caseSections.situation}
            background={caseSections.background}
            data={caseSections.data}
            characters={caseSections.characters}
            constraints={caseSections.constraints}
            objectives={caseSections.objectives}
            timeline={caseSections.timeline}
            remainingSeconds={readingSeconds}
            onNext={() => setCurrentScreen(2)}
          />
        ) : null}
        {currentScreen === 2 ? (
          <Screen2Analysis
            questions={writtenQuestions}
            answers={writtenAnswers}
            initialSummary={initialSummary}
            onInitialSummaryChange={setInitialSummary}
            reflectionQuestions={reflectionPrompts}
            remainingSeconds={writingSeconds}
            onAnswerChange={handleAnalysisChange}
            onNext={handleAnalysisNext}
          />
        ) : null}
        {currentScreen === 3 ? (
          <Screen3AIChat
            rapidFireQuestions={rapidFireQuestions}
            analysisText={analysisText}
            chatMessages={chatMessages}
            remainingSeconds={rapidFireSeconds}
            isGenerating={rapidFireLoading}
            onSendMessage={() => undefined}
            onNext={() => undefined}
            onSubmit={handleRapidFireSubmit}
            isSubmitting={isSubmitting}
          />
        ) : null}
        {currentScreen === 4 && evaluation ? (
          <Screen6Evaluation evaluation={evaluation} />
        ) : null}
        {currentScreen === 4 && !evaluation ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[#6B7280]">
            <div className="size-8 animate-spin rounded-full border-4 border-[#E6EBEB] border-t-[#C9A227]" />
            <p className="text-sm font-medium">AI is generating your evaluation…</p>
          </div>
        ) : null}
      </main>
    </div>
  )
}

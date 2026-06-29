import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import ProgressBar from "../../components/attempt/ProgressBar"
import Screen1Briefing from "../../components/attempt/Screen1Briefing"
import Screen2Analysis from "../../components/attempt/Screen2Analysis"
import Screen3AIChat, { type ChatMessage } from "../../components/attempt/Screen3AIChat"
import Screen4Solution, { type SolutionState } from "../../components/attempt/Screen4Solution"
import Screen5Defense from "../../components/attempt/Screen5Defense"
import Screen6Evaluation, { type EvaluationData } from "../../components/attempt/Screen6Evaluation"

const initialAiMessage =
  "I've reviewed your initial analysis. You've correctly identified the revenue decline but I'd like to explore your thinking on distribution. What do you see as the root cause?"

const mockAIResponses = [
  "Interesting perspective. Have you considered how the shift to premium products affects your distribution strategy? What data would you need to validate this?",
  "You're on the right track. Let me push you further - if you fix distribution alone, how does that address the pricing gap with Chinese OEMs?",
  "Good thinking. Now consider this: what happens if the competitor responds by dropping prices by 15%? How does your strategy hold up?",
  "I'd challenge your assumption about customer loyalty here. What evidence do you have that brand recall is still strong in these markets?",
  "Solid analysis. What's your recommended first move in the next 90 days, and why that over alternatives?",
]

const mockDefenseQuestions = [
  "Your strategy assumes brand recall is high. But recent surveys show only 34% recognise the ABC brand. How does this change your approach?",
  "If the board cuts your budget by 40%, which elements of your plan do you preserve and which do you cut first?",
  "A competitor just announced a direct entry into your target market with a product priced 20% lower. How do you respond?",
]

const mockEvaluation: EvaluationData = {
  total_score: 76,
  thinking_depth: 82,
  logic_score: 74,
  creativity_score: 63,
  practicality_score: 79,
  risk_awareness_score: 65,
  reflection_score: 71,
  strengths:
    "Strong structured thinking and clear prioritisation of the distribution problem. Good use of strategic frameworks under time pressure.",
  weaknesses:
    "Risk mitigation was surface-level. Competitor response scenarios were identified but not fully developed into concrete contingency plans.",
  blind_spots:
    "Brand perception data was available in the brief but was not meaningfully incorporated into the final recommendation.",
  next_case: {
    id: 2,
    title: "India-China Border Tensions: Economic Impact",
    domain: "Geopolitics",
    difficulty: 5,
    estimated_minutes: 90,
  },
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

export default function CaseAttempt() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [currentScreen, setCurrentScreen] = useState(1)
  const [analysisText, setAnalysisText] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "ai", text: initialAiMessage },
  ])
  const [solution, setSolution] = useState<SolutionState>(emptySolution)
  const [defenseAnswers, setDefenseAnswers] = useState<string[]>([])
  const [currentDefenseQ, setCurrentDefenseQ] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setElapsedTime((value) => value + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const aiResponseIndex = useMemo(() => {
    const studentMessageCount = chatMessages.filter((message) => message.role === "student").length
    return studentMessageCount % mockAIResponses.length
  }, [chatMessages])

  function goNext() {
    setCurrentScreen((screen) => Math.min(screen + 1, 6))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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

  function handleSendMessage(message: string) {
    const aiResponse = mockAIResponses[aiResponseIndex]
    setChatMessages((messages) => [
      ...messages,
      { role: "student", text: message },
      { role: "ai", text: aiResponse },
    ])
  }

  function handleSolutionChange(field: keyof SolutionState, value: string) {
    setSolution((currentSolution) => ({
      ...currentSolution,
      [field]: value,
    }))
  }

  function handleDefenseAnswer(answer: string) {
    setDefenseAnswers((answers) => [...answers, answer])
    setCurrentDefenseQ((questionIndex) =>
      Math.min(questionIndex + 1, mockDefenseQuestions.length - 1),
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <ProgressBar currentScreen={currentScreen} elapsedTime={elapsedTime} />
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

        {currentScreen === 1 ? <Screen1Briefing onNext={goNext} /> : null}
        {currentScreen === 2 ? (
          <Screen2Analysis
            analysisText={analysisText}
            wordCount={wordCount}
            onAnalysisChange={handleAnalysisChange}
            onNext={goNext}
          />
        ) : null}
        {currentScreen === 3 ? (
          <Screen3AIChat
            analysisText={analysisText}
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
            onNext={goNext}
          />
        ) : null}
        {currentScreen === 4 ? (
          <Screen4Solution
            solution={solution}
            onSolutionChange={handleSolutionChange}
            onNext={goNext}
          />
        ) : null}
        {currentScreen === 5 ? (
          <Screen5Defense
            questions={mockDefenseQuestions}
            defenseAnswers={defenseAnswers}
            currentDefenseQ={currentDefenseQ}
            onSubmitAnswer={handleDefenseAnswer}
            onComplete={goNext}
          />
        ) : null}
        {currentScreen === 6 ? <Screen6Evaluation evaluation={mockEvaluation} /> : null}
      </main>
    </div>
  )
}

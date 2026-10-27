import { useMemo, useState } from "react"

import { AISH_GREETING, AISH_NAME, AishIntro } from "../../components/aish/Aish"
import CoachCard, { type Coach } from "../../components/coach/CoachCard"
import CoachChat, {
  type CoachMessage,
  type SessionHistoryItem,
} from "../../components/coach/CoachChat"
import DashboardLayout from "../../layouts/DashboardLayout"

const coaches: Coach[] = [
  {
    id: "capability",
    focus: ["Analytical thinking", "Critical thinking", "Strategic thinking"],
    name: "Capability Coach",
    tagline: "Strengthen core thinking",
    description:
      "I help you identify gaps in your analytical, critical, and strategic thinking through targeted exercises and questions.",
    icon: "Brain",
    color: "#0B1D3A",
    system_prompt:
      "You are Aish, the Capability Coach for PCDC. Your role is to help business students strengthen their analytical, critical, and strategic thinking. Ask probing questions, suggest frameworks, and guide reflection. Never give direct answers - guide the student to discover insights themselves. Keep responses under 150 words.",
  },
  {
    id: "leadership",
    focus: ["Team management", "Influence", "Conflict resolution"],
    name: "Leadership Coach",
    tagline: "Lead with impact",
    description:
      "I work on your leadership presence, team management, influence, and conflict resolution skills.",
    icon: "Users",
    color: "#1D4ED8",
    system_prompt:
      "You are Aish, the Leadership Coach for PCDC. Help students develop leadership skills including team management, influence, and conflict resolution. Use real-world scenarios and Socratic questioning. Keep responses under 150 words.",
  },
  {
    id: "communication",
    focus: ["Executive presence", "Structured arguments", "Clarity"],
    name: "Communication Coach",
    tagline: "Refine your executive voice",
    description:
      "I help you communicate with clarity, structure your arguments, and present ideas with executive presence.",
    icon: "MessageSquare",
    color: "#7C3AED",
    system_prompt:
      "You are Aish, the Communication Coach for PCDC. Help students develop clear, structured, and persuasive communication. Focus on executive presence, structured thinking (SCQA, Pyramid Principle), and clarity. Keep responses under 150 words.",
  },
  {
    id: "career",
    focus: ["Career pathways", "Goal setting", "Development planning"],
    name: "Career Coach",
    tagline: "Navigate your path",
    description:
      "I guide your career decisions, help you explore pathways, and align your development to your goals.",
    icon: "Compass",
    color: "#059669",
    system_prompt:
      "You are Aish, the Career Coach for PCDC. Help students navigate career decisions in consulting, finance, marketing, HR, entrepreneurship, and family business. Be practical, ask about their goals, and suggest relevant development actions. Keep responses under 150 words.",
  },
  {
    id: "startup",
    focus: ["Opportunity spotting", "Business models", "Founder mindset"],
    name: "Startup Mentor",
    tagline: "Build with conviction",
    description:
      "I help entrepreneurial thinkers develop business models, assess opportunities, and think like founders.",
    icon: "Rocket",
    color: "#DC2626",
    system_prompt:
      "You are Aish, the Startup Mentor for PCDC. Help students think like entrepreneurs - opportunity recognition, business model design, risk assessment, and resourcefulness. Challenge their assumptions and push them to think beyond constraints. Keep responses under 150 words.",
  },
  {
    id: "reflection",
    focus: ["Guided reflection", "Self-awareness", "Learning from cases"],
    name: "Reflection Coach",
    tagline: "Deepen self-awareness",
    description:
      "I guide structured reflection after case studies to help you extract learning and build self-awareness.",
    icon: "BookOpen",
    color: "#D97706",
    system_prompt:
      "You are Aish, the Reflection Coach for PCDC. Help students extract deep learning from their experiences through guided reflection. Use questions like 'What would you do differently?', 'What does this reveal about your assumptions?'. Keep responses under 150 words.",
  },
]

// Every coach is Aish wearing a different hat, so each opening line starts
// with "Hi, I am Aish!" and names the coach's focus.
const openingMessages: Record<string, string> = {
  capability: `${AISH_GREETING} As your Capability Coach, I focus on analytical, critical and strategic thinking. I've reviewed your capability scores. Your Strategic Thinking dipped this month. Shall we explore why and work on strengthening it?`,
  leadership: `${AISH_GREETING} As your Leadership Coach, I focus on team management, influence and conflict resolution. What leadership challenge are you currently facing - at college, in a project, or in life?`,
  communication: `${AISH_GREETING} As your Communication Coach, I focus on clarity, structured arguments and executive presence. What's one situation where you felt your communication fell short?`,
  career: `${AISH_GREETING} As your Career Coach, I help you explore pathways and align your development to your goals. Your career pathway shows Management Consulting. What excites you most about that path - and what worries you?`,
  startup: `${AISH_GREETING} As your Startup Mentor, I help you spot opportunities, design business models and think like a founder. What's a problem you've noticed recently that nobody seems to be solving?`,
  reflection: `${AISH_GREETING} As your Reflection Coach, I guide you to extract learning from your case studies. Which of your recent case studies felt most challenging, and why?`,
}

const mockAIResponses = [
  "Interesting perspective. Have you considered how the shift to premium products affects your distribution strategy? What data would you need to validate this?",
  "You're on the right track. Let me push you further - if you fix distribution alone, how does that address the pricing gap with Chinese OEMs?",
  "Good thinking. Now consider this: what happens if the competitor responds by dropping prices by 15%? How does your strategy hold up?",
  "I'd challenge your assumption about customer loyalty here. What evidence do you have that brand recall is still strong in these markets?",
  "Solid analysis. What's your recommended first move in the next 90 days, and why that over alternatives?",
]

const sessionHistory: SessionHistoryItem[] = [
  { date: "Jun 20, 2025", coach: `${AISH_NAME} · Capability Coach`, messages: 12 },
  { date: "Jun 15, 2025", coach: `${AISH_NAME} · Career Coach`, messages: 8 },
  { date: "Jun 10, 2025", coach: `${AISH_NAME} · Reflection Coach`, messages: 15 },
]

function messagesForCoach(coach: Coach): CoachMessage[] {
  return [{ role: "ai", text: openingMessages[coach.id] }]
}

export default function AICoach() {
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])

  const responseIndex = useMemo(() => {
    const studentCount = messages.filter((message) => message.role === "student").length
    return studentCount % mockAIResponses.length
  }, [messages])

  function handleSelectCoach(coach: Coach) {
    setSelectedCoach(coach)
    setMessages(messagesForCoach(coach))
  }

  function handleSendMessage(message: string) {
    const response = mockAIResponses[responseIndex]
    setMessages((currentMessages) => [
      ...currentMessages,
      { role: "student", text: message },
      { role: "ai", text: response },
    ])
  }

  function handleNewSession() {
    if (!selectedCoach) return
    setMessages(messagesForCoach(selectedCoach))
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-[#111827]">Your {AISH_NAME} Coaches</h1>
          <AishIntro className="mt-4 max-w-3xl">
            I'm your personal development coach, available 24/7. I can coach you in six
            different areas. Pick one below and let's start a focused conversation.
          </AishIntro>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {coaches.map((coach) => (
            <CoachCard
              key={coach.id}
              coach={coach}
              isActive={selectedCoach?.id === coach.id}
              onSelect={handleSelectCoach}
            />
          ))}
        </section>

        {selectedCoach ? (
          <CoachChat
            coach={selectedCoach}
            messages={messages}
            sessionHistory={sessionHistory}
            onSendMessage={handleSendMessage}
            onNewSession={handleNewSession}
          />
        ) : (
          <section className="rounded-xl border border-dashed border-[#E6EBEB] bg-white px-5 py-12 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">Choose a coach to begin</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              {AISH_NAME} opens each session with a focused prompt tailored to that development area.
            </p>
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}

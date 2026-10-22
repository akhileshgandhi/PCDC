import { Send } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { Coach } from "./CoachCard"

export interface CoachMessage {
  role: "ai" | "student"
  text: string
}

export interface SessionHistoryItem {
  date: string
  coach: string
  messages: number
}

interface CoachChatProps {
  coach: Coach
  messages: CoachMessage[]
  sessionHistory: SessionHistoryItem[]
  onSendMessage: (message: string) => void
  onNewSession: () => void
}

const iconInitials: Record<string, string> = {
  capability: "CC",
  leadership: "LC",
  communication: "CO",
  career: "CR",
  startup: "SM",
  reflection: "RC",
}

export default function CoachChat({
  coach,
  messages,
  sessionHistory,
  onSendMessage,
  onNewSession,
}: CoachChatProps) {
  const [draft, setDraft] = useState("")
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setDraft("")
  }

  return (
    <section className="rounded-xl border border-[#E6EBEB] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#E6EBEB] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="grid size-12 place-items-center rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: coach.color }}
          >
            {iconInitials[coach.id] ?? "AI"}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">{coach.name}</h2>
            <p className="text-sm font-medium text-[#6B7280]">{coach.tagline}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onNewSession}
            className="rounded-lg border border-[#0B1D3A] px-4 py-2 text-sm font-semibold text-[#0B1D3A] transition hover:bg-[#0B1D3A] hover:text-white"
          >
            Start New Session
          </button>
          <button
            type="button"
            onClick={() => window.alert("Coming soon")}
            className="rounded-lg bg-[#F6F7F9] px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#E6EBEB]"
          >
            View Session History
          </button>
        </div>
      </div>

      <div className="max-h-[520px] min-h-[360px] space-y-4 overflow-auto bg-[#F6F7F9] p-5">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "student" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-6 ${
                message.role === "student"
                  ? "bg-[#0B1D3A] text-white"
                  : "border border-[#E6EBEB] bg-white text-[#374151]"
              }`}
            >
              <p className="mb-1 text-xs font-semibold uppercase opacity-70">
                {message.role === "student" ? "Student" : "AI"}
              </p>
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-col gap-3 border-t border-[#E6EBEB] p-5 sm:flex-row">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend()
          }}
          placeholder="Type your message..."
          className="min-w-0 flex-1 rounded-lg border border-[#E6EBEB] px-4 py-3 text-sm outline-none transition focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
        />
        <button
          type="button"
          onClick={handleSend}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#B08D20]"
        >
          Send
          <Send size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="border-t border-[#E6EBEB] p-5">
        <h3 className="text-lg font-semibold text-[#111827]">Previous Sessions</h3>
        <div className="mt-4 divide-y divide-[#E6EBEB] rounded-lg border border-[#E6EBEB]">
          {sessionHistory.map((session) => (
            <div
              key={`${session.date}-${session.coach}`}
              className="grid gap-2 px-4 py-3 text-sm text-[#6B7280] sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
            >
              <span className="font-medium text-[#111827]">{session.date}</span>
              <span>{session.coach}</span>
              <span>{session.messages} messages</span>
              <button
                type="button"
                onClick={() => window.alert("Coming soon")}
                className="text-left font-semibold text-[#92702A] sm:text-right"
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

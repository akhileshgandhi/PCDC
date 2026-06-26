import { ArrowRight, ChevronDown, ChevronUp, Send } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"

export interface ChatMessage {
  role: "ai" | "student"
  text: string
}

interface Screen3AIChatProps {
  analysisText: string
  chatMessages: ChatMessage[]
  onSendMessage: (message: string) => void
  onNext: () => void
}

const keyDataPoints = [
  "Revenue declined 25% over two quarters.",
  "Distributor coverage dropped from 1,200 to 780 stores.",
  "Premium-segment preference is rising across target cities.",
  "Chinese OEMs are using price bundles and retail incentives.",
]

export default function Screen3AIChat({
  analysisText,
  chatMessages,
  onSendMessage,
  onNext,
}: Screen3AIChatProps) {
  const [draft, setDraft] = useState("")
  const [isReferenceOpen, setIsReferenceOpen] = useState(true)

  function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setDraft("")
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[45%_55%]">
        <aside className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setIsReferenceOpen((value) => !value)}
            className="flex w-full items-center justify-between text-left"
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Case Reference
              </span>
              <span className="mt-1 block text-lg font-semibold text-[#111827]">
                Summary and Your Analysis
              </span>
            </span>
            {isReferenceOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {isReferenceOpen ? (
            <div className="mt-5 space-y-5">
              <ReferenceSection title="Case Summary">
                ABC Electronics is losing Southeast Asia share as distribution weakens, OEM
                competitors undercut prices, and premium preferences shift.
              </ReferenceSection>
              <ReferenceSection title="Key Data Points">
                <ul className="space-y-2">
                  {keyDataPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </ReferenceSection>
              <ReferenceSection title="Your Analysis">
                <p className="max-h-56 overflow-auto rounded-lg bg-[#F6F7F9] p-3">
                  {analysisText || "Your submitted analysis will appear here."}
                </p>
              </ReferenceSection>
            </div>
          ) : null}
        </aside>

        <main className="flex min-h-[560px] flex-col rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              AI Discussion
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Challenge Your Thinking</h2>
          </div>

          <div className="mt-5 flex-1 space-y-4 overflow-auto rounded-xl bg-[#F6F7F9] p-4">
            {chatMessages.map((message, index) => (
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
          </div>

          <div className="mt-4 flex gap-3">
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B1D3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#122A54]"
            >
              <Send size={16} aria-hidden="true" />
              Send
            </button>
          </div>
        </main>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#B08D20]"
        >
          I'm ready to submit my solution
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

interface ReferenceSectionProps {
  title: string
  children: ReactNode
}

function ReferenceSection({ title, children }: ReferenceSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-[#6B7280]">{children}</div>
    </section>
  )
}

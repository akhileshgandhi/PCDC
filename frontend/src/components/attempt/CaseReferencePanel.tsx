import { BookOpen, X } from "lucide-react"

import CaseBriefSections, { Card, type CaseBriefSectionValues } from "./CaseBriefSections"

export interface AnsweredQuestion {
  question_text: string
  answer_text: string
}

interface CaseReferencePanelProps {
  sections: CaseBriefSectionValues
  isOpen: boolean
  onToggle: () => void
  // Only passed during Rapid Fire — the student's own earlier answers, shown
  // read-only alongside the case text so they can check their own reasoning
  // without being able to change it.
  initialSummary?: string
  answeredQuestions?: AnsweredQuestion[]
}

// Lets a student re-open the case text (and, during Rapid Fire, their own
// earlier answers) without leaving the Questions/Rapid Fire screen — mirrors
// having the case papers next to you during a real assessment.
export default function CaseReferencePanel({
  sections,
  isOpen,
  onToggle,
  initialSummary,
  answeredQuestions,
}: CaseReferencePanelProps) {
  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={onToggle}
          className="fixed right-4 top-24 z-30 inline-flex items-center gap-2 rounded-full border border-[#E6EBEB] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1D3A] shadow-md transition hover:border-[#C9A227] hover:bg-[#FFF7DF] sm:right-8"
          aria-expanded={false}
        >
          <BookOpen size={16} aria-hidden="true" />
          View Case
        </button>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="Close case reference panel"
            onClick={onToggle}
            className="absolute inset-0 bg-black/30"
          />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-[#F6F7F9] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E6EBEB] bg-white px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0B1D3A]">
                Case Reference
              </h2>
              <button
                type="button"
                onClick={onToggle}
                aria-label="Close"
                className="rounded-md p-1.5 text-[#6B7280] transition hover:bg-[#F6F7F9] hover:text-[#111827]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {answeredQuestions && answeredQuestions.length > 0 ? (
                <div className="mb-5 space-y-4">
                  {initialSummary ? (
                    <Card eyebrow="Your Initial Summary">
                      <p className="whitespace-pre-line text-sm leading-6 text-[#374151]">
                        {initialSummary}
                      </p>
                    </Card>
                  ) : null}
                  <Card eyebrow="Your Answers">
                    <div className="space-y-4">
                      {answeredQuestions.map((qa, index) => (
                        <div key={index} className={index > 0 ? "border-t border-[#E6EBEB] pt-4" : undefined}>
                          <p className="text-sm font-semibold text-[#111827]">{qa.question_text}</p>
                          <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-[#6B7280]">
                            {qa.answer_text || "(no answer given)"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              ) : null}
              <CaseBriefSections sections={sections} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}

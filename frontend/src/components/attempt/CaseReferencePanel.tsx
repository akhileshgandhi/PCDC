import CaseBriefSections, { Card, type CaseBriefSectionValues } from "./CaseBriefSections"

export interface AnsweredQuestion {
  question_text: string
  answer_text: string
}

interface CaseReferencePanelProps {
  sections: CaseBriefSectionValues
  // Only passed during Rapid Fire — the student's own earlier answers, shown
  // read-only alongside the case text so they can check their own reasoning
  // without being able to change it.
  initialSummary?: string
  answeredQuestions?: AnsweredQuestion[]
}

// The case text (and, during Rapid Fire, the student's own earlier answers)
// stays visible in a permanent left-hand column next to the Questions/Rapid
// Fire work area — mirrors having the case papers open next to you during a
// real assessment, rather than a toggle the student has to keep reopening.
export default function CaseReferencePanel({
  sections,
  initialSummary,
  answeredQuestions,
}: CaseReferencePanelProps) {
  return (
    // No sticky/max-height/inner-scroll here — the panel flows with the page
    // like everything else, instead of being squeezed into a short nested
    // scroll region that made it feel cramped no matter the actual content
    // length.
    <aside className="self-start rounded-xl border border-[#E6EBEB] bg-[#F6F7F9] shadow-sm">
      <div className="rounded-t-xl border-b border-[#E6EBEB] bg-white px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0B1D3A]">
          Case Reference
        </h2>
      </div>
      <div className="px-5 py-5">
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
  )
}

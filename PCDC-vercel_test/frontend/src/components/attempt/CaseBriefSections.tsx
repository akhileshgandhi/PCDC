import type { ReactNode } from "react"

import ExpandableText from "../ExpandableText"

export interface CaseBriefSectionValues {
  description: string
  data: string
  objectives: string
  outcome_statement?: string
  decision_options?: string[]
  learning_takeaways?: string[]
}

interface CaseBriefSectionsProps {
  sections: CaseBriefSectionValues
}

// The case-brief cards (Case Description/Expected Outcome/Decision Options/
// Learning Takeaway) — shared between the Reading screen and the reference
// panel shown during Questions/Rapid Fire, so the two never drift apart.
//
// `data`/`objectives` (the old "Situation"/"What You Will Develop" cards)
// are no longer rendered here — the Case Builder dropped the manual fields
// they came from once "Case Background...Facts and Data" and "The Expected
// Outcome" took over the same ground, so showing them risked either
// duplicating that content or, for any case without them filled in, showing
// a generic fallback instead of nothing.
export default function CaseBriefSections({ sections }: CaseBriefSectionsProps) {
  const { description, outcome_statement, decision_options, learning_takeaways } = sections
  return (
    <div className="space-y-5">
      {description && (
        <Card eyebrow="Case Description">
          <ExpandableText
            label="Case Description"
            text={description}
            className="text-sm leading-7 text-[#374151]"
          />
        </Card>
      )}

      {outcome_statement && (
        <Card eyebrow="The Expected Outcome">
          <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">{outcome_statement}</p>
        </Card>
      )}

      {decision_options && decision_options.length > 0 && (
        <Card eyebrow="Decision / Action Options">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#374151]">
            {decision_options.map((option, index) => (
              <li key={index}>{option}</li>
            ))}
          </ul>
        </Card>
      )}

      {learning_takeaways && learning_takeaways.length > 0 && (
        <Card eyebrow="Learning Takeaway">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#374151]">
            {learning_takeaways.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

interface CardProps {
  eyebrow: string
  children: ReactNode
}

export function Card({ eyebrow, children }: CardProps) {
  return (
    <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
        {eyebrow}
      </p>
      {children}
    </article>
  )
}

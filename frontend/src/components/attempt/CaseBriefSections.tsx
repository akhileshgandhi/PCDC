import type { ReactNode } from "react"
import { Building2 } from "lucide-react"

import ExpandableText from "../ExpandableText"

export interface CaseBriefSectionValues {
  description: string
  data: string
  objectives: string
}

interface CaseBriefSectionsProps {
  sections: CaseBriefSectionValues
}

// The case-brief cards (Case Description/Situation/What You Will Develop) —
// shared between the Reading screen and the reference panel shown during
// Questions/Rapid Fire, so the two never drift apart.
export default function CaseBriefSections({ sections }: CaseBriefSectionsProps) {
  const { description, data, objectives } = sections
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

      {data && (
        <Card eyebrow="Situation">
          <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">{data}</p>
        </Card>
      )}

      <Card eyebrow="What You Will Develop">
        <div className="flex gap-4">
          <Building2 className="mt-1 shrink-0 text-[#C9A227]" size={22} aria-hidden="true" />
          <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">
            {objectives || "Analyse the case and propose a well-reasoned solution."}
          </p>
        </div>
      </Card>
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

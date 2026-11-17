import { ArrowRight, BriefcaseBusiness } from "lucide-react"

import CaseBriefSections, { Card } from "./CaseBriefSections"
import CountdownTimer from "./CountdownTimer"

interface Screen1BriefingProps {
  caseTitle: string
  description: string
  data: string
  objectives: string
  outcomeStatement?: string
  decisionOptions?: string[]
  learningTakeaways?: string[]
  remainingSeconds?: number | null
  onNext: () => void
}

export default function Screen1Briefing({
  caseTitle,
  description,
  data,
  objectives,
  outcomeStatement,
  decisionOptions,
  learningTakeaways,
  remainingSeconds,
  onNext,
}: Screen1BriefingProps) {
  return (
    <section className="mx-auto max-w-[800px] space-y-5">
      {remainingSeconds != null ? (
        <CountdownTimer seconds={remainingSeconds} label="Reading time" onExpire={onNext} hidden />
      ) : null}
      <Card eyebrow="Role Assigned">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-xl bg-[#F6F7F9] text-[#0c1f3d]">
            <BriefcaseBusiness size={26} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[#0c1f3d]">{caseTitle}</h2>
          </div>
        </div>
      </Card>

      <CaseBriefSections
        sections={{
          description,
          data,
          objectives,
          outcome_statement: outcomeStatement,
          decision_options: decisionOptions,
          learning_takeaways: learningTakeaways,
        }}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3b82f6]"
        >
          I have read the case — Begin Analysis
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

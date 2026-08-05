import { ArrowRight, BriefcaseBusiness, Building2 } from "lucide-react"
import type { ReactNode } from "react"

import CountdownTimer from "./CountdownTimer"

interface Screen1BriefingProps {
  caseTitle: string
  situation: string
  background: string
  data: string
  characters: string
  constraints: string
  objectives: string
  timeline: string
  remainingSeconds?: number | null
  onNext: () => void
}

export default function Screen1Briefing({
  caseTitle,
  situation,
  background,
  data,
  characters,
  constraints,
  objectives,
  timeline,
  remainingSeconds,
  onNext,
}: Screen1BriefingProps) {
  return (
    <section className="mx-auto max-w-[800px] space-y-5">
      {remainingSeconds != null ? (
        <div className="sticky top-2 z-10 flex items-center justify-between rounded-xl border border-[#E6EBEB] bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-semibold text-[#0B1D3A]">Reading phase</span>
          <CountdownTimer seconds={remainingSeconds} label="Reading time" onExpire={onNext} />
        </div>
      ) : null}
      <Card eyebrow="Role Assigned">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-xl bg-[#F6F7F9] text-[#0B1D3A]">
            <BriefcaseBusiness size={26} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[#0B1D3A]">{caseTitle}</h2>
          </div>
        </div>
      </Card>

      {situation && (
        <Card eyebrow="The Situation">
          <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">{situation}</p>
        </Card>
      )}

      {background && (
        <Card eyebrow="Background">
          <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">{background}</p>
        </Card>
      )}

      {data && (
        <Card eyebrow="Data &amp; Financials">
          <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">{data}</p>
        </Card>
      )}

      {(characters || constraints) && (
        <Card eyebrow="Key Details">
          <div className="grid gap-4 md:grid-cols-2">
            {characters && (
              <div className="rounded-lg bg-[#F6F7F9] p-4">
                <h3 className="text-sm font-semibold text-[#111827]">Key People</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#6B7280]">{characters}</p>
              </div>
            )}
            {constraints && (
              <div className="rounded-lg bg-[#F6F7F9] p-4">
                <h3 className="text-sm font-semibold text-[#111827]">Constraints</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#6B7280]">{constraints}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {timeline && (
        <Card eyebrow="Timeline">
          <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">{timeline}</p>
        </Card>
      )}

      <Card eyebrow="Your Objective">
        <div className="flex gap-4">
          <Building2 className="mt-1 shrink-0 text-[#C9A227]" size={22} aria-hidden="true" />
          <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">
            {objectives || "Analyse the case and propose a well-reasoned solution."}
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#B08D20]"
          >
            I have read the case — Begin Analysis
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </Card>
    </section>
  )
}

interface CardProps {
  eyebrow: string
  children: ReactNode
}

function Card({ eyebrow, children }: CardProps) {
  return (
    <article className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
        {eyebrow}
      </p>
      {children}
    </article>
  )
}

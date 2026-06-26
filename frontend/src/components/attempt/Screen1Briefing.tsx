import { ArrowRight, BriefcaseBusiness, Building2 } from "lucide-react"
import type { ReactNode } from "react"

interface Screen1BriefingProps {
  onNext: () => void
}

const caseDescription = `ABC Electronics, a mid-sized consumer electronics company, has seen a 25% revenue decline over the past two quarters in Southeast Asia. The company faces stiff competition from Chinese OEMs, a weakening distribution network, and shifting consumer preferences toward premium-segment products.

As the newly appointed Strategy Head, you have been tasked with developing a comprehensive market re-entry plan. You have access to financial reports, customer feedback data, and competitor analysis. The board expects a presentation in 45 minutes.`

const financialRows = [
  ["Revenue", "Q1: $42M", "Q2: $31.5M"],
  ["Gross margin", "34%", "27%"],
  ["Distributor coverage", "1,200 stores", "780 stores"],
]

const feedback = [
  "Premium buyers say ABC feels reliable but less aspirational than newer brands.",
  "Retail partners report slower replacement parts and lower sales support.",
  "Price-sensitive customers increasingly compare ABC against Chinese OEM bundles.",
]

const competitors = [
  "DragonTech: aggressive pricing and wide distributor incentives.",
  "NovaOne: premium positioning with influencer-led launches.",
  "Local OEMs: faster service turnaround in tier-2 cities.",
]

export default function Screen1Briefing({ onNext }: Screen1BriefingProps) {
  return (
    <section className="mx-auto max-w-[800px] space-y-5">
      <Card eyebrow="Role Assigned">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-xl bg-[#F6F7F9] text-[#0B1D3A]">
            <BriefcaseBusiness size={26} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[#0B1D3A]">You are the Strategy Head</h2>
            <p className="mt-1 text-sm font-medium text-[#6B7280]">ABC Electronics</p>
          </div>
        </div>
      </Card>

      <Card eyebrow="The Situation">
        <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">{caseDescription}</p>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#E6EBEB]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F6F7F9] text-[#111827]">
              <tr>
                <th className="px-4 py-3 font-semibold">Metric</th>
                <th className="px-4 py-3 font-semibold">Previous Quarter</th>
                <th className="px-4 py-3 font-semibold">Current Quarter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EBEB]">
              {financialRows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3 text-[#374151]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ReferenceList title="Customer Feedback" items={feedback} />
          <ReferenceList title="Competitor Overview" items={competitors} />
        </div>
      </Card>

      <Card eyebrow="Your Objective">
        <div className="flex gap-4">
          <Building2 className="mt-1 shrink-0 text-[#C9A227]" size={22} aria-hidden="true" />
          <p className="text-sm leading-7 text-[#374151]">
            Develop a comprehensive market re-entry plan for Southeast Asia. You have 45 minutes.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#B08D20]"
          >
            I have read the case - Begin Analysis
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

interface ReferenceListProps {
  title: string
  items: string[]
}

function ReferenceList({ title, items }: ReferenceListProps) {
  return (
    <div className="rounded-lg bg-[#F6F7F9] p-4">
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6B7280]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

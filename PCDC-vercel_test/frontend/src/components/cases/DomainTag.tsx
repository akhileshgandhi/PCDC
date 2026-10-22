export type CaseDomain =
  | "Geopolitics"
  | "Sports"
  | "Business"
  | "Social"
  | "Science"
  | "Technology"
  | "Environment"
  | "Healthcare"

interface DomainTagProps {
  domain: CaseDomain
}

const domainClasses: Record<CaseDomain, string> = {
  Geopolitics: "bg-[#0B1D3A] text-white",
  Sports: "bg-[#16A34A] text-white",
  Business: "bg-[#C9A227] text-[#111827]",
  Social: "bg-[#7C3AED] text-white",
  Science: "bg-[#2563EB] text-white",
  Technology: "bg-[#0F766E] text-white",
  Environment: "bg-[#059669] text-white",
  Healthcare: "bg-[#EF4444] text-white",
}

export default function DomainTag({ domain }: DomainTagProps) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${domainClasses[domain]}`}>
      {domain}
    </span>
  )
}

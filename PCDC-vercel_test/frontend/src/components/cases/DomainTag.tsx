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
  Geopolitics: "bg-[#0c1f3d] text-white",
  Sports: "bg-[#16A34A] text-white",
  Business: "bg-[#0891B2] text-white",
  Social: "bg-[#7C3AED] text-white",
  Science: "bg-[#2563EB] text-white",
  Technology: "bg-[#4F46E5] text-white",
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

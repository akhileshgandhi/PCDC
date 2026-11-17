import { useId } from "react"

const SIZES = {
  xs: { tile: 14, text: "text-[8px]", gap: "gap-0.5" },
  sm: { tile: 26, text: "text-[15px]", gap: "gap-1.5" },
  md: { tile: 46, text: "text-[26px]", gap: "gap-2" },
  lg: { tile: 64, text: "text-[36px]", gap: "gap-3" },
}

/** The Prestige mark: a gradient tile with a "P" and a few dots, then the name. */
export function PrestigeLogo({ size = "md", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  const gradient = useId()
  const { tile, text, gap } = SIZES[size]
  return (
    <span className={`inline-flex items-center ${gap} ${className}`} role="img" aria-label="Prestige">
      <svg width={tile} height={tile} viewBox="0 0 46 46" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#0c1f3d" />
          </linearGradient>
        </defs>
        <circle cx="5" cy="9" r="2.5" fill="#3b82f6" />
        <circle cx="11" cy="3.5" r="3" fill="#2563eb" />
        <circle cx="3.5" cy="17" r="2" fill="#2563eb" opacity="0.7" />
        <rect x="10" y="10" width="34" height="34" rx="8" fill={`url(#${gradient})`} />
        <text x="27" y="36" textAnchor="middle" fontSize="24" fontWeight="800" fill="#FFFFFF" fontFamily="inherit">
          P
        </text>
      </svg>
      <span className={`${text} font-bold leading-none tracking-tight text-[#111827]`} aria-hidden="true">
        Prestige
      </span>
    </span>
  )
}

/** The top of every memo: the logo, the word MEMO and a rule, like a company memo template. */
export default function MemoLetterhead() {
  return (
    <div className="select-none" aria-hidden="true">
      <div className="flex justify-end">
        <PrestigeLogo />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-wide text-[#0c1f3d]">MEMO</p>
      <div className="mt-3 h-0.5 bg-[#2563eb]" />
    </div>
  )
}

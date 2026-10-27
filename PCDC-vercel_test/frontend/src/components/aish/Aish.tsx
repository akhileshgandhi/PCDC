import { useId, type ReactNode } from "react"

// Aish is the single name/face of every AI touchpoint a student sees (Rapid
// Fire, AI Challenge, evaluation feedback, the AI Coaches). Use these pieces
// instead of labelling anything "AI" in the student portal.
export const AISH_NAME = "Aish"
export const AISH_GREETING = `Hi, I am ${AISH_NAME}!`

interface AishAvatarProps {
  size?: number
  className?: string
}

/** Aish's avatar: a friendly navy face with a gold ring and an AI sparkle. */
export function AishAvatar({ size = 40, className = "" }: AishAvatarProps) {
  const id = useId().replace(/:/g, "")
  const ring = `aish-ring-${id}`
  const face = `aish-face-${id}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={AISH_NAME}
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F3D46B" />
          <stop offset="100%" stopColor="#B08D20" />
        </linearGradient>
        <radialGradient id={face} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#1E3A66" />
          <stop offset="100%" stopColor="#0B1D3A" />
        </radialGradient>
      </defs>
      {/* Gold ring + navy face */}
      <circle cx="24" cy="24" r="23" fill={`url(#${ring})`} />
      <circle cx="24" cy="24" r="20" fill={`url(#${face})`} />
      {/* Eyes */}
      <ellipse cx="18" cy="22" rx="2.4" ry="3" fill="#FFFFFF" />
      <ellipse cx="30" cy="22" rx="2.4" ry="3" fill="#FFFFFF" />
      <circle cx="18.6" cy="22.6" r="1.1" fill="#0B1D3A" />
      <circle cx="30.6" cy="22.6" r="1.1" fill="#0B1D3A" />
      {/* Smile */}
      <path
        d="M17.5 29.5 Q24 35 30.5 29.5"
        fill="none"
        stroke="#F3D46B"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Cheeks */}
      <circle cx="14.5" cy="28" r="1.6" fill="#C9A227" opacity="0.45" />
      <circle cx="33.5" cy="28" r="1.6" fill="#C9A227" opacity="0.45" />
      {/* AI sparkle */}
      <path
        d="M37 6 L38.4 9.6 L42 11 L38.4 12.4 L37 16 L35.6 12.4 L32 11 L35.6 9.6 Z"
        fill="#FFFFFF"
        stroke="#C9A227"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface AishIntroProps {
  /** Text after "Hi, I am Aish!". */
  children: ReactNode
  /** Optional role shown under the name, e.g. "Your Leadership Coach". */
  role?: string
  size?: "sm" | "md"
  className?: string
}

/** A speech bubble from Aish that always opens with "Hi, I am Aish!". */
export function AishIntro({ children, role, size = "md", className = "" }: AishIntroProps) {
  const avatar = size === "sm" ? 32 : 44
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <AishAvatar size={avatar} />
      <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-[#F3E7BF] bg-[#FFFBEB] px-4 py-3">
        <p className="text-xs font-semibold text-[#92702A]">
          {AISH_NAME}
          {role ? <span className="font-medium text-[#B08D20]"> · {role}</span> : null}
        </p>
        <p className={`mt-1 leading-6 text-[#374151] ${size === "sm" ? "text-xs" : "text-sm"}`}>
          <span className="font-semibold text-[#0B1D3A]">{AISH_GREETING}</span> {children}
        </p>
      </div>
    </div>
  )
}

interface AishSaysProps {
  children: ReactNode
  className?: string
}

/** Inline AI-written text attributed to Aish (small avatar + "Aish says"). */
export function AishSays({ children, className = "" }: AishSaysProps) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <AishAvatar size={22} className="mt-0.5" />
      <div className="min-w-0 flex-1 text-sm leading-6 text-[#374151]">
        <span className="mr-1 font-semibold text-[#92702A]">{AISH_NAME}:</span>
        {children}
      </div>
    </div>
  )
}

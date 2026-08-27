import { Clock } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface CountdownTimerProps {
  seconds: number
  label?: string
  onExpire?: () => void
  // Keeps the tick/onExpire effects running without rendering the visible
  // clock — used when a screen still owns the expiry action but the visible
  // countdown is shown once, centrally, in the sticky header instead.
  hidden?: boolean
}

/**
 * Counts down from the given number of seconds (server-computed remaining time)
 * and fires onExpire once when it reaches zero. Turns amber under a minute and
 * red under 30 seconds.
 */
export default function CountdownTimer({
  seconds,
  label = "Time remaining",
  onExpire,
  hidden = false,
}: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.round(seconds)))
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  // Reset when the server-provided remaining time changes (e.g. a new phase, or
  // a resumed phase after refresh recomputed the remaining time).
  useEffect(() => {
    setSecondsLeft(Math.max(0, Math.round(seconds)))
    expiredRef.current = false
  }, [seconds])

  // Tick once per second.
  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft])

  // Fire onExpire exactly once when the clock hits zero.
  useEffect(() => {
    if (secondsLeft === 0 && !expiredRef.current) {
      expiredRef.current = true
      onExpireRef.current?.()
    }
  }, [secondsLeft])

  const mm = Math.floor(secondsLeft / 60)
  const ss = secondsLeft % 60
  const low = secondsLeft <= 30
  const warn = secondsLeft <= 60 && !low

  return (
    <div
      className={
        hidden
          ? "sr-only"
          : `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums ${
              low
                ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                : warn
                  ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                  : "border-[#E6EBEB] bg-white text-[#0B1D3A]"
            }`
      }
      role="timer"
      aria-live="off"
    >
      <Clock size={15} aria-hidden="true" />
      <span>
        {label}: {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </span>
    </div>
  )
}

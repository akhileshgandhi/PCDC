import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  /** Final value. A non-numeric value (e.g. "--", "6/10") is shown as-is,
   * with no animation. */
  value: number | string
  /** Shown while loading, in place of the number. */
  isLoading?: boolean
  duration?: number
}

const DEFAULT_DURATION_MS = 900

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/**
 * Counts up from 0 to `value` the first time it scrolls into view, instead
 * of just appearing. Falls back to showing the value immediately for
 * non-numeric values (e.g. "6/10", "--") or when already loading.
 */
export default function CountUp({ value, isLoading, duration = DEFAULT_DURATION_MS }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState<number | string>(typeof value === "number" ? 0 : value)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (typeof value !== "number" || isLoading) {
      setDisplay(value)
      return
    }
    const node = ref.current
    if (!node || hasAnimated.current) return

    if (typeof IntersectionObserver === "undefined") {
      hasAnimated.current = true
      setDisplay(value)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return
        hasAnimated.current = true
        observer.disconnect()

        const prefersReducedMotion =
          typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        if (prefersReducedMotion) {
          setDisplay(value)
          return
        }

        // `value` is narrowed to `number` above, but that narrowing doesn't
        // survive into this nested closure — capture it in a local that is.
        const target = value
        const start = performance.now()
        function tick(now: number) {
          const progress = Math.min(1, (now - start) / duration)
          setDisplay(Math.round(easeOutExpo(progress) * target))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.3 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [value, isLoading, duration])

  return <span ref={ref}>{isLoading ? "..." : display}</span>
}

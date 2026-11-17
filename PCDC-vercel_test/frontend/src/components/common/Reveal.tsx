import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

interface RevealProps {
  children: ReactNode
  /** Position in a row/grid of Reveals — staggers each one's entrance so a
   * row of cards animates in left-to-right/top-to-bottom instead of at once. */
  index?: number
  className?: string
}

const STEP_MS = 80
const MAX_DELAY_MS = 480

/**
 * Fades a card/section up into place the first time it scrolls into view,
 * staggered by `index`. Pure CSS animation triggered by IntersectionObserver
 * — no layout, data, or navigation behavior changes.
 */
export default function Reveal({ children, index = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const delay = Math.min(index * STEP_MS, MAX_DELAY_MS)

  return (
    <div
      ref={ref}
      className={`pcdc-reveal ${isVisible ? "pcdc-reveal-visible" : ""} ${className ?? ""}`}
      style={isVisible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

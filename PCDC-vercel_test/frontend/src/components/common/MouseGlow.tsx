import { useEffect, useRef } from "react"

const SIZE = 100
const EASE = 0.12

/**
 * A soft, blurred brand-blue circle that follows the cursor with a little
 * lag, app-wide. Purely decorative: fixed position, no pointer events, and
 * hidden for reduced-motion or touch-only devices (no cursor to follow).
 */
export default function MouseGlow() {
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const hasHoverCursor = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches
    if (prefersReducedMotion || !hasHoverCursor) return

    const node = dotRef.current
    if (!node) return

    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let currentX = targetX
    let currentY = targetY
    let rafId = 0
    let visible = false

    function onMouseMove(event: MouseEvent) {
      targetX = event.clientX
      targetY = event.clientY
      if (!visible && node) {
        visible = true
        node.style.opacity = "1"
      }
    }

    function tick() {
      currentX += (targetX - currentX) * EASE
      currentY += (targetY - currentY) * EASE
      if (node) {
        node.style.transform = `translate3d(${currentX - SIZE / 2}px, ${currentY - SIZE / 2}px, 0)`
      }
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener("mousemove", onMouseMove)
    rafId = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[1] rounded-full opacity-0 transition-opacity duration-500"
      style={{
        width: SIZE,
        height: SIZE,
        background:
          "radial-gradient(circle, rgba(37,99,235,0.16) 0%, rgba(59,130,246,0.08) 45%, transparent 72%)",
        filter: "blur(10px)",
      }}
    />
  )
}

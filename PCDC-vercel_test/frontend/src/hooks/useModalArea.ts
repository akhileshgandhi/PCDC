import { useEffect, useState } from "react"

/**
 * For modals that sit inside the visible content area (below the sticky
 * layout header). Returns the header's live bottom edge in px, so the modal
 * backdrop can start right under it even when the header wraps to two lines
 * (narrow window or browser zoom). Also locks page scroll while mounted, so
 * the list behind the modal does not scroll away.
 */
export function useModalArea(fallbackTop = 80) {
  const [top, setTop] = useState(fallbackTop)

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.sticky")
    function measure() {
      setTop(header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0)
    }
    measure()
    window.addEventListener("resize", measure)
    const observer = header && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    if (header) observer?.observe(header)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("resize", measure)
      observer?.disconnect()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return top
}

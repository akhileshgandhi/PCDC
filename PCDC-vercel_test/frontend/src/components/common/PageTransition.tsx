import type { ReactNode } from "react"
import { useLocation } from "react-router-dom"

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Fades/slides the page content in whenever the route changes, so opening a
 * tab in the sidebar always has the same gentle motion. Remounts the
 * animation via `key={pathname}` — no layout or data behavior changes.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="pcdc-page-transition">
      {children}
    </div>
  )
}

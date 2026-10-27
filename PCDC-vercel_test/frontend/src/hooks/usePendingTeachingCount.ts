import { useEffect, useState } from "react"

import { getPendingTeachingCount } from "../api/admin"

// How often admin screens re-check for new teaching-approval requests, so an
// admin is alerted within a minute without reloading the page.
export const ADMIN_ALERT_POLL_MS = 30_000

// Fired after an approve/reject/revoke so every badge updates immediately.
const CHANGED_EVENT = "pcdc:teaching-approvals-changed"

export function notifyTeachingApprovalsChanged() {
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

/** Calls `refresh` now (unless `immediate` is false), every
 * ADMIN_ALERT_POLL_MS, when the tab becomes visible again, and after any
 * approval decision. */
export function useAdminAlertRefresh(refresh: () => void, immediate = true) {
  useEffect(() => {
    if (immediate) refresh()
    const timer = window.setInterval(refresh, ADMIN_ALERT_POLL_MS)
    function onVisible() {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener(CHANGED_EVENT, refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener(CHANGED_EVENT, refresh)
    }
    // refresh is expected to be stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Live count of faculty teaching selections waiting for this admin's
 * approval (null until the first response). */
export function usePendingTeachingCount(): number | null {
  const [count, setCount] = useState<number | null>(null)
  useAdminAlertRefresh(() => {
    getPendingTeachingCount()
      .then((data) => setCount(data.pending))
      .catch(() => undefined)
  })
  return count
}

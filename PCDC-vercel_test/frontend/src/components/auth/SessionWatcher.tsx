import { Clock } from "lucide-react"
import { useEffect, useState } from "react"

import {
  IDLE_WARNING_MS,
  clearToken,
  expireSession,
  getToken,
  idleRemainingMs,
  isSessionExpired,
  markActivity,
} from "../../utils/auth"

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart"] as const
const CHECK_INTERVAL_MS = 1000
const PORTAL_PATH = /^\/(student|faculty|admin)(\/|$)/

// Ends the session after IDLE_TIMEOUT_MS (10 min) with no activity, or when
// the JWT itself expires, even if the user never clicks anything — the page
// then shows the "session expired" login and returns here after login. A
// minute before the idle logout it shows a countdown warning; any activity
// (or "Stay signed in") resets the timer. Activity is shared across tabs via
// localStorage, so working in one tab keeps the others signed in too.
export default function SessionWatcher() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    const onActivity = () => {
      if (getToken()) markActivity()
    }
    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, onActivity, { passive: true, capture: true }),
    )

    const check = () => {
      if (!PORTAL_PATH.test(window.location.pathname)) {
        setSecondsLeft(null)
        return
      }
      // Expired here, or the session was already ended in another tab.
      if (isSessionExpired() || !getToken()) {
        expireSession()
        return
      }
      const remaining = idleRemainingMs()
      setSecondsLeft(
        remaining !== null && remaining <= IDLE_WARNING_MS ? Math.ceil(remaining / 1000) : null,
      )
    }
    const interval = window.setInterval(check, CHECK_INTERVAL_MS)
    // Coming back to a tab that sat in the background (where timers are
    // throttled): check right away instead of waiting for the next tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") check()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      ACTIVITY_EVENTS.forEach((name) =>
        window.removeEventListener(name, onActivity, { capture: true }),
      )
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  if (secondsLeft === null) return null

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 px-4">
      <div
        role="alertdialog"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-body"
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <Clock size={22} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <h2 id="session-warning-title" className="text-base font-semibold text-slate-900">
              Are you still there?
            </h2>
            <p id="session-warning-body" className="mt-1 text-sm text-slate-600">
              You'll be logged out in{" "}
              <span className="font-semibold text-slate-900">{secondsLeft}s</span> due to
              inactivity. Save your work or stay signed in.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              clearToken()
              window.location.replace("/login")
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Log out now
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              markActivity(true)
              setSecondsLeft(null)
            }}
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}

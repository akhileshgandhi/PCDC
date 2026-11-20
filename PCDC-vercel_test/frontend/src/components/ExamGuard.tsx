import { AlertTriangle, AppWindow, Maximize, Puzzle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"

import { getUserRole } from "../utils/auth"
import type { FullscreenEvent, FullscreenStatus } from "../utils/studentGuard"
import { ALLOW_STUDENT_CLIPBOARD, hasExtensionTraces } from "../utils/studentGuard"

const SCAN_DELAY_MS = 300
const NOTICE_MS = 8000
// Shown before the server has answered; the server's max_exits wins after that.
const DEFAULT_MAX_EXITS = 3
// A focus loss shorter than this (a browser prompt flashing up) isn't a switch.
const SWITCH_DELAY_MS = 300

interface KeyboardLock {
  lock?: (keyCodes?: string[]) => Promise<void>
  unlock?: () => void
}

/** Watches the page for marks that browser extensions leave behind. */
function useExtensionDetected(active: boolean) {
  const [detected, setDetected] = useState(false)
  useEffect(() => {
    if (!active) return
    let timer = 0
    const scan = () => {
      if (hasExtensionTraces()) setDetected(true)
    }
    scan()
    // Extensions often inject a moment after the page loads, so keep watching.
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(scan, SCAN_DELAY_MS)
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-gramm", "data-gramm_editor", "src", "href"],
    })
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [active])
  return active && detected
}

interface ExamGuardProps {
  /** True while the attempt is open; the rules apply only then. */
  active: boolean
  /** Sends a full-screen enter/exit to the server, which counts exits and ends
   * the attempt on the last one. Leave out until the attempt id is known. */
  report?: (event: FullscreenEvent) => Promise<FullscreenStatus>
  /** Called once the server says the attempt has ended. */
  onEnded?: () => void
  /** "case study" or "simulation", used in the messages. */
  noun: string
  /** What happens to the attempt on the last exit, e.g. "be submitted". */
  endsWith: string
  /** Where the "ended" message's button goes, and its label. */
  exitTo: string
  exitLabel: string
}

/**
 * Exam-time guard for a student attempt page. While `active`:
 * - if a browser extension is detected, covers the page until the student
 *   turns extensions off and reloads;
 * - asks the student to stay in full screen and covers the page when they leave.
 *   Each exit is counted on the server; on the third the attempt ends and the
 *   student is told why. Reloading or leaving the page while in full screen
 *   counts as an exit too.
 * Off for staff and when the local testing switch VITE_ALLOW_STUDENT_CLIPBOARD is on.
 */
export default function ExamGuard({ active, report, onEnded, noun, endsWith, exitTo, exitLabel }: ExamGuardProps) {
  const navigate = useNavigate()
  const enabled = active && getUserRole() === "student" && !ALLOW_STUDENT_CLIPBOARD
  const extensionDetected = useExtensionDetected(enabled)
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement))
  const [status, setStatus] = useState<FullscreenStatus | null>(null)
  const [notice, setNotice] = useState("")
  const [switchedAway, setSwitchedAway] = useState(false)
  const switchedRef = useRef(false)
  useEffect(() => {
    switchedRef.current = switchedAway
  }, [switchedAway])

  // The fullscreenchange listener lives for the whole page, so it reads the
  // latest props through refs.
  const enabledRef = useRef(enabled)
  const reportRef = useRef(report)
  const onEndedRef = useRef(onEnded)
  useEffect(() => {
    enabledRef.current = enabled
    reportRef.current = report
    onEndedRef.current = onEnded
  })

  const send = useRef(async (event: FullscreenEvent) => {
    const sendReport = reportRef.current
    if (!enabledRef.current || !sendReport) return
    try {
      const result = await sendReport(event)
      setStatus(result)
      if (result.ended) {
        onEndedRef.current?.()
      } else if (event === "enter" && result.counted) {
        setNotice(
          `Leaving or reloading the page during the attempt counts as leaving full screen. ` +
            `You have used ${result.exits} of ${result.max_exits}.`,
        )
      }
    } catch {
      // A lost report only means this exit isn't counted; the attempt goes on.
    }
  }).current

  useEffect(() => {
    const onChange = () => {
      const now = Boolean(document.fullscreenElement)
      setIsFullscreen(now)
      if (now) setSwitchedAway(false)
      void send(now ? "enter" : "exit")
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [send])

  // Already in full screen when the attempt id arrives: tell the server.
  const canReport = enabled && Boolean(report)
  useEffect(() => {
    if (canReport && document.fullscreenElement) void send("enter")
  }, [canReport, send])

  // Keyboard Lock (Chrome and Edge, full screen only): the page receives
  // Alt+Tab, the Windows/Cmd key and similar shortcuts instead of the system,
  // so they can't switch windows. Esc must then be held to leave full screen.
  useEffect(() => {
    const keyboard = (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard
    if (!enabled || !isFullscreen || !keyboard?.lock) return
    void keyboard.lock().catch(() => undefined)
    return () => keyboard.unlock?.()
  }, [enabled, isFullscreen])

  // Alt and Tab do nothing during the attempt: no Alt shortcuts (Alt+Left goes
  // back, Alt alone opens the browser menu) and no moving focus with Tab.
  // AltGr stays, because some keyboards type characters such as ₹ or @ with it.
  useEffect(() => {
    if (!enabled) return
    const block = (event: KeyboardEvent) => {
      const altGr = event.getModifierState?.("AltGraph")
      const isAlt = (event.key === "Alt" || event.altKey) && !altGr
      if (event.key !== "Tab" && !isAlt) return
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener("keydown", block, true)
    window.addEventListener("keyup", block, true)
    return () => {
      window.removeEventListener("keydown", block, true)
      window.removeEventListener("keyup", block, true)
    }
  }, [enabled])

  // Switching to another window or app while in full screen (Alt+Tab where
  // Keyboard Lock isn't available, the Windows key, Ctrl+Alt+Del) counts as
  // leaving full screen.
  useEffect(() => {
    if (!enabled) return
    let timer = 0
    const check = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const away = document.visibilityState === "hidden" || !document.hasFocus()
        if (!away || !document.fullscreenElement || switchedRef.current) return
        switchedRef.current = true
        setSwitchedAway(true)
        void send("exit")
      }, SWITCH_DELAY_MS)
    }
    window.addEventListener("blur", check)
    document.addEventListener("visibilitychange", check)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("blur", check)
      document.removeEventListener("visibilitychange", check)
    }
  }, [enabled, send])

  // Leave full screen once the attempt ends (submitted or time up) or the page closes.
  useEffect(() => {
    if (!enabled) return
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    }
  }, [enabled])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(""), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (status?.ended) {
    return (
      <Cover>
        <AlertTriangle className="mx-auto text-[#B91C1C]" size={32} aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-[#111827]">Your {noun} has ended</h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          You left full screen {status.exits} times, which is the limit, so this {noun} has ended.
        </p>
        <button type="button" onClick={() => navigate(exitTo)} className={BUTTON}>
          {exitLabel}
        </button>
      </Cover>
    )
  }

  if (!enabled) return null

  if (extensionDetected) {
    return (
      <Cover>
        <Puzzle className="mx-auto text-[#B91C1C]" size={32} aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-[#111827]">Turn off browser extensions</h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          A browser extension (for example Grammarly, an AI helper or a password manager) is changing this page.
          Extensions aren&apos;t allowed during an attempt. Your work so far is saved.
        </p>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          Turn extensions off, or open the portal in an Incognito (Chrome) or InPrivate (Edge) window, where
          extensions are off by default. Then reload this page.
        </p>
        <button type="button" onClick={() => window.location.reload()} className={BUTTON}>
          Reload page
        </button>
      </Cover>
    )
  }

  const maxExits = status?.max_exits ?? DEFAULT_MAX_EXITS
  const exits = status?.exits ?? 0
  const left = maxExits - exits

  if (document.fullscreenEnabled && !isFullscreen) {
    return (
      <Cover>
        <Maximize className="mx-auto text-[#2563EB]" size={32} aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-[#111827]">
          {exits > 0 ? "You left full screen" : "Continue in full screen"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          This {noun} runs in full screen. You can leave full screen at most {maxExits} times; the{" "}
          {ordinal(maxExits)} time, your {noun} will {endsWith}. Switching to another window, reloading or
          leaving the page counts too.
        </p>
        {exits > 0 ? (
          <p className="mt-3 rounded-md bg-[#FFFBEB] px-3 py-2 text-sm font-semibold text-[#B45309]">
            Warning: you have left full screen {exits} of {maxExits} times.{" "}
            {left === 1 ? `Next time, your ${noun} will ${endsWith}.` : `${left} left.`}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void document.documentElement.requestFullscreen().catch(() => undefined)}
          className={BUTTON}
        >
          {exits > 0 ? "Go back to full screen" : "Enter full screen"}
        </button>
      </Cover>
    )
  }

  if (switchedAway) {
    return (
      <Cover>
        <AppWindow className="mx-auto text-[#B45309]" size={32} aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-[#111827]">You switched to another window</h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          Switching windows or apps during the {noun} counts as leaving full screen.
        </p>
        <p className="mt-3 rounded-md bg-[#FFFBEB] px-3 py-2 text-sm font-semibold text-[#B45309]">
          Warning: you have left full screen {exits} of {maxExits} times.{" "}
          {left === 1 ? `Next time, your ${noun} will ${endsWith}.` : `${left} left.`}
        </p>
        <button
          type="button"
          onClick={() => {
            setSwitchedAway(false)
            void send("enter")
          }}
          className={BUTTON}
        >
          Continue the {noun}
        </button>
      </Cover>
    )
  }

  return notice ? (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[100] w-[min(92vw,520px)] -translate-x-1/2 rounded-lg bg-[#B45309] px-4 py-3 text-sm font-medium text-white shadow-lg"
    >
      {notice}
    </div>
  ) : null
}

const BUTTON =
  "mt-5 rounded-md bg-[#0B1D3A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1B3452]"

function ordinal(n: number) {
  return ["", "1st", "2nd", "3rd"][n] ?? `${n}th`
}

function Cover({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#0B1D3A]/80 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl">{children}</div>
    </div>
  )
}

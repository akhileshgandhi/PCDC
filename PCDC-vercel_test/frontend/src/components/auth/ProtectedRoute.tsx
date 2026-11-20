import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"

import type { UserRole } from "../../types/user"
import {
  expireSession,
  getUserRole,
  isAuthenticated,
  isSessionExpired,
  mustChangePassword,
} from "../../utils/auth"
import { ALLOW_STUDENT_CLIPBOARD, BLOCKED_EVENT, BLOCKED_MESSAGES, installCopyGuard, installInputGuard } from "../../utils/studentGuard"

interface ProtectedRouteProps {
  allowedRole: UserRole | UserRole[]
  children: ReactNode
}

// Anti-cheating for students, everywhere in the student portal: no selecting
// or copying page text, no copy/cut/paste (answer boxes included), no
// right-click, printing or saving the page, and no text that browser
// extensions type or insert (see utils/studentGuard).
function useBlockClipboardForStudent(active: boolean) {
  useEffect(() => {
    if (!active) return
    const removeCopyGuard = installCopyGuard()
    const removeInputGuard = installInputGuard()
    return () => {
      removeCopyGuard()
      removeInputGuard()
    }
  }, [active])
}

const NOTICE_MS = 4000

/** A short notice after right-click, copy, paste or inserted text was blocked. */
function BlockedNotice() {
  const [message, setMessage] = useState("")
  useEffect(() => {
    let timer = 0
    const show = (event: Event) => {
      setMessage(event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : BLOCKED_MESSAGES.insert)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(""), NOTICE_MS)
    }
    window.addEventListener(BLOCKED_EVENT, show)
    return () => {
      window.removeEventListener(BLOCKED_EVENT, show)
      window.clearTimeout(timer)
    }
  }, [])
  if (!message) return null
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  )
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const role = getUserRole()
  // Testing escape hatch: VITE_ALLOW_STUDENT_CLIPBOARD=true in a local
  // .env.local re-enables copy/paste for students. Leave it unset everywhere
  // else so the anti-cheating block stays on.
  const guardStudent = role === "student" && !ALLOW_STUDENT_CLIPBOARD
  useBlockClipboardForStudent(guardStudent)

  // Had a session but it ran out (JWT expired or idle too long): show the
  // "session expired" login; logging back in lands on the portal dashboard.
  if (isSessionExpired()) {
    expireSession()
    return null
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  // First-time accounts (e.g. students created with their scholar number as the
  // password) must set a new password before reaching any portal.
  if (mustChangePassword()) {
    return <Navigate to="/change-password" replace />
  }

  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole]

  if (allowed.length > 0 && (!role || !allowed.includes(role))) {
    return <Navigate to="/unauthorized" replace />
  }

  return (
    <>
      {children}
      {guardStudent ? <BlockedNotice /> : null}
    </>
  )
}

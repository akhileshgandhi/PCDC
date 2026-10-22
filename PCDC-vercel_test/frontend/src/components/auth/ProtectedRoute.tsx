import type { ReactNode } from "react"
import { useEffect } from "react"
import { Navigate } from "react-router-dom"

import type { UserRole } from "../../types/user"
import { getUserRole, isAuthenticated, mustChangePassword } from "../../utils/auth"

interface ProtectedRouteProps {
  allowedRole: UserRole | UserRole[]
  children: ReactNode
}

// Anti-cheating: block copy/cut/paste and right-click for students,
// everywhere in the student portal (including their own answer text areas —
// paste is blocked with no exceptions), and disable text selection so
// there's nothing to copy in the first place.
function useBlockClipboardForStudent(active: boolean) {
  useEffect(() => {
    if (!active) return
    function blockEvent(event: ClipboardEvent | MouseEvent) {
      event.preventDefault()
    }
    document.addEventListener("copy", blockEvent)
    document.addEventListener("cut", blockEvent)
    document.addEventListener("paste", blockEvent)
    document.addEventListener("contextmenu", blockEvent)
    document.body.classList.add("select-none")
    return () => {
      document.removeEventListener("copy", blockEvent)
      document.removeEventListener("cut", blockEvent)
      document.removeEventListener("paste", blockEvent)
      document.removeEventListener("contextmenu", blockEvent)
      document.body.classList.remove("select-none")
    }
  }, [active])
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const role = getUserRole()
  useBlockClipboardForStudent(role === "student")

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

  return children
}

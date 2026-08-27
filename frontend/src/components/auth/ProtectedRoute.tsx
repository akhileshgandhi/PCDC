import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import type { UserRole } from "../../types/user"
import { getUserRole, isAuthenticated, mustChangePassword } from "../../utils/auth"

interface ProtectedRouteProps {
  allowedRole: UserRole | UserRole[]
  children: ReactNode
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  // First-time accounts (e.g. students created with their scholar number as the
  // password) must set a new password before reaching any portal.
  if (mustChangePassword()) {
    return <Navigate to="/change-password" replace />
  }

  const role = getUserRole()
  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole]

  if (allowed.length > 0 && (!role || !allowed.includes(role))) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import type { UserRole } from "../../types/user"
import { getUserRole, isAuthenticated } from "../../utils/auth"

interface ProtectedRouteProps {
  allowedRole: UserRole
  children: ReactNode
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const role = getUserRole()

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

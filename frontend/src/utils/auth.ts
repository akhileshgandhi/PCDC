import type { UserRole } from "../types/user"

const TOKEN_KEY = "pcdc_token"

const PORTAL_PATHS: Partial<Record<UserRole, string>> = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  admin: "/admin/dashboard",
}

export interface JwtPayload {
  sub?: string
  name?: string
  email?: string
  exp?: number
  role?: UserRole
  must_change?: boolean
  [key: string]: unknown
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function decodeToken(token: string): JwtPayload | null {
  const payload = token.split(".")[1]

  if (!payload) {
    return null
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/")
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    )
    return JSON.parse(window.atob(paddedPayload)) as JwtPayload
  } catch {
    return null
  }
}

export const decodeJwtPayload = decodeToken

export function getUserRole() {
  return getCurrentUser()?.role ?? null
}

export function getCurrentUser() {
  const token = getToken()

  if (!token) {
    return null
  }

  return decodeToken(token)
}

export function isTokenExpired() {
  const payload = getCurrentUser()

  if (!payload?.exp) {
    return true
  }

  return Date.now() / 1000 > payload.exp
}

export function isAuthenticated() {
  return Boolean(getToken()) && !isTokenExpired()
}

export function portalPathForRole(role?: UserRole) {
  return role ? PORTAL_PATHS[role] : undefined
}

export function mustChangePassword() {
  return Boolean(getCurrentUser()?.must_change)
}

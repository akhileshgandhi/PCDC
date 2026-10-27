import type { UserRole } from "../types/user"

const TOKEN_KEY = "pcdc_token"

const PORTAL_PATHS: Partial<Record<UserRole, string>> = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  admin: "/admin/dashboard",
  superadmin: "/admin/dashboard",
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
  markActivity(true)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LAST_ACTIVITY_KEY)
}

// ---------------------------------------------------------------------------
// Session expiry: idle timeout + "return to the page you were on" after login
// ---------------------------------------------------------------------------

/** Log the user out after this long with no mouse/keyboard/touch/scroll activity. */
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000

/** Show the "you'll be logged out" warning this long before the idle logout. */
export const IDLE_WARNING_MS = 60 * 1000
// Kept in localStorage so activity in any open tab keeps every tab alive.
const LAST_ACTIVITY_KEY = "pcdc_last_activity"
// Per tab, so each tab returns to its own page.
const RETURN_TO_KEY = "pcdc_return_to"
export const SESSION_EXPIRED_REASON = "expired"

let lastActivityWrite = 0
let isExpiring = false

/** Record user activity. Throttled so a moving mouse doesn't hammer localStorage. */
export function markActivity(force = false) {
  const now = Date.now()
  if (!force && now - lastActivityWrite < 5000) return
  lastActivityWrite = now
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
}

/** Milliseconds until the idle logout (null if no activity has been recorded yet). */
export function idleRemainingMs() {
  const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY))
  // No timestamp (e.g. token from before this feature) counts as active now.
  if (!last) return null
  return IDLE_TIMEOUT_MS - (Date.now() - last)
}

export function isIdleExpired() {
  const remaining = idleRemainingMs()
  return remaining !== null && remaining <= 0
}

/** A token exists but the session is over (JWT expired or idle too long). */
export function isSessionExpired() {
  return Boolean(getToken()) && (isTokenExpired() || isIdleExpired())
}

/**
 * End the session and land on the login screen with a "session expired"
 * message, remembering `returnTo` (default: the current page) so login can
 * send the user straight back. Safe to call repeatedly — only the first call
 * in a page load acts.
 */
export function expireSession(returnTo?: string) {
  if (isExpiring) return
  isExpiring = true
  const path = returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (isSafeReturnPath(path)) {
    sessionStorage.setItem(RETURN_TO_KEY, path)
  }
  clearToken()
  window.location.replace(`/login?reason=${SESSION_EXPIRED_REASON}`)
}

function isSafeReturnPath(path: string) {
  // Internal paths only (no "//evil.com"), and never back to an auth page.
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !/^\/(login|register|set-password|change-password|forgot-password|unauthorized)\b/.test(path)
  )
}

function roleCanOpen(role: UserRole | undefined, path: string) {
  if (!role) return false
  if (path.startsWith("/student")) return role === "student"
  if (path.startsWith("/faculty")) return role === "faculty" || isAdminRole(role)
  if (path.startsWith("/admin")) return isAdminRole(role)
  return true
}

/** The saved page, if it is still valid for this role. Does not clear it. */
export function peekReturnPath(role?: UserRole) {
  const path = sessionStorage.getItem(RETURN_TO_KEY)
  if (!path || !isSafeReturnPath(path) || !roleCanOpen(role, path)) return null
  return path
}

/** Where to go after login: the saved page (consumed), else the role's portal. */
export function takePostLoginPath(role?: UserRole) {
  const path = peekReturnPath(role)
  sessionStorage.removeItem(RETURN_TO_KEY)
  return path ?? portalPathForRole(role)
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
  return Boolean(getToken()) && !isTokenExpired() && !isIdleExpired()
}

export function portalPathForRole(role?: UserRole) {
  return role ? PORTAL_PATHS[role] : undefined
}

export function mustChangePassword() {
  return Boolean(getCurrentUser()?.must_change)
}

/** Admin portal access: institute admins and the Central Admin (superadmin). */
export function isAdminRole(role?: UserRole | null) {
  return role === "admin" || role === "superadmin"
}

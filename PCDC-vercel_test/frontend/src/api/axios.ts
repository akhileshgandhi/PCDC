import axios from "axios"

import { expireSession } from "../utils/auth"

// Local Vite dev talks to the backend on :8000. When deployed (e.g. Vercel),
// the API is same-origin under /api/v1. VITE_API_URL overrides both.
// Detected via Vite's own DEV flag rather than a hardcoded port — Vite
// silently falls back to 5174/5175/... whenever 5173 is already taken (e.g.
// by another dev server on the same machine), and a port-based check missed
// that entirely, silently pointing the app at a same-origin "/api/v1" that
// doesn't exist in dev and breaking every API call including login.
const isViteDev = import.meta.env.DEV
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (isViteDev
      ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
      : "/api/v1"),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pcdc_token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// A 401 on an authenticated request means the token is no longer valid
// (expired or revoked): end the session and send the user to login, which
// brings them back to this page afterwards. Login's own 401 (wrong password)
// is left alone so the form can show its error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(error?.config?.headers?.Authorization)
    const isLoginCall = String(error?.config?.url ?? "").includes("/auth/login")
    if (error?.response?.status === 401 && hadToken && !isLoginCall) {
      expireSession()
    }
    return Promise.reject(error)
  },
)

export default api

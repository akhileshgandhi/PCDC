import axios from "axios"

// Local Vite dev (port 5173) talks to the backend on :8000. When deployed
// (e.g. Vercel), the API is same-origin under /api/v1. VITE_API_URL overrides both.
const isViteDev = window.location.port === "5173"
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

export default api

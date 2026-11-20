import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"

// Pages are code-split. After a new deploy, a tab opened on the old build can ask
// for a chunk that no longer exists; reload once to pick up the new build.
// At most one reload per 10 seconds, so a genuinely missing file can't loop.
window.addEventListener("vite:preloadError", (event) => {
  const key = "pcdc:chunk-reload-at"
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0)
    if (Date.now() - last < 10_000) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    return // storage blocked: can't guard against a loop, so don't auto-reload
  }
  event.preventDefault()
  window.location.reload()
})

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

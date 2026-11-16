import { CheckCircle2, X, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

type ToastVariant = "success" | "error"

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

const EVENT_NAME = "pcdc:toast"
const AUTO_DISMISS_MS = 4000
let nextId = 1

/** Fire a floating, auto-dismissing notification in the top-right corner —
 * for a one-off confirmation like "Simulation created successfully", as
 * opposed to an inline page banner. Works from anywhere; <ToastHost /> (one
 * instance, mounted once in App.tsx) renders whatever this dispatches. */
export function showToast(message: string, variant: ToastVariant = "success") {
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT_NAME, { detail: { id: nextId++, message, variant } }))
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function onToast(event: Event) {
      const toast = (event as CustomEvent<ToastItem>).detail
      setToasts((current) => [...current, toast])
      window.setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== toast.id))
      }, AUTO_DISMISS_MS)
    }
    window.addEventListener(EVENT_NAME, onToast)
    return () => window.removeEventListener(EVENT_NAME, onToast)
  }, [])

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.variant === "success"
              ? "border-[#a6f4c5] bg-[#ecfdf3] text-[#067647]"
              : "border-[#fecaca] bg-[#fef2f2] text-[#b42318]"
          }`}
        >
          {toast.variant === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
            aria-label="Dismiss"
            className="shrink-0 opacity-60 transition hover:opacity-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

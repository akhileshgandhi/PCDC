import { Loader2 } from "lucide-react"

/** Shown while a lazily loaded page's code is downloading (first visit only). */
export default function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F6F7F9]" role="status" aria-live="polite">
      <Loader2 className="animate-spin text-[#6B7280]" size={28} aria-label="Loading" />
    </div>
  )
}

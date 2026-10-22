import { LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { clearToken, getCurrentUser } from "../../utils/auth"

interface PortalPlaceholderProps {
  role: string
}

export default function PortalPlaceholder({ role }: PortalPlaceholderProps) {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const displayName = currentUser?.name ?? currentUser?.email ?? "PCDC User"

  function handleLogout() {
    clearToken()
    navigate("/login", { replace: true })
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F6F7F9] px-4 text-[#111827]">
      <section className="w-full max-w-lg rounded-xl border border-[#E6EBEB] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
          {role} Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#0B1D3A]">
          {role} Portal - Coming Soon
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#6B7280]">
          Signed in as <span className="font-semibold text-[#111827]">{displayName}</span>
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-[#0B1D3A] px-5 py-3 text-sm font-semibold text-[#0B1D3A] transition hover:bg-[#0B1D3A] hover:text-white"
        >
          <LogOut size={16} aria-hidden="true" />
          Log Out
        </button>
      </section>
    </main>
  )
}

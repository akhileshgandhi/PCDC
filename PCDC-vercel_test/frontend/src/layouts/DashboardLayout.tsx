import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Compass,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  TrendingUp,
  Trophy,
  UserCircle,
} from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"

import ChangePasswordModal from "../components/ChangePasswordModal"
import PageTransition from "../components/common/PageTransition"
import { useNewAssignmentsCount } from "../hooks/useNewAssignmentsCount"
import { clearToken, getCurrentUser } from "../utils/auth"

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  admin: "Admin",
}

// Red count of newly assigned case studies / simulations (same look as the
// faculty "sent back" badge).
function NewAssignmentBadge({ count }: { count: number }) {
  return (
    <span
      className="grid min-w-5 place-items-center rounded-full bg-[#d92d20] px-1.5 text-[10px] font-bold leading-5 text-white"
      aria-label={`${count} new ${count === 1 ? "assignment" : "assignments"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

function roleLabel(role: string | undefined): string {
  if (!role) return "Student"
  return ROLE_LABELS[role] ?? role
}

function userInitials(name: string | undefined): string {
  if (!name) return "PC"
  const parts = name.split(" ").filter(Boolean)
  if (parts.length === 0) return "PC"
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const navigationItems = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/student/dashboard", end: true },
    { label: "My Case Studies", icon: BookOpen, to: "/student/case-studies" },
    { label: "My Simulations", icon: BriefcaseBusiness, to: "/student/simulations" },
    { label: "Capability Profile", icon: TrendingUp, to: "/student/capability-profile" },
    { label: "Aish Coaches", icon: MessageSquare, to: "/student/ai-coach" },
    { label: "Achievements", icon: Trophy, to: "/student/achievements" },
    { label: "Career Pathway", icon: Compass, to: "/student/career-pathway" },
  ]

  const newAssignments = useNewAssignmentsCount()
  const pendingByPath: Record<string, number> = {
    "/student/case-studies": newAssignments.case_studies,
    "/student/simulations": newAssignments.simulations,
  }

  useEffect(() => {
    if (!isMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMenuOpen])

  function handleLogout() {
    clearToken()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#111827]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-[#0c1f3d] p-6 text-white lg:block">
        <div className="border-b border-white/10 pb-6">
          <div className="text-xl font-semibold leading-tight">Student Portal</div>
          <p className="mt-1 text-xs text-white/70">PCDC Case Studio</p>
        </div>

        <nav className="mt-7 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-[#2563eb] text-white shadow-md"
                      : "text-white/85 hover:bg-[#16305a]"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {(pendingByPath[item.to] ?? 0) > 0 ? (
                  <NewAssignmentBadge count={pendingByPath[item.to]} />
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 space-y-5">
          <div className="space-y-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 text-sm font-semibold text-white/80 transition hover:text-white"
            >
              <LogOut size={17} aria-hidden="true" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-[#e6e8eb] bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="mx-auto flex min-h-20 max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-[#111827] sm:text-2xl">
                PCDC Student Portal
              </h1>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                aria-label="Profile menu"
                className="flex items-center gap-3 rounded-lg border border-[#e6e8eb] bg-white px-2 py-2 transition hover:border-[#2563eb]"
              >
                <div className="grid size-10 place-items-center rounded-lg bg-[#0c1f3d] text-sm font-semibold text-white">
                  {userInitials(currentUser?.name)}
                </div>
                <div className="hidden min-w-36 text-left sm:block">
                  <p className="truncate text-sm font-semibold text-[#111827]">
                    {currentUser?.name ?? "PCDC User"}
                  </p>
                  <p className="truncate text-xs text-[#6b7280]">{roleLabel(currentUser?.role)}</p>
                </div>
              </button>

              {isMenuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-[#e6e8eb] bg-white shadow-xl shadow-slate-900/10">
                  <div className="border-b border-[#eef2f7] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[#111827]">
                      {currentUser?.name ?? "PCDC User"}
                    </p>
                    <p className="truncate text-xs text-[#6b7280]">
                      {currentUser?.email ?? roleLabel(currentUser?.role)}
                    </p>
                  </div>
                  <div className="py-1">
                    <NavLink
                      to="/student/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#111827] transition hover:bg-[#f6f7fb]"
                    >
                      <UserCircle size={16} aria-hidden="true" />
                      My profile
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        setIsChangingPassword(true)
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#111827] transition hover:bg-[#f6f7fb]"
                    >
                      <KeyRound size={16} aria-hidden="true" />
                      Change password
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#b42318] transition hover:bg-[#fff5f5]"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      Log out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {isChangingPassword ? <ChangePasswordModal onClose={() => setIsChangingPassword(false)} /> : null}

        <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
          <div className="lg:hidden">
            <div className="mb-4 flex items-center justify-between rounded-lg bg-[#0c1f3d] px-4 py-3 text-white">
              <span className="font-semibold">PCDC</span>
              <CalendarDays size={18} aria-hidden="true" />
            </div>
          </div>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}

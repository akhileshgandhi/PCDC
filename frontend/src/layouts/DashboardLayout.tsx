import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import {
  Bell,
  BookOpen,
  CalendarDays,
  CircleHelp,
  Compass,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  TrendingUp,
  Trophy,
  UserCircle,
} from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"

import { clearToken, getCurrentUser } from "../utils/auth"

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  admin: "Admin",
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
  const menuRef = useRef<HTMLDivElement>(null)

  const navigationItems = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/student/dashboard", end: true },
    { label: "My Case Studies", icon: BookOpen, to: "/student/case-studies" },
    { label: "Capability Profile", icon: TrendingUp, to: "/student/capability-profile" },
    { label: "AI Coaches", icon: MessageSquare, to: "/student/ai-coach" },
    { label: "Achievements", icon: Trophy, to: "/student/achievements" },
    { label: "Career Pathway", icon: Compass, to: "/student/career-pathway" },
  ]

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
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-[#081d3a] p-5 text-white lg:block">
        <div className="border-b border-white/10 pb-6">
          <div className="text-xl font-semibold leading-tight">
            Executive
            <br />
            Education
          </div>
          <p className="mt-1 text-xs text-white/70">Prestige Capability Development</p>
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
                  `flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-[#c9a227] text-[#081d3a] shadow-md"
                      : "text-white/85 hover:bg-[#122a54]"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 space-y-5">
          <div className="space-y-3 border-t border-white/10 pt-5">
            <button type="button" className="flex items-center gap-3 text-sm text-white/80">
              <Settings size={17} aria-hidden="true" />
              <span>Settings</span>
            </button>
            <button type="button" className="flex items-center gap-3 text-sm text-white/80">
              <MessageSquare size={17} aria-hidden="true" />
              <span>Support</span>
            </button>
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
        <header className="sticky top-0 z-10 border-b border-[#e6e8eb] bg-white">
          <div className="mx-auto flex min-h-20 max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-[#111827] sm:text-2xl">
                PCDC Executive Portal
              </h1>
            </div>

            <label className="hidden w-full max-w-xs items-center gap-3 rounded-md border border-[#e6e8eb] bg-[#f6f7fb] px-3 py-2 text-sm text-[#6b7280] md:flex">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search insights</span>
              <input
                type="search"
                placeholder="Search insights..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#6b7280]"
              />
            </label>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                className="grid size-9 place-items-center rounded-md border border-transparent text-[#111827] transition hover:border-[#e6e8eb] hover:bg-[#f6f7fb]"
                aria-label="Notifications"
              >
                <Bell size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-md border border-transparent text-[#111827] transition hover:border-[#e6e8eb] hover:bg-[#f6f7fb]"
                aria-label="Help"
              >
                <CircleHelp size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                className="flex items-center gap-3 rounded-md border border-[#e6e8eb] bg-white px-2 py-2 transition hover:border-[#c9a227]"
              >
                <div className="grid size-10 place-items-center rounded-md bg-[#081d3a] text-sm font-semibold text-white">
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
                <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-md border border-[#e6e8eb] bg-white py-2 shadow-lg">
                  <div className="flex items-center gap-3 px-4 pb-2">
                    <div className="grid size-9 place-items-center rounded-md bg-[#081d3a] text-xs font-semibold text-white">
                      {userInitials(currentUser?.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">
                        {currentUser?.name ?? "PCDC User"}
                      </p>
                      <p className="truncate text-xs text-[#6b7280]">{roleLabel(currentUser?.role)}</p>
                    </div>
                  </div>
                  <div className="my-2 border-t border-[#e6e8eb]" />
                  <NavLink
                    to="/student/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#f6f7fb]"
                  >
                    <UserCircle size={17} aria-hidden="true" />
                    My Profile
                  </NavLink>
                  <NavLink
                    to="/student/career-pathway"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#f6f7fb]"
                  >
                    <Compass size={17} aria-hidden="true" />
                    Career Pathway
                  </NavLink>
                  <div className="my-2 border-t border-[#e6e8eb]" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-[#111827] hover:bg-[#f6f7fb]"
                  >
                    <LogOut size={17} aria-hidden="true" />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6">
          <div className="lg:hidden">
            <div className="mb-4 flex items-center justify-between rounded-md bg-[#081d3a] px-4 py-3 text-white">
              <span className="font-semibold">PCDC</span>
              <CalendarDays size={18} aria-hidden="true" />
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

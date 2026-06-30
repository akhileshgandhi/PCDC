import type { ReactNode } from "react"
import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  PenTool,
  Search,
  Settings,
  SlidersHorizontal,
  UserCircle,
  Users,
} from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"

import { clearToken, getCurrentUser } from "../utils/auth"

interface FacultyLayoutProps {
  children: ReactNode
}

const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/faculty/dashboard", end: true },
  { label: "Case Library", icon: BookOpen, to: "/faculty/case-library" },
  { label: "Case Builder", icon: PenTool, to: "/faculty/case-builder" },
  { label: "Rubric Builder", icon: SlidersHorizontal, to: "/faculty/rubric-builder" },
  { label: "Students", icon: Users, to: "/faculty/students" },
  { label: "Analytics", icon: BarChart3, to: "/faculty/analytics" },
  { label: "Reports", icon: FileBarChart, to: "/faculty/reports" },
]

export default function FacultyLayout({ children }: FacultyLayoutProps) {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const displayName = currentUser?.name ?? "Faculty"
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  function handleLogout() {
    clearToken()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#111827]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-[#0b1d3a] p-5 text-white lg:block">
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-[#c9a227] text-[#0b1d3a]">
              <FolderKanban size={21} aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">Faculty Portal</div>
              <p className="mt-1 text-xs text-white/70">PCDC Case Studio</p>
            </div>
          </div>
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
                      ? "bg-[#c9a227] text-[#0b1d3a] shadow-md"
                      : "text-white/85 hover:bg-[#17315c]"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 space-y-3 border-t border-white/10 pt-5">
          <button type="button" className="flex items-center gap-3 text-sm text-white/80">
            <Settings size={17} aria-hidden="true" />
            <span>Settings</span>
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
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-[#e6e8eb] bg-white">
          <div className="mx-auto flex min-h-20 max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-[#111827] sm:text-2xl">
                Faculty Portal
              </h1>
              <p className="mt-1 hidden text-sm text-[#6b7280] sm:block">
                Create cases, review progress, and monitor cohort capability signals.
              </p>
            </div>

            <label className="hidden w-full max-w-xs items-center gap-3 rounded-md border border-[#e6e8eb] bg-[#f6f7fb] px-3 py-2 text-sm text-[#6b7280] md:flex">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search faculty workspace</span>
              <input
                type="search"
                placeholder="Search cases, students..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#6b7280]"
              />
            </label>

            <button
              type="button"
              className="hidden size-9 place-items-center rounded-md text-[#111827] transition hover:bg-[#f6f7fb] sm:grid"
              aria-label="Notifications"
            >
              <Bell size={18} aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3 rounded-md border border-[#e6e8eb] bg-white px-2 py-2">
              <div className="grid size-10 place-items-center rounded-md bg-[#0b1d3a] text-sm font-semibold text-white">
                {initials || <UserCircle size={24} aria-hidden="true" />}
              </div>
              <div className="hidden min-w-32 sm:block">
                <p className="truncate text-sm font-semibold text-[#111827]">{displayName}</p>
                <p className="truncate text-xs text-[#6b7280]">Faculty</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6">
          <div className="mb-4 grid gap-2 lg:hidden">
            <div className="flex items-center justify-between rounded-md bg-[#0b1d3a] px-4 py-3 text-white">
              <span className="font-semibold">Faculty Portal</span>
              <ClipboardList size={18} aria-hidden="true" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${
                      isActive
                        ? "bg-[#0b1d3a] text-white"
                        : "border border-[#e6e8eb] bg-white text-[#111827]"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

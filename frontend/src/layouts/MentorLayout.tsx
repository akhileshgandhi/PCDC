import type { ReactNode } from "react"
import {
  AlertTriangle,
  Brain,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Search,
  UserCircle,
  Users,
} from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"

import { clearToken, getCurrentUser } from "../utils/auth"

interface MentorLayoutProps {
  children: ReactNode
}

const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/mentor/dashboard", end: true },
  { label: "Students", icon: Users, to: "/mentor/students" },
  { label: "Thinking Path", icon: Brain, to: "/mentor/thinking-path" },
  { label: "Interventions", icon: ClipboardList, to: "/mentor/interventions" },
  { label: "Sessions", icon: CalendarDays, to: "/mentor/sessions" },
  { label: "Alerts", icon: AlertTriangle, to: "/mentor/alerts" },
]

export default function MentorLayout({ children }: MentorLayoutProps) {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const displayName = currentUser?.name ?? "Mentor"
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
    <div className="min-h-screen bg-[#f6f7f4] text-[#1c2420]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-[#17382f] p-5 text-white lg:block">
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-[#f3c95b] text-[#17382f]">
              <Brain size={21} aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">Mentor Portal</div>
              <p className="mt-1 text-xs text-white/70">Student Intervention</p>
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
                  `flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#f3c95b] text-[#17382f] shadow-md"
                      : "text-white/85 hover:bg-[#245848]"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 border-t border-white/10 pt-5">
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
        <header className="sticky top-0 z-10 border-b border-[#dfe5dd] bg-white">
          <div className="mx-auto flex min-h-20 max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-[#1c2420] sm:text-2xl">
                Mentor Portal
              </h1>
              <p className="mt-1 hidden text-sm text-[#617069] sm:block">
                Watch trends, review thinking, and intervene early.
              </p>
            </div>

            <label className="hidden w-full max-w-xs items-center gap-3 rounded-md border border-[#dfe5dd] bg-[#f6f7f4] px-3 py-2 text-sm text-[#617069] md:flex">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search mentor workspace</span>
              <input
                type="search"
                placeholder="Search students..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#617069]"
              />
            </label>

            <div className="flex items-center gap-3 rounded-md border border-[#dfe5dd] bg-white px-2 py-2">
              <div className="grid size-10 place-items-center rounded-md bg-[#17382f] text-sm font-semibold text-white">
                {initials || <UserCircle size={24} aria-hidden="true" />}
              </div>
              <div className="hidden min-w-32 sm:block">
                <p className="truncate text-sm font-semibold text-[#1c2420]">{displayName}</p>
                <p className="truncate text-xs text-[#617069]">Mentor</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6">
          <div className="mb-4 grid gap-2 lg:hidden">
            <div className="flex items-center justify-between rounded-md bg-[#17382f] px-4 py-3 text-white">
              <span className="font-semibold">Mentor Portal</span>
              <Brain size={18} aria-hidden="true" />
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
                        ? "bg-[#17382f] text-white"
                        : "border border-[#dfe5dd] bg-white text-[#1c2420]"
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

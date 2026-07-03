import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Compass,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  TrendingUp,
  Trophy,
  UserCheck,
  UserCircle,
} from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"

import { getStudentProfile, type StudentProfile } from "../api/student"
import { clearToken, getCurrentUser } from "../utils/auth"

interface DashboardLayoutProps {
  children: ReactNode
}

const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/student/dashboard", end: true },
  { label: "My Case Studies", icon: BookOpen, to: "/student/case-studies" },
  { label: "Active Attempt", icon: ClipboardList, to: "/student/case-studies/1/attempt" },
  { label: "Capability Profile", icon: TrendingUp, to: "/student/capability-profile" },
  { label: "AI Coaches", icon: MessageSquare, to: "/student/ai-coach" },
  { label: "Achievements", icon: Trophy, to: "/student/achievements" },
  { label: "Career Pathway", icon: Compass, to: "/student/career-pathway" },
  { label: "Mentor Support", icon: UserCheck, to: "/student/mentor-support" },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const [profile, setProfile] = useState<StudentProfile | null>(null)

  useEffect(() => {
    let isMounted = true
    getStudentProfile()
      .then((data) => {
        if (isMounted) setProfile(data)
      })
      .catch(() => {
        if (isMounted) setProfile(null)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const identitySubtitle = profile?.career_track_name
    ? `Career Track: ${profile.career_track_name}`
    : profile?.course_name || null

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
          <NavLink
            to="/student/mentor-support"
            className="flex w-full items-center justify-between rounded-md bg-[#c9a227] px-4 py-3 text-sm font-semibold text-[#081d3a] shadow-md"
          >
            <span>Schedule Mentor</span>
            <ChevronRight size={17} aria-hidden="true" />
          </NavLink>

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

            <div className="flex items-center gap-3 rounded-md border border-[#e6e8eb] bg-white px-2 py-2">
              <div className="grid size-10 place-items-center rounded-md bg-[#081d3a] text-white">
                <UserCircle size={24} aria-hidden="true" />
              </div>
              <div className="hidden min-w-36 sm:block">
                <p className="truncate text-sm font-semibold text-[#111827]">
                  {currentUser?.name ?? "PCDC User"}
                  {profile?.course_name ? `, ${profile.course_name}` : ""}
                </p>
                {identitySubtitle ? (
                  <p className="truncate text-xs text-[#6b7280]">{identitySubtitle}</p>
                ) : null}
              </div>
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

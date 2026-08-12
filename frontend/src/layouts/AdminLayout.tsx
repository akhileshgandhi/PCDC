import type { ReactNode } from "react"
import { useState } from "react"
import {
  Bell,
  BookMarked,
  CalendarRange,
  ChevronDown,
  Database,
  FileUp,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Rows3,
  Search,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

import { clearToken, getCurrentUser } from "../utils/auth"

interface AdminLayoutProps {
  children: ReactNode
}

const dashboardItem = {
  label: "Dashboard",
  icon: LayoutDashboard,
  to: "/admin/dashboard",
  end: true,
}

interface NavGroup {
  label: string
  icon: typeof Users
  items: Array<{ label: string; to: string; icon: typeof Users }>
}

const navGroups: NavGroup[] = [
  {
    label: "Academic Setup",
    icon: Library,
    items: [
      { label: "Institutions", to: "/admin/academic/institutions", icon: Library },
      { label: "Departments", to: "/admin/academic/departments", icon: Library },
      { label: "Courses", to: "/admin/academic/courses", icon: GraduationCap },
      { label: "Batches", to: "/admin/academic/batches", icon: Layers },
      { label: "Semesters", to: "/admin/academic/semesters", icon: CalendarRange },
      { label: "Sections", to: "/admin/academic/sections", icon: Rows3 },
      { label: "Subjects", to: "/admin/academic/subjects", icon: BookMarked },
    ],
  },
  {
    label: "People",
    icon: Users,
    items: [
      { label: "Faculty", to: "/admin/people/faculty", icon: Users },
      { label: "Students", to: "/admin/people/students", icon: GraduationCap },
      { label: "Teaching Approvals", to: "/admin/people/teaching-approvals", icon: Users },
      { label: "All Users", to: "/admin/users", icon: Users },
    ],
  },
  {
    label: "System",
    icon: Settings,
    items: [
      { label: "Case Import", to: "/admin/case-import", icon: FileUp },
      { label: "Settings", to: "/admin/settings", icon: Settings },
      { label: "Notifications", to: "/admin/notifications", icon: Bell },
    ],
  },
]

const mobileItems = [
  dashboardItem,
  ...navGroups.flatMap((group) => group.items),
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = getCurrentUser()
  const displayName = currentUser?.name ?? "Admin"
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  // Groups start expanded when the current route lives inside them.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const open = new Set<string>()
    for (const group of navGroups) {
      if (group.items.some((item) => location.pathname.startsWith(item.to))) {
        open.add(group.label)
      }
    }
    if (open.size === 0) open.add("Academic Setup")
    return open
  })

  function toggleGroup(label: string) {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function handleLogout() {
    clearToken()
    navigate("/login", { replace: true })
  }

  const navLinkClass = (compact = false) =>
    ({ isActive }: { isActive: boolean }) =>
      `flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-sm font-medium transition ${
        compact ? "pl-11" : ""
      } ${
        isActive
          ? "bg-[#34c6a3] text-[#102033] shadow-md"
          : "text-white/85 hover:bg-[#1b3452]"
      }`

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#17202a]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-[#102033] p-5 text-white lg:flex">
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-[#34c6a3] text-[#102033]">
              <ShieldCheck size={21} aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">Admin Portal</div>
              <p className="mt-1 text-xs text-white/70">System Operations</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          <NavLink to={dashboardItem.to} end={dashboardItem.end} className={navLinkClass()}>
            <LayoutDashboard size={18} aria-hidden="true" />
            <span>{dashboardItem.label}</span>
          </NavLink>

          {navGroups.map((group) => {
            const GroupIcon = group.icon
            const isOpen = openGroups.has(group.label)
            return (
              <div key={group.label} className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-sm font-semibold text-white/90 transition hover:bg-[#1b3452]"
                >
                  <GroupIcon size={18} aria-hidden="true" />
                  <span className="flex-1">{group.label}</span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>
                {isOpen ? (
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => (
                      <NavLink key={item.to} to={item.to} className={navLinkClass(true)}>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <NavLink
            to="/admin/settings"
            className="flex items-center gap-3 text-sm text-white/80 transition hover:text-white"
          >
            <Settings size={17} aria-hidden="true" />
            <span>Settings</span>
          </NavLink>
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
        <header className="sticky top-0 z-10 border-b border-[#dde4ec] bg-white">
          <div className="mx-auto flex min-h-20 max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-[#17202a] sm:text-2xl">Admin Portal</h1>
              <p className="mt-1 hidden text-sm text-[#667085] sm:block">
                Academic structure, people, imports, and system operations.
              </p>
            </div>

            <label className="hidden w-full max-w-xs items-center gap-3 rounded-md border border-[#dde4ec] bg-[#f5f7fa] px-3 py-2 text-sm text-[#667085] md:flex">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search admin workspace</span>
              <input
                type="search"
                placeholder="Search users, imports..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#667085]"
              />
            </label>

            <button
              type="button"
              className="hidden size-9 place-items-center rounded-md text-[#17202a] transition hover:bg-[#f5f7fa] sm:grid"
              aria-label="Notifications"
            >
              <Bell size={18} aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3 rounded-md border border-[#dde4ec] bg-white px-2 py-2">
              <div className="grid size-10 place-items-center rounded-md bg-[#102033] text-sm font-semibold text-white">
                {initials || <UserCircle size={24} aria-hidden="true" />}
              </div>
              <div className="hidden min-w-32 sm:block">
                <p className="truncate text-sm font-semibold text-[#17202a]">{displayName}</p>
                <p className="truncate text-xs text-[#667085]">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6">
          <div className="mb-4 grid gap-2 lg:hidden">
            <div className="flex items-center justify-between rounded-md bg-[#102033] px-4 py-3 text-white">
              <span className="font-semibold">Admin Portal</span>
              <Database size={18} aria-hidden="true" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {mobileItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={(item as { end?: boolean }).end}
                  className={({ isActive }) =>
                    `shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${
                      isActive
                        ? "bg-[#102033] text-white"
                        : "border border-[#dde4ec] bg-white text-[#17202a]"
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

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import {
  Bell,
  BookMarked,
  CalendarRange,
  ChevronDown,
  Database,
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

import { getAdminNotifications, type AdminNotification } from "../api/admin"
import { clearToken, getCurrentUser } from "../utils/auth"

const NOTIF_SEEN_KEY = "pcdc_admin_notif_last_seen_id"

function timeAgo(iso: string): string {
  const then = new Date(iso.endsWith("Z") ? iso : `${iso}Z`).getTime()
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

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

  // Groups start expanded only when the current route lives inside them —
  // e.g. Dashboard matches no group, so everything stays collapsed.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const open = new Set<string>()
    for (const group of navGroups) {
      if (group.items.some((item) => location.pathname.startsWith(item.to))) {
        open.add(group.label)
      }
    }
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

  // Users and Faculty already ship their own search box — showing the global
  // one too reads as two identical search bars on the same screen.
  const hasOwnSearch =
    location.pathname.startsWith("/admin/users") || location.pathname.startsWith("/admin/people/faculty")

  const [topSearch, setTopSearch] = useState("")
  function handleTopSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = topSearch.trim()
    if (!term) return
    navigate(`/admin/users?search=${encodeURIComponent(term)}`)
  }

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [lastSeenId, setLastSeenId] = useState(() => {
    const stored = localStorage.getItem(NOTIF_SEEN_KEY)
    return stored ? Number(stored) : 0
  })
  const notifRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((n) => n.id > lastSeenId).length

  useEffect(() => {
    getAdminNotifications(20)
      .then((data) => setNotifications(data.items))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [notifOpen])

  function toggleNotifications() {
    const next = !notifOpen
    setNotifOpen(next)
    if (next) {
      setNotifLoading(true)
      getAdminNotifications(20)
        .then((data) => {
          setNotifications(data.items)
          const maxId = data.items.reduce((max, n) => Math.max(max, n.id), lastSeenId)
          setLastSeenId(maxId)
          localStorage.setItem(NOTIF_SEEN_KEY, String(maxId))
        })
        .catch(() => undefined)
        .finally(() => setNotifLoading(false))
    }
  }

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [profileOpen])

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

            {hasOwnSearch ? null : (
              <form
                onSubmit={handleTopSearch}
                className="hidden w-full max-w-xs items-center gap-3 rounded-md border border-[#dde4ec] bg-[#f5f7fa] px-3 py-2 text-sm text-[#667085] md:flex"
              >
                <button type="submit" aria-label="Search users" className="text-[#667085]">
                  <Search size={17} aria-hidden="true" />
                </button>
                <input
                  type="search"
                  value={topSearch}
                  onChange={(event) => setTopSearch(event.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#667085]"
                />
              </form>
            )}

            <div className="relative hidden sm:block" ref={notifRef}>
              <button
                type="button"
                onClick={toggleNotifications}
                className="relative grid size-9 place-items-center rounded-md text-[#17202a] transition hover:bg-[#f5f7fa]"
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <Bell size={18} aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-[#d92d20] text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-lg border border-[#dde4ec] bg-white shadow-lg">
                  <div className="border-b border-[#eef2f7] px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#17202a]">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifLoading ? (
                      <p className="px-4 py-6 text-center text-sm text-[#667085]">Loading…</p>
                    ) : notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-[#667085]">
                        No notifications yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-[#eef2f7]">
                        {notifications.map((n) => (
                          <li key={n.id} className="px-4 py-3 hover:bg-[#f9fafb]">
                            <p className="text-sm text-[#17202a]">{n.message}</p>
                            <p className="mt-1 text-xs text-[#98a2b3]">{timeAgo(n.created_at)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-label="Profile menu"
                className="flex items-center gap-3 rounded-md border border-[#dde4ec] bg-white px-2 py-2 transition hover:border-[#34c6a3]"
              >
                <div className="grid size-10 place-items-center rounded-md bg-[#102033] text-sm font-semibold text-white">
                  {initials || <UserCircle size={24} aria-hidden="true" />}
                </div>
                <div className="hidden min-w-32 text-left sm:block">
                  <p className="truncate text-sm font-semibold text-[#17202a]">{displayName}</p>
                  <p className="truncate text-xs text-[#667085]">Admin</p>
                </div>
              </button>

              {profileOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-lg border border-[#dde4ec] bg-white shadow-lg">
                  <div className="border-b border-[#eef2f7] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[#17202a]">{displayName}</p>
                    <p className="truncate text-xs text-[#667085]">{currentUser?.email ?? "Admin"}</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        navigate("/admin/settings")
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#17202a] transition hover:bg-[#f5f7fa]"
                    >
                      <Settings size={16} aria-hidden="true" />
                      Account settings
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

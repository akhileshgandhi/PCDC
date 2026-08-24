import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  UserCircle,
  Users,
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

import { getFacultyNotifications, type FacultyNotification } from "../api/faculty"
import { clearToken, getCurrentUser } from "../utils/auth"

const NOTIF_SEEN_KEY = "pcdc_faculty_notif_last_seen_id"

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

interface FacultyLayoutProps {
  children: ReactNode
}

const dashboardItem = {
  label: "Dashboard",
  icon: LayoutDashboard,
  to: "/faculty/dashboard",
  end: true,
}

interface NavGroup {
  label: string
  icon: typeof Users
  items: Array<{ label: string; to: string }>
}

const navGroups: NavGroup[] = [
  {
    label: "Onboarding",
    icon: GraduationCap,
    items: [
      { label: "My Teaching", to: "/faculty/onboarding/my-teaching" },
      { label: "Students", to: "/faculty/students" },
    ],
  },
  {
    label: "Cases",
    icon: BookOpen,
    items: [
      { label: "Case Library", to: "/faculty/case-library" },
      { label: "Case Bank", to: "/faculty/case-bank" },
      { label: "Case Builder", to: "/faculty/case-builder" },
    ],
  },
  {
    label: "Insights",
    icon: BarChart3,
    items: [
      { label: "Analytics", to: "/faculty/analytics" },
      { label: "Reports", to: "/faculty/reports" },
    ],
  },
]

const mobileItems = [
  dashboardItem,
  ...navGroups.flatMap((group) => group.items),
]

export default function FacultyLayout({ children }: FacultyLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = getCurrentUser()
  const displayName = currentUser?.name ?? "Faculty"
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const open = new Set<string>()
    for (const group of navGroups) {
      if (group.items.some((item) => location.pathname.startsWith(item.to))) {
        open.add(group.label)
      }
    }
    if (open.size === 0) open.add("Onboarding")
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

  const [topSearch, setTopSearch] = useState("")
  function handleTopSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = topSearch.trim()
    if (!term) return
    navigate(`/faculty/students?search=${encodeURIComponent(term)}`)
  }

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<FacultyNotification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [lastSeenId, setLastSeenId] = useState<number>(() => {
    const stored = localStorage.getItem(NOTIF_SEEN_KEY)
    return stored ? Number(stored) : 0
  })
  const notifRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((n) => n.id > lastSeenId).length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function toggleNotifications() {
    setNotifOpen((prev) => {
      const next = !prev
      if (next) {
        setNotifLoading(true)
        getFacultyNotifications(20)
          .then((data) => {
            setNotifications(data.items)
            if (data.items.length > 0) {
              const maxId = Math.max(...data.items.map((n) => n.id))
              setLastSeenId(maxId)
              localStorage.setItem(NOTIF_SEEN_KEY, String(maxId))
            }
          })
          .finally(() => setNotifLoading(false))
      }
      return next
    })
  }

  const navLinkClass = (compact = false) =>
    ({ isActive }: { isActive: boolean }) =>
      `flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-sm font-medium transition ${
        compact ? "pl-11" : ""
      } ${
        isActive ? "bg-[#c9a227] text-[#0b1d3a] shadow-md" : "text-white/85 hover:bg-[#17315c]"
      }`

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#111827]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-[#0b1d3a] p-5 text-white lg:flex">
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
                  className="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-sm font-semibold text-white/90 transition hover:bg-[#17315c]"
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
              <h1 className="text-xl font-semibold text-[#111827] sm:text-2xl">Faculty Portal</h1>
              <p className="mt-1 hidden text-sm text-[#6b7280] sm:block">
                Create cases, review progress, and monitor cohort capability signals.
              </p>
            </div>

            <form
              onSubmit={handleTopSearch}
              className="hidden w-full max-w-xs items-center gap-3 rounded-md border border-[#e6e8eb] bg-[#f6f7fb] px-3 py-2 text-sm text-[#6b7280] md:flex"
            >
              <button type="submit" aria-label="Search students" className="text-[#6b7280]">
                <Search size={17} aria-hidden="true" />
              </button>
              <input
                type="search"
                value={topSearch}
                onChange={(event) => setTopSearch(event.target.value)}
                placeholder="Search students by name or email..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#6b7280]"
              />
            </form>

            <div className="relative hidden sm:block" ref={notifRef}>
              <button
                type="button"
                onClick={toggleNotifications}
                className="relative grid size-9 place-items-center rounded-md text-[#111827] transition hover:bg-[#f6f7fb]"
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
                <div className="absolute right-0 top-11 z-20 w-80 rounded-md border border-[#e6e8eb] bg-white py-2 shadow-lg">
                  <div className="border-b border-[#eef2f7] px-4 py-2 text-sm font-semibold text-[#111827]">
                    Notifications
                  </div>
                  {notifLoading ? (
                    <p className="px-4 py-6 text-center text-sm text-[#6b7280]">Loading…</p>
                  ) : notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-[#6b7280]">No notifications yet.</p>
                  ) : (
                    <div className="max-h-80 divide-y divide-[#eef2f7] overflow-y-auto">
                      {notifications.map((n) => (
                        <div key={n.id} className="px-4 py-2.5 text-sm">
                          <p className="text-[#111827]">{n.message}</p>
                          <p className="mt-0.5 text-xs text-[#6b7280]">{timeAgo(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

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
              {mobileItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={"end" in item ? (item as { end?: boolean }).end : undefined}
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

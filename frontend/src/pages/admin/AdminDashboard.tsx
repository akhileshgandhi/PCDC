import {
  ArrowRight,
  Bell,
  FileUp,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
  getAdminDashboardSummary,
  type AdminDashboardSummary,
} from "../../api/admin"
import AdminLayout from "../../layouts/AdminLayout"
import { getCurrentUser } from "../../utils/auth"

const defaultSummary: AdminDashboardSummary = {
  total_users: 0,
  active_today: 0,
  pending_imports: 0,
  users_by_role: {},
  recent_activity: [],
}

const quickLinks = [
  {
    label: "Import Users",
    description: "Download template and prepare CSV onboarding.",
    to: "/admin/users?action=import",
    icon: Users,
  },
  {
    label: "Import Cases",
    description: "Review external case import queue.",
    to: "/admin/case-import",
    icon: FileUp,
  },
  {
    label: "Settings",
    description: "Configure thresholds, channels, and AI settings.",
    to: "/admin/settings",
    icon: Settings,
  },
  {
    label: "Notifications",
    description: "Check delivery logs and broadcast operations.",
    to: "/admin/notifications",
    icon: Bell,
  },
]

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary>(defaultSummary)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const currentUser = getCurrentUser()
  const firstName = currentUser?.name?.split(" ")[0] ?? "Admin"

  useEffect(() => {
    let isMounted = true

    async function loadSummary() {
      try {
        const data = await getAdminDashboardSummary()
        if (isMounted) {
          setSummary(data)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load admin summary right now.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="rounded-lg bg-[#102033] p-6 text-white shadow-md sm:p-8">
            <div className="inline-flex rounded-full bg-[#34c6a3] px-3 py-1 text-xs font-semibold text-[#102033]">
              System operations
            </div>
            <h2 className="mt-7 text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back, {firstName}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/82 sm:text-base">
              Manage access, imports, platform configuration, and message delivery from one
              admin workspace.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/admin/users"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#34c6a3] px-5 py-3 text-sm font-semibold text-[#102033] shadow-sm transition hover:bg-[#5dd7bb]"
              >
                Review Users
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <article className="rounded-lg border border-[#dde4ec] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Users by Role</h3>
            <div className="mt-5 space-y-3">
              {(["student", "faculty", "admin"] as const).map(
                (role) => (
                  <RoleCount
                    key={role}
                    label={titleCase(role)}
                    value={summary.users_by_role[role] ?? 0}
                    isLoading={isLoading}
                    to={`/admin/users?role=${role}`}
                  />
                ),
              )}
            </div>
          </article>
        </section>

        {error ? (
          <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Total Users"
            value={summary.total_users}
            icon={Users}
            isLoading={isLoading}
            to="/admin/users"
            linkLabel="View all users"
          />
          <SummaryCard
            label="Active Today"
            value={summary.active_today}
            icon={ShieldCheck}
            isLoading={isLoading}
            description="Accounts with at least one login in the last 24 hours."
          />
          <SummaryCard
            label="Pending Case Imports"
            value={summary.pending_imports}
            icon={FileUp}
            isLoading={isLoading}
            description="Case studies uploaded for the library that are still in draft or awaiting your review."
            to="/admin/case-import"
            linkLabel="Review imports"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-semibold">Quick Actions</h2>
              <p className="mt-1 text-sm text-[#667085]">
                Common operations for account onboarding and platform setup.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {quickLinks.map((item) => {
                const Icon = item.icon

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="rounded-lg border border-[#dde4ec] bg-white p-4 shadow-sm transition hover:border-[#34c6a3] hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 place-items-center rounded-md bg-[#e8f8f4] text-[#176b5a]">
                        <Icon size={19} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#17202a]">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-[#667085]">
                          {item.description}
                        </span>
                      </span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">Recent Activity</h2>
            <div className="mt-5 space-y-3">
              {isLoading ? (
                <p className="text-sm font-medium text-[#667085]">Loading activity...</p>
              ) : summary.recent_activity.length > 0 ? (
                summary.recent_activity.map((event) => (
                  <div key={event.id} className="rounded-md bg-[#f5f7fa] p-3">
                    <p className="text-sm font-semibold text-[#17202a]">{event.message}</p>
                    <p className="mt-1 text-xs text-[#667085]">
                      {titleCase(event.event_type.replace(/_/g, " "))} -{" "}
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#667085]">
                  Activity will appear after admin actions are recorded.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}

interface SummaryCardProps {
  label: string
  value: number
  icon: LucideIcon
  isLoading: boolean
  description?: string
  to?: string
  linkLabel?: string
}

function SummaryCard({ label, value, icon: Icon, isLoading, description, to, linkLabel }: SummaryCardProps) {
  return (
    <article className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-[#e8f8f4] text-[#176b5a]">
          <Icon size={19} aria-hidden="true" />
        </div>
        <span className="rounded-full bg-[#f5f7fa] px-3 py-1 text-xs font-semibold text-[#667085]">
          Live
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[#667085]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#17202a]">
        {isLoading ? "..." : value}
      </p>
      {description ? (
        <p className="mt-2 text-xs leading-5 text-[#98a2b3]">{description}</p>
      ) : null}
      {to && !isLoading ? (
        <Link
          to={to}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#176b5a] hover:text-[#102033]"
        >
          {linkLabel ?? "Review"}
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  )
}

interface RoleCountProps {
  label: string
  value: number
  isLoading: boolean
  to: string
}

function RoleCount({ label, value, isLoading, to }: RoleCountProps) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-md bg-[#f5f7fa] px-4 py-3 transition hover:bg-[#eef2f7]"
    >
      <span className="text-sm font-semibold text-[#667085]">{label}</span>
      <span className="text-sm font-semibold text-[#17202a]">
        {isLoading ? "..." : value}
      </span>
    </Link>
  )
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

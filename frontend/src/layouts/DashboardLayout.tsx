import type { ReactNode } from "react"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 md:block">
        <div className="text-lg font-semibold">PCDC</div>
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Sidebar placeholder
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="text-sm font-medium text-slate-600">
            Header placeholder
          </div>
        </header>
        <main className="p-5">{children}</main>
      </div>
    </div>
  )
}

import { ArrowLeft, Construction } from "lucide-react"
import { Link } from "react-router-dom"

import AdminLayout from "../../layouts/AdminLayout"

interface AdminModulePlaceholderProps {
  title: string
  description: string
}

export default function AdminModulePlaceholder({
  title,
  description,
}: AdminModulePlaceholderProps) {
  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#dde4ec] bg-white p-5 shadow-sm sm:p-6">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#176b5a] transition hover:text-[#102033]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Dashboard
          </Link>
          <div className="mt-8 flex max-w-3xl items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#e8f8f4] text-[#176b5a]">
              <Construction size={22} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-normal text-[#17202a]">
                  {title}
                </h1>
                <span className="rounded-full bg-[#fff7df] px-3 py-1 text-xs font-semibold text-[#92702a]">
                  Coming soon
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#667085]">
                This module isn't available yet. {description}
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}

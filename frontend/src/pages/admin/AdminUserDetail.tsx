import { ArrowLeft, UserCog } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import AdminLayout from "../../layouts/AdminLayout"

export default function AdminUserDetail() {
  const { id } = useParams()

  return (
    <AdminLayout>
      <section className="rounded-lg border border-[#dde4ec] bg-white p-6 shadow-sm">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#176b5a] transition hover:text-[#102033]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Users
        </Link>
        <div className="mt-8 flex max-w-3xl items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#e8f8f4] text-[#176b5a]">
            <UserCog size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-[#17202a]">
              User Detail
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#667085]">
              Profile editing, account actions, login history, and mentor assignment
              for user #{id} will build on the users API slice.
            </p>
          </div>
        </div>
      </section>
    </AdminLayout>
  )
}

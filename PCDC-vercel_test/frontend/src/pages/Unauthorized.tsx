import { LockKeyhole } from "lucide-react"
import { Link } from "react-router-dom"

export default function Unauthorized() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F6F7F9] px-4 text-[#111827]">
      <section className="w-full max-w-md rounded-xl border border-[#E6EBEB] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-lg bg-[#DBEAFE] text-[#1D4ED8]">
          <LockKeyhole size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#0C1F3D]">Access Denied</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          You don't have permission to view this page.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3B82F6]"
        >
          Back to Login
        </Link>
      </section>
    </main>
  )
}

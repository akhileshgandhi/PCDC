import type { ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            PCDC
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Capability Development Centre
          </h1>
        </div>
        {children}
      </section>
    </main>
  )
}

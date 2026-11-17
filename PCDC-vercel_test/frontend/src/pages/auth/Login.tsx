import { Clock, Eye, EyeOff, LoaderCircle, LogIn, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"
import { SESSION_EXPIRED_REASON, decodeJwtPayload, takePostLoginPath } from "../../utils/auth"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get("reason") === SESSION_EXPIRED_REASON
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const token = await login(email, password)
      const payload = decodeJwtPayload(token)

      if (payload?.must_change) {
        navigate("/change-password", { replace: true })
        return
      }

      // Always their portal dashboard, however they were logged out.
      const nextPath = takePostLoginPath(payload?.role)
      navigate(nextPath ?? "/unauthorized", { replace: true })
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Login failed. Please try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-2">
      {/* Branding panel */}
      <div className="relative hidden overflow-hidden bg-[#0c1f3d] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px circle at 20% 20%, rgba(37,99,235,0.45), transparent 60%), radial-gradient(500px circle at 80% 75%, rgba(59,130,246,0.35), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-[#2563eb]/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-16 size-[28rem] rounded-full bg-[#3b82f6]/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3 text-white">
          <div className="grid size-10 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className="text-lg font-semibold tracking-tight">PCDC Case Studio</div>
        </div>

        <div className="relative max-w-md text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93c5fd]">
            Capability Development Centre
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Build the judgment that real roles demand.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/70">
            Case studies, simulations, and capability tracking in one studio — for students,
            faculty, and institute admins alike.
          </p>
        </div>

        <p className="relative text-xs text-white/50">
          &copy; {new Date().getFullYear()} PCDC Case Studio. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">PCDC</p>
            <h1 className="mt-2 text-xl font-semibold text-slate-950">Capability Development Centre</h1>
          </div>

          <h2 className="text-2xl font-semibold text-slate-950">Welcome back</h2>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to your portal.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {sessionExpired ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
              >
                <Clock size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold">Session expired.</span> Please log in again to
                  continue where you left off.
                </span>
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email or scholar number
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                autoComplete="username"
                placeholder="you@example.com or PIMR2024001"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-2 flex rounded-lg border border-slate-300 transition focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/20">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-sm outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  className="grid w-11 place-items-center rounded-r-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm font-medium text-[#1d4ed8] transition hover:text-[#0c1f3d]"
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
              ) : (
                <LogIn size={18} aria-hidden="true" />
              )}
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <p className="text-center text-sm text-slate-500">
              Contact your program administrator for account access.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}

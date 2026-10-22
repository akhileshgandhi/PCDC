import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"
import AuthLayout from "../../layouts/AuthLayout"
import { decodeJwtPayload, portalPathForRole } from "../../utils/auth"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
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

      const portalPath = portalPathForRole(payload?.role)
      navigate(portalPath ?? "/unauthorized", { replace: true })
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
    <AuthLayout>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email or scholar number
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            autoComplete="username"
            placeholder="you@example.com or PIMR2024001"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <div className="mt-2 flex rounded-md border border-slate-300 transition focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-200">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-sm outline-none"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((currentValue) => !currentValue)}
              className="grid w-11 place-items-center rounded-r-md text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
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
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Forgot password?
          </button>
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? (
            <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
          ) : (
            <LogIn size={18} aria-hidden="true" />
          )}
          {isLoading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Contact your program administrator for account access.
        </p>
      </form>
    </AuthLayout>
  )
}

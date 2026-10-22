import axios from "axios"
import { CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import api from "../../api/axios"
import AuthLayout from "../../layouts/AuthLayout"
import { decodeJwtPayload, portalPathForRole, setToken } from "../../utils/auth"

interface Invitee {
  name: string
  email: string
}

export default function SetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get("token") ?? ""

  const [checking, setChecking] = useState(true)
  const [invitee, setInvitee] = useState<Invitee | null>(null)
  const [linkError, setLinkError] = useState("")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) {
      setLinkError("This link is missing its token. Please use the link from your invitation email.")
      setChecking(false)
      return
    }
    api
      .get<Invitee>("/auth/set-password", { params: { token } })
      .then((res) => setInvitee(res.data))
      .catch((err) => {
        const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null
        setLinkError(typeof detail === "string" ? detail : "This link is invalid or has expired.")
      })
      .finally(() => setChecking(false))
  }, [token])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post<{ access_token: string }>("/auth/set-password", {
        token,
        password,
      })
      const accessToken = res.data.access_token
      setToken(accessToken)
      const payload = decodeJwtPayload(accessToken)
      const portalPath = portalPathForRole(payload?.role) ?? "/login"
      // Full navigation so AuthProvider re-initializes from the stored token.
      window.location.assign(portalPath)
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null
      setError(typeof detail === "string" ? detail : "Could not set your password. Please try again.")
      setSubmitting(false)
    }
  }

  const field =
    "mt-2 flex rounded-md border border-slate-300 transition focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-200"

  if (checking) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
          Checking your link…
        </div>
      </AuthLayout>
    )
  }

  if (linkError) {
    return (
      <AuthLayout>
        <div className="space-y-4">
          <div className="rounded-md bg-red-50 px-3 py-3 text-sm text-red-700">{linkError}</div>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Go to login
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-start gap-3 rounded-md bg-slate-50 px-3 py-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#c9a227]" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-slate-900">Set your password</p>
            <p className="mt-0.5 text-slate-600">
              Activating access for <span className="font-medium text-slate-900">{invitee?.email}</span>
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <div className={field}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-sm outline-none"
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="grid w-11 place-items-center rounded-r-md text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirm"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            autoComplete="new-password"
          />
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? (
            <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={18} aria-hidden="true" />
          )}
          {submitting ? "Setting password…" : "Set password & sign in"}
        </button>
      </form>
    </AuthLayout>
  )
}

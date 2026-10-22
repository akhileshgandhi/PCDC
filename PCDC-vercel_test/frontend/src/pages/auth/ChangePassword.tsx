import axios from "axios"
import { CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react"
import { useState } from "react"
import { Navigate } from "react-router-dom"

import api from "../../api/axios"
import AuthLayout from "../../layouts/AuthLayout"
import {
  decodeJwtPayload,
  getToken,
  isAuthenticated,
  portalPathForRole,
  setToken,
} from "../../utils/auth"

export default function ChangePassword() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const currentEmail = decodeJwtPayload(getToken() ?? "")?.email

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
      const res = await api.post<{ access_token: string }>("/auth/change-password", {
        password,
      })
      const accessToken = res.data.access_token
      setToken(accessToken)
      const payload = decodeJwtPayload(accessToken)
      const portalPath = portalPathForRole(payload?.role) ?? "/login"
      window.location.assign(portalPath)
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null
      setError(typeof detail === "string" ? detail : "Could not update your password. Please try again.")
      setSubmitting(false)
    }
  }

  const field =
    "mt-2 flex rounded-md border border-slate-300 transition focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-200"

  return (
    <AuthLayout>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-start gap-3 rounded-md bg-slate-50 px-3 py-3">
          <KeyRound size={20} className="mt-0.5 shrink-0 text-[#c9a227]" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-slate-900">Set a new password</p>
            <p className="mt-0.5 text-slate-600">
              For your security, please replace the temporary password
              {currentEmail ? (
                <>
                  {" "}
                  for <span className="font-medium text-slate-900">{currentEmail}</span>
                </>
              ) : null}
              .
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
          {submitting ? "Updating…" : "Update password & continue"}
        </button>
      </form>
    </AuthLayout>
  )
}

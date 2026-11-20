import axios from "axios"
import { CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, X } from "lucide-react"
import { useState } from "react"

import api from "../../api/axios"
import { setToken } from "../../utils/auth"

/** Self-service "change my own password" modal — works for any logged-in
 * role (student/faculty/admin/superadmin), since the backend endpoint it
 * calls is role-agnostic. */
export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      const response = await api.post<{ access_token: string }>("/auth/change-password", { password })
      setToken(response.data.access_token)
      setDone(true)
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null
      setError(typeof detail === "string" ? detail : "Could not update your password. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const field =
    "mt-2 flex rounded-lg border border-[#dde4ec] transition focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/20"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1f3d]/50 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        {done ? (
          <div className="py-2 text-center">
            <CheckCircle2 className="mx-auto text-[#2563eb]" size={32} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#17202a]">Password updated</h2>
            <p className="mt-1 text-sm text-[#667085]">Your new password is active now.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3b82f6]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <KeyRound size={20} className="mt-0.5 shrink-0 text-[#2563eb]" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-semibold text-[#17202a]">Change password</h2>
                  <p className="mt-0.5 text-sm text-[#667085]">Applies to your own account.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="text-[#667085] hover:text-[#17202a]">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="change-password-new" className="block text-sm font-medium text-[#374151]">
                  New password
                </label>
                <div className={field}>
                  <input
                    id="change-password-new"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-sm outline-none"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="grid w-11 place-items-center rounded-r-md text-[#667085] transition hover:bg-[#f5f7fa] hover:text-[#17202a]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="change-password-confirm" className="block text-sm font-medium text-[#374151]">
                  Confirm password
                </label>
                <div className={field}>
                  <input
                    id="change-password-confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-sm outline-none"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="grid w-11 place-items-center rounded-r-md text-[#667085] transition hover:bg-[#f5f7fa] hover:text-[#17202a]"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="rounded-md border border-[#f3c4c4] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#dde4ec] px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#f5f7fa]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={17} aria-hidden="true" />
                )}
                {submitting ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

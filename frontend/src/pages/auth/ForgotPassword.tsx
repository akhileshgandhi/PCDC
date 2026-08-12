import { ArrowLeft, LoaderCircle, Mail, Send } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import api from "../../api/axios"
import AuthLayout from "../../layouts/AuthLayout"

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!identifier.trim()) return
    setSubmitting(true)
    try {
      await api.post("/auth/forgot-password", { identifier: identifier.trim() })
    } catch {
      // Always show the same message — never reveal whether an account exists.
    } finally {
      setSubmitting(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md bg-slate-50 px-3 py-3">
            <Mail size={20} className="mt-0.5 shrink-0 text-[#c9a227]" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-slate-900">Check your email</p>
              <p className="mt-0.5 text-slate-600">
                If an account exists for <span className="font-medium text-slate-900">{identifier}</span>,
                we've sent a link to reset your password. The link expires in 72 hours.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            No email? It may be in spam, or your account may not have an email on file — in that
            case, ask your program administrator to reset it.
          </p>
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Forgot your password?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter your email or scholar number and we'll send you a reset link.
          </p>
        </div>
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-slate-700">
            Email or scholar number
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            autoComplete="username"
            placeholder="you@example.com or PIMR2024001"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !identifier.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? (
            <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
          {submitting ? "Sending…" : "Send reset link"}
        </button>
        <Link
          to="/login"
          className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to login
        </Link>
      </form>
    </AuthLayout>
  )
}

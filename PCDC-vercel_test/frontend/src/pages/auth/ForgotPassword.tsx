import { ArrowLeft, LoaderCircle, Mail, Send } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import api from "../../api/axios"
import AuthLayout from "../../layouts/AuthLayout"

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("")
  const [studentEmail, setStudentEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  // A scholar number has no "@"; students then also enter an email for the link.
  const looksLikeScholar = identifier.trim() !== "" && !identifier.includes("@")
  const linkEmail = looksLikeScholar ? studentEmail.trim() : identifier.trim()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!identifier.trim()) {
      setError("Enter your email or scholar number.")
      return
    }
    if (looksLikeScholar && !studentEmail.trim()) {
      setError("Enter your email — we'll send the reset link there.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await api.post<{ status: string }>("/auth/forgot-password", {
        identifier: identifier.trim(),
        email: looksLikeScholar ? studentEmail.trim() : undefined,
      })
      if (res.data.status === "email_required") {
        setError("Enter a valid email to receive the reset link.")
        setSubmitting(false)
        return
      }
    } catch {
      // Always show the same message — never reveal whether an account exists.
    }
    setSubmitting(false)
    setSent(true)
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
                If an account exists, we've sent a link to reset your password to{" "}
                <span className="font-medium text-slate-900">{linkEmail}</span>. The link expires in
                72 hours.
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
            Faculty &amp; admins: enter your email. Students: enter your scholar number and an email —
            we'll send the reset link there.
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

        {looksLikeScholar ? (
          <div>
            <label htmlFor="studentEmail" className="block text-sm font-medium text-slate-700">
              Email <span className="text-[#d92d20]">*</span>
            </label>
            <input
              id="studentEmail"
              type="email"
              value={studentEmail}
              onChange={(event) => setStudentEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <p className="mt-1 text-xs text-slate-500">
              We'll send your set-password link to this email.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !identifier.trim() || (looksLikeScholar && !studentEmail.trim())}
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

import { UserPlus } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import GoogleSignInButton from "../../components/auth/GoogleSignInButton"
import AuthLayout from "../../layouts/AuthLayout"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    await new Promise((resolve) => {
      window.setTimeout(resolve, 300)
    })

    setIsLoading(false)
  }

  return (
    <AuthLayout>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            autoComplete="name"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <UserPlus size={18} aria-hidden="true" />
          {isLoading ? "Registering..." : "Register"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <GoogleSignInButton onError={setError} />

        <p className="text-center text-xs text-slate-500">
          Google sign-in works for accounts your administrator has already created.
        </p>

        <p className="text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-medium text-slate-950 underline" to="/login">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

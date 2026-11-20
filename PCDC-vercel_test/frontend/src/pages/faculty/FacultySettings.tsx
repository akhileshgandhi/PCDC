import { KeyRound, LogOut } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import ChangePasswordModal from "../../components/common/ChangePasswordModal"
import FacultyLayout from "../../layouts/FacultyLayout"
import { clearToken, getCurrentUser } from "../../utils/auth"

/** Faculty account page: who is signed in, change password, log out. */
export default function FacultySettings() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const details = [
    { label: "Name", value: currentUser?.name ?? "—" },
    { label: "Email", value: currentUser?.email ?? "—" },
    { label: "Role", value: "Faculty" },
  ]

  function handleLogout() {
    clearToken()
    navigate("/login", { replace: true })
  }

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-semibold text-[#111827]">Account settings</h1>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">Your account details and sign-in security.</p>
        </section>

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#111827]">Profile</h2>
          <dl className="mt-4 divide-y divide-[#eef2f7]">
            {details.map((item) => (
              <div key={item.label} className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]">
                <dt className="text-sm font-medium text-[#6b7280]">{item.label}</dt>
                <dd className="break-all text-sm font-semibold text-[#111827]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#111827]">Security</h2>
          <p className="mt-1 text-sm text-[#6b7280]">Change the password you use to sign in.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsChangingPassword(true)}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3b82f6]"
            >
              <KeyRound size={16} aria-hidden="true" />
              Change password
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-[#e6e8eb] bg-white px-4 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff5f5]"
            >
              <LogOut size={16} aria-hidden="true" />
              Log out
            </button>
          </div>
        </section>
      </div>
      {isChangingPassword ? <ChangePasswordModal onClose={() => setIsChangingPassword(false)} /> : null}
    </FacultyLayout>
  )
}

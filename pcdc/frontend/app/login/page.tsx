"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, saveSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@pcdc.in");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const { access_token, user } = await login(email.trim(), password);
      saveSession(access_token, user);
      const home = user.role === "admin" ? "/admin/dashboard" : user.role === "mentor" ? "/mentor/dashboard" : user.role === "student" ? "/student/dashboard" : "/login";
      router.push(home);
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex flex-1 flex-col justify-center p-14 text-white bg-gradient-to-br from-brand-700 to-brand-500">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-extrabold text-xl mb-7">PC</div>
        <h1 className="text-4xl font-extrabold leading-tight mb-3">Prestige Capability<br />Development Centre</h1>
        <p className="text-[15px] opacity-90 max-w-md">Admin portal — manage subjects, capabilities, scoring, mentors and students.</p>
      </div>
      <div className="w-full md:w-[460px] flex flex-col justify-center p-12">
        <h2 className="text-2xl font-extrabold mb-1.5">Welcome back</h2>
        <p className="text-slate2 mb-6 text-sm">Sign in to your PCDC account.</p>
        {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}
        <form onSubmit={submit}>
          <div className="mb-4">
            <label className="field-label">Email</label>
            <input className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-5">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-pri w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="text-slate2 text-xs text-center mt-4">Demo: admin@pcdc.in / admin123</p>
      </div>
    </div>
  );
}

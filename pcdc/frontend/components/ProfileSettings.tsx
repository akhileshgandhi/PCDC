"use client";
import { useEffect, useState } from "react";
import { api, getToken, saveSession } from "@/lib/api";

function Row({ label, value }: { label: string; value: any }) {
  return <div className="flex justify-between py-2.5 border-b border-line last:border-0 text-sm">
    <span className="text-slate2">{label}</span><span className="font-semibold">{value || "—"}</span></div>;
}

export default function ProfileSettings() {
  const [me, setMe] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);

  async function load() {
    try { const m = await api("/api/auth/me"); setMe(m); setName(m.full_name || ""); setPhone(m.phone || ""); }
    catch (e: any) { setMsg({ k: "err", t: e.message }); }
  }
  useEffect(() => { load(); }, []);

  async function saveProfile() {
    setMsg(null);
    try {
      const updated = await api("/api/auth/me", { method: "PATCH", body: JSON.stringify({ full_name: name, phone }) });
      setMe(updated);
      const tok = getToken(); if (tok) saveSession(tok, updated);   // refresh header on next load
      setMsg({ k: "ok", t: "Profile updated. Reload to refresh the header." });
    } catch (e: any) { setMsg({ k: "err", t: e.message }); }
  }
  async function changePw() {
    setPwMsg(null);
    if (pw.new_password !== pw.confirm) { setPwMsg({ k: "err", t: "New passwords don't match." }); return; }
    try {
      await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: pw.current_password, new_password: pw.new_password }) });
      setPw({ current_password: "", new_password: "", confirm: "" });
      setPwMsg({ k: "ok", t: "Password changed." });
    } catch (e: any) { setPwMsg({ k: "err", t: e.message }); }
  }

  if (!me) return <p className="text-slate2">Loading…</p>;
  const initials = (me.full_name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("");

  return (
    <div className="grid lg:grid-cols-2 gap-5 max-w-[920px]">
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-extrabold text-xl">{initials}</div>
          <div><div className="font-extrabold text-lg">{me.full_name}</div><div className="text-slate2 text-sm capitalize">{me.role}</div></div>
        </div>
        <Row label="Email" value={me.email} />
        <Row label="Phone" value={me.phone} />
        {me.role === "mentor" && <><Row label="Employee ID" value={me.employee_id} /><Row label="Designation" value={me.designation} /><Row label="Qualification" value={me.qualification} /><Row label="Experience" value={me.experience} /></>}
        {me.role === "student" && <><Row label="College ID" value={me.college_id} /><Row label="Program" value={me.program} /><Row label="Batch" value={me.batch} /></>}
        <Row label="Status" value={me.status} />
      </div>

      <div className="space-y-5">
        <div className="card">
          <h3 className="font-bold text-[15px] mb-4">Edit details</h3>
          <div className="mb-3"><label className="field-label">Full name</label><input className="field-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="mb-4"><label className="field-label">Phone</label><input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" /></div>
          {msg && <div className={`chip mb-3 ${msg.k === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{msg.t}</div>}
          <div className="flex justify-end"><button className="btn btn-pri" onClick={saveProfile}>Save profile</button></div>
        </div>

        <div className="card">
          <h3 className="font-bold text-[15px] mb-4">Change password</h3>
          <div className="mb-3"><label className="field-label">Current password</label><input type="password" className="field-input" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></div>
          <div className="mb-3"><label className="field-label">New password</label><input type="password" className="field-input" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></div>
          <div className="mb-4"><label className="field-label">Confirm new password</label><input type="password" className="field-input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
          {pwMsg && <div className={`chip mb-3 ${pwMsg.k === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{pwMsg.t}</div>}
          <div className="flex justify-end"><button className="btn btn-pri" onClick={changePw}>Update password</button></div>
        </div>
      </div>
    </div>
  );
}

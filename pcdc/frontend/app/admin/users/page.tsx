"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import BulkImport from "@/components/BulkImport";
import EditUserModal from "@/components/EditUserModal";
import Toggle from "@/components/Toggle";
import { exportToExcel } from "@/lib/export";
import { Upload, Download, Pencil, Trash2, Send, Ban, Link2, X } from "lucide-react";

type Tab = "mentors" | "students";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending invite", cls: "bg-amber-100 text-amber-700" },
  accepted: { label: "Accepted", cls: "bg-blue-100 text-blue-700" },
  active: { label: "Active", cls: "bg-green-100 text-green-700" },
  inactive: { label: "Inactive", cls: "bg-slate-100 text-slate-600" },
  revoked: { label: "Revoked", cls: "bg-red-100 text-red-700" },
};
function StatusChip({ s }: { s: string }) {
  const c = STATUS[s] || { label: s, cls: "bg-slate-100 text-slate-600" };
  return <span className={`chip ${c.cls}`}>{c.label}</span>;
}
const isEnabled = (s: string) => s === "active" || s === "accepted";

export default function UserManagement() {
  const [tab, setTab] = useState<Tab>("mentors");
  const [mentors, setMentors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  // mentor (faculty) form
  const [m, setM] = useState({ full_name: "", email: "", phone: "", employee_id: "", designation: "", qualification: "", experience: "" });
  const [mSubs, setMSubs] = useState<number[]>([]);
  // student form
  const [st, setSt] = useState({ full_name: "", email: "", phone: "", college_id: "", program: "", batch: "", subject_id: 0 });

  async function load() {
    try {
      const [me, su, sb, fl] = await Promise.all([api("/api/mentors"), api("/api/students"), api("/api/subjects"), api("/api/users/fields")]);
      setMentors(me); setStudents(su); setSubjects(sb); setFields(fl);
      if (sb.length && !st.subject_id) setSt((x) => ({ ...x, subject_id: sb[0].id }));
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function inviteMentor(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try {
      await api("/api/mentors/invite", { method: "POST", body: JSON.stringify({ ...m, subject_ids: mSubs }) });
      setM({ full_name: "", email: "", phone: "", employee_id: "", designation: "", qualification: "", experience: "" }); setMSubs([]); setShowInvite(false); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function inviteStudent(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try {
      await api("/api/students/invite", { method: "POST", body: JSON.stringify(st) });
      setSt({ full_name: "", email: "", phone: "", college_id: "", program: "", batch: "", subject_id: subjects[0]?.id || 0 }); setShowInvite(false); load();
    } catch (e: any) { setErr(e.message); }
  }

  async function toggleStatus(u: any) {
    setErr("");
    const next = isEnabled(u.status) ? "inactive" : "active";
    try { await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) }); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function del(u: any) {
    setErr("");
    if (!confirm(`Delete ${u.full_name}? This permanently removes the account.`)) return;
    try { await api(`/api/users/${u.id}`, { method: "DELETE" }); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function revoke(u: any) {
    setErr(""); setNotice("");
    if (!confirm(`Revoke ${u.full_name}'s invitation? Their invite link will stop working immediately.`)) return;
    try { await api(`/api/users/${u.id}/revoke`, { method: "POST" }); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function resend(u: any) {
    setErr(""); setNotice("");
    try {
      const r = await api(`/api/users/${u.id}/resend-invite`, { method: "POST" });
      try { await navigator.clipboard.writeText(r.invite_link); } catch {}
      setNotice(`Invite sent to ${u.email}. Link copied: ${r.invite_link}`);
      load();
    } catch (e: any) { setErr(e.message); }
  }
  async function copyLink(u: any) {
    setErr(""); setNotice("");
    try {
      const r = await api(`/api/users/${u.id}/invite-link`);
      try { await navigator.clipboard.writeText(r.invite_link); } catch {}
      setNotice(`Invite link copied: ${r.invite_link}`);
    } catch (e: any) { setErr(e.message); }
  }

  const list = tab === "mentors" ? mentors : students;
  const cols: { h: string; v: (u: any) => string; bold?: boolean; muted?: boolean }[] = tab === "mentors"
    ? [
        { h: "Mentor", v: (u) => u.full_name, bold: true },
        { h: "Email", v: (u) => u.email, muted: true },
        { h: "Department", v: (u) => (u.departments || []).join(", ") || "—" },
        { h: "Designation", v: (u) => u.designation || "—" },
        { h: "Employee ID", v: (u) => u.employee_id || "—" },
        { h: "Experience", v: (u) => u.experience || "—" },
      ]
    : [
        { h: "Student", v: (u) => u.full_name, bold: true },
        { h: "Email", v: (u) => u.email, muted: true },
        { h: "Department", v: (u) => (u.departments || []).join(", ") || "—" },
        { h: "College ID", v: (u) => u.college_id || "—" },
        { h: "Program", v: (u) => u.program || "—" },
        { h: "Batch", v: (u) => u.batch || "—" },
      ];

  const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div className="mb-4"><label className="field-label">{label}</label>
      <input className="field-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>
  );

  function exportRows() {
    const data = list.map((u) => {
      const o: Record<string, any> = {};
      cols.forEach((c) => { o[c.h] = c.v(u); });
      fields.forEach((f) => { o[f.label] = u.extra?.[f.key] || ""; });
      o["Status"] = u.status;
      return o;
    });
    exportToExcel(tab, data);
  }

  return (
    <Shell title="User Management" subtitle="Manage faculty and students in one place."
      actions={<div className="flex gap-2">
        <button className="btn btn-gh inline-flex items-center gap-2" onClick={() => { setShowImport(true); setErr(""); }}><Upload size={16} /> Bulk import</button>
        <button className="btn btn-gh inline-flex items-center gap-2" onClick={exportRows} disabled={!list.length}><Download size={16} /> Export</button>
        <button className="btn btn-pri" onClick={() => { setShowInvite((v) => !v); setErr(""); }}>
          {showInvite ? "Close" : tab === "mentors" ? "+ Invite mentor" : "+ Invite student"}</button>
      </div>}>

      {showImport && <BulkImport onClose={() => setShowImport(false)} onDone={load} />}
      {editing && <EditUserModal user={editing} subjects={subjects} onClose={() => setEditing(null)} onSaved={load} />}

      <div className="inline-flex border border-line rounded-xl overflow-hidden mb-5 bg-white">
        {(["mentors", "students"] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setShowInvite(false); }}
            className={`px-5 py-2.5 text-sm font-semibold capitalize ${tab === t ? "bg-brand-600 text-white" : "text-slate2 hover:bg-brand-50"}`}>
            {t} <span className="opacity-70">({t === "mentors" ? mentors.length : students.length})</span>
          </button>
        ))}
      </div>

      {err && <div className="chip bg-red-100 text-red-700 mb-3">{err}</div>}
      {notice && (
        <div className="flex items-start gap-2 mb-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-[13px] px-3 py-2">
          <span className="flex-1 break-all">{notice}</span>
          <button onClick={() => setNotice("")} className="text-green-700 hover:text-green-900"><X size={15} /></button>
        </div>
      )}

      {showInvite && tab === "mentors" && (
        <div className="card mb-5">
          <h3 className="font-bold text-[15px] mb-4">Invite mentor</h3>
          <form onSubmit={inviteMentor}>
            <div className="grid md:grid-cols-2 gap-x-5">
              <Field label="Full name" value={m.full_name} onChange={(v) => setM({ ...m, full_name: v })} />
              <Field label="Email" value={m.email} onChange={(v) => setM({ ...m, email: v })} />
              <Field label="Phone" value={m.phone} onChange={(v) => setM({ ...m, phone: v })} placeholder="+91 …" />
              <Field label="Employee ID" value={m.employee_id} onChange={(v) => setM({ ...m, employee_id: v })} placeholder="PIBM-F-XXX" />
              <Field label="Designation" value={m.designation} onChange={(v) => setM({ ...m, designation: v })} placeholder="e.g. Assistant Professor" />
              <Field label="Qualification" value={m.qualification} onChange={(v) => setM({ ...m, qualification: v })} placeholder="e.g. PhD (Finance)" />
              <Field label="Experience" value={m.experience} onChange={(v) => setM({ ...m, experience: v })} placeholder="e.g. 8 yrs" />
            </div>
            <div className="mb-4"><label className="field-label">Departments</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const on = mSubs.includes(s.id);
                  return <span key={s.id} onClick={() => setMSubs(on ? mSubs.filter((x) => x !== s.id) : [...mSubs, s.id])}
                    className={`cursor-pointer px-3.5 py-2 rounded-full text-[13px] font-semibold border ${on ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200"}`}>{s.name}</span>;
                })}
                {subjects.length === 0 && <span className="text-slate2 text-sm">No departments yet — add some under Departments.</span>}
              </div>
            </div>
            <div className="flex justify-end"><button className="btn btn-pri">Send invitation</button></div>
          </form>
        </div>
      )}

      {showInvite && tab === "students" && (
        <div className="card mb-5">
          <h3 className="font-bold text-[15px] mb-4">Invite student</h3>
          <form onSubmit={inviteStudent}>
            <div className="grid md:grid-cols-2 gap-x-5">
              <Field label="Full name" value={st.full_name} onChange={(v) => setSt({ ...st, full_name: v })} />
              <Field label="Email" value={st.email} onChange={(v) => setSt({ ...st, email: v })} />
              <Field label="Phone" value={st.phone} onChange={(v) => setSt({ ...st, phone: v })} placeholder="+91 …" />
              <Field label="College ID" value={st.college_id} onChange={(v) => setSt({ ...st, college_id: v })} placeholder="PIBM-XXXX" />
              <Field label="Program" value={st.program} onChange={(v) => setSt({ ...st, program: v })} placeholder="e.g. PGDM" />
              <Field label="Batch" value={st.batch} onChange={(v) => setSt({ ...st, batch: v })} placeholder="e.g. 2024-26" />
              <div className="mb-4"><label className="field-label">Department</label>
                <select className="field-input" value={st.subject_id} onChange={(e) => setSt({ ...st, subject_id: Number(e.target.value) })}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
            </div>
            <div className="flex justify-end"><button className="btn btn-pri">Send invitation</button></div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate2 font-bold">
              {cols.map((c) => <th key={c.h} className="py-3 pr-4 border-b border-line">{c.h}</th>)}
              {fields.map((f) => <th key={f.key} className="py-3 pr-4 border-b border-line">{f.label}</th>)}
              <th className="py-3 pr-4 border-b border-line">Status</th>
              <th className="py-3 border-b border-line text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-brand-50/60">
                {cols.map((c) => <td key={c.h} className={`py-3.5 pr-4 border-b border-line ${c.bold ? "font-bold text-sm" : "text-[13px]"} ${c.muted ? "text-slate2" : ""}`}>{c.v(u)}</td>)}
                {fields.map((f) => <td key={f.key} className="py-3.5 pr-4 border-b border-line text-[13px] text-slate2">{u.extra?.[f.key] || "—"}</td>)}
                <td className="py-3.5 pr-4 border-b border-line"><StatusChip s={u.status} /></td>
                <td className="py-3.5 border-b border-line">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditing(u)} title="Edit"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-brand-700 hover:bg-brand-50"><Pencil size={16} /></button>

                    {/* pending: copy link / resend / revoke */}
                    {u.status === "pending" && <>
                      <button onClick={() => copyLink(u)} title="Copy invite link"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate2 hover:bg-neutral-100"><Link2 size={16} /></button>
                      <button onClick={() => resend(u)} title="Resend invitation"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-brand-700 hover:bg-brand-50"><Send size={15} /></button>
                      <button onClick={() => revoke(u)} title="Revoke invitation"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 hover:bg-red-50"><Ban size={16} /></button>
                    </>}

                    {/* revoked: re-invite */}
                    {u.status === "revoked" &&
                      <button onClick={() => resend(u)} title="Re-invite"
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-brand-700 hover:bg-brand-50 text-[13px] font-semibold"><Send size={14} /> Re-invite</button>}

                    {/* accepted / active / inactive: enable-disable toggle */}
                    {(isEnabled(u.status) || u.status === "inactive") &&
                      <Toggle on={isEnabled(u.status)} onChange={() => toggleStatus(u)} title={isEnabled(u.status) ? "Deactivate" : "Activate"} />}

                    <button onClick={() => del(u)} title="Delete"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={cols.length + fields.length + 2} className="py-4 text-slate2 text-sm">None yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

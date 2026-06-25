"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import BulkImport from "@/components/BulkImport";
import { UserPlus, Upload, Users, X } from "lucide-react";

function StatusChip({ s }: { s: string }) {
  const c: any = { active: "bg-green-100 text-green-700", accepted: "bg-blue-100 text-blue-700", pending: "bg-amber-100 text-amber-700", inactive: "bg-slate-100 text-slate-600", revoked: "bg-red-100 text-red-700" };
  return <span className={`chip ${c[s] || "bg-slate-100 text-slate-600"}`}>{s}</span>;
}

export default function MentorStudents() {
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [pane, setPane] = useState<"" | "invite" | "pick" | "import">("");
  const [inv, setInv] = useState({ full_name: "", email: "", college_id: "", program: "", batch: "", subject_id: 0 });
  const [directory, setDirectory] = useState<any[]>([]);
  const [pickDept, setPickDept] = useState(0);

  async function load() {
    try {
      const [students, meta] = await Promise.all([api("/api/students"), api("/api/case-studies/meta")]);
      setRows(students); setDepts(meta.departments);
      if (meta.departments[0]) { setInv((x) => ({ ...x, subject_id: x.subject_id || meta.departments[0].id })); setPickDept((d) => d || meta.departments[0].id); }
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function inviteStudent(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setNotice("");
    try {
      await api("/api/students/invite", { method: "POST", body: JSON.stringify(inv) });
      setInv({ full_name: "", email: "", college_id: "", program: "", batch: "", subject_id: depts[0]?.id || 0 });
      setPane(""); setNotice("Student invited."); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function openPick() {
    setErr(""); setPane("pick");
    try { setDirectory(await api("/api/students/directory")); } catch (e: any) { setErr(e.message); }
  }
  async function addExisting(studentId: number) {
    setErr("");
    try { await api(`/api/students/${studentId}/assign-department`, { method: "POST", body: JSON.stringify({ subject_id: pickDept }) }); openPick(); load(); }
    catch (e: any) { setErr(e.message); }
  }

  const list = rows.filter((u) => !q || u.full_name.toLowerCase().includes(q.toLowerCase()) || (u.email || "").toLowerCase().includes(q.toLowerCase()));
  const notInMyDept = directory.filter((d) => !d.extra?._in_my_dept);

  return (
    <Shell title="My Students" subtitle="Students in your departments."
      actions={<div className="flex gap-2">
        <button className="btn btn-gh inline-flex items-center gap-2" onClick={openPick}><Users size={16} /> Add existing</button>
        <button className="btn btn-gh inline-flex items-center gap-2" onClick={() => setPane("import")}><Upload size={16} /> Bulk import</button>
        <button className="btn btn-pri inline-flex items-center gap-2" onClick={() => setPane(pane === "invite" ? "" : "invite")}><UserPlus size={16} /> Invite student</button>
      </div>}>

      {err && <div className="chip bg-red-100 text-red-700 mb-3">{err}</div>}
      {notice && <div className="chip bg-green-100 text-green-700 mb-3">{notice}</div>}
      {pane === "import" && <BulkImport onClose={() => setPane("")} onDone={load} />}

      {/* invite form */}
      {pane === "invite" && (
        <div className="card mb-5">
          <h3 className="font-bold text-[15px] mb-4">Invite student</h3>
          <form onSubmit={inviteStudent}>
            <div className="grid md:grid-cols-2 gap-x-5">
              <div className="mb-4"><label className="field-label">Full name</label><input className="field-input" value={inv.full_name} onChange={(e) => setInv({ ...inv, full_name: e.target.value })} /></div>
              <div className="mb-4"><label className="field-label">Email</label><input className="field-input" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} /></div>
              <div className="mb-4"><label className="field-label">College ID</label><input className="field-input" value={inv.college_id} onChange={(e) => setInv({ ...inv, college_id: e.target.value })} placeholder="PIBM-XXXX" /></div>
              <div className="mb-4"><label className="field-label">Program</label><input className="field-input" value={inv.program} onChange={(e) => setInv({ ...inv, program: e.target.value })} placeholder="e.g. PGDM" /></div>
              <div className="mb-4"><label className="field-label">Batch</label><input className="field-input" value={inv.batch} onChange={(e) => setInv({ ...inv, batch: e.target.value })} placeholder="e.g. 2024-26" /></div>
              <div className="mb-4"><label className="field-label">Department</label>
                <select className="field-input" value={inv.subject_id} onChange={(e) => setInv({ ...inv, subject_id: Number(e.target.value) })}>
                  {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
            </div>
            <div className="flex justify-end"><button className="btn btn-pri">Send invitation</button></div>
          </form>
        </div>
      )}

      {/* pick existing modal */}
      {pane === "pick" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 overflow-y-auto">
          <div className="card w-full max-w-[640px] my-6">
            <div className="flex items-center justify-between mb-3"><h3 className="font-extrabold text-[16px]">Add existing students</h3>
              <button onClick={() => setPane("")} className="text-slate2 hover:text-ink"><X size={20} /></button></div>
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className="field-label !mb-0">Add to department</span>
              <select className="field-input !w-auto py-2" value={pickDept} onChange={(e) => setPickDept(Number(e.target.value))}>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="max-h-[360px] overflow-y-auto divide-y divide-line">
              {notInMyDept.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div><b className="text-sm">{s.full_name}</b><span className="text-slate2 text-[13px] ml-2">{s.email}</span>
                    <div className="text-slate2 text-[12px]">{(s.departments || []).join(", ") || "no department"}</div></div>
                  <button onClick={() => addExisting(s.id)} className="btn btn-gh py-1.5 px-3 text-xs">+ Add</button>
                </div>
              ))}
              {notInMyDept.length === 0 && <p className="text-slate2 text-sm py-3">All students are already in your departments.</p>}
            </div>
          </div>
        </div>
      )}

      <input className="field-input !w-auto min-w-[240px] mb-4" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-[11.5px] uppercase tracking-wide text-slate2 font-bold">
            {["Student", "Email", "Department", "College ID", "Program", "Batch", "Status"].map((h) => <th key={h} className="py-3 pr-4 border-b border-line">{h}</th>)}
          </tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-brand-50/60">
                <td className="py-3.5 pr-4 border-b border-line font-bold text-sm">{u.full_name}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px] text-slate2">{u.email}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{(u.departments || []).join(", ") || "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{u.college_id || "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{u.program || "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{u.batch || "—"}</td>
                <td className="py-3.5 border-b border-line"><StatusChip s={u.status} /></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="py-4 text-slate2 text-sm">No students in your departments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

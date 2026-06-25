"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Trash2, Pencil, Check, X, Upload, Download } from "lucide-react";
import Toggle from "@/components/Toggle";
import DeptImport from "@/components/DeptImport";
import { exportToExcel } from "@/lib/export";

function fmt(d?: string) {
  if (!d) return "—";
  const dt = new Date(d.endsWith("Z") ? d : d + "Z");
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function Departments() {
  const [rows, setRows] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(0);
  const [editName, setEditName] = useState("");
  const [showImport, setShowImport] = useState(false);

  function exportRows() {
    exportToExcel("departments", rows.map((s) => ({
      Department: s.name, "Head of Department": s.head_name || "", Status: s.status,
      "Created at": s.created_at || "", "Updated at": s.updated_at || "",
    })));
  }

  async function load() {
    try {
      const [subs, ment] = await Promise.all([api("/api/subjects"), api("/api/mentors")]);
      setRows(subs); setMentors(ment);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const v = name.trim();
    if (!v) { setErr("Enter a department name."); return; }
    setBusy(true);
    try {
      await api("/api/subjects", { method: "POST", body: JSON.stringify({ name: v }) });
      setName(""); await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function setHead(id: number, head_id: number, current: number) {
    if (head_id === current) return;   // idempotent: ignore no-op change events
    setErr("");
    try { await api(`/api/subjects/${id}`, { method: "PATCH", body: JSON.stringify({ head_id }) }); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  async function saveEdit(id: number) {
    const v = editName.trim();
    if (!v) { setErr("Department name cannot be empty."); return; }
    setErr("");
    try { await api(`/api/subjects/${id}`, { method: "PATCH", body: JSON.stringify({ name: v }) }); setEditId(0); await load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function toggleStatus(s: any) {
    setErr("");
    const next = s.status === "active" ? "inactive" : "active";
    try { await api(`/api/subjects/${s.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) }); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  async function del(id: number) {
    setErr("");
    if (!confirm("Delete this department? Users mapped to it will lose the mapping.")) return;
    try { await api(`/api/subjects/${id}`, { method: "DELETE" }); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <Shell title="Departments" subtitle="Specializations students & faculty are mapped to. Each can have a Head of Department."
      actions={<div className="flex gap-2">
        <button className="btn btn-gh inline-flex items-center gap-2" onClick={() => setShowImport(true)}><Upload size={16} /> Bulk import</button>
        <button className="btn btn-gh inline-flex items-center gap-2" onClick={exportRows} disabled={!rows.length}><Download size={16} /> Export</button>
      </div>}>
      {showImport && <DeptImport onClose={() => setShowImport(false)} onDone={load} />}
      <div className="card">
        <form onSubmit={add} className="flex items-end gap-3 mb-5">
          <div className="flex-1">
            <label className="field-label">New department</label>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Business Analytics" />
          </div>
          <button type="submit" className="btn btn-pri" disabled={busy}>{busy ? "Adding…" : "+ Add"}</button>
        </form>
        {err && <div className="chip bg-red-100 text-red-700 mb-3">{err}</div>}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate2 font-bold">
                <th className="py-3 pr-4 border-b border-line">Department</th>
                <th className="py-3 pr-4 border-b border-line">Head of Department</th>
                <th className="py-3 pr-4 border-b border-line">Status</th>
                <th className="py-3 pr-4 border-b border-line">Created at</th>
                <th className="py-3 pr-4 border-b border-line">Updated at</th>
                <th className="py-3 border-b border-line text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-brand-50/60">
                  <td className="py-3.5 pr-4 border-b border-line font-bold text-sm">
                    {editId === s.id
                      ? <input autoFocus className="field-input py-1.5" value={editName} onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(s.id); if (e.key === "Escape") setEditId(0); }} />
                      : s.name}
                  </td>
                  <td className="py-3.5 pr-4 border-b border-line">
                    <select className="field-input py-1.5 !w-auto min-w-[180px]" value={s.head_id || 0}
                      onChange={(e) => setHead(s.id, Number(e.target.value), s.head_id || 0)}>
                      <option value={0}>— Unassigned —</option>
                      {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      {/* fallback so the select always has a matching option even before mentors load */}
                      {s.head_id && !mentors.some((m) => m.id === s.head_id) && <option value={s.head_id}>{s.head_name}</option>}
                    </select>
                  </td>
                  <td className="py-3.5 pr-4 border-b border-line">
                    <span className={`chip ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{s.status}</span>
                  </td>
                  <td className="py-3.5 pr-4 border-b border-line text-[13px] text-slate2">{fmt(s.created_at)}</td>
                  <td className="py-3.5 pr-4 border-b border-line text-[13px] text-slate2">{fmt(s.updated_at)}</td>
                  <td className="py-3.5 border-b border-line">
                    <div className="flex items-center justify-end gap-1">
                      {editId === s.id ? (
                        <>
                          <button onClick={() => saveEdit(s.id)} title="Save" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-green-600 hover:bg-green-50"><Check size={17} /></button>
                          <button onClick={() => setEditId(0)} title="Cancel" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate2 hover:bg-neutral-100"><X size={17} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(s.id); setEditName(s.name); }} title="Rename" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-brand-700 hover:bg-brand-50"><Pencil size={16} /></button>
                          <Toggle on={s.status === "active"} onChange={() => toggleStatus(s)} title={s.status === "active" ? "Deactivate" : "Activate"} />
                          <button onClick={() => del(s.id)} title="Delete department" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-slate2 text-sm">No departments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

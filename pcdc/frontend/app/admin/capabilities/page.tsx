"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Trash2, Pencil, Check, X, Download } from "lucide-react";
import { exportToExcel } from "@/lib/export";

const FAMILIES = ["Cognitive", "Leadership", "Entrepreneurial", "Professional"];

export default function Capabilities() {
  const [rows, setRows] = useState<any[]>([]);
  const [family, setFamily] = useState(FAMILIES[0]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(0);
  const [editName, setEditName] = useState("");

  async function load() {
    try { setRows(await api("/api/capabilities")); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!name.trim()) { setErr("Enter a capability name."); return; }
    setBusy(true);
    try {
      await api("/api/capabilities", { method: "POST", body: JSON.stringify({ family, name: name.trim() }) });
      setName(""); await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function del(id: number) {
    try { await api(`/api/capabilities/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { setErr(e.message); }
  }
  async function saveEdit(id: number) {
    const v = editName.trim();
    if (!v) { setErr("Capability name cannot be empty."); return; }
    setErr("");
    try { await api(`/api/capabilities/${id}`, { method: "PATCH", body: JSON.stringify({ name: v }) }); setEditId(0); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <Shell title="Capabilities" subtitle="The capability framework. Case studies map to one or more of these — Super-Admin configurable."
      actions={<button className="btn btn-gh inline-flex items-center gap-2" disabled={!rows.length}
        onClick={() => exportToExcel("capabilities", rows.map((c) => ({ Family: c.family, Capability: c.name })))}><Download size={16} /> Export</button>}>
      <div className="card mb-5">
        <form onSubmit={add} className="grid md:grid-cols-[200px_1fr_auto] gap-3 items-end">
          <div><label className="field-label">Family</label>
            <select className="field-input" value={family} onChange={(e) => setFamily(e.target.value)}>
              {FAMILIES.map((f) => <option key={f}>{f}</option>)}
            </select></div>
          <div><label className="field-label">New capability</label>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Systems Thinking" /></div>
          <button type="submit" className="btn btn-pri" disabled={busy}>{busy ? "Adding…" : "+ Add"}</button>
        </form>
        {err && <div className="chip bg-red-100 text-red-700 mt-3">{err}</div>}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {FAMILIES.map((f) => {
          const items = rows.filter((r) => r.family === f);
          return (
            <div key={f} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[15px]">{f} Capabilities</h3>
                <span className="chip bg-brand-50 text-brand-700">{items.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((c) => (
                  editId === c.id ? (
                    <span key={c.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border border-brand-300">
                      <input autoFocus className="text-[13px] outline-none w-[130px] px-1" value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c.id); if (e.key === "Escape") setEditId(0); }} />
                      <button onClick={() => saveEdit(c.id)} title="Save" className="text-green-600"><Check size={14} /></button>
                      <button onClick={() => setEditId(0)} title="Cancel" className="text-slate2"><X size={14} /></button>
                    </span>
                  ) : (
                    <span key={c.id} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-brand-600 text-white text-[13px] font-semibold">
                      {c.name}
                      <button onClick={() => { setEditId(c.id); setEditName(c.name); }} title="Rename" className="opacity-80 hover:opacity-100"><Pencil size={12} /></button>
                      <button onClick={() => del(c.id)} title="Remove" className="opacity-80 hover:opacity-100"><Trash2 size={13} /></button>
                    </span>
                  )
                ))}
                {items.length === 0 && <span className="text-slate2 text-sm">None yet.</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

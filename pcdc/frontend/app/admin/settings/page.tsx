"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Trash2 } from "lucide-react";

type Param = { id?: number; name: string; weight: number; active: boolean };

export default function Settings() {
  const [params, setParams] = useState<Param[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const rows = await api("/api/scoring-parameters");
      setParams(rows.map((r: any) => ({ id: r.id, name: r.name, weight: r.weight, active: r.active })));
    } catch (e: any) { setMsg({ kind: "err", text: e.message }); }
  }
  useEffect(() => { load(); }, []);

  const total = params.filter((p) => p.active).reduce((s, p) => s + (Number(p.weight) || 0), 0);

  function update(i: number, patch: Partial<Param>) {
    setParams(params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addRow() { setParams([...params, { name: "", weight: 0, active: true }]); }
  function removeRow(i: number) { setParams(params.filter((_, idx) => idx !== i)); }

  async function save() {
    setMsg(null);
    if (total !== 100) { setMsg({ kind: "err", text: `Active weights must total 100 (currently ${total}).` }); return; }
    setBusy(true);
    try {
      await api("/api/scoring-parameters", {
        method: "PUT",
        body: JSON.stringify(params.map((p) => ({ name: p.name, weight: Number(p.weight), active: p.active }))),
      });
      await load();
      setMsg({ kind: "ok", text: "Scoring scheme saved." });
    } catch (e: any) { setMsg({ kind: "err", text: e.message }); } finally { setBusy(false); }
  }

  return (
    <Shell title="Settings" subtitle="Super-Admin configuration · scoring scheme.">
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        <div className="card"><h3 className="font-bold text-[15px] mb-1">Pass mark</h3><div className="text-[40px] font-extrabold leading-none">75<span className="text-[18px] text-slate2">/100</span></div><p className="text-slate2 text-sm mt-2">≥ this auto-advances to the next level (1–5).</p></div>
        <div className="card"><h3 className="font-bold text-[15px] mb-2">Completion tiers</h3>
          <div className="text-sm space-y-2"><div className="flex justify-between"><span>Completed</span><b>100% submitted</b></div><div className="flex justify-between"><span>Incomplete</span><b>≥ 70%</b></div><div className="flex justify-between"><span>Disqualified</span><b>&lt; 70%</b></div></div></div>
        <div className="card"><h3 className="font-bold text-[15px] mb-2">Disqualification</h3><span className="chip bg-red-100 text-red-700">&lt; 70% in time → Rejected</span><p className="text-slate2 text-[13px] mt-2">"Try again later. Contact your faculty/admin." Mentor can re-assign.</p></div>
      </div>

      <div className="card max-w-[760px]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-[15px]">Scoring parameters &amp; weights</h3>
          <span className={`chip ${total === 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>Total: {total} / 100</span>
        </div>
        <p className="text-slate2 text-[13px] mb-4">Scoring is out of 100, weighted across these parameters. Active weights must total 100.</p>

        <div className="space-y-2.5">
          {params.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <input className="field-input flex-1" value={p.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Parameter name" />
              <input type="number" className="field-input w-24" value={p.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })} />
              <label className="flex items-center gap-1.5 text-[13px] text-slate2 w-20"><input type="checkbox" checked={p.active} onChange={(e) => update(i, { active: e.target.checked })} /> active</label>
              <button onClick={() => removeRow(i)} title="Remove" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        <button onClick={addRow} className="btn btn-gh mt-3 py-2 px-3 text-xs">+ Add parameter</button>

        {msg && <div className={`chip mt-4 ${msg.kind === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{msg.text}</div>}
        <div className="flex justify-end mt-4"><button className="btn btn-pri" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save scheme"}</button></div>
      </div>
    </Shell>
  );
}

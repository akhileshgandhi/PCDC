"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import Toggle from "@/components/Toggle";
import { BarList, TrendBars, Donut } from "@/components/Charts";
import { exportToExcel } from "@/lib/export";
import { Eye, Trash2, Download } from "lucide-react";

function fmtDate(d?: string) {
  if (!d) return "—";
  const s = d.includes("T") && !d.endsWith("Z") ? d + "Z" : d;
  const dt = new Date(s);
  return isNaN(+dt) ? "—" : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
const bandColor = (d: { label: string }) =>
  d.label.startsWith("Rejected") ? "bg-red-400" : d.label.startsWith("Incomplete") ? "bg-amber-400" : "bg-green-500";

function Stat({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return <div className="card"><div className="text-slate2 text-[12.5px] font-semibold">{label}</div>
    <div className="text-[30px] font-extrabold mt-1.5 tracking-tight">{value}</div>
    {sub && <div className="text-slate2 text-xs mt-0.5">{sub}</div>}</div>;
}

export default function CaseStudies() {
  const [rows, setRows] = useState<any[]>([]);
  const [an, setAn] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [f, setF] = useState({ subject_id: "", level: "", status: "", author_id: "", days: "", q: "" });
  const [err, setErr] = useState("");

  async function loadList() {
    const p = new URLSearchParams();
    if (f.subject_id) p.set("subject_id", f.subject_id);
    if (f.level) p.set("level", f.level);
    if (f.status) p.set("status", f.status);
    if (f.author_id) p.set("author_id", f.author_id);
    if (f.days) p.set("days", f.days);
    if (f.q) p.set("q", f.q);
    try { setRows(await api("/api/case-studies" + (p.toString() ? `?${p}` : ""))); } catch (e: any) { setErr(e.message); }
  }

  function exportRows() {
    exportToExcel("case-studies", rows.map((c) => ({
      "Case study": c.title, Department: c.department || "", Author: c.author || "", Level: c.level,
      "Launch date": c.launch_at || "", Mode: c.launch_mode, Answered: c.answered, Assigned: c.assigned,
      "Avg score": c.avg_score ?? "", "Pass rate %": c.pass_rate ?? "", Status: c.status,
    })));
  }
  async function loadMeta() {
    try {
      const [a, s, m] = await Promise.all([api("/api/case-studies/analytics"), api("/api/subjects"), api("/api/mentors")]);
      setAn(a); setSubjects(s); setMentors(m);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadList(); }, [f]);

  async function toggle(c: any) {
    setErr("");
    try { await api(`/api/case-studies/${c.id}`, { method: "PATCH", body: JSON.stringify({ status: c.status === "active" ? "inactive" : "active" }) }); loadList(); loadMeta(); }
    catch (e: any) { setErr(e.message); }
  }
  async function del(c: any) {
    setErr("");
    if (!confirm(`Delete "${c.title}" and all its attempt data?`)) return;
    try { await api(`/api/case-studies/${c.id}`, { method: "DELETE" }); loadList(); loadMeta(); }
    catch (e: any) { setErr(e.message); }
  }

  const t = an?.totals;
  return (
    <Shell title="Case Studies" subtitle="Every case study across all departments — launch dates, status & analytics."
      actions={<button className="btn btn-gh inline-flex items-center gap-2" onClick={exportRows} disabled={!rows.length}><Download size={16} /> Export</button>}>
      {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}

      {/* summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Stat label="Case studies" value={t ? t.case_studies : "…"} sub={t ? `${t.active} active · ${t.inactive} inactive` : ""} />
        <Stat label="Total attempts" value={t ? t.attempts : "…"} sub={t ? `${t.answered} answered` : ""} />
        <Stat label="Students engaged" value={t ? t.unique_students : "…"} sub="unique" />
        <Stat label="Avg score" value={t?.avg_score ?? "—"} sub="out of 100" />
        <Stat label="Pass rate" value={t ? `${t.pass_rate ?? 0}%` : "…"} sub="score ≥ 75" />
        <Stat label="Disqualified" value={t ? `${t.disqualification_rate ?? 0}%` : "…"} sub="of answered" />
      </div>

      {/* charts */}
      {an && (
        <div className="grid lg:grid-cols-2 gap-5 mb-6">
          <div className="card"><h3 className="font-bold text-[15px] mb-4">Submissions over time</h3><TrendBars data={an.attempts_over_time} /></div>
          <div className="card"><h3 className="font-bold text-[15px] mb-4">Score distribution</h3><Donut data={an.score_bands} /></div>
          <div className="card"><h3 className="font-bold text-[15px] mb-4">Case studies by level</h3><BarList data={an.by_level} /></div>
          <div className="card"><h3 className="font-bold text-[15px] mb-4">Case studies by department</h3><BarList data={an.by_department} /></div>
          <div className="card"><h3 className="font-bold text-[15px] mb-4">Most attempted</h3>
            <BarList data={an.most_attempted.map((m: any) => ({ label: m.title, value: m.attempts }))} /></div>
          <div className="card"><h3 className="font-bold text-[15px] mb-4">Hardest (lowest avg score)</h3>
            <BarList data={an.hardest.map((m: any) => ({ label: m.title, value: m.avg_score ?? 0 }))} colorFor={() => "bg-amber-400"} /></div>
        </div>
      )}

      {/* filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <input className="field-input !w-auto flex-1 min-w-[200px]" placeholder="Search title…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className="field-input !w-auto" value={f.subject_id} onChange={(e) => setF({ ...f, subject_id: e.target.value })}>
          <option value="">All departments</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="field-input !w-auto" value={f.author_id} onChange={(e) => setF({ ...f, author_id: e.target.value })}>
          <option value="">All mentors</option>
          {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <select className="field-input !w-auto" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
          <option value="">All levels</option>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}
        </select>
        <select className="field-input !w-auto" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">All status</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
        <select className="field-input !w-auto" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}>
          <option value="">Any time</option>
          <option value="7">Launched: last 7 days</option>
          <option value="30">Launched: last 30 days</option>
          <option value="90">Launched: last 90 days</option>
        </select>
      </div>

      {/* table */}
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate2 font-bold">
              {["Case study", "Department", "Author", "Level", "Launch date", "Mode", "Answered", "Avg", "Pass", "Status", "Actions"].map((h) =>
                <th key={h} className="py-3 pr-4 border-b border-line whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-brand-50/60">
                <td className="py-3.5 pr-4 border-b border-line font-bold text-sm">{c.title}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{c.department || "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px] text-slate2">{c.author || "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]"><span className="chip bg-brand-50 text-brand-700">L{c.level}</span></td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px] text-slate2">{fmtDate(c.launch_at)}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{c.launch_mode === "fixed_window" ? "Fixed window" : "Open"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px] font-semibold">{c.answered}<span className="text-slate2 font-normal"> / {c.assigned}</span></td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px] font-semibold">{c.avg_score ?? "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{c.pass_rate != null ? `${c.pass_rate}%` : "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line"><span className={`chip ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{c.status}</span></td>
                <td className="py-3.5 border-b border-line">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/case-studies/${c.id}`} title="View analytics" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-brand-700 hover:bg-brand-50"><Eye size={16} /></Link>
                    <Toggle on={c.status === "active"} onChange={() => toggle(c)} title={c.status === "active" ? "Deactivate" : "Activate"} />
                    <button onClick={() => del(c)} title="Delete" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="py-4 text-slate2 text-sm">No case studies match.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

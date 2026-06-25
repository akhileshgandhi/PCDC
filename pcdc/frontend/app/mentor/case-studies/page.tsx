"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import Toggle from "@/components/Toggle";
import { Plus, Eye, Pencil, Trash2, Rocket } from "lucide-react";

function fmtDate(d?: string) {
  if (!d) return "—";
  const s = d.includes("T") && !d.endsWith("Z") ? d + "Z" : d;
  const dt = new Date(s);
  return isNaN(+dt) ? "—" : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
const isClosed = (d?: string) => { if (!d) return false; const s = d.includes("T") && !d.endsWith("Z") ? d + "Z" : d; return new Date(s).getTime() < Date.now(); };

export default function MentorCaseStudies() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    try { setRows(await api("/api/case-studies" + (p.toString() ? `?${p}` : ""))); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [status, q]);

  async function toggle(c: any) {
    setErr("");
    try { await api(`/api/case-studies/${c.id}`, { method: "PATCH", body: JSON.stringify({ status: c.status === "active" ? "inactive" : "active" }) }); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function launch(c: any) {
    setErr("");
    if (!confirm(`Launch "${c.title}"? It will go live and accept responses until ${fmtDate(c.close_at)}.`)) return;
    try { await api(`/api/case-studies/${c.id}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) }); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function del(c: any) {
    setErr("");
    if (!confirm(`Delete "${c.title}" and all its attempt data?`)) return;
    try { await api(`/api/case-studies/${c.id}`, { method: "DELETE" }); load(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <Shell title="My Case Studies" subtitle="Author, launch and track case studies in your departments."
      actions={<Link href="/mentor/case-studies/new" className="btn btn-pri inline-flex items-center gap-2"><Plus size={16} /> New case study</Link>}>
      {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <input className="field-input !w-auto flex-1 min-w-[200px]" placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field-input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option><option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-[11.5px] uppercase tracking-wide text-slate2 font-bold">
            {["Case study", "Department", "Level", "Launch date", "Answered", "Avg", "Pass", "Status", "Actions"].map((h) =>
              <th key={h} className="py-3 pr-4 border-b border-line whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} onClick={() => router.push(`/mentor/case-studies/${c.id}`)} className="hover:bg-brand-50/60 cursor-pointer">
                <td className="py-3.5 pr-4 border-b border-line font-bold text-sm text-brand-700">{c.title}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{c.department || "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]"><span className="chip bg-brand-50 text-brand-700">L{c.level}</span></td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px] text-slate2">{fmtDate(c.launch_at)}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px] font-semibold">{c.answered}<span className="text-slate2 font-normal"> / {c.assigned}</span></td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px] font-semibold">{c.avg_score ?? "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line text-[13px]">{c.pass_rate != null ? `${c.pass_rate}%` : "—"}</td>
                <td className="py-3.5 pr-4 border-b border-line">
                  {c.status === "active" && isClosed(c.close_at)
                    ? <span className="chip bg-red-100 text-red-700">closed</span>
                    : <span className={`chip ${c.status === "active" ? "bg-green-100 text-green-700" : c.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{c.status === "active" ? "live" : c.status}</span>}
                </td>
                <td className="py-3.5 border-b border-line" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {c.status === "draft" && <button onClick={() => launch(c)} title="Launch" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-[13px] font-semibold"><Rocket size={14} /> Launch</button>}
                    <Link href={`/mentor/case-studies/${c.id}`} title="View analytics" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-brand-700 hover:bg-brand-50"><Eye size={16} /></Link>
                    <Link href={`/mentor/case-studies/${c.id}/edit`} title="Edit" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Link>
                    {c.status !== "draft" && <Toggle on={c.status === "active"} onChange={() => toggle(c)} title={c.status === "active" ? "Pause" : "Resume"} />}
                    <button onClick={() => del(c)} title="Delete" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="py-4 text-slate2 text-sm">No case studies yet — create your first one.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

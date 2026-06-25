"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { BarList, Funnel } from "@/components/Charts";
import AttemptReportCard from "@/components/AttemptReportCard";
import { ArrowLeft, Users, Clock, FileText } from "lucide-react";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const s = d.includes("T") && !d.endsWith("Z") ? d + "Z" : d;
  const dt = new Date(s);
  return isNaN(+dt) ? "—" : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
const mins = (s?: number | null) => (s == null ? "—" : `${Math.round(s / 60)} min`);

function timeToClose(launchMode: string, closeAt?: string | null) {
  if (launchMode !== "fixed_window" || !closeAt) return { text: "Open — no scheduled close", tone: "open" };
  const end = new Date(closeAt.endsWith("Z") || closeAt.includes("+") ? closeAt : closeAt + "Z").getTime();
  const diff = end - Date.now();
  if (diff <= 0) return { text: "Closed", tone: "closed" };
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000);
  const text = d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  return { text, tone: diff < 86400000 ? "soon" : "ok" };
}

function StatusChip({ s }: { s: string }) {
  const c: any = { completed: "bg-green-100 text-green-700", submitted: "bg-blue-100 text-blue-700", disqualified: "bg-red-100 text-red-700", in_progress: "bg-amber-100 text-amber-700" };
  return <span className={`chip ${c[s] || "bg-slate-100 text-slate-600"}`}>{s.replace("_", " ")}</span>;
}

export default function CaseStudyAnalytics({ id, backHref }: { id: string | number; backHref: string }) {
  const [d, setD] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [det, att] = await Promise.all([api(`/api/case-studies/${id}`), api(`/api/case-studies/${id}/attempts`)]);
        setD(det); setAttempts(att);
      } catch (e: any) { setErr(e.message); }
    })();
  }, [id]);

  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(t); }, []);

  async function downloadAttachment() {
    try {
      const res = await api(`/api/case-studies/${id}/attachment`);
      const bytes = Uint8Array.from(atob(res.data), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes]));
      const a = document.createElement("a"); a.href = url; a.download = res.name || "brief"; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setErr(e.message); }
  }

  if (err) return <div className="chip bg-red-100 text-red-700">{err}</div>;
  if (!d) return <p className="text-slate2">Loading…</p>;
  const s = d.stats;
  const Stat = ({ label, value }: { label: string; value: any }) => (
    <div className="card"><div className="text-slate2 text-[12.5px] font-semibold">{label}</div>
      <div className="text-[26px] font-extrabold mt-1 tracking-tight">{value}</div></div>
  );

  const ttc = timeToClose(d.launch_mode, d.close_at);
  const ttcCls = ttc.tone === "soon" ? "text-amber-600" : ttc.tone === "closed" ? "text-red-600" : ttc.tone === "open" ? "text-slate2" : "text-green-600";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div><h2 className="text-xl font-extrabold">{d.title}</h2><p className="text-slate2 text-sm mt-0.5">{d.department} · authored by {d.author}</p></div>
        <Link href={backHref} className="btn btn-gh inline-flex items-center gap-2"><ArrowLeft size={16} /> Back</Link>
      </div>

      {/* highlight strip: who answered + time to close */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div className="card flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center flex-none"><Users size={20} /></span>
          <div><div className="text-[26px] font-extrabold leading-none">{s.answered}<span className="text-[15px] text-slate2"> / {d.funnel.assigned}</span></div>
            <div className="text-slate2 text-[13px] mt-1">students answered</div></div>
        </div>
        <div className="card flex items-center gap-4">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-none ${ttc.tone === "soon" ? "bg-amber-100 text-amber-600" : ttc.tone === "closed" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}><Clock size={20} /></span>
          <div><div className={`text-[22px] font-extrabold leading-none ${ttcCls}`}>{ttc.text}</div>
            <div className="text-slate2 text-[13px] mt-1">{d.launch_mode === "fixed_window" && d.close_at ? `closes ${fmtDate(d.close_at)}` : "time to close"}</div></div>
        </div>
      </div>

      <div className="card mb-5">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="chip bg-brand-50 text-brand-700">Level {d.level}</span>
          <span className={`chip ${d.status === "active" ? "bg-green-100 text-green-700" : d.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{d.status}</span>
          <span className="chip bg-neutral-100 text-slate2">{d.launch_mode === "fixed_window" ? "Fixed window" : "Open window"}</span>
          {d.capabilities.map((c: string) => <span key={c} className="chip bg-brand-600 text-white">{c}</span>)}
        </div>
        <p className="text-slate2 text-sm mb-3">{d.scenario}</p>
        {d.attachment_name && (
          <button onClick={downloadAttachment} className="inline-flex items-center gap-2 chip bg-brand-50 text-brand-700 mb-3 cursor-pointer hover:bg-brand-100">
            <FileText size={13} /> {d.attachment_name} · download
          </button>
        )}
        {d.questions?.length > 0 && (
          <div className="mb-4">
            <div className="field-label mb-1.5">Questions ({d.questions.length})</div>
            <ol className="list-decimal pl-5 space-y-1 text-[13px]">{d.questions.map((q: string, i: number) => <li key={i}>{q}</li>)}</ol>
          </div>
        )}
        <div className="grid md:grid-cols-4 gap-4 text-[13px]">
          <div><div className="field-label">Launched</div>{fmtDate(d.launch_at)}</div>
          <div><div className="field-label">Closes</div>{fmtDate(d.close_at)}</div>
          <div><div className="field-label">Reading / Attempt time</div>{mins(d.reading_time_sec)} / {mins(d.attempt_time_sec)}</div>
          <div><div className="field-label">Pass / Disqualify</div>{d.pass_mark} / &lt;{d.disqualify_threshold}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        <Stat label="Answered" value={s.answered} />
        <Stat label="Avg score" value={s.avg_score ?? "—"} />
        <Stat label="Median" value={s.median_score ?? "—"} />
        <Stat label="Pass rate" value={s.pass_rate != null ? `${s.pass_rate}%` : "—"} />
        <Stat label="Disqualified" value={s.disqualification_rate != null ? `${s.disqualification_rate}%` : "—"} />
        <Stat label="Avg time" value={mins(s.avg_time_sec)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="card"><h3 className="font-bold text-[15px] mb-4">Participation funnel</h3>
          <Funnel steps={[
            { label: "Assigned", value: d.funnel.assigned }, { label: "Started", value: d.funnel.started },
            { label: "Submitted", value: d.funnel.submitted }, { label: "Completed", value: d.funnel.completed },
            { label: "Disqualified", value: d.funnel.disqualified },
          ]} /></div>
        <div className="card"><h3 className="font-bold text-[15px] mb-4">Score distribution</h3><BarList data={d.score_distribution} /></div>
        <div className="card lg:col-span-2"><h3 className="font-bold text-[15px] mb-4">Average score by capability</h3>
          <BarList data={d.per_capability} colorFor={() => "bg-brand-600"} /></div>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="font-bold text-[15px] mb-1">Submissions ({attempts.length})</h3>
        <p className="text-slate2 text-[13px] mb-3">Click a student to see their answer and AI report card.</p>
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-[11.5px] uppercase tracking-wide text-slate2 font-bold">
            {["Student", "Department", "Score", "Status", "Time taken", "Revised", "Submitted", ""].map((h, i) => <th key={i} className="py-3 pr-4 border-b border-line">{h}</th>)}
          </tr></thead>
          <tbody>
            {attempts.map((a) => {
              const clickable = a.status !== "in_progress";
              return (
                <tr key={a.id} onClick={() => clickable && setSelected(a.id)}
                  className={`${clickable ? "cursor-pointer hover:bg-brand-50/60" : "opacity-60"}`}>
                  <td className="py-3 pr-4 border-b border-line font-semibold text-sm">{a.student_name}</td>
                  <td className="py-3 pr-4 border-b border-line text-[13px] text-slate2">{a.department || "—"}</td>
                  <td className="py-3 pr-4 border-b border-line text-[13px] font-bold">{a.score ?? "—"}</td>
                  <td className="py-3 pr-4 border-b border-line"><StatusChip s={a.status} /></td>
                  <td className="py-3 pr-4 border-b border-line text-[13px]">{mins(a.time_taken_sec)}</td>
                  <td className="py-3 pr-4 border-b border-line text-[13px]">{a.revise_used ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4 border-b border-line text-[13px] text-slate2">{fmtDate(a.submitted_at)}</td>
                  <td className="py-3 border-b border-line text-right">
                    {clickable && <span className="inline-flex items-center gap-1.5 text-brand-700 text-[13px] font-semibold"><FileText size={14} /> Report card</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected != null && <AttemptReportCard caseId={id} attemptId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

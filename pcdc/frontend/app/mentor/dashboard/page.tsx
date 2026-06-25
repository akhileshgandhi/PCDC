"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Donut, BarList } from "@/components/Charts";
import { Plus } from "lucide-react";

function Stat({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return <div className="card"><div className="text-slate2 text-[12.5px] font-semibold">{label}</div>
    <div className="text-[30px] font-extrabold mt-1.5 tracking-tight">{value}</div>
    {sub && <div className="text-slate2 text-xs mt-0.5">{sub}</div>}</div>;
}

export default function MentorDashboard() {
  const [an, setAn] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [a, l, s] = await Promise.all([api("/api/case-studies/analytics"), api("/api/case-studies"), api("/api/students")]);
        setAn(a); setList(l); setStudents(s);
      } catch (e: any) { setErr(e.message); }
    })();
  }, []);

  const t = an?.totals;
  return (
    <Shell title="Mentor Dashboard" subtitle="Your case studies and how your students are performing."
      actions={<Link href="/mentor/case-studies/new" className="btn btn-pri inline-flex items-center gap-2"><Plus size={16} /> New case study</Link>}>
      {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Stat label="My case studies" value={t ? t.case_studies : "…"} sub={t ? `${t.active} active` : ""} />
        <Stat label="Submissions" value={t ? t.answered : "…"} sub="answered" />
        <Stat label="Students engaged" value={t ? t.unique_students : "…"} sub="unique" />
        <Stat label="Avg score" value={t?.avg_score ?? "—"} sub="out of 100" />
        <Stat label="Pass rate" value={t ? `${t.pass_rate ?? 0}%` : "…"} sub="score ≥ 75" />
        <Stat label="My students" value={students.length} sub="in my departments" />
      </div>

      {an && (
        <div className="grid lg:grid-cols-2 gap-5 mb-6">
          <div className="card"><h3 className="font-bold text-[15px] mb-4">Score distribution</h3><Donut data={an.score_bands} /></div>
          <div className="card"><h3 className="font-bold text-[15px] mb-4">My case studies by level</h3><BarList data={an.by_level} /></div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px]">My case studies</h3>
          <Link href="/mentor/case-studies" className="text-brand-700 text-sm font-semibold">View all →</Link>
        </div>
        {list.length === 0 ? <p className="text-slate2 text-sm">No case studies yet — create your first one.</p> : (
          <div className="divide-y divide-line">
            {list.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/mentor/case-studies/${c.id}`} className="flex items-center justify-between py-3 hover:bg-brand-50/60 -mx-2 px-2 rounded">
                <div><b className="text-sm">{c.title}</b><span className="text-slate2 text-[13px] ml-3">{c.department} · L{c.level}</span></div>
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="text-slate2">{c.answered} answered</span>
                  <span className={`chip ${c.status === "active" ? "bg-green-100 text-green-700" : c.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{c.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

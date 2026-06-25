"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Lock, Play, CheckCircle2, BookOpen } from "lucide-react";

function Stat({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return <div className="card"><div className="text-slate2 text-[12.5px] font-semibold">{label}</div>
    <div className="text-[30px] font-extrabold mt-1.5 tracking-tight">{value}</div>
    {sub && <div className="text-slate2 text-xs mt-0.5">{sub}</div>}</div>;
}

export default function StudentDashboard() {
  const [ov, setOv] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try { const [o, l] = await Promise.all([api("/api/student/overview"), api("/api/student/case-studies")]); setOv(o); setList(l); }
      catch (e: any) { setErr(e.message); }
    })();
  }, []);

  return (
    <Shell title={ov ? `Welcome, ${ov.name.split(" ")[0]}` : "Dashboard"} subtitle={ov ? `${ov.department} · currently at Level ${ov.current_level}` : ""}>
      {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Available" value={ov ? ov.available : "…"} sub="assessments" />
        <Stat label="Completed" value={ov ? ov.completed : "…"} sub="so far" />
        <Stat label="Current level" value={ov ? ov.current_level : "…"} sub="of 5" />
        <Stat label="Best score" value={ov?.best_score ?? "—"} sub="out of 100" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px]">Your assessments</h3>
          <Link href="/student/assessments" className="text-brand-700 text-sm font-semibold">View all →</Link>
        </div>
        {list.length === 0 ? <p className="text-slate2 text-sm">No assessments available in your department yet.</p> : (
          <div className="divide-y divide-line">
            {list.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center"><BookOpen size={17} /></span>
                  <div><b className="text-sm">{c.title}</b>
                    <div className="text-slate2 text-[12.5px]">Level {c.level} · {c.questions_count} questions · {Math.round(c.attempt_time_sec / 60)} min</div></div>
                </div>
                {c.locked ? (
                  <span className="chip bg-slate-100 text-slate-500 inline-flex items-center gap-1.5"><Lock size={13} /> Locked · reach L{c.level}</span>
                ) : c.attempt_status === "completed" || c.attempt_status === "disqualified" ? (
                  <span className="chip bg-green-100 text-green-700 inline-flex items-center gap-1.5"><CheckCircle2 size={13} /> Submitted · {c.attempt_score}/100</span>
                ) : (
                  <Link href={`/student/assess/${c.id}`} className="btn btn-pri py-2 px-3.5 text-xs inline-flex items-center gap-1.5"><Play size={13} /> {c.attempt_status === "in_progress" ? "Resume" : "Start"}</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

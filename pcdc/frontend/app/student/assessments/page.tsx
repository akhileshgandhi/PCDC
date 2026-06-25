"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Lock, Play, CheckCircle2 } from "lucide-react";

export default function StudentAssessments() {
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => { (async () => { try { setList(await api("/api/student/case-studies")); } catch (e: any) { setErr(e.message); } })(); }, []);

  return (
    <Shell title="Assessments" subtitle="Case studies available in your department, by level.">
      {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}
      {list.length === 0 && <p className="text-slate2 text-sm">No assessments available yet.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {list.map((c) => (
          <div key={c.id} className={`card ${c.locked ? "opacity-70" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip bg-brand-50 text-brand-700">Level {c.level}</span>
                  {(c.attempt_status === "completed" || c.attempt_status === "disqualified") && <span className="chip bg-green-100 text-green-700">Last: {c.attempt_score}/100</span>}
                </div>
                <h3 className="font-bold text-[15px]">{c.title}</h3>
                <p className="text-slate2 text-[13px] mt-1">{c.questions_count} questions · {Math.round(c.attempt_time_sec / 60)} min attempt · {Math.round(c.reading_time_sec / 60)} min reading</p>
                <div className="flex flex-wrap gap-1.5 mt-2">{c.capabilities.map((cap: string) => <span key={cap} className="chip bg-neutral-100 text-slate2">{cap}</span>)}</div>
              </div>
            </div>
            <div className="mt-4">
              {c.locked
                ? <span className="chip bg-slate-100 text-slate-500 inline-flex items-center gap-1.5"><Lock size={13} /> Reach Level {c.level} to unlock</span>
                : c.attempt_status === "completed" || c.attempt_status === "disqualified"
                ? <span className="chip bg-green-100 text-green-700 inline-flex items-center gap-1.5"><CheckCircle2 size={13} /> Submitted · {c.attempt_score}/100</span>
                : <Link href={`/student/assess/${c.id}`} className="btn btn-pri py-2 px-4 text-sm inline-flex items-center gap-1.5">
                    {c.attempt_status === "in_progress" ? <>Resume</> : <><Play size={14} /> Start assessment</>}
                  </Link>}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

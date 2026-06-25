"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState({ subjects: 0, mentors: 0, students: 0 });
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [subs, mentors, students] = await Promise.all([
          api("/api/subjects"), api("/api/mentors"), api("/api/students"),
        ]);
        setSubjects(subs);
        setStats({ subjects: subs.length, mentors: mentors.length, students: students.length });
      } catch { /* redirected on 401 */ }
      finally { setLoading(false); }
    })();
  }, []);

  const Tile = ({ label, n, sub }: { label: string; n: number; sub: string }) => (
    <div className="card">
      <div className="text-slate2 text-[13.5px] font-semibold">{label}</div>
      <div className="text-[34px] font-extrabold mt-3 tracking-tight">{loading ? "…" : n}</div>
      <div className="text-slate2 text-xs mt-1">{sub}</div>
    </div>
  );

  return (
    <Shell title="Dashboard" subtitle="Live data from the PCDC API.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Tile label="Departments" n={stats.subjects} sub="active specializations" />
        <Tile label="Mentors" n={stats.mentors} sub="faculty accounts" />
        <Tile label="Students" n={stats.students} sub="across all departments" />
      </div>
      <div className="card mt-6">
        <h3 className="font-bold text-[15px] mb-4">Departments</h3>
        {loading ? <p className="text-slate2 text-sm">Loading…</p> : (
          <div className="divide-y divide-line">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div><b className="text-sm">{s.name}</b><span className="text-slate2 text-[13px] ml-3">Head: {s.head_name || "—"}</span></div>
                <span className="chip bg-green-100 text-green-700">{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

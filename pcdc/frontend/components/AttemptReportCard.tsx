"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BarList } from "@/components/Charts";
import { X, CheckCircle2, AlertTriangle, MessageSquare, Lightbulb } from "lucide-react";

const mins = (s?: number | null) => (s == null ? "—" : `${Math.round(s / 60)} min`);

export default function AttemptReportCard({ caseId, attemptId, onClose }: { caseId: number | string; attemptId: number; onClose: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => { try { setD(await api(`/api/case-studies/${caseId}/attempts/${attemptId}`)); } catch (e: any) { setErr(e.message); } })();
  }, [caseId, attemptId]);

  const r = d?.ai_report || {};
  const resultCls = r.result === "Pass" ? "bg-green-100 text-green-700" : r.result === "Needs improvement" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  const rfCls = (v: string) => v === "Solid" ? "bg-green-100 text-green-700" : v === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  const capData = Object.entries(d?.capability_scores || {}).map(([label, value]) => ({ label, value: value as number }));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 overflow-y-auto">
      <div className="card w-full max-w-[820px] my-6 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="font-extrabold text-[16px]">Report card</div>
          <button onClick={onClose} className="text-slate2 hover:text-ink"><X size={20} /></button>
        </div>
        {err && <div className="m-6 chip bg-red-100 text-red-700">{err}</div>}
        {!d && !err && <p className="p-6 text-slate2">Loading…</p>}
        {d && (
          <div className="p-6">
            {/* header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-xl font-extrabold">{d.student_name}</h3>
                <p className="text-slate2 text-sm mt-0.5">{d.department} · {d.case_title}</p>
                <div className="flex gap-2 mt-2 text-[12.5px]">
                  <span className="chip bg-neutral-100 text-slate2">Time: {mins(d.time_taken_sec)}</span>
                  <span className="chip bg-neutral-100 text-slate2">Revised: {d.revise_used ? "Yes" : "No"}</span>
                  {d.submitted_at && <span className="chip bg-neutral-100 text-slate2">Submitted {new Date(d.submitted_at + "Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[40px] font-extrabold leading-none">{d.score ?? "—"}<span className="text-[16px] text-slate2">/100</span></div>
                <span className={`chip mt-1 ${resultCls}`}>{r.result || d.status}</span>
                <div className="text-[11px] text-slate2 mt-1">pass mark {d.pass_mark}</div>
              </div>
            </div>

            {/* student answers — per question if available, else the single blob */}
            <div className="mb-5">
              <h4 className="font-bold text-[14px] mb-2">Student's answers</h4>
              {d.question_answers?.length > 0 ? (
                <div className="space-y-3">
                  {d.question_answers.map((qa: any, i: number) => (
                    <div key={i} className="rounded-xl border border-line p-4">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="font-semibold text-[13.5px]">{i + 1}. {qa.q}</div>
                        {qa.assessment && <span className={`chip flex-none ${rfCls(qa.assessment)}`}>{qa.assessment}</span>}
                      </div>
                      <div className="text-[13.5px] text-ink leading-relaxed whitespace-pre-wrap">{qa.a || "—"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-bg2 p-4 text-[13.5px] leading-relaxed whitespace-pre-wrap">{d.answer_text || "—"}</div>
              )}
            </div>

            {/* AI report card */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 mb-5">
              <div className="font-bold text-[14px] mb-3 flex items-center gap-2 text-brand-800"><MessageSquare size={16} /> AI report card</div>
              {r.summary && <p className="text-[13.5px] text-ink mb-4 italic">“{r.summary}”</p>}

              <div className="mb-4">
                <div className="field-label mb-2">Capability scorecard</div>
                <BarList data={capData} colorFor={() => "bg-brand-600"} />
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="field-label mb-1.5 flex items-center gap-1.5 text-green-700"><CheckCircle2 size={14} /> Strengths</div>
                  <ul className="space-y-1 text-[13px]">{(r.strengths || []).map((s: string, i: number) => <li key={i} className="flex gap-2"><span className="text-green-600">•</span>{s}</li>)}</ul>
                </div>
                <div>
                  <div className="field-label mb-1.5 flex items-center gap-1.5 text-amber-600"><AlertTriangle size={14} /> Areas to improve</div>
                  <ul className="space-y-1 text-[13px]">{(r.improvements || []).map((s: string, i: number) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span>{s}</li>)}</ul>
                </div>
              </div>

              {r.rapid_fire?.length > 0 && (
                <div className="mb-4">
                  <div className="field-label mb-2">Rapid-fire round</div>
                  <div className="space-y-2">
                    {r.rapid_fire.map((rf: any, i: number) => (
                      <div key={i} className="rounded-lg bg-white border border-line p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-[13px]">{rf.q}</div>
                          <span className={`chip flex-none ${rfCls(rf.assessment)}`}>{rf.assessment}</span>
                        </div>
                        <div className="text-[13px] text-slate2 mt-1">{rf.a}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {r.suggestions?.length > 0 && (
                <div>
                  <div className="field-label mb-1.5 flex items-center gap-1.5 text-brand-700"><Lightbulb size={14} /> Suggestions</div>
                  <ul className="space-y-1 text-[13px]">{r.suggestions.map((s: string, i: number) => <li key={i} className="flex gap-2"><span className="text-brand-600">•</span>{s}</li>)}</ul>
                </div>
              )}
            </div>

            <div className="flex justify-end"><button className="btn btn-pri" onClick={onClose}>Close</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { BarList } from "@/components/Charts";
import { BookOpen, Clock, Lock, ShieldAlert, MessageSquare, Lightbulb, CheckCircle2, AlertTriangle, Trophy } from "lucide-react";

type Phase = "briefing" | "reading" | "attempt" | "rapidfire" | "suggestions" | "revise" | "result";
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;
const noPaste = { onPaste: (e: any) => e.preventDefault(), onDrop: (e: any) => e.preventDefault(), onContextMenu: (e: any) => e.preventDefault() };

export default function Assess() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("briefing");
  const [cs, setCs] = useState<any>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [readLeft, setReadLeft] = useState(0);
  const [attLeft, setAttLeft] = useState(0);
  const [rfQs, setRfQs] = useState<string[]>([]);
  const [rfAns, setRfAns] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // preview the briefing (questions/scenario) before starting
  const [preview, setPreview] = useState<any>(null);
  useEffect(() => {
    (async () => { try { const l = await api("/api/student/case-studies"); setPreview((l || []).find((c: any) => c.id === Number(id))); } catch { } })();
  }, [id]);

  async function begin() {
    setErr(""); setBusy(true);
    try {
      const d = await api("/api/student/start", { method: "POST", body: JSON.stringify({ case_study_id: Number(id) }) });
      setCs(d); setAnswers(d.questions.map(() => "")); setReadLeft(d.reading_time_sec); setAttLeft(d.attempt_time_sec); setPhase("reading");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  // reading countdown
  useEffect(() => {
    if (phase !== "reading") return;
    if (readLeft <= 0) { setPhase("attempt"); return; }
    const t = setTimeout(() => setReadLeft((s) => s - 1), 1000); return () => clearTimeout(t);
  }, [phase, readLeft]);
  // attempt countdown → auto-submit at 0
  useEffect(() => {
    if (phase !== "attempt") return;
    if (attLeft <= 0) { submitAnswers(); return; }
    const t = setTimeout(() => setAttLeft((s) => s - 1), 1000); return () => clearTimeout(t);
  }, [phase, attLeft]);

  const qa = () => cs.questions.map((q: string, i: number) => ({ q, a: answers[i] || "" }));
  const rfPairs = () => rfQs.map((q, i) => ({ q, a: rfAns[i] || "" }));

  async function submitAnswers() {
    setBusy(true); setErr("");
    try {
      const d = await api("/api/student/rapidfire", { method: "POST", body: JSON.stringify({ case_study_id: Number(id), answers: qa() }) });
      setRfQs(d.questions); setRfAns(d.questions.map(() => "")); setPhase("rapidfire");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function submitRapidfire() {
    setBusy(true); setErr("");
    try {
      const d = await api("/api/student/suggestions", { method: "POST", body: JSON.stringify({ case_study_id: Number(id), answers: qa(), rapidfire: rfPairs() }) });
      setSuggestions(d.suggestions); setPhase("suggestions");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function finalize(revised: boolean) {
    setBusy(true); setErr("");
    try {
      const d = await api("/api/student/finalize", { method: "POST", body: JSON.stringify({ attempt_id: cs.attempt_id, answers: qa(), rapidfire: rfPairs(), revised }) });
      setResult(d); setPhase("result");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const title = cs?.title || preview?.title || "Assessment";

  return (
    <Shell title={title} subtitle={phase === "result" ? "Your scorecard" : "Assessment"}>
      {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}

      {/* timers bar (reading / attempt) */}
      {(phase === "reading" || phase === "attempt") && (
        <div className={`card mb-5 flex items-center justify-between ${phase === "attempt" && attLeft < 120 ? "border-red-300" : ""}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {phase === "reading" ? <><BookOpen size={16} className="text-brand-600" /> Reading time — answering locked</> : <><Clock size={16} className={attLeft < 120 ? "text-red-600" : "text-brand-600"} /> Attempt in progress</>}
          </div>
          <div className={`text-2xl font-extrabold tabular-nums ${phase === "attempt" && attLeft < 120 ? "text-red-600" : ""}`}>{clock(phase === "reading" ? readLeft : attLeft)}</div>
        </div>
      )}

      {/* BRIEFING */}
      {phase === "briefing" && (
        <div className="max-w-[760px]">
          <div className="card mb-5">
            <div className="flex flex-wrap gap-2 mb-3">
              {preview && <span className="chip bg-brand-50 text-brand-700">Level {preview.level}</span>}
              {preview && <span className="chip bg-neutral-100 text-slate2">{Math.round((preview.reading_time_sec || 0) / 60)} min reading</span>}
              {preview && <span className="chip bg-neutral-100 text-slate2">{Math.round((preview.attempt_time_sec || 0) / 60)} min attempt</span>}
              {preview?.capabilities?.map((c: string) => <span key={c} className="chip bg-brand-600 text-white">{c}</span>)}
            </div>
            <h3 className="font-bold text-[15px] mb-2">How this works</h3>
            <ol className="list-decimal pl-5 text-[13.5px] space-y-1 text-slate2">
              <li>Read the brief during the reading time (answering is locked).</li>
              <li>Answer each question before the attempt timer runs out. <b>Pasting is disabled.</b></li>
              <li>Answer a short AI rapid-fire round.</li>
              <li>Review the AI's suggestions — you get <b>one revision</b> before final scoring.</li>
            </ol>
          </div>
          <div className="card border-amber-200 bg-amber-50/50 mb-5 flex gap-3 text-[13px]">
            <ShieldAlert size={18} className="text-amber-600 flex-none" />
            <div>Once you start, the reading and attempt timers run continuously. Make sure you're ready.</div>
          </div>
          <button className="btn btn-pri" onClick={begin} disabled={busy}>{busy ? "Starting…" : "Start assessment"}</button>
        </div>
      )}

      {/* READING */}
      {phase === "reading" && cs && (
        <div className="max-w-[760px]">
          <div className="card mb-5">
            <h3 className="font-bold text-[15px] mb-2">Case brief</h3>
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{cs.scenario || "—"}</p>
          </div>
          <div className="card mb-5">
            <h3 className="font-bold text-[15px] mb-2 flex items-center gap-2"><Lock size={15} /> Questions (locked until reading ends)</h3>
            <ol className="list-decimal pl-5 space-y-1 text-[13.5px]">{cs.questions.map((q: string, i: number) => <li key={i}>{q}</li>)}</ol>
          </div>
          <button className="btn btn-pri" onClick={() => setPhase("attempt")}>I've read it — start answering now</button>
        </div>
      )}

      {/* ATTEMPT */}
      {phase === "attempt" && cs && (
        <div className="max-w-[820px]">
          <div className="card mb-4">
            <h3 className="font-bold text-[15px] mb-1">Case brief</h3>
            <p className="text-[13.5px] leading-relaxed text-slate2 whitespace-pre-wrap">{cs.scenario}</p>
          </div>
          <p className="text-[12px] text-slate2 mb-3 flex items-center gap-1.5"><ShieldAlert size={13} /> Paste is disabled — type your own answers.</p>
          <div className="space-y-4">
            {cs.questions.map((q: string, i: number) => (
              <div key={i} className="card">
                <label className="field-label">{i + 1}. {q}</label>
                <textarea {...noPaste} className="field-input min-h-[110px]" value={answers[i]}
                  onChange={(e) => setAnswers(answers.map((a, idx) => idx === i ? e.target.value : a))} placeholder="Type your answer…" />
                <div className="text-[11px] text-slate2 mt-1">{(answers[i] || "").trim().split(/\s+/).filter(Boolean).length} words</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4"><button className="btn btn-pri" onClick={submitAnswers} disabled={busy}>{busy ? "Submitting…" : "Submit answers"}</button></div>
        </div>
      )}

      {/* RAPID FIRE */}
      {phase === "rapidfire" && (
        <div className="max-w-[760px]">
          <div className="card border-brand-200 bg-brand-50/40 mb-4 flex gap-3 text-[13px]"><MessageSquare size={18} className="text-brand-600 flex-none" />
            <div>The AI has a few quick follow-ups based on your answers. Keep these short and specific.</div></div>
          <div className="space-y-4">
            {rfQs.map((q, i) => (
              <div key={i} className="card">
                <label className="field-label">{q}</label>
                <textarea {...noPaste} className="field-input min-h-[70px]" value={rfAns[i]}
                  onChange={(e) => setRfAns(rfAns.map((a, idx) => idx === i ? e.target.value : a))} placeholder="Your response…" />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4"><button className="btn btn-pri" onClick={submitRapidfire} disabled={busy}>{busy ? "Submitting…" : "Submit rapid-fire"}</button></div>
        </div>
      )}

      {/* SUGGESTIONS */}
      {phase === "suggestions" && (
        <div className="max-w-[760px]">
          <div className="card mb-5">
            <h3 className="font-bold text-[15px] mb-3 flex items-center gap-2 text-brand-800"><Lightbulb size={16} /> AI suggestions</h3>
            <ul className="space-y-2 text-[13.5px]">{suggestions.map((s, i) => <li key={i} className="flex gap-2"><span className="text-brand-600">•</span>{s}</li>)}</ul>
            <p className="text-slate2 text-[13px] mt-4">You can revise your answers once based on this feedback, or submit as they are for final scoring.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-gh" onClick={() => setPhase("revise")}>Revise my answers</button>
            <button className="btn btn-pri" onClick={() => finalize(false)} disabled={busy}>{busy ? "Scoring…" : "Submit for final score"}</button>
          </div>
        </div>
      )}

      {/* REVISE */}
      {phase === "revise" && cs && (
        <div className="max-w-[820px]">
          <div className="card border-brand-200 bg-brand-50/40 mb-4 text-[13px]">Revise your answers using the AI's suggestions, then submit for final scoring. (This is your one revision.)</div>
          <div className="space-y-4">
            {cs.questions.map((q: string, i: number) => (
              <div key={i} className="card">
                <label className="field-label">{i + 1}. {q}</label>
                <textarea {...noPaste} className="field-input min-h-[110px]" value={answers[i]}
                  onChange={(e) => setAnswers(answers.map((a, idx) => idx === i ? e.target.value : a))} />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4"><button className="btn btn-pri" onClick={() => finalize(true)} disabled={busy}>{busy ? "Scoring…" : "Submit final answers"}</button></div>
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && result && (
        <div className="max-w-[820px]">
          <div className={`card mb-5 ${result.passed ? "border-green-300 bg-green-50/40" : "border-amber-300 bg-amber-50/40"}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${result.passed ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>{result.passed ? <Trophy size={24} /> : <AlertTriangle size={24} />}</span>
                <div><div className="font-extrabold text-lg">{result.result}</div><div className="text-slate2 text-sm">{result.progression_message}</div></div>
              </div>
              <div className="text-right"><div className="text-[40px] font-extrabold leading-none">{result.score}<span className="text-[16px] text-slate2">/100</span></div><div className="text-[11px] text-slate2">pass mark {result.pass_mark}</div></div>
            </div>
          </div>

          <div className="card mb-5"><h3 className="font-bold text-[15px] mb-4">Capability scorecard</h3>
            <BarList data={Object.entries(result.capability_scores || {}).map(([label, value]) => ({ label, value: value as number }))} colorFor={() => "bg-brand-600"} /></div>

          <div className="card mb-5">
            <h3 className="font-bold text-[15px] mb-2 flex items-center gap-2"><MessageSquare size={16} /> AI review</h3>
            <p className="text-[13.5px] italic mb-4">“{result.report.summary}”</p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div><div className="field-label flex items-center gap-1.5 text-green-700"><CheckCircle2 size={14} /> Strengths</div>
                <ul className="text-[13px] space-y-1 mt-1">{(result.report.strengths || []).map((s: string, i: number) => <li key={i} className="flex gap-2"><span className="text-green-600">•</span>{s}</li>)}</ul></div>
              <div><div className="field-label flex items-center gap-1.5 text-amber-600"><AlertTriangle size={14} /> Improve</div>
                <ul className="text-[13px] space-y-1 mt-1">{(result.report.improvements || []).map((s: string, i: number) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span>{s}</li>)}</ul></div>
            </div>
            {result.report.rapid_fire?.length > 0 && <div>
              <div className="field-label mb-1.5">Rapid-fire</div>
              <div className="space-y-2">{result.report.rapid_fire.map((rf: any, i: number) => (
                <div key={i} className="rounded-lg border border-line p-3 text-[13px]"><div className="flex justify-between gap-2"><b>{rf.q}</b><span className={`chip ${rf.assessment === "Solid" ? "bg-green-100 text-green-700" : rf.assessment === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{rf.assessment}</span></div></div>
              ))}</div></div>}
          </div>

          <div className="flex gap-2"><button className="btn btn-pri" onClick={() => router.push("/student/dashboard")}>Back to dashboard</button></div>
        </div>
      )}
    </Shell>
  );
}

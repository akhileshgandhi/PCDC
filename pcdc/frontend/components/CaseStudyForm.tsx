"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const FAMILIES = ["Cognitive", "Leadership", "Entrepreneurial", "Professional"];

export default function CaseStudyForm({ id }: { id?: number }) {
  const router = useRouter();
  const editing = !!id;
  const [departments, setDepartments] = useState<any[]>([]);
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [caps, setCaps] = useState<number[]>([]);
  const [questions, setQuestions] = useState<string[]>([""]);
  const [briefMode, setBriefMode] = useState<"write" | "upload">("write");
  const [attachment, setAttachment] = useState<{ name: string; data: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    title: "", scenario: "", subject_id: 0, level: 1, launch_mode: "open",
    reading_min: 5, attempt_min: 30, launch_at: "", close_at: "", pass_mark: 75, disqualify_threshold: 70,
  });
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));

  const [parsing, setParsing] = useState(false);
  const [docText, setDocText] = useState("");   // extracted text shown for reference/copy

  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => { const s = String(r.result || ""); resolve(s.includes(",") ? s.split(",")[1] : s); };
      r.onerror = reject; r.readAsDataURL(file);
    });
  }

  async function extractText(file: File): Promise<string> {
    const name = file.name.toLowerCase();
    if (/\.(txt|md|csv)$/.test(name)) return file.text();
    if (/\.docx$/.test(name)) {
      const mod: any = await import("mammoth/mammoth.browser");
      const mammoth = mod.default || mod;
      const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return value || "";
    }
    if (/\.pdf$/.test(name)) {
      const pdfjs: any = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        text += content.items.map((it: any) => it.str).join(" ") + "\n";
      }
      return text;
    }
    return "";   // unsupported binary type → attach only
  }

  async function onFile(file: File) {
    if (file.size > 8_000_000) { setErr("File too large (max 8 MB)."); return; }
    setErr(""); setParsing(true);
    try {
      setAttachment({ name: file.name, data: await toBase64(file) });
      const text = (await extractText(file)).trim();
      if (text) {
        setDocText(text);
        // Put the text into the editable brief; the mentor structures it.
        // We deliberately do NOT auto-guess questions — that produced wrong results on varied formats.
        if (!f.scenario.trim()) set("scenario", text);
      }
    } catch (e: any) {
      setErr(`Couldn't read text from ${file.name}: ${e.message}. It's still attached for download.`);
    } finally { setParsing(false); }
  }

  useEffect(() => {
    (async () => {
      try {
        const meta = await api("/api/case-studies/meta");
        setDepartments(meta.departments); setCapabilities(meta.capabilities);
        if (!editing && meta.departments[0]) set("subject_id", meta.departments[0].id);
        if (editing) {
          const d = await api(`/api/case-studies/${id}`);
          setF({
            title: d.title || "", scenario: d.scenario || "",
            subject_id: meta.departments.find((x: any) => x.name === d.department)?.id || 0,
            level: d.level, launch_mode: d.launch_mode,
            reading_min: Math.round(d.reading_time_sec / 60), attempt_min: Math.round(d.attempt_time_sec / 60),
            launch_at: d.launch_at ? d.launch_at.slice(0, 16) : "", close_at: d.close_at ? d.close_at.slice(0, 16) : "",
            pass_mark: d.pass_mark, disqualify_threshold: d.disqualify_threshold,
          });
          setCaps(d.capability_ids || []);
          setQuestions(d.questions?.length ? d.questions : [""]);
          if (d.attachment_name) setAttachment({ name: d.attachment_name, data: "" });
        }
      } catch (e: any) { setErr(e.message); }
    })();
  }, [id]);

  async function save(status?: string) {
    if (!f.title.trim()) { setErr("Title is required."); return; }
    if (!f.subject_id) { setErr("Pick a department."); return; }
    if (!caps.length) { setErr("Map at least one capability."); return; }
    const qs = questions.map((q) => q.trim()).filter(Boolean);
    if (!qs.length) { setErr("Add at least one question."); return; }
    setErr(""); setBusy(true);
    const body: any = {
      title: f.title.trim(), scenario: f.scenario, subject_id: Number(f.subject_id), level: Number(f.level),
      launch_mode: "fixed_window", reading_time_sec: f.reading_min * 60, attempt_time_sec: f.attempt_min * 60,
      launch_at: f.launch_at || null, close_at: f.close_at || null,
      pass_mark: Number(f.pass_mark), disqualify_threshold: Number(f.disqualify_threshold),
      capability_ids: caps, questions: qs,
    };
    // only send attachment when a new file was picked (data present)
    if (attachment?.data) { body.attachment_name = attachment.name; body.attachment_data = attachment.data; }
    if (status) body.status = status;
    try {
      if (editing) await api(`/api/case-studies/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/case-studies", { method: "POST", body: JSON.stringify(body) });
      router.push("/mentor/case-studies");
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="max-w-[820px]">
      {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}

      <div className="card mb-5">
        <h3 className="font-bold text-[15px] mb-4">Case study</h3>
        <div className="mb-4"><label className="field-label">Title</label>
          <input className="field-input" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Turnaround of a Distressed NBFC" /></div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="field-label !mb-0">Scenario / brief</label>
            <div className="inline-flex border border-line rounded-lg overflow-hidden text-[12px] font-semibold">
              {(["write", "upload"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setBriefMode(m)}
                  className={`px-3 py-1 capitalize ${briefMode === m ? "bg-brand-600 text-white" : "text-slate2 hover:bg-brand-50"}`}>{m}</button>
              ))}
            </div>
          </div>
          {briefMode === "write" ? (
            <textarea className="field-input min-h-[120px]" value={f.scenario} onChange={(e) => set("scenario", e.target.value)} placeholder="Describe the situation the student must analyse…" />
          ) : (
            <div>
              <label className="block border-2 border-dashed border-line rounded-xl2 py-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/40">
                <input type="file" accept=".txt,.md,.csv,.pdf,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                <span className="text-slate2 text-sm">{parsing ? "Reading document…" : attachment ? `📎 ${attachment.name}` : "Click to upload a brief (.pdf, .docx, .txt …)"}</span>
              </label>
              {attachment && !parsing && <button type="button" onClick={() => { setAttachment(null); setDocText(""); }} className="text-red-600 text-[12px] mt-1.5">Remove attachment</button>}
              {docText && <p className="text-green-700 text-[12px] mt-1 font-semibold">✓ Pulled the text in below — switch to “Write” to trim the brief, then add your questions from the document reference.</p>}
              <p className="text-slate2 text-[12px] mt-1">.pdf / .docx / .txt are read into the brief and the file is attached. You structure the brief & questions yourself — nothing is auto-guessed.</p>
            </div>
          )}
        </div>

        {/* read-only reference of the uploaded document, to copy questions from */}
        {docText && (
          <details className="mb-4 rounded-lg border border-line bg-bg2">
            <summary className="cursor-pointer px-3 py-2 text-[13px] font-semibold text-slate2">📄 Uploaded document text (reference — copy your questions from here)</summary>
            <pre className="max-h-[280px] overflow-auto px-3 py-2 text-[12px] whitespace-pre-wrap text-ink">{docText}</pre>
          </details>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="field-label">Department</label>
            <select className="field-input" value={f.subject_id} onChange={(e) => set("subject_id", Number(e.target.value))}>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
          <div><label className="field-label">Difficulty level</label>
            <select className="field-input" value={f.level} onChange={(e) => set("level", Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}
            </select></div>
        </div>
      </div>

      <div className="card mb-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-[15px]">Questions</h3>
          <span className="chip bg-brand-50 text-brand-700">{questions.filter((q) => q.trim()).length}</span>
        </div>
        <p className="text-slate2 text-[13px] mb-3">Students answer each question; the AI assesses every answer. Add as many as you need.</p>
        <div className="space-y-2.5">
          {questions.map((q, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-6 h-9 flex items-center justify-center text-slate2 font-bold text-sm flex-none">{i + 1}.</span>
              <textarea className="field-input min-h-[44px] flex-1" value={q} placeholder="e.g. Diagnose the root cause and recommend a plan."
                onChange={(e) => setQuestions(questions.map((x, idx) => idx === i ? e.target.value : x))} />
              <button type="button" onClick={() => setQuestions(questions.length > 1 ? questions.filter((_, idx) => idx !== i) : [""])}
                className="w-9 h-9 flex-none inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setQuestions([...questions, ""])} className="btn btn-gh mt-3 py-2 px-3 text-xs">+ Add question</button>
      </div>

      <div className="card mb-5">
        <h3 className="font-bold text-[15px] mb-1">Capabilities assessed</h3>
        <p className="text-slate2 text-[13px] mb-3">The AI scores the student against these. Select one or more.</p>
        {FAMILIES.map((fam) => {
          const items = capabilities.filter((c) => c.family === fam);
          if (!items.length) return null;
          return (
            <div key={fam} className="mb-3">
              <div className="text-[12px] uppercase tracking-wide text-slate2 font-bold mb-1.5">{fam}</div>
              <div className="flex flex-wrap gap-2">
                {items.map((c) => {
                  const on = caps.includes(c.id);
                  return <span key={c.id} onClick={() => setCaps(on ? caps.filter((x) => x !== c.id) : [...caps, c.id])}
                    className={`cursor-pointer px-3.5 py-2 rounded-full text-[13px] font-semibold border ${on ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200"}`}>{c.name}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mb-5">
        <h3 className="font-bold text-[15px] mb-1">Availability window & rules</h3>
        <p className="text-slate2 text-[13px] mb-4">Students can respond between the launch and close dates. After the close date, responses are blocked.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="field-label">Launch date/time (opens)</label>
            <input type="datetime-local" className="field-input" value={f.launch_at}
              onChange={(e) => { const v = e.target.value; set("launch_at", v); if (v && !f.close_at) { const d = new Date(v); d.setDate(d.getDate() + 14); set("close_at", d.toISOString().slice(0, 16)); } }} /></div>
          <div><label className="field-label">Close date/time (deadline)</label>
            <input type="datetime-local" className="field-input" value={f.close_at} onChange={(e) => set("close_at", e.target.value)} /></div>
          <div><label className="field-label">Reading time (minutes)</label>
            <input type="number" className="field-input" value={f.reading_min} onChange={(e) => set("reading_min", Number(e.target.value))} /></div>
          <div><label className="field-label">Attempt time (minutes)</label>
            <input type="number" className="field-input" value={f.attempt_min} onChange={(e) => set("attempt_min", Number(e.target.value))} /></div>
          <div><label className="field-label">Pass mark (/100)</label>
            <input type="number" className="field-input" value={f.pass_mark} onChange={(e) => set("pass_mark", Number(e.target.value))} /></div>
          <div><label className="field-label">Disqualify if completion below (%)</label>
            <input type="number" className="field-input" value={f.disqualify_threshold} onChange={(e) => set("disqualify_threshold", Number(e.target.value))} /></div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn btn-gh" onClick={() => router.push("/mentor/case-studies")} disabled={busy}>Cancel</button>
        {editing ? (
          <button className="btn btn-pri" onClick={() => save()} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        ) : (
          <>
            <button className="btn btn-gh" onClick={() => save("draft")} disabled={busy}>Save as draft</button>
            <button className="btn btn-pri" onClick={() => save("active")} disabled={busy}>{busy ? "Saving…" : "Create & launch"}</button>
          </>
        )}
      </div>
    </div>
  );
}

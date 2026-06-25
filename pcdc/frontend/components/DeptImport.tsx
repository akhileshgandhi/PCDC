"use client";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import { Upload, X, FileSpreadsheet, CheckCircle2 } from "lucide-react";

type Target = "ignore" | "name" | "status";
const TARGETS: { v: Target; label: string }[] = [
  { v: "ignore", label: "— Ignore —" },
  { v: "name", label: "Department name *" },
  { v: "status", label: "Status (active/inactive)" },
];
function guess(h: string): Target {
  const s = h.toLowerCase();
  if (/status|state/.test(s)) return "status";
  if (/name|department|dept|title/.test(s)) return "name";
  return "ignore";
}

export default function DeptImport({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Target[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function parse(file: File) {
    setErr("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result, { type: "array" });
        const aoa = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "", raw: false });
        const hdr = (aoa[0] || []).map((h) => String(h ?? "").trim());
        const body = aoa.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
          .map((r) => hdr.map((_, i) => String(r[i] ?? "").trim()));
        if (!hdr.length) { setErr("No columns detected."); return; }
        setFileName(file.name); setHeaders(hdr); setRows(body); setMap(hdr.map(guess)); setStep(2);
      } catch (e: any) { setErr("Could not read file: " + e.message); }
    };
    reader.readAsArrayBuffer(file);
  }

  const canImport = map.includes("name");
  async function doImport() {
    if (!canImport) { setErr("Map a column to Department name first."); return; }
    setErr(""); setBusy(true);
    try {
      const nameIdx = map.indexOf("name"); const statusIdx = map.indexOf("status");
      const payload = rows.map((r) => ({ name: r[nameIdx] || "", status: statusIdx >= 0 ? (r[statusIdx] || "active") : "active" }));
      const res = await api("/api/subjects/import", { method: "POST", body: JSON.stringify(payload) });
      setResult(res.data); setStep(3); onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 overflow-y-auto">
      <div className="card w-full max-w-[720px] my-6 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2.5 font-extrabold text-[16px]"><FileSpreadsheet size={20} className="text-brand-600" /> Bulk import departments</div>
          <button onClick={onClose} className="text-slate2 hover:text-ink"><X size={20} /></button>
        </div>
        <div className="flex gap-2 px-6 py-3 text-[12.5px] font-semibold border-b border-line">
          {["1 · Upload", "2 · Map fields", "3 · Result"].map((s, i) =>
            <span key={s} className={`chip ${step === i + 1 ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}>{s}</span>)}
        </div>
        <div className="p-6">
          {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}

          {step === 1 && (
            <div>
              <p className="text-slate2 text-sm mb-4">Upload an Excel/CSV of departments. You'll map the columns next — only a name column is required.</p>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-line rounded-xl2 py-12 flex flex-col items-center gap-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40">
                <Upload size={30} className="text-brand-600" /><div className="font-semibold">Click to choose a file</div><div className="text-slate2 text-[13px]">.xlsx · .xls · .csv</div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && parse(e.target.files[0])} />
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm mb-4"><b>{fileName}</b> · {headers.length} columns · {rows.length} rows</p>
              <div className="border border-line rounded-xl overflow-hidden">
                <table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate2 font-bold bg-bg2">
                  <th className="py-2.5 px-4">Source column</th><th className="py-2.5 px-4">Sample</th><th className="py-2.5 px-4">Maps to</th></tr></thead>
                  <tbody>
                    {headers.map((h, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="py-2.5 px-4 font-semibold">{h || "(blank)"}</td>
                        <td className="py-2.5 px-4 text-slate2 text-[13px]">{rows[0]?.[i] || "—"}</td>
                        <td className="py-2.5 px-4">
                          <select className="field-input py-1.5" value={map[i]} onChange={(e) => setMap(map.map((m, idx) => idx === i ? e.target.value as Target : m))}>
                            {TARGETS.map((t) => {
                              const taken = t.v !== "ignore" && map[i] !== t.v && map.includes(t.v);
                              return <option key={t.v} value={t.v} disabled={taken}>{t.label}{taken ? " (used)" : ""}</option>;
                            })}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between mt-5">
                <button className="btn btn-gh" onClick={() => { setStep(1); setErr(""); }}>Back</button>
                <button className="btn btn-pri" disabled={!canImport || busy} onClick={doImport}>{busy ? "Importing…" : `Import ${rows.length} departments`}</button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="card !shadow-none border border-line text-center"><CheckCircle2 className="mx-auto text-green-600 mb-1" /><div className="text-2xl font-extrabold">{result.created}</div><div className="text-slate2 text-[13px]">Created</div></div>
                <div className="card !shadow-none border border-line text-center"><div className="text-2xl font-extrabold text-amber-600">{result.skipped}</div><div className="text-slate2 text-[13px]">Skipped (duplicates)</div></div>
                <div className="card !shadow-none border border-line text-center"><div className="text-2xl font-extrabold text-red-600">{result.errors?.length || 0}</div><div className="text-slate2 text-[13px]">Errors</div></div>
              </div>
              <div className="flex justify-end"><button className="btn btn-pri" onClick={onClose}>Done</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";

type Target =
  | "ignore" | "full_name" | "email" | "role" | "phone"
  | "college_id" | "program" | "batch"
  | "employee_id" | "designation" | "qualification" | "experience"
  | "subject" | "custom";

const TARGETS: { v: Target; label: string }[] = [
  { v: "ignore", label: "— Ignore —" },
  { v: "full_name", label: "Full name *" },
  { v: "email", label: "Email *" },
  { v: "role", label: "Role" },
  { v: "phone", label: "Phone" },
  { v: "subject", label: "Department" },
  { v: "college_id", label: "College ID / Roll no" },
  { v: "program", label: "Program (PGDM/MBA)" },
  { v: "batch", label: "Batch / Year" },
  { v: "employee_id", label: "Employee ID" },
  { v: "designation", label: "Designation" },
  { v: "qualification", label: "Qualification" },
  { v: "experience", label: "Experience" },
  { v: "custom", label: "➕ Add as custom field" },
];

function guess(h: string): Target {
  const s = h.toLowerCase();
  if (/mail/.test(s)) return "email";
  if (/(full.?name|^name$|student.?name|candidate|employee.?name|faculty.?name)/.test(s)) return "full_name";
  if (/(phone|mobile|contact|whatsapp)/.test(s)) return "phone";
  if (/(department|dept|domain|specialization|specialisation|stream|subject)/.test(s)) return "subject";
  if (/(employee.?id|emp.?id|staff.?id|faculty.?id)/.test(s)) return "employee_id";
  if (/(college|roll|enroll|reg.?no|registration|student.?id|pibm)/.test(s)) return "college_id";
  if (/(program|programme|course|degree)/.test(s)) return "program";
  if (/(batch|year|session|cohort)/.test(s)) return "batch";
  if (/(designation|title|^post$|position)/.test(s)) return "designation";
  if (/(qualification|education|highest)/.test(s)) return "qualification";
  if (/(experience|^exp$|years.?of)/.test(s)) return "experience";
  if (/role/.test(s)) return "role";
  return "custom"; // unknown columns are captured as custom fields by default
}

const SYS: Target[] = ["full_name", "email", "role", "phone", "subject", "college_id",
  "program", "batch", "employee_id", "designation", "qualification", "experience"];

export default function BulkImport({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Target[]>([]);
  const [role, setRole] = useState("student");
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
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false });
        const hdr = (aoa[0] || []).map((h) => String(h ?? "").trim()).filter((_, i) => true);
        const body = aoa.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
          .map((r) => hdr.map((_, i) => String(r[i] ?? "").trim()));
        if (!hdr.length) { setErr("No columns detected in the first sheet."); return; }
        setFileName(file.name);
        setHeaders(hdr);
        setRows(body);
        setMap(hdr.map(guess));
        setStep(2);
      } catch (e: any) { setErr("Could not read file: " + e.message); }
    };
    reader.readAsArrayBuffer(file);
  }

  const mappedTo = (t: Target) => map.includes(t);
  const canImport = mappedTo("full_name") && mappedTo("email");
  const customCols = headers.filter((_, i) => map[i] === "custom");

  function buildRecords() {
    return rows.map((r) => {
      // always include the required system fields so the payload validates;
      // the backend reports empty ones per-row instead of rejecting the whole batch.
      const rec: any = { full_name: "", email: "", extra: {} };
      headers.forEach((h, i) => {
        const t = map[i]; const v = r[i];
        if (!v || t === "ignore") return;
        if (t === "custom") { if (h) rec.extra[h] = v; }
        else rec[t] = v;
      });
      return rec;
    });
  }

  async function doImport() {
    if (!canImport) { setErr("Map both Full name and Email before importing."); return; }
    setErr(""); setBusy(true);
    try {
      const records = buildRecords();
      const custom_fields = customCols.map((h) => ({ key: h, label: h }));
      const res = await api("/api/users/import", {
        method: "POST",
        body: JSON.stringify({ role, records, custom_fields }),
      });
      setResult(res.data); setStep(3); onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 overflow-y-auto">
      <div className="card w-full max-w-[860px] my-6 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2.5 font-extrabold text-[16px]"><FileSpreadsheet size={20} className="text-brand-600" /> Bulk import users</div>
          <button onClick={onClose} className="text-slate2 hover:text-ink"><X size={20} /></button>
        </div>

        {/* steps */}
        <div className="flex gap-2 px-6 py-3 text-[12.5px] font-semibold text-slate2 border-b border-line">
          {["1 · Upload", "2 · Map fields", "3 · Result"].map((s, i) => (
            <span key={s} className={`chip ${step === i + 1 ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}>{s}</span>
          ))}
        </div>

        <div className="p-6">
          {err && <div className="chip bg-red-100 text-red-700 mb-4">{err}</div>}

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <p className="text-slate2 text-sm mb-4">Upload any Excel (.xlsx/.xls) or CSV. You'll map its columns on the next step — unrecognised columns are captured as custom fields.</p>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-line rounded-xl2 py-12 flex flex-col items-center gap-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40">
                <Upload size={30} className="text-brand-600" />
                <div className="font-semibold">Click to choose a file</div>
                <div className="text-slate2 text-[13px]">.xlsx · .xls · .csv</div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && parse(e.target.files[0])} />
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <span className="text-sm"><b>{fileName}</b> · {headers.length} columns · {rows.length} rows</span>
                <div className="ml-auto flex items-center gap-2 text-sm">
                  <span className="field-label !mb-0">Default role</span>
                  <select className="field-input !w-auto py-2" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="student">Student</option>
                    <option value="mentor">Mentor</option>
                  </select>
                </div>
              </div>
              <div className="border border-line rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-sm">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate2 font-bold bg-bg2">
                    <th className="py-2.5 px-4">Source column</th><th className="py-2.5 px-4">Sample</th><th className="py-2.5 px-4">Maps to</th>
                  </tr></thead>
                  <tbody>
                    {headers.map((h, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="py-2.5 px-4 font-semibold">{h || <span className="text-slate2">(blank)</span>}</td>
                        <td className="py-2.5 px-4 text-slate2 text-[13px] truncate max-w-[200px]">{rows[0]?.[i] || "—"}</td>
                        <td className="py-2.5 px-4">
                          <select className="field-input py-1.5" value={map[i]}
                            onChange={(e) => setMap(map.map((m, idx) => (idx === i ? (e.target.value as Target) : m)))}>
                            {TARGETS.map((t) => {
                              const taken = t.v !== "custom" && t.v !== "ignore" && SYS.includes(t.v) && map[i] !== t.v && mappedTo(t.v);
                              return <option key={t.v} value={t.v} disabled={taken}>{t.label}{taken ? " (used)" : ""}</option>;
                            })}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {customCols.length > 0 && (
                <p className="text-[13px] text-slate2 mt-3">Will register {customCols.length} custom field(s): {customCols.map((c) => <span key={c} className="chip bg-brand-50 text-brand-700 mr-1">{c}</span>)}</p>
              )}
              {!canImport && <p className="text-[13px] text-amber-600 mt-3 flex items-center gap-1.5"><AlertTriangle size={14} /> Map both <b>Full name</b> and <b>Email</b> to continue.</p>}
              <div className="flex justify-between mt-5">
                <button className="btn btn-gh" onClick={() => { setStep(1); setErr(""); }}>Back</button>
                <button className="btn btn-pri" disabled={!canImport || busy} onClick={doImport}>{busy ? "Importing…" : `Import ${rows.length} users`}</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && result && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="card !shadow-none border border-line text-center"><CheckCircle2 className="mx-auto text-green-600 mb-1" /><div className="text-2xl font-extrabold">{result.created}</div><div className="text-slate2 text-[13px]">Created</div></div>
                <div className="card !shadow-none border border-line text-center"><div className="text-2xl font-extrabold text-amber-600">{result.skipped}</div><div className="text-slate2 text-[13px]">Skipped (duplicates)</div></div>
                <div className="card !shadow-none border border-line text-center"><div className="text-2xl font-extrabold text-red-600">{result.errors?.length || 0}</div><div className="text-slate2 text-[13px]">Errors</div></div>
              </div>
              {result.custom_fields?.length > 0 && (
                <p className="text-[13px] text-slate2 mb-3">Registered custom fields: {result.custom_fields.map((f: any) => <span key={f.key} className="chip bg-brand-50 text-brand-700 mr-1">{f.label}</span>)}</p>
              )}
              {result.errors?.length > 0 && (
                <div className="border border-line rounded-xl overflow-hidden max-h-[200px] overflow-y-auto mb-4">
                  <table className="w-full text-[13px]"><thead><tr className="text-left text-slate2 bg-bg2"><th className="py-2 px-3">Row</th><th className="py-2 px-3">Email</th><th className="py-2 px-3">Reason</th></tr></thead>
                    <tbody>{result.errors.map((e: any, i: number) => <tr key={i} className="border-t border-line"><td className="py-2 px-3">{e.line}</td><td className="py-2 px-3">{e.email || "—"}</td><td className="py-2 px-3 text-red-600">{e.reason}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end"><button className="btn btn-pri" onClick={onClose}>Done</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

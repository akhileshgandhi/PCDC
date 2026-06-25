"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";

export default function EditUserModal({ user, subjects, onClose, onSaved }: {
  user: any; subjects: any[]; onClose: () => void; onSaved: () => void;
}) {
  const isMentor = user.role === "mentor";
  const [f, setF] = useState({
    full_name: user.full_name || "", phone: user.phone || "",
    college_id: user.college_id || "", program: user.program || "", batch: user.batch || "",
    employee_id: user.employee_id || "", designation: user.designation || "",
    qualification: user.qualification || "", experience: user.experience || "",
  });
  // department mapping: ids derived by matching current department names to subjects
  const initialIds = subjects.filter((s) => (user.departments || []).includes(s.name)).map((s) => s.id);
  const [subs, setSubs] = useState<number[]>(initialIds);
  const [studentSub, setStudentSub] = useState<number>(initialIds[0] || subjects[0]?.id || 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const Field = ({ label, k, placeholder }: { label: string; k: keyof typeof f; placeholder?: string }) => (
    <div className="mb-4"><label className="field-label">{label}</label>
      <input className="field-input" value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} /></div>
  );

  async function save() {
    if (!f.full_name.trim()) { setErr("Name is required."); return; }
    setErr(""); setBusy(true);
    try {
      const body: any = { ...f, subject_ids: isMentor ? subs : (studentSub ? [studentSub] : []) };
      await api(`/api/users/${user.id}`, { method: "PATCH", body: JSON.stringify(body) });
      onSaved(); onClose();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 overflow-y-auto">
      <div className="card w-full max-w-[640px] my-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-[16px]">Edit {isMentor ? "mentor" : "student"}</h3>
          <button onClick={onClose} className="text-slate2 hover:text-ink"><X size={20} /></button>
        </div>
        {err && <div className="chip bg-red-100 text-red-700 mb-3">{err}</div>}

        <div className="grid md:grid-cols-2 gap-x-5">
          <Field label="Full name" k="full_name" />
          <div className="mb-4"><label className="field-label">Email</label>
            <input className="field-input bg-neutral-100 text-slate2" value={user.email} disabled /></div>
          <Field label="Phone" k="phone" placeholder="+91 …" />
          {isMentor ? (
            <>
              <Field label="Employee ID" k="employee_id" placeholder="PIBM-F-XXX" />
              <Field label="Designation" k="designation" placeholder="e.g. Professor" />
              <Field label="Qualification" k="qualification" placeholder="e.g. PhD (Finance)" />
              <Field label="Experience" k="experience" placeholder="e.g. 8 yrs" />
            </>
          ) : (
            <>
              <Field label="College ID" k="college_id" placeholder="PIBM-XXXX" />
              <Field label="Program" k="program" placeholder="e.g. PGDM" />
              <Field label="Batch" k="batch" placeholder="e.g. 2024-26" />
            </>
          )}
        </div>

        <div className="mb-4"><label className="field-label">Department{isMentor ? "s" : ""}</label>
          {isMentor ? (
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const on = subs.includes(s.id);
                return <span key={s.id} onClick={() => setSubs(on ? subs.filter((x) => x !== s.id) : [...subs, s.id])}
                  className={`cursor-pointer px-3.5 py-2 rounded-full text-[13px] font-semibold border ${on ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200"}`}>{s.name}</span>;
              })}
            </div>
          ) : (
            <select className="field-input" value={studentSub} onChange={(e) => setStudentSub(Number(e.target.value))}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button className="btn btn-gh" onClick={onClose}>Cancel</button>
          <button className="btn btn-pri" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

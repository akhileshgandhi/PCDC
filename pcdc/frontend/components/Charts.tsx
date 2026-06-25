"use client";

type D = { label: string; value: number };

export function BarList({ data, suffix = "", colorFor }: { data: D[]; suffix?: string; colorFor?: (d: D) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-slate2 text-sm">No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-[13px]">
          <span className="w-44 flex-none text-slate2 truncate" title={d.label}>{d.label}</span>
          <div className="flex-1 bg-neutral-100 rounded h-5 overflow-hidden">
            <div className={`h-full rounded ${colorFor ? colorFor(d) : "bg-brand-500"}`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-14 text-right font-semibold">{d.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendBars({ data }: { data: D[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-slate2 text-sm">No submissions yet.</p>;
  return (
    <div className="flex items-end gap-[3px] h-32">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col justify-end group relative" title={`${d.label}: ${d.value}`}>
          <div className="w-full bg-brand-500/80 rounded-t hover:bg-brand-600 transition-colors" style={{ height: `${(d.value / max) * 100}%`, minHeight: 2 }} />
        </div>
      ))}
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, steps[0]?.value || 1);
  const colors = ["bg-brand-700", "bg-brand-600", "bg-brand-500", "bg-green-500", "bg-red-400"];
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3 text-[13px]">
          <span className="w-28 flex-none text-slate2">{s.label}</span>
          <div className="flex-1 bg-neutral-100 rounded h-7 overflow-hidden">
            <div className={`h-full rounded ${colors[i] || "bg-brand-500"} flex items-center justify-end pr-2 text-white text-xs font-bold`}
              style={{ width: `${Math.max((s.value / max) * 100, 6)}%` }}>{s.value}</div>
          </div>
          <span className="w-12 text-right text-slate2">{max ? Math.round((s.value / max) * 100) : 0}%</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data }: { data: D[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const palette = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6"];
  let acc = 0;
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="w-32 h-32 flex-none">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-neutral-100, #f1f5f9)" strokeWidth="16" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = `${frac * C} ${C}`;
          const el = <circle key={d.label} cx="70" cy="70" r={R} fill="none" stroke={palette[i % palette.length]}
            strokeWidth="16" strokeDasharray={dash} strokeDashoffset={-acc * C} transform="rotate(-90 70 70)" />;
          acc += frac;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="fill-ink font-extrabold" fontSize="22">{total}</text>
        <text x="70" y="84" textAnchor="middle" className="fill-slate-400" fontSize="10">attempts</text>
      </svg>
      <div className="space-y-1.5 text-[13px]">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: palette[i % palette.length] }} />
            <span className="text-slate2">{d.label}</span>
            <b className="ml-auto">{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

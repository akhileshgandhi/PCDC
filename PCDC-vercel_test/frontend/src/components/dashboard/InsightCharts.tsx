import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// Charts for the role dashboards. Colours: two validated categorical slots
// for series (blue, cyan — both from the app's blue theme) and fixed status
// colours for assignment states; every colour is paired with a text label,
// never used alone.

export const SERIES_1 = "#2563eb"
export const SERIES_2 = "#06b6d4"
const GRID = "#eef2f7"
const AXIS_TEXT = "#98a2b3"
const INK = "#17202a"
const INK_MUTED = "#667085"

const STATUS_SEGMENTS = [
  { key: "completed", label: "Completed", color: "#0ca30c" },
  { key: "in_progress", label: "In progress", color: SERIES_1 },
  { key: "not_started", label: "Not started", color: "#c3c2b7" },
  { key: "overdue", label: "Overdue", color: "#d03b3b" },
] as const

export interface AssignmentStatusCounts {
  completed: number
  in_progress: number
  not_started: number
  overdue: number
}

/** One 100%-wide stacked bar of assignment states, with a labelled legend
 * that carries the counts (so the bar never has to be read by colour). */
export function AssignmentStatusBar({ counts }: { counts: AssignmentStatusCounts }) {
  const total = STATUS_SEGMENTS.reduce((sum, s) => sum + counts[s.key], 0)
  if (total === 0) {
    return <p className="text-sm text-[#667085]">No assigned cases yet.</p>
  }
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-[#eef2f7]" role="img"
        aria-label={STATUS_SEGMENTS.map((s) => `${s.label} ${counts[s.key]}`).join(", ")}>
        {STATUS_SEGMENTS.filter((s) => counts[s.key] > 0).map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${counts[s.key]} (${Math.round((100 * counts[s.key]) / total)}%)`}
            className="h-full transition-opacity hover:opacity-80"
            style={{ width: `${(100 * counts[s.key]) / total}%`, backgroundColor: s.color }}
          />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-[#eef2f7]">
        {STATUS_SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-2.5 py-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="text-[#667085]">{s.label}</span>
            <span className="ml-auto font-semibold text-[#17202a]">{counts[s.key]}</span>
            <span className="w-10 text-right text-xs text-[#98a2b3]">{Math.round((100 * counts[s.key]) / total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function weekLabel(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(date)
}

interface TooltipEntry {
  name?: string | number
  value?: number | string
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: TooltipEntry[]
  labelPrefix?: string
  valueSuffix?: string
}

/** Value first (strong), series name second, short line key for identity. */
function ChartTooltip({ active, label, payload, labelPrefix, valueSuffix = "" }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-[#dde4ec] bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-[#667085]">
        {labelPrefix}
        {label}
      </p>
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex items-center gap-2 text-xs">
          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
          <span className="font-semibold" style={{ color: INK }}>
            {entry.value}
            {valueSuffix}
          </span>
          <span style={{ color: INK_MUTED }}>{entry.name}</span>
        </p>
      ))}
    </div>
  )
}

interface TrendSeries {
  key: string
  label: string
  color: string
}

interface DotProps {
  cx?: number
  cy?: number
  index?: number
  payload?: { value?: number | null }
}

/** A plain dot everywhere, except the latest point on the line, which pulses
 * gently — a small "this is live, still moving" cue on an otherwise static
 * trend line. */
function liveDot(color: string, lastIndex: number) {
  return function LiveDot({ cx, cy, index, payload }: DotProps) {
    if (cx === undefined || cy === undefined) return null
    if (payload && (payload.value === null || payload.value === undefined)) return null
    if (index !== lastIndex) {
      return <circle cx={cx} cy={cy} r={3} strokeWidth={2} fill="#ffffff" stroke={color} />
    }
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.35} className="origin-center animate-ping" />
        <circle cx={cx} cy={cy} r={4} strokeWidth={2} fill={color} stroke="#ffffff" />
      </g>
    )
  }
}

/** Weekly counts (same unit, one axis). Legend only when there are 2+ series. */
export function WeeklyTrendChart<T extends { week_start: string }>({
  data,
  series,
  height = 220,
}: {
  data: T[]
  series: TrendSeries[]
  height?: number
}) {
  const rows = data.map((row) => ({ ...row, week: weekLabel(row.week_start) }))
  return (
    <div>
      {series.length > 1 ? (
        <ul className="mb-2 flex flex-wrap gap-4">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-xs text-[#667085]">
              <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`trendFill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 4" />
            <XAxis dataKey="week" tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: "#c3c2b7", strokeWidth: 1 }}
              content={<ChartTooltip labelPrefix="Week of " />}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                fill={`url(#trendFill-${s.key})`}
                dot={liveDot(s.color, rows.length - 1)}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
                animationDuration={1100}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Single-series vertical bars (e.g. score distribution). The title names
 * the series, so there is no legend. */
export function SimpleBarChart({
  data,
  categoryKey,
  valueKey,
  valueName,
  color = SERIES_1,
  valueSuffix = "",
  height = 220,
}: {
  data: object[]
  categoryKey: string
  valueKey: string
  valueName: string
  color?: string
  valueSuffix?: string
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }} barCategoryGap="25%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={categoryKey} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#f5f7fa" }} content={<ChartTooltip valueSuffix={valueSuffix} />} />
          <Bar dataKey={valueKey} name={valueName} fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horizontal bars for comparing named groups on a 0–100 score. */
export function HorizontalScoreBars({
  data,
  categoryKey,
  valueKey,
  valueName,
  color = SERIES_1,
}: {
  data: object[]
  categoryKey: string
  valueKey: string
  valueName: string
  color?: string
}) {
  const height = Math.max(120, data.length * 40 + 30)
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barCategoryGap="30%">
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
          <YAxis
            type="category"
            dataKey={categoryKey}
            width={110}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "#f5f7fa" }} content={<ChartTooltip valueSuffix="%" />} />
          <Bar dataKey={valueKey} name={valueName} fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Score per evaluated case over time (0–100), with the case title in the tooltip. */
export function ScoreTrendChart({
  data,
  height = 220,
}: {
  data: { title: string; score_pct: number | null; at: string | null }[]
  height?: number
}) {
  const rows = data.map((row, index) => ({
    n: `#${index + 1}`,
    score: row.score_pct === null ? null : Math.round(row.score_pct),
    title: row.title,
  }))
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="scoreTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_1} stopOpacity={0.35} />
              <stop offset="100%" stopColor={SERIES_1} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="n" tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip
            cursor={{ stroke: "#c3c2b7", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof rows)[number] | undefined
              if (!active || !row) return null
              return (
                <div className="max-w-[220px] rounded-md border border-[#dde4ec] bg-white px-3 py-2 shadow-md">
                  <p className="text-sm font-semibold" style={{ color: INK }}>{row.score ?? "—"}%</p>
                  <p className="text-xs" style={{ color: INK_MUTED }}>{row.title}</p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            name="Score"
            stroke={SERIES_1}
            strokeWidth={2.5}
            fill="url(#scoreTrendFill)"
            dot={liveDot(SERIES_1, rows.length - 1)}
            activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }}
            connectNulls
            animationDuration={1100}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

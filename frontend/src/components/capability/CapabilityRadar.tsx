import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

export interface CapabilityRadarItem {
  name: string
  score: number
}

interface CapabilityRadarProps {
  capabilities: CapabilityRadarItem[]
}

export default function CapabilityRadar({ capabilities }: CapabilityRadarProps) {
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart outerRadius="72%" data={capabilities}>
          <PolarGrid stroke="#E6EBEB" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              borderColor: "#E6EBEB",
              borderRadius: "8px",
              color: "#111827",
            }}
          />
          <Radar
            name="Current"
            dataKey="score"
            stroke="#C9A227"
            fill="#C9A227"
            fillOpacity={0.35}
            strokeWidth={3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

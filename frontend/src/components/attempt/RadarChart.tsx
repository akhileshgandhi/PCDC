export interface RadarMetric {
  label: string
  score: number
}

interface RadarChartProps {
  metrics: RadarMetric[]
}

export default function RadarChart({ metrics }: RadarChartProps) {
  const size = 260
  const center = size / 2
  const radius = 92
  const points = metrics.map((metric, index) => {
    const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2
    const valueRadius = (metric.score / 100) * radius
    return {
      x: center + Math.cos(angle) * valueRadius,
      y: center + Math.sin(angle) * valueRadius,
    }
  })
  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ")

  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-72 w-full max-w-72"
        role="img"
        aria-label="Capability radar chart"
      >
        {rings.map((ring) => (
          <circle
            key={ring}
            cx={center}
            cy={center}
            r={radius * ring}
            fill="none"
            stroke="#E6EBEB"
            strokeWidth="1"
          />
        ))}
        {metrics.map((metric, index) => {
          const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2
          const axisX = center + Math.cos(angle) * radius
          const axisY = center + Math.sin(angle) * radius
          const labelX = center + Math.cos(angle) * (radius + 28)
          const labelY = center + Math.sin(angle) * (radius + 28)

          return (
            <g key={metric.label}>
              <line x1={center} y1={center} x2={axisX} y2={axisY} stroke="#E6EBEB" />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[#6B7280] text-[10px] font-semibold"
              >
                {metric.label.split(" ")[0]}
              </text>
            </g>
          )
        })}
        <polygon
          points={polygonPoints}
          fill="#C9A227"
          fillOpacity="0.28"
          stroke="#C9A227"
          strokeWidth="3"
        />
        {points.map((point, index) => (
          <circle
            key={metrics[index].label}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#0B1D3A"
          />
        ))}
      </svg>
    </div>
  )
}

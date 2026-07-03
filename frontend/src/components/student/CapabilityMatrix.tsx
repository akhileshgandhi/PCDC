import { useState } from "react"

interface CapabilityMatrixItem {
  name: string
  score: number
}

interface CapabilityMatrixCategory {
  id: string
  label: string
  score: number
  items: CapabilityMatrixItem[]
}

const capabilityData: CapabilityMatrixCategory[] = [
  {
    id: "cognitive",
    label: "Cognitive Capabilities",
    score: 68,
    items: [
      { name: "Analytical Thinking", score: 74 },
      { name: "Critical Thinking", score: 65 },
      { name: "Strategic Thinking", score: 71 },
      { name: "Systems Thinking", score: 60 },
      { name: "Decision Making", score: 70 },
    ],
  },
  {
    id: "leadership",
    label: "Leadership Capabilities",
    score: 61,
    items: [
      { name: "Communication", score: 68 },
      { name: "Influence", score: 58 },
      { name: "Negotiation", score: 63 },
      { name: "Conflict Resolution", score: 55 },
      { name: "Team Management", score: 61 },
    ],
  },
  {
    id: "entrepreneurial",
    label: "Entrepreneurial Capabilities",
    score: 57,
    items: [
      { name: "Opportunity Recognition", score: 62 },
      { name: "Innovation", score: 55 },
      { name: "Business Model Thinking", score: 58 },
      { name: "Risk Assessment", score: 51 },
      { name: "Resourcefulness", score: 59 },
    ],
  },
  {
    id: "professional",
    label: "Professional Capabilities",
    score: 72,
    items: [
      { name: "Professional Judgment", score: 75 },
      { name: "Business Acumen", score: 70 },
      { name: "Execution Orientation", score: 73 },
      { name: "Learning Agility", score: 68 },
      { name: "Adaptability", score: 74 },
    ],
  },
]

export default function CapabilityMatrix() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  function handleBoxClick(categoryId: string) {
    setActiveCategory((prev) => (prev === categoryId ? null : categoryId))
  }

  const activeData = capabilityData.find((category) => category.id === activeCategory) ?? null

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {capabilityData.map((category) => {
          const isActive = category.id === activeCategory
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleBoxClick(category.id)}
              aria-expanded={isActive}
              className={`rounded-lg border p-5 text-center shadow-sm transition ${
                isActive
                  ? "border-[#c9a227] bg-[#fff7df]"
                  : "border-[#e6e8eb] bg-white hover:border-[#c9a227]"
              }`}
            >
              <h3 className="text-sm font-medium text-[#111827]">{category.label}</h3>
              <p className="mt-3 text-3xl font-bold text-[#081d3a]">{category.score}</p>
              <p className="mt-1 text-xs text-[#6b7280]">avg score</p>
            </button>
          )
        })}
      </div>

      {activeData ? (
        <div className="mt-4 rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#111827]">{activeData.label}</h3>
            <span className="text-lg font-bold text-[#081d3a]">{activeData.score}</span>
          </div>
          <div className="mt-4 space-y-3">
            {activeData.items.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm font-medium text-[#111827] sm:w-48">
                  {item.name}
                </span>
                <div className="h-2 flex-1 rounded-full bg-[#e6e8eb]">
                  <div
                    className="h-2 rounded-full bg-[#c9a227]"
                    style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold text-[#111827]">
                  {item.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

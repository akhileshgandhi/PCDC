import { ChevronDown } from "lucide-react"
import { useState } from "react"

interface CapabilityCategory {
  key: string
  label: string
  icon: string
  capabilities: string[]
}

const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  {
    key: "cognitive",
    label: "Cognitive Capabilities",
    icon: "🧠",
    capabilities: [
      "Analytical Thinking",
      "Critical Thinking",
      "Strategic Thinking",
      "Systems Thinking",
      "Decision Making",
    ],
  },
  {
    key: "leadership",
    label: "Leadership Capabilities",
    icon: "👥",
    capabilities: [
      "Communication",
      "Influence",
      "Negotiation",
      "Conflict Resolution",
      "Team Management",
    ],
  },
  {
    key: "entrepreneurial",
    label: "Entrepreneurial Capabilities",
    icon: "💡",
    capabilities: [
      "Opportunity Recognition",
      "Innovation",
      "Business Model Thinking",
      "Risk Assessment",
      "Resourcefulness",
    ],
  },
  {
    key: "professional",
    label: "Professional Capabilities",
    icon: "⭐",
    capabilities: [
      "Professional Judgment",
      "Business Acumen",
      "Execution Orientation",
      "Learning Agility",
      "Adaptability",
    ],
  },
]

interface CapabilitySelectorProps {
  selected: string[]
  onToggle: (capabilityName: string) => void
}

export default function CapabilitySelector({ selected, onToggle }: CapabilitySelectorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(CAPABILITY_CATEGORIES.map((category) => category.key)),
  )

  function toggleExpanded(categoryKey: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(categoryKey)) {
        next.delete(categoryKey)
      } else {
        next.add(categoryKey)
      }
      return next
    })
  }

  return (
    <div>
      <p className="text-sm font-semibold text-[#111827]">Capabilities Targeted</p>
      <div className="mt-2 grid gap-3">
        {CAPABILITY_CATEGORIES.map((category) => {
          const isExpanded = expanded.has(category.key)
          return (
            <div key={category.key} className="rounded-lg border border-[#e6e8eb] bg-white">
              <button
                type="button"
                onClick={() => toggleExpanded(category.key)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[#111827]"
              >
                <span>
                  <span aria-hidden="true">{category.icon}</span> {category.label}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {isExpanded ? (
                <div className="grid gap-2 border-t border-[#e6e8eb] px-4 py-3">
                  {category.capabilities.map((capability) => {
                    const isSelected = selected.includes(capability)
                    return (
                      <label
                        key={capability}
                        className="flex items-center gap-3 text-sm font-medium text-[#111827]"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggle(capability)}
                          className="size-4"
                        />
                        {capability}
                      </label>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-sm font-medium text-[#6b7280]">
        {selected.length === 0
          ? "No capabilities selected yet."
          : `Selected: ${selected.join(", ")} (${selected.length} selected)`}
      </p>
    </div>
  )
}

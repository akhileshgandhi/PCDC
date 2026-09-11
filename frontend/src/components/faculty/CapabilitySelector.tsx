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
      "Observation",
      "Questioning",
      "Reasoning",
      "Diagnosis",
      "Analytical Thinking",
      "Critical Thinking",
      "Judgment",
      "Trade-off Analysis",
      "Strategic Thinking",
      "Systems Thinking",
      "Long-term Planning",
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
      "Empathy",
      "Negotiation",
      "Conflict Management",
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
  // View-only: category headers stay clickable so a reader can still expand
  // a category to see what's checked inside it — only the pills themselves
  // (which would change the selection) are disabled.
  disabled?: boolean
}

const ALL_CATALOG_CAPABILITIES = new Set(
  CAPABILITY_CATEGORIES.flatMap((category) => category.capabilities),
)

export default function CapabilitySelector({ selected, onToggle, disabled = false }: CapabilitySelectorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const uncategorized = selected.filter((capability) => !ALL_CATALOG_CAPABILITIES.has(capability))

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
      <div className="mt-2 grid gap-2">
        {CAPABILITY_CATEGORIES.map((category) => {
          const isExpanded = expanded.has(category.key)
          const selectedCount = category.capabilities.filter((capability) =>
            selected.includes(capability),
          ).length
          return (
            <div key={category.key} className="rounded-lg border border-[#e6e8eb] bg-white">
              <button
                type="button"
                onClick={() => toggleExpanded(category.key)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-[#111827]"
              >
                <span>
                  <span aria-hidden="true">{category.icon}</span> {category.label}
                  {selectedCount > 0 ? (
                    <span className="ml-2 rounded-full bg-[#fff7df] px-2 py-0.5 text-xs font-semibold text-[#92702a]">
                      {selectedCount} selected
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {isExpanded ? (
                <div className="flex flex-wrap gap-2 border-t border-[#e6e8eb] px-4 py-3">
                  {category.capabilities.map((capability) => {
                    const isSelected = selected.includes(capability)
                    return (
                      <button
                        key={capability}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onToggle(capability)}
                        disabled={disabled}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-[#c9a227] bg-[#fff7df] text-[#92702a]"
                            : "border-[#e6e8eb] bg-white text-[#374151] hover:border-[#c9a227]"
                        } ${disabled ? "cursor-not-allowed opacity-70 hover:border-[#e6e8eb]" : ""}`}
                      >
                        {capability}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      {uncategorized.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[#f3c4c4] bg-[#fff8f8] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#b42318]">
            Not in the standard list
          </p>
          <p className="mt-1 text-xs leading-5 text-[#6b7280]">
            These were saved with this case (e.g. from a bulk-uploaded document) but don't match
            any of the four categories above exactly, so they can't be shown as a checked pill in
            any of them.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {uncategorized.map((capability) => (
              <span
                key={capability}
                className="rounded-full border border-[#f3c4c4] bg-white px-3 py-1.5 text-xs font-semibold text-[#b42318]"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-sm font-medium text-[#6b7280]">
        {selected.length === 0
          ? "No capabilities selected yet."
          : `Selected: ${selected.join(", ")} (${selected.length} selected)`}
      </p>
    </div>
  )
}

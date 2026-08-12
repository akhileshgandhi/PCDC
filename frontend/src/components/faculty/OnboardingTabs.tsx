import { NavLink } from "react-router-dom"

interface OnboardingTabsProps {
  studentCount?: number
}

const tabs = [
  { label: "My Teaching", to: "/faculty/onboarding/my-teaching" },
  { label: "Students", to: "/faculty/students", showCount: true },
]

export default function OnboardingTabs({ studentCount }: OnboardingTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          className={({ isActive }) =>
            `inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[#0b1d3a] text-white"
                : "border border-[#e6e8eb] bg-white text-[#111827] hover:border-[#0b1d3a]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {t.label}
              {t.showCount && studentCount !== undefined ? (
                <span
                  className={`grid min-w-5 place-items-center rounded-full px-1 text-xs font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-[#eef2f7] text-[#475467]"
                  }`}
                >
                  {studentCount}
                </span>
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}

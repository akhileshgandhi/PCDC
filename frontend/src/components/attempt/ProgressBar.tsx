interface ProgressBarProps {
  currentScreen: number
  title?: string
}

const stages = ["Briefing", "Analysis", "Rapid Fire", "Evaluation"]

export default function ProgressBar({ currentScreen, title }: ProgressBarProps) {
  const currentStage = stages[currentScreen - 1]
  const progressPercent = ((currentScreen - 1) / (stages.length - 1)) * 100

  return (
    <header className="sticky top-0 z-20 border-b border-[#E6EBEB] bg-white shadow-sm">
      <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#0B1D3A] text-sm font-semibold text-white">
              P
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold uppercase tracking-wide text-[#C9A227]">
                PCDC
              </p>
              <h1 className="truncate text-lg font-semibold text-[#111827]">
                {title || "Case Attempt"}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <span className="rounded-full bg-[#F6F7F9] px-3 py-1 text-[#0B1D3A]">
            Stage {currentScreen} of 4: {currentStage}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <div className="relative h-2 rounded-full bg-[#E6EBEB]">
            <div
              className="h-2 rounded-full bg-[#C9A227] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {stages.map((stage, index) => {
              const stageNumber = index + 1
              const isComplete = stageNumber < currentScreen
              const isCurrent = stageNumber === currentScreen

              return (
                <div key={stage} className="text-center">
                  <div
                    className={`mx-auto grid size-8 place-items-center rounded-full border text-xs font-semibold ${
                      isCurrent || isComplete
                        ? "border-[#C9A227] bg-[#C9A227] text-white"
                        : "border-[#D1D5DB] bg-white text-[#6B7280]"
                    }`}
                  >
                    {stageNumber}
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-[#6B7280]">{stage}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}

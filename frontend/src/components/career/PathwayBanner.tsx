interface PathwayBannerProps {
  readiness: number
  focusAreas: string[]
}

export default function PathwayBanner({ readiness, focusAreas }: PathwayBannerProps) {
  return (
    <section className="rounded-lg bg-[#081d3a] p-6 text-white shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a227]">
            Current Pathway
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Management Consulting</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            Focused development toward consulting readiness through structured thinking,
            decision quality, and executive communication.
          </p>
        </div>

        <button
          type="button"
          className="w-fit rounded-md border border-[#c9a227] px-4 py-2 text-sm font-semibold text-[#c9a227] transition hover:bg-[#c9a227] hover:text-[#081d3a]"
        >
          Change Pathway
        </button>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-white">Capability Readiness</span>
            <span className="font-semibold text-[#c9a227]">{readiness}%</span>
          </div>
          <div className="mt-3 h-3 rounded-full bg-white/15">
            <div
              className="h-3 rounded-full bg-[#c9a227]"
              style={{ width: `${readiness}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-white/70">Estimated readiness: 4-6 months</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Key Focus Areas</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {focusAreas.map((area) => (
              <span
                key={area}
                className="rounded-md border border-[#c9a227]/40 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

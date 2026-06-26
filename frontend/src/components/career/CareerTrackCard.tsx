import type { LucideIcon } from "lucide-react"

export interface CareerTrack {
  name: string
  icon: LucideIcon
  match: number
  current?: boolean
}

interface CareerTrackCardProps {
  track: CareerTrack
}

export default function CareerTrackCard({ track }: CareerTrackCardProps) {
  const Icon = track.icon

  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        track.current ? "border-[#c9a227] ring-2 ring-[#c9a227]/20" : "border-[#e6e8eb]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-[#f6f7fb] text-[#081d3a]">
            <Icon size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-[#111827]">{track.name}</h3>
            <p className="mt-1 text-xs text-[#6b7280]">{track.match}% capability match</p>
          </div>
        </div>
        {track.current ? (
          <span className="rounded-md bg-[#c9a227] px-2.5 py-1 text-xs font-semibold text-[#081d3a]">
            Current
          </span>
        ) : null}
      </div>

      <div className="mt-4 h-2 rounded-full bg-[#eef0f3]">
        <div className="h-2 rounded-full bg-[#081d3a]" style={{ width: `${track.match}%` }} />
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-md border border-[#e6e8eb] px-3 py-2 text-sm font-semibold text-[#081d3a] transition hover:border-[#081d3a]"
      >
        Explore
      </button>
    </article>
  )
}

import { CalendarDays, Video } from "lucide-react"

interface UpcomingSessionProps {
  onJoinSession: () => void
}

export default function UpcomingSession({ onJoinSession }: UpcomingSessionProps) {
  return (
    <section className="rounded-lg border border-l-4 border-[#e6e8eb] border-l-[#c9a227] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-[#fff9e8] text-[#c9a227]">
          <CalendarDays size={19} aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-[#6b7280]">Upcoming Session</p>
          <h2 className="text-lg font-semibold text-[#111827]">Friday, June 27, 2025</h2>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-[#111827]">11:00 AM - 11:45 AM</p>
      <p className="mt-4 text-sm leading-6 text-[#6b7280]">
        Agenda: Focus on improving risk awareness and implementation clarity in your defense
        responses.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onJoinSession}
          className="inline-flex items-center gap-2 rounded-md bg-[#081d3a] px-4 py-2 text-sm font-semibold text-white"
        >
          <Video size={17} aria-hidden="true" />
          Join Session
        </button>
        <button
          type="button"
          className="rounded-md border border-[#e6e8eb] px-4 py-2 text-sm font-semibold text-[#081d3a]"
        >
          Add to Calendar
        </button>
      </div>
    </section>
  )
}

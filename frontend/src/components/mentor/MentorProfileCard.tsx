import { MessageSquare, UserCircle } from "lucide-react"

interface MentorProfileCardProps {
  onSendMessage: () => void
}

export default function MentorProfileCard({ onSendMessage }: MentorProfileCardProps) {
  return (
    <section className="rounded-lg bg-[#081d3a] p-6 text-white shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-white/10 text-[#c9a227]">
            <UserCircle size={52} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a227]">
              Assigned Executive Mentor
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Dr. Ananya Rao</h2>
            <div className="mt-4 grid gap-2 text-sm text-white/75">
              <p>Department: Strategy & Leadership</p>
              <p>Experience: 18 years in consulting</p>
              <p>Specialisation: Strategic Thinking, Decision Making, Executive Presence</p>
              <p>Students assigned: 18 / 25</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSendMessage}
            className="inline-flex items-center gap-2 rounded-md bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#081d3a]"
          >
            <MessageSquare size={17} aria-hidden="true" />
            Send Message
          </button>
          <button
            type="button"
            className="rounded-md border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View Profile
          </button>
        </div>
      </div>
    </section>
  )
}

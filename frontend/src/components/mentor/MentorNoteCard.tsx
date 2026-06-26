export type MentorNoteType = "observation" | "recommendation" | "praise"

export interface MentorNote {
  date: string
  caseName: string
  note: string
  type: MentorNoteType
}

interface MentorNoteCardProps {
  note: MentorNote
}

const borderColors: Record<MentorNoteType, string> = {
  observation: "border-l-[#081d3a]",
  recommendation: "border-l-[#c9a227]",
  praise: "border-l-[#16a34a]",
}

export default function MentorNoteCard({ note }: MentorNoteCardProps) {
  return (
    <article className={`rounded-lg border border-l-4 border-[#e6e8eb] bg-white p-4 shadow-sm ${borderColors[note.type]}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-[#111827]">{note.caseName}</h3>
        <span className="text-xs font-semibold uppercase text-[#6b7280]">{note.date}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{note.note}</p>
    </article>
  )
}

import MentorNoteCard, { type MentorNote } from "../../components/mentor/MentorNoteCard"
import MentorProfileCard from "../../components/mentor/MentorProfileCard"
import ScheduleSession from "../../components/mentor/ScheduleSession"
import UpcomingSession from "../../components/mentor/UpcomingSession"
import DashboardLayout from "../../layouts/DashboardLayout"

const mentorNotes: MentorNote[] = [
  {
    date: "Jun 20, 2025",
    caseName: "Q3 Market Entry Strategy",
    note: "Sanjay shows strong structured thinking but needs to develop more robust risk mitigation. His AI utilisation is good because he asks probing questions rather than seeking answers.",
    type: "observation",
  },
  {
    date: "Jun 15, 2025",
    caseName: "IPL Franchise Turnaround",
    note: "Communication score was lower than expected. Recommend working with the Communication Coach before the next leadership case.",
    type: "recommendation",
  },
  {
    date: "Jun 10, 2025",
    caseName: "General",
    note: "Excellent improvement in analytical thinking this month. Keep pushing on strategic case complexity.",
    type: "praise",
  },
]

const interventions = [
  { date: "Jun 20", type: "Capability Alert", action: "Recommended Level 5", status: "Done" },
  { date: "Jun 15", type: "Session", action: "45-min coaching call", status: "Done" },
  { date: "Jun 01", type: "Resource Share", action: "Sent McKinsey article", status: "Done" },
]

export default function MentorSupport() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Mentor Support</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Your assigned executive mentor and coaching history.
          </p>
        </div>

        <MentorProfileCard
          onSendMessage={() => window.alert("Messaging will be available in a future release.")}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <UpcomingSession
            onJoinSession={() => window.alert("Video session joining will be available soon.")}
          />

          <section>
            <h2 className="text-lg font-semibold text-[#111827]">Mentor Observations</h2>
            <div className="mt-4 grid gap-4">
              {mentorNotes.map((note) => (
                <MentorNoteCard key={`${note.date}-${note.caseName}`} note={note} />
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Intervention History</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e6e8eb] text-xs uppercase text-[#6b7280]">
                  <th className="py-3 pr-4 font-semibold">Date</th>
                  <th className="py-3 pr-4 font-semibold">Type</th>
                  <th className="py-3 pr-4 font-semibold">Action Taken</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((intervention) => (
                  <tr key={`${intervention.date}-${intervention.type}`} className="border-b border-[#eef0f3] last:border-b-0">
                    <td className="py-3 pr-4 font-semibold text-[#111827]">{intervention.date}</td>
                    <td className="py-3 pr-4 text-[#6b7280]">{intervention.type}</td>
                    <td className="py-3 pr-4 text-[#111827]">{intervention.action}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-md bg-[#dcfce7] px-2.5 py-1 text-xs font-semibold text-[#166534]">
                        {intervention.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ScheduleSession />
      </div>
    </DashboardLayout>
  )
}

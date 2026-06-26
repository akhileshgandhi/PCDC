export interface CapabilityHistoryRow {
  title: string
  date: string
  score: number
  strongest: string
  weakest: string
}

interface CapabilityHistoryTableProps {
  rows: CapabilityHistoryRow[]
}

export default function CapabilityHistoryTable({ rows }: CapabilityHistoryTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E6EBEB] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#F6F7F9] text-[#111827]">
            <tr>
              <th className="px-5 py-4 font-semibold">Case Study</th>
              <th className="px-5 py-4 font-semibold">Date</th>
              <th className="px-5 py-4 font-semibold">Score</th>
              <th className="px-5 py-4 font-semibold">Strongest</th>
              <th className="px-5 py-4 font-semibold">Weakest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EBEB]">
            {rows.map((row) => (
              <tr key={row.title} className="text-[#374151]">
                <td className="px-5 py-4 font-semibold text-[#111827]">{row.title}</td>
                <td className="px-5 py-4">{row.date}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[#F6F7F9] px-3 py-1 font-semibold text-[#0B1D3A]">
                    {row.score}
                  </span>
                </td>
                <td className="px-5 py-4">{row.strongest}</td>
                <td className="px-5 py-4">{row.weakest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export interface LeaderboardRow {
  rank: number
  name: string
  score: number
  level: number
  cases: number
  self?: boolean
}

interface LeaderboardProps {
  rows: LeaderboardRow[]
}

export default function Leaderboard({ rows }: LeaderboardProps) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">Cohort Leaderboard</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#e6e8eb] text-xs uppercase text-[#6b7280]">
              <th className="py-3 pr-4 font-semibold">Rank</th>
              <th className="py-3 pr-4 font-semibold">Name</th>
              <th className="py-3 pr-4 font-semibold">Score</th>
              <th className="py-3 pr-4 font-semibold">Level</th>
              <th className="py-3 pr-4 font-semibold">Cases</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.rank}
                className={`border-b border-[#eef0f3] last:border-b-0 ${
                  row.self ? "bg-[#fff9e8] text-[#081d3a]" : "text-[#111827]"
                }`}
              >
                <td className="py-3 pr-4 font-semibold">#{row.rank}</td>
                <td className="py-3 pr-4 font-semibold">{row.name}</td>
                <td className="py-3 pr-4">{row.score}</td>
                <td className="py-3 pr-4">{row.level}</td>
                <td className="py-3 pr-4">{row.cases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

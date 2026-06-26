import { useState } from "react"

export default function ScheduleSession() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">Request a Session</h2>

      {submitted ? (
        <div className="mt-4 rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-semibold text-[#166534]">
          Session request sent to Dr. Rao.
        </div>
      ) : null}

      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
        }}
      >
        <label className="grid gap-2 text-sm font-medium text-[#111827]">
          Reason
          <select className="rounded-md border border-[#e6e8eb] bg-white px-3 py-2 text-sm outline-none focus:border-[#c9a227]">
            <option>Case Study Review</option>
            <option>Capability Discussion</option>
            <option>Career Guidance</option>
            <option>General Check-in</option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-[#111827]">
            Preferred date
            <input
              type="date"
              className="rounded-md border border-[#e6e8eb] px-3 py-2 text-sm outline-none focus:border-[#c9a227]"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[#111827]">
            Preferred time
            <input
              type="time"
              className="rounded-md border border-[#e6e8eb] px-3 py-2 text-sm outline-none focus:border-[#c9a227]"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-[#111827]">
          Message to mentor
          <textarea
            rows={4}
            placeholder="Optional context for the session"
            className="resize-none rounded-md border border-[#e6e8eb] px-3 py-2 text-sm outline-none focus:border-[#c9a227]"
          />
        </label>

        <button
          type="submit"
          className="w-fit rounded-md bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#081d3a]"
        >
          Send Request
        </button>
      </form>
    </section>
  )
}

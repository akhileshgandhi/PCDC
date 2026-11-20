import { CheckCircle2, LoaderCircle } from "lucide-react"
import { useEffect, useState } from "react"

import { chooseCareerTrack, getCareerTracks, type CareerTrack } from "../../api/student"

interface CareerTrackPickerProps {
  /** Name of the student's current track, or null when none is set. */
  currentTrack: string | null
  /** Called after a track is saved, so the page can reload the pathway. */
  onChosen: () => void
  onCancel?: () => void
}

/** "Choose your career track": one card per track; clicking one saves it. */
export default function CareerTrackPicker({ currentTrack, onChosen, onCancel }: CareerTrackPickerProps) {
  const [tracks, setTracks] = useState<CareerTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getCareerTracks()
      .then((result) => {
        if (active) setTracks(result)
      })
      .catch(() => {
        if (active) setError("Unable to load career tracks right now.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleChoose(track: CareerTrack) {
    if (savingId !== null) return
    if (track.name === currentTrack) {
      onCancel?.()
      return
    }
    setError("")
    setSavingId(track.id)
    try {
      await chooseCareerTrack(track.id)
      onChosen()
    } catch {
      setError("Could not save your career track. Please try again.")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section id="choose-track" className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Choose your career track</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Pick the career you are working toward. You can change it at any time.
          </p>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#e6e8eb] px-3 py-1.5 text-sm font-semibold text-[#374151] hover:bg-[#f6f7fb]"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-[#f3c4c4] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#b42318]">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-[#6b7280]">Loading career tracks...</p>
      ) : tracks.length === 0 && !error ? (
        <p className="mt-4 text-sm text-[#6b7280]">No career tracks are available yet. Please contact your admin.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tracks.map((track) => {
            const isCurrent = track.name === currentTrack
            const isSaving = savingId === track.id
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => handleChoose(track)}
                disabled={savingId !== null}
                aria-pressed={isCurrent}
                className={`rounded-lg border p-4 text-left transition disabled:cursor-wait ${
                  isCurrent
                    ? "border-[#2563eb] bg-[#eaf1fd]"
                    : "border-[#e6e8eb] bg-white hover:border-[#2563eb] hover:bg-[#f6f9ff]"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#111827]">{track.name}</span>
                  {isSaving ? (
                    <LoaderCircle size={16} className="animate-spin text-[#2563eb]" aria-hidden="true" />
                  ) : isCurrent ? (
                    <CheckCircle2 size={16} className="text-[#2563eb]" aria-label="Current track" />
                  ) : null}
                </span>
                {track.description ? (
                  <span className="mt-1 block text-xs leading-5 text-[#6b7280]">{track.description}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

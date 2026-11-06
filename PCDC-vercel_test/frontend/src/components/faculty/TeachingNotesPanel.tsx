import { AlertTriangle, CheckCircle2, Loader2, Lock, Save, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import {
  generateFacultyTeachingNotes,
  getFacultyTeachingNotes,
  saveFacultyTeachingNotes,
} from "../../api/faculty"

const MAX_NOTES_CHARS = 20000
const MAX_PROMPT_CHARS = 2000

interface TeachingNotesPanelProps {
  caseId: number
}

// Faculty-only notes in the Case Builder. Sits outside the read-only wrapper
// because notes aren't case content: the case's creator can still edit them
// after publishing. Loads and saves via its own endpoints, like RubricEditor.
export default function TeachingNotesPanel({ caseId }: TeachingNotesPanelProps) {
  const [notes, setNotes] = useState("")
  const [savedNotes, setSavedNotes] = useState("")
  const [canEdit, setCanEdit] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const hasChanges = notes.trim() !== savedNotes.trim()
  const tooLong = notes.length > MAX_NOTES_CHARS

  useEffect(() => {
    let isMounted = true
    async function loadNotes() {
      setIsLoading(true)
      setIsLoaded(false)
      try {
        const data = await getFacultyTeachingNotes(caseId)
        if (isMounted) {
          setNotes(data.teaching_notes)
          setSavedNotes(data.teaching_notes)
          setCanEdit(data.can_edit)
          setIsLoaded(true)
          setError("")
        }
      } catch {
        if (isMounted) setError("Unable to load the teaching notes.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadNotes()
    return () => {
      isMounted = false
    }
  }, [caseId])

  async function saveNotes() {
    setIsSaving(true)
    setNotice("")
    try {
      const data = await saveFacultyTeachingNotes(caseId, notes)
      setNotes(data.teaching_notes)
      setSavedNotes(data.teaching_notes)
      setCanEdit(data.can_edit)
      setError("")
      setNotice("Teaching notes saved.")
    } catch {
      setError("Unable to save the teaching notes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  async function generateNotes() {
    setIsGenerating(true)
    setNotice("")
    try {
      const data = await generateFacultyTeachingNotes(caseId, prompt.trim())
      // Added below anything already written, so nothing is lost.
      setNotes((current) =>
        current.trim() ? `${current.trimEnd()}\n\n${data.teaching_notes}` : data.teaching_notes,
      )
      setPrompt("")
      setError("")
      setNotice("AI notes added below. Review them, then save.")
    } catch {
      setError("The AI could not write notes right now. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111827]">Teaching Notes</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6b7280]">
            <Lock size={14} aria-hidden="true" />
            For faculty and admins only. Students never see these notes.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={saveNotes}
            disabled={!hasChanges || tooLong || isSaving || isGenerating}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save Notes
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
          <AlertTriangle size={16} aria-hidden="true" />
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]">
          <CheckCircle2 size={16} aria-hidden="true" />
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
          Loading notes…
        </div>
      ) : isLoaded ? (
        <>
          {canEdit ? (
            <div className="mb-4 rounded-lg border border-[#e6e8eb] bg-[#f9fafb] p-4">
              <label htmlFor="teaching-notes-prompt" className="text-sm font-semibold text-[#111827]">
                Write with AI
              </label>
              <p className="mt-1 text-sm text-[#6b7280]">
                Say what you want to understand. The AI uses this case as context, and its notes
                are added below for you to edit.
              </p>
              <textarea
                id="teaching-notes-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={2}
                maxLength={MAX_PROMPT_CHARS}
                placeholder="e.g. Explain break-even analysis and how to use it to discuss this case in class."
                className="mt-3 w-full rounded-md border border-[#e6e8eb] bg-white px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-[#9ca3af] focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
              />
              <button
                type="button"
                onClick={generateNotes}
                disabled={!prompt.trim() || isGenerating || isSaving}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {isGenerating ? "Writing notes…" : "Write notes with AI"}
              </button>
            </div>
          ) : null}

          <label htmlFor="teaching-notes" className="text-sm font-semibold text-[#111827]">
            Notes
          </label>
          <textarea
            id="teaching-notes"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
              setNotice("")
            }}
            readOnly={!canEdit}
            rows={14}
            placeholder={canEdit ? "Write your notes here." : "No teaching notes yet."}
            className="mt-2 w-full rounded-md border border-[#e6e8eb] bg-white px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-[#9ca3af] focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
          />
          {canEdit ? (
            <p className={`mt-1 text-xs ${tooLong ? "font-semibold text-[#b42318]" : "text-[#6b7280]"}`}>
              {notes.length} / {MAX_NOTES_CHARS} characters
              {hasChanges ? " · Unsaved changes" : ""}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

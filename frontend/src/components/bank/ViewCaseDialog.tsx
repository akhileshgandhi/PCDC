import { Rocket } from "lucide-react"

import type { BankEntryDetail } from "../../api/bank"
import {
  INSTRUCTION_FIELDS,
  ModalShell,
  SECTION_FIELDS,
  SourceChip,
  bankTheme,
  formatDate,
  roleLabel,
  secondaryBtn,
  type BankVariant,
} from "./shared"

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value || !String(value).trim()) return null
  return (
    <div>
      <h4 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}</h4>
      <p className="whitespace-pre-wrap text-sm leading-6 text-[#374151]">{value}</p>
    </div>
  )
}

function ListBlock({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <h4 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}</h4>
      <ul className="list-disc space-y-0.5 pl-5 text-sm leading-6 text-[#374151]">
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  )
}

/** Full-detail view of a bank entry — shows every field of the case-study
 * creation form that the entry carries (sections, timing, questions with
 * model answers, instructions), not just the summary. */
export default function ViewCaseDialog({ entry, variant, onClose, onPublish }: {
  entry: BankEntryDetail
  variant: BankVariant
  onClose: () => void
  onPublish: () => void
}) {
  const snapshot = entry.snapshot ?? {}
  const sections = (snapshot.sections ?? {}) as Record<string, string | string[]>
  const instructions = ((snapshot as Record<string, unknown>).instructions ?? {}) as Record<string, string>
  const timing = ((snapshot as Record<string, unknown>).timing ?? {}) as Record<string, number>
  const metadata = ((snapshot as Record<string, unknown>).metadata ?? {}) as Record<string, string>
  const questions = snapshot.questions ?? []
  const hasInstructions = INSTRUCTION_FIELDS.some((f) => String(instructions[f.key] ?? "").trim())

  return (
    <ModalShell title={entry.title} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SourceChip source={entry.source} />
        {entry.subject ? <span className="rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-semibold text-[#111827]">{entry.subject}</span> : null}
        {entry.semester_number ? <span className="rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-semibold text-[#111827]">Semester {entry.semester_number}</span> : null}
        <span className="rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-semibold text-[#111827]">{entry.difficulty_label}</span>
        {snapshot.industry ? <span className="rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-semibold capitalize text-[#111827]">{snapshot.industry}</span> : null}
        {metadata.functional_area ? <span className="rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-semibold text-[#111827]">{metadata.functional_area}</span> : null}
        {(snapshot.capabilities ?? []).map((capability) => (
          <span key={capability} className="rounded-full bg-[#0b1d3a] px-3 py-1 text-xs font-semibold text-white">{capability}</span>
        ))}
      </div>
      <p className="mb-1 text-xs text-[#6b7280]">
        Added by <span className="font-semibold text-[#111827]">{entry.creator_name}</span>
        {entry.creator_role ? ` (${roleLabel(entry.creator_role)})` : ""} · {formatDate(entry.created_at)}
      </p>
      {(timing.reading_time_minutes || timing.answer_writing_time_minutes) ? (
        <p className="mb-4 text-xs text-[#6b7280]">
          Timing: {timing.reading_time_minutes ?? "—"} min reading · {timing.answer_writing_time_minutes ?? "—"} min writing · 8 min rapid fire
        </p>
      ) : <div className="mb-3" />}

      <div className="space-y-4">
        <TextBlock label="Overview" value={entry.brief} />
        {SECTION_FIELDS.map((field) =>
          field.list ? (
            <ListBlock key={field.key} label={field.label.replace(" (one per line)", "")}
              items={Array.isArray(sections[field.key]) ? (sections[field.key] as string[]) : undefined} />
          ) : (
            <TextBlock key={field.key} label={field.label}
              value={typeof sections[field.key] === "string" ? (sections[field.key] as string) : undefined} />
          ),
        )}

        {questions.length > 0 ? (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Written questions</h4>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <details key={index} className="rounded-md border border-[#eef2f7] bg-[#f9fafb] p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#111827]">
                    Q{index + 1}. {question.question_text}
                    {question.blooms_level ? (
                      <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#6b7280]">{question.blooms_level}</span>
                    ) : null}
                  </summary>
                  {question.model_answer ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#374151]">
                      <span className="font-semibold">Model answer: </span>{question.model_answer}
                    </p>
                  ) : null}
                </details>
              ))}
            </div>
          </div>
        ) : null}

        {hasInstructions ? (
          <details className="rounded-md border border-[#eef2f7] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#111827]">Instructions & faculty notes</summary>
            <div className="mt-3 space-y-3">
              {INSTRUCTION_FIELDS.map((field) => (
                <TextBlock key={field.key} label={field.label} value={instructions[field.key]} />
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={secondaryBtn} onClick={onClose}>Close</button>
        <button type="button" className={bankTheme[variant].primaryBtn} onClick={onPublish}>
          <Rocket size={15} aria-hidden="true" /> Publish
        </button>
      </div>
    </ModalShell>
  )
}

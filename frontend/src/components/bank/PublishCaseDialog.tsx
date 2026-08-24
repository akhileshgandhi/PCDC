import { Rocket } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import api from "../../api/axios"
import { publishBankEntry, type BankEntryDetail, type BankMeta, type BankPublishResult } from "../../api/bank"
import {
  CASE_DOMAINS,
  INSTRUCTION_FIELDS,
  ModalShell,
  SECTION_FIELDS,
  apiErrorDetail,
  bankTheme,
  errorBanner,
  inputClass,
  labelClass,
  secondaryBtn,
  textareaClass,
  type BankVariant,
} from "./shared"

const FALLBACK_CAPABILITIES = [
  "Communication", "Leadership", "Problem Solving", "Decision Making",
  "Innovation", "Strategic Thinking", "Entrepreneurship", "Professionalism",
]

interface EditableQuestion {
  question_text: string
  blooms_level: string
  model_answer: string
  marking_scheme: string
}

/** Publish dialog with the FULL case-study creation form — every field the
 * Case Builder collects can be reviewed/edited before publishing. Any content
 * change keeps the original entry visible in the bank; an untouched form
 * publishes as-is and hides the entry while the copy is live. */
export default function PublishCaseDialog({ entry, variant, meta, onClose, onDone }: {
  entry: BankEntryDetail
  variant: BankVariant
  meta: BankMeta
  onClose: () => void
  onDone: (result: BankPublishResult) => void
}) {
  const t = bankTheme[variant]
  const snapshot = entry.snapshot ?? {}
  const snapSections = (snapshot.sections ?? {}) as Record<string, string | string[]>
  const snapInstructions = ((snapshot as Record<string, unknown>).instructions ?? {}) as Record<string, string>
  const snapTiming = ((snapshot as Record<string, unknown>).timing ?? {}) as Record<string, number>
  const snapMetadata = ((snapshot as Record<string, unknown>).metadata ?? {}) as Record<string, string>

  const [title, setTitle] = useState(entry.title)
  const [brief, setBrief] = useState(entry.brief ?? "")
  const [subject, setSubject] = useState(entry.subject ?? "")
  const [semester, setSemester] = useState(entry.semester_number ? String(entry.semester_number) : "")
  const [difficulty, setDifficulty] = useState(String(entry.difficulty))
  const [industry, setIndustry] = useState(String(snapshot.industry ?? "business"))
  const [functionalArea, setFunctionalArea] = useState(snapMetadata.functional_area ?? "")
  const [capabilities, setCapabilities] = useState<string[]>(snapshot.capabilities ?? [])
  const [allCapabilities, setAllCapabilities] = useState<string[]>(FALLBACK_CAPABILITIES)
  const [readingMin, setReadingMin] = useState(String(snapTiming.reading_time_minutes ?? 8))
  const [writingMin, setWritingMin] = useState(String(snapTiming.answer_writing_time_minutes ?? 12))
  const [sections, setSections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of SECTION_FIELDS) {
      const value = snapSections[field.key]
      initial[field.key] = field.list
        ? (Array.isArray(value) ? value.join("\n") : "")
        : (typeof value === "string" ? value : "")
    }
    return initial
  })
  const [instructions, setInstructions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of INSTRUCTION_FIELDS) initial[field.key] = snapInstructions[field.key] ?? ""
    return initial
  })
  const [questions, setQuestions] = useState<EditableQuestion[]>(() =>
    (snapshot.questions ?? []).map((q) => ({
      question_text: q.question_text ?? "",
      blooms_level: (q as Record<string, string>).blooms_level ?? "",
      model_answer: q.model_answer ?? "",
      marking_scheme: (q as Record<string, string>).marking_scheme ?? "",
    })),
  )
  const [publishNow, setPublishNow] = useState(entry.has_full_case)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api.get<Array<{ id: number; name: string }>>("/faculty/capabilities")
      .then((response) => {
        const names = response.data.map((c) => c.name)
        if (names.length > 0) setAllCapabilities(names)
      })
      .catch(() => undefined)
  }, [])

  const capabilityOptions = useMemo(
    () => Array.from(new Set([...allCapabilities, ...capabilities])),
    [allCapabilities, capabilities],
  )

  function toggleCapability(name: string) {
    setCapabilities((current) =>
      current.includes(name) ? current.filter((c) => c !== name) : [...current, name],
    )
  }

  function setSection(key: string, value: string) {
    setSections((current) => ({ ...current, [key]: value }))
  }

  function setInstruction(key: string, value: string) {
    setInstructions((current) => ({ ...current, [key]: value }))
  }

  function setQuestion(index: number, key: keyof EditableQuestion, value: string) {
    setQuestions((current) => current.map((q, i) => (i === index ? { ...q, [key]: value } : q)))
  }

  async function handlePublish() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setError("")
    setIsPublishing(true)
    const sectionsPayload: Record<string, string | string[]> = {}
    for (const field of SECTION_FIELDS) {
      sectionsPayload[field.key] = field.list
        ? sections[field.key].split("\n").map((line) => line.trim()).filter(Boolean)
        : sections[field.key]
    }
    try {
      const result = await publishBankEntry(entry.id, {
        title: title.trim(),
        brief,
        subject: subject.trim() || undefined,
        semester_number: semester ? Number(semester) : undefined,
        difficulty: Number(difficulty),
        industry,
        functional_area: functionalArea,
        capabilities,
        sections: sectionsPayload,
        reading_time_minutes: Number(readingMin) || 8,
        answer_writing_time_minutes: Number(writingMin) || 12,
        questions: questions
          .filter((q) => q.question_text.trim())
          .map((q, index) => ({
            question_number: index + 1,
            question_text: q.question_text,
            blooms_level: q.blooms_level,
            model_answer: q.model_answer,
            marking_scheme: q.marking_scheme,
          })),
        instructions,
        publish_now: publishNow,
      })
      onDone(result)
    } catch (publishError: unknown) {
      setError(apiErrorDetail(publishError, "Publish failed."))
      setIsPublishing(false)
    }
  }

  return (
    <ModalShell title={`Publish "${entry.title}"`} onClose={onClose} wide>
      {error ? <div className={errorBanner}>{error}</div> : null}
      <div className="mb-4 rounded-lg border border-[#f2e3b3] bg-[#fdf8e9] px-4 py-3 text-xs leading-5 text-[#7a5d0e]">
        Publishing <span className="font-semibold">as-is</span> removes this entry from the bank while
        your copy is live. If you <span className="font-semibold">edit any content</span> below, the
        original entry stays in the bank for other faculty.
      </div>

      <div className="space-y-4">
        {/* ---- core fields (case-creation form) ---- */}
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Overview / expected outcomes</label>
          <textarea className={textareaClass} value={brief} onChange={(e) => setBrief(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Industry / domain</label>
            <select className={inputClass} value={industry} onChange={(e) => setIndustry(e.target.value)}>
              {CASE_DOMAINS.map((domain) => (
                <option key={domain} value={domain} className="capitalize">{domain}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Subject</label>
            <input className={inputClass} list="publish-bank-subjects" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <datalist id="publish-bank-subjects">
              {meta.subjects.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Functional area</label>
            <input className={inputClass} value={functionalArea} onChange={(e) => setFunctionalArea(e.target.value)}
              placeholder="e.g. Channel Management" />
          </div>
          <div>
            <label className={labelClass}>Semester</label>
            <select className={inputClass} value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">Not set</option>
              {meta.semesters.map((item) => <option key={item} value={item}>Semester {item}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Difficulty</label>
            <select className={inputClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {meta.difficulties.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Reading (min)</label>
              <input type="number" min={1} className={inputClass} value={readingMin} onChange={(e) => setReadingMin(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Writing (min)</label>
              <input type="number" min={1} className={inputClass} value={writingMin} onChange={(e) => setWritingMin(e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Capabilities assessed</label>
          <div className="flex flex-wrap gap-1.5">
            {capabilityOptions.map((name) => {
              const active = capabilities.includes(name)
              return (
                <button key={name} type="button" onClick={() => toggleCapability(name)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-[#0b1d3a] bg-[#0b1d3a] text-white"
                      : "border-[#e6e8eb] bg-white text-[#0b1d3a] hover:bg-[#f6f7fb]"
                  }`}>
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        {/* ---- case sections ---- */}
        <details open className="rounded-md border border-[#eef2f7] p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#111827]">Case sections</summary>
          <div className="mt-3 space-y-3">
            {SECTION_FIELDS.map((field) => (
              <div key={field.key}>
                <label className={labelClass}>{field.label}</label>
                <textarea
                  className={`${textareaClass} ${field.key === "situation" ? "min-h-[110px]" : "min-h-[60px]"}`}
                  value={sections[field.key]}
                  onChange={(e) => setSection(field.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </details>

        {/* ---- written questions ---- */}
        <details open={questions.length > 0} className="rounded-md border border-[#eef2f7] p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#111827]">
            Written questions ({questions.filter((q) => q.question_text.trim()).length}/3)
          </summary>
          <div className="mt-3 space-y-3">
            {questions.map((question, index) => (
              <div key={index} className="rounded-md border border-[#eef2f7] bg-[#f9fafb] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Question {index + 1}</span>
                  <button type="button" className="text-xs font-semibold text-[#b42318]"
                    onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))}>
                    Remove
                  </button>
                </div>
                <div className="space-y-2">
                  <textarea className={`${textareaClass} min-h-[48px]`} placeholder="Question text"
                    value={question.question_text} onChange={(e) => setQuestion(index, "question_text", e.target.value)} />
                  <input className={inputClass} placeholder="Bloom's level (e.g. Analyze)"
                    value={question.blooms_level} onChange={(e) => setQuestion(index, "blooms_level", e.target.value)} />
                  <textarea className={`${textareaClass} min-h-[60px]`} placeholder="Model answer"
                    value={question.model_answer} onChange={(e) => setQuestion(index, "model_answer", e.target.value)} />
                </div>
              </div>
            ))}
            {questions.length < 3 ? (
              <button type="button" className={secondaryBtn}
                onClick={() => setQuestions((current) => [...current, { question_text: "", blooms_level: "", model_answer: "", marking_scheme: "" }])}>
                + Add question
              </button>
            ) : null}
          </div>
        </details>

        {/* ---- instructions & faculty notes ---- */}
        <details className="rounded-md border border-[#eef2f7] p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#111827]">Instructions & faculty notes</summary>
          <div className="mt-3 space-y-3">
            {INSTRUCTION_FIELDS.map((field) => (
              <div key={field.key}>
                <label className={labelClass}>{field.label}</label>
                <textarea className={`${textareaClass} min-h-[48px]`} value={instructions[field.key]}
                  onChange={(e) => setInstruction(field.key, e.target.value)} />
              </div>
            ))}
          </div>
        </details>

        <label className="flex items-start gap-2 text-sm text-[#374151]">
          <input type="checkbox" className="mt-0.5" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
          <span>
            <span className="font-semibold">Publish live immediately.</span>{" "}
            Otherwise the case lands as a draft in the Case Library / Case Builder to finish and publish there.
          </span>
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={secondaryBtn} onClick={onClose} disabled={isPublishing}>Cancel</button>
        <button type="button" className={t.primaryBtn} onClick={() => void handlePublish()} disabled={isPublishing}>
          <Rocket size={15} aria-hidden="true" /> {isPublishing ? "Publishing…" : "Publish"}
        </button>
      </div>
    </ModalShell>
  )
}

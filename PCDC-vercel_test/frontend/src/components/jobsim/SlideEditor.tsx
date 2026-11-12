import { ArrowDown, ArrowUp, CheckCircle2, Circle, Plus, Send, Trash2 } from "lucide-react"
import { useEffect, useRef } from "react"
import type { KeyboardEvent, ReactNode } from "react"

import type { JobsimTask, Slide } from "../../api/jobsim"
import { PrestigeLogo } from "./MemoLetterhead"

export const MAX_SLIDES = 15
const MAX_POINTS = 8
const MAX_TITLE = 120
const MAX_POINT = 300

/** A new deck starts from the faculty's slide plan, or one blank slide. */
export function startingDeck(task: JobsimTask): Slide[] {
  const plan = task.config.slide_plan ?? []
  return plan.length ? plan.map((item) => ({ title: item.title, points: [""] })) : [{ title: "", points: [""] }]
}

export function deckProblems(slides: Slide[], minSlides: number) {
  const problems: string[] = []
  if (slides.length < minSlides) problems.push(`Make at least ${minSlides} slides`)
  slides.forEach((slide, i) => {
    if (!slide.title.trim()) problems.push(`Give slide ${i + 1} a title`)
    if (!slide.points.some((p) => p.trim())) problems.push(`Add a point to slide ${i + 1}`)
  })
  return problems
}

const slideReady = (slide: Slide) => Boolean(slide.title.trim()) && slide.points.some((p) => p.trim())
const titleKey = (title: string) => title.trim().replace(/\s+/g, " ").toLowerCase()

/** Which slide a plan item is on: the slide with its title, else the slide in
 * its place if that one has no title yet. Follows slides that were moved. */
export function slideForPlan(slides: Slide[], title: string, at: number) {
  const byTitle = slides.findIndex((slide) => titleKey(slide.title) === titleKey(title))
  if (byTitle >= 0) return byTitle
  return at < slides.length && !slides[at].title.trim() ? at : -1
}

/** The plan note for a slide, matched the same way. */
export function guideFor(slides: Slide[], plan: Array<{ title: string; guide: string }>, index: number) {
  const item = plan.find((entry, at) => slideForPlan(slides, entry.title, at) === index)
  return item?.guide ?? ""
}

interface SlideEditorProps {
  task: JobsimTask
  slides: Slide[]
  current: number
  /** Time is up, the attempt is submitted, or this deck is submitted. */
  disabled: boolean
  isSubmitted: boolean
  onCurrentChange: (index: number) => void
  onChange: (slides: Slide[]) => void
  onSubmit: () => void
}

/**
 * The student's slide deck (handover 8.3): our own editor, no PowerPoint. Each
 * slide is a title and bullet points; add, delete and reorder, up to 15
 * slides. The server repeats the structure checks on submit.
 */
export default function SlideEditor({ task, slides, current, disabled, isSubmitted, onCurrentChange, onChange, onSubmit }: SlideEditorProps) {
  const minSlides = task.config.min_slides ?? 1
  const plan = task.config.slide_plan ?? []
  const index = Math.min(current, slides.length - 1)
  const slide = slides[index]
  const problems = deckProblems(slides, minSlides)
  const focusPoint = useRef<number | null>(null)
  const pointRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (focusPoint.current !== null) {
      pointRefs.current[focusPoint.current]?.focus()
      focusPoint.current = null
    }
  })

  const update = (next: Slide) => onChange(slides.map((s, i) => (i === index ? next : s)))
  const setPoint = (at: number, value: string) => update({ ...slide, points: slide.points.map((p, i) => (i === at ? value : p)) })

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return
    onChange([...slides.slice(0, index + 1), { title: "", points: [""] }, ...slides.slice(index + 1)])
    onCurrentChange(index + 1)
  }

  function deleteSlide() {
    if (slides.length <= 1) return
    onChange(slides.filter((_, i) => i !== index))
    onCurrentChange(Math.max(0, index - 1))
  }

  function moveSlide(step: number) {
    const to = index + step
    if (to < 0 || to >= slides.length) return
    const next = [...slides]
    ;[next[index], next[to]] = [next[to], next[index]]
    onChange(next)
    onCurrentChange(to)
  }

  function onPointKey(event: KeyboardEvent<HTMLInputElement>, at: number) {
    if (event.key === "Enter") {
      event.preventDefault()
      if (slide.points.length >= MAX_POINTS) return
      update({ ...slide, points: [...slide.points.slice(0, at + 1), "", ...slide.points.slice(at + 1)] })
      focusPoint.current = at + 1
    } else if (event.key === "Backspace" && !slide.points[at] && slide.points.length > 1) {
      event.preventDefault()
      update({ ...slide, points: slide.points.filter((_, i) => i !== at) })
      focusPoint.current = Math.max(0, at - 1)
    }
  }

  const guide = guideFor(slides, plan, index)
  // The first slide is the cover: a large logo; every other slide carries a small one.
  const isCover = index === 0

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-[#E6EBEB] bg-white">
      <ol className="w-44 shrink-0 space-y-2 overflow-auto border-r border-[#EEF2F6] bg-[#F9FAFB] p-3" aria-label="Slides">
        {slides.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onCurrentChange(i)}
              aria-current={i === index ? "true" : undefined}
              aria-label={`Slide ${i + 1}${s.title.trim() ? `: ${s.title}` : ""}`}
              className="flex w-full items-start gap-1.5 text-left"
            >
              <span className="w-4 shrink-0 pt-0.5 text-right text-[11px] font-semibold text-[#6B7280]">{i + 1}</span>
              <span
                className={`relative block aspect-video w-full overflow-hidden rounded border bg-white p-1.5 transition ${
                  i === index ? "border-[#C9A227] ring-2 ring-[#C9A227]/40" : "border-[#E6EBEB] hover:border-[#C9A227]"
                }`}
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-[#0B1D3A]" aria-hidden="true" />
                <span className="block truncate pl-1.5 text-[9px] font-semibold text-[#0B1D3A]">{s.title || "Untitled"}</span>
                {s.points.filter((p) => p.trim()).slice(0, 3).map((p, j) => (
                  <span key={j} className="block truncate pl-1.5 text-[7px] leading-3 text-[#6B7280]">• {p}</span>
                ))}
                {slideReady(s) ? (
                  <CheckCircle2 size={11} className="absolute right-1 top-1 text-[#12B76A]" aria-hidden="true" />
                ) : null}
                <span className="absolute bottom-1 right-1" aria-hidden="true">
                  <PrestigeLogo size="xs" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="flex min-w-0 flex-1 flex-col">
        {!disabled ? (
          <div className="flex flex-wrap items-center gap-1 border-b border-[#EEF2F6] p-2" role="toolbar" aria-label="Slides">
            <ToolButton label="New slide" onClick={addSlide} disabled={slides.length >= MAX_SLIDES}>
              <Plus size={15} /> New slide
            </ToolButton>
            <ToolButton label="Move slide up" onClick={() => moveSlide(-1)} disabled={index === 0}><ArrowUp size={15} /></ToolButton>
            <ToolButton label="Move slide down" onClick={() => moveSlide(1)} disabled={index === slides.length - 1}><ArrowDown size={15} /></ToolButton>
            <ToolButton label="Delete slide" onClick={deleteSlide} disabled={slides.length <= 1} danger><Trash2 size={15} /></ToolButton>
            <span className="ml-auto pr-1 text-xs text-[#6B7280]">
              Slide {index + 1} of {slides.length} · up to {MAX_SLIDES}
            </span>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto bg-[#EEF2F6] p-6">
          {guide ? (
            <p className="mx-auto mb-3 max-w-3xl rounded-md bg-[#FFF7DF] px-3 py-2 text-xs text-[#5C4613]">
              <b>On this slide:</b> {guide}
            </p>
          ) : null}
          <div className="relative mx-auto aspect-video max-w-3xl overflow-hidden rounded-md bg-white shadow-md">
            <div className="absolute inset-y-0 left-0 w-2 bg-[#0B1D3A]" aria-hidden="true" />
            <div className="absolute right-6 top-0 h-10 w-3 bg-[#C9A227]" aria-hidden="true" />
            {isCover ? null : (
              <span className="absolute bottom-4 right-6" aria-hidden="true">
                <PrestigeLogo size="sm" />
              </span>
            )}
            <div className={`flex h-full flex-col px-10 ${isCover ? "justify-center pb-10 pt-24" : "py-7"}`}>
              {isCover ? (
                <span className="absolute left-10 top-8" aria-hidden="true">
                  <PrestigeLogo size="lg" />
                </span>
              ) : null}
              <div className={isCover ? "text-[32px] font-bold leading-tight" : "text-2xl font-semibold"}>
                <input
                  value={slide.title}
                  readOnly={disabled}
                  maxLength={MAX_TITLE}
                  onChange={(e) => update({ ...slide, title: e.target.value })}
                  placeholder="Click to add title"
                  aria-label={`Slide ${index + 1} title`}
                  className="w-full border-b border-transparent bg-transparent pb-1 text-[#0B1D3A] outline-none placeholder:text-[#9CA3AF] focus:border-[#C9A227]"
                />
              </div>
              {isCover ? <div className="mt-2 h-1 w-24 rounded-full bg-[#C9A227]" aria-hidden="true" /> : null}
              <ul className={`mt-4 space-y-2 overflow-auto ${isCover ? "text-lg" : "text-base"}`}>
                {slide.points.map((point, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-[#C9A227]" aria-hidden="true" />
                    <input
                      ref={(el) => {
                        pointRefs.current[i] = el
                      }}
                      value={point}
                      readOnly={disabled}
                      maxLength={MAX_POINT}
                      onChange={(e) => setPoint(i, e.target.value)}
                      onKeyDown={(e) => onPointKey(e, i)}
                      placeholder={i === 0 ? "Click to add a point. Press Enter for the next one." : "Another point"}
                      aria-label={`Slide ${index + 1} point ${i + 1}`}
                      className="w-full bg-transparent text-base text-[#111827] outline-none placeholder:text-[#9CA3AF]"
                    />
                  </li>
                ))}
              </ul>
              {!disabled && slide.points.length < MAX_POINTS ? (
                <button
                  type="button"
                  onClick={() => {
                    update({ ...slide, points: [...slide.points, ""] })
                    focusPoint.current = slide.points.length
                  }}
                  className="mt-2 self-start text-xs font-semibold text-[#92702A] hover:underline"
                >
                  + Add point
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#EEF2F6] p-3">
          <div className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1">
            <Check ok={slides.length >= minSlides}>
              {slides.length} {slides.length === 1 ? "slide" : "slides"}
              {minSlides > 1 ? ` of ${minSlides} minimum` : ""}
            </Check>
            <Check ok={slides.every(slideReady)}>Every slide has a title and a point</Check>
          </div>
          {isSubmitted ? (
            <span className="text-sm font-semibold text-[#067647]">Slides submitted</span>
          ) : !disabled ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={problems.length > 0}
              title={problems.length ? problems.slice(0, 3).join(". ") : undefined}
              className="inline-flex items-center gap-2 rounded-md bg-[#0B1D3A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1B3452] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} aria-hidden="true" /> Submit slides
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? CheckCircle2 : Circle
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ok ? "text-[#067647]" : "text-[#6B7280]"}`}>
      <Icon size={14} aria-hidden="true" /> <span>{children}</span>
    </span>
  )
}

function ToolButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-semibold transition disabled:opacity-40 ${
        danger ? "text-[#B42318] hover:bg-[#FFF5F5]" : "text-[#0B1D3A] hover:bg-[#F6F7F9]"
      }`}
    >
      {children}
    </button>
  )
}

import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import type { Editor, JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, CheckCircle2, Circle, Heading2, Heading3, Italic, List, ListOrdered, Send } from "lucide-react"
import { useEffect } from "react"
import type { ReactNode } from "react"

import type { JobsimTask } from "../../api/jobsim"
import MemoLetterhead from "./MemoLetterhead"

const sectionKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase()

function memoStats(editor: Editor) {
  const headings = new Set<string>()
  editor.state.doc.descendants((node) => {
    if (node.type.name === "heading") headings.add(sectionKey(node.textContent))
  })
  const text = editor.getText({ blockSeparator: "\n" }).trim()
  return { headings, words: text ? text.split(/\s+/).length : 0 }
}

// ProseMirror handles these itself before the portal's page-wide block runs,
// so the editor needs its own block. It honours the same local testing switch.
const allowClipboard = import.meta.env.VITE_ALLOW_STUDENT_CLIPBOARD === "true"
const blockEvent = (_view: unknown, event: Event) => {
  if (allowClipboard) return false
  event.preventDefault()
  return true
}

/** A new memo starts with the required section headings, like a memo template.
 * Nothing is saved until the student types, so an untouched memo stays blank. */
function memoTemplate(task: JobsimTask): JSONContent | string {
  const sections = task.config.required_sections ?? []
  if (!sections.length) return ""
  return {
    type: "doc",
    content: sections.flatMap((name) => [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: name }] },
      { type: "paragraph" },
    ]),
  }
}

interface MemoEditorProps {
  task: JobsimTask
  initialDoc: JSONContent | null
  /** Time is up, the attempt is submitted, or this memo is submitted. */
  disabled: boolean
  isSubmitted: boolean
  onChange: (doc: JSONContent, words: number) => void
  onSubmit: (doc: JSONContent) => void
}

/**
 * The student's memo (handover 8.2): headings, bold, italics and lists only
 * (DD6), a live word count, and the structure checks. The server repeats the
 * checks on submit and builds the plain-text copy itself.
 */
export default function MemoEditor({ task, initialDoc, disabled, isSubmitted, onChange, onSubmit }: MemoEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        hardBreak: false,
        horizontalRule: false,
        link: false,
        strike: false,
        underline: false,
      }),
    ],
    content: initialDoc ?? memoTemplate(task),
    editable: !disabled,
    editorProps: {
      attributes: {
        "aria-label": "Memo",
        class:
          "min-h-full select-text py-2 text-sm leading-6 text-[#111827] outline-none [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
      },
      handleDOMEvents: { copy: blockEvent, cut: blockEvent, paste: blockEvent, drop: blockEvent, dragstart: blockEvent },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON(), memoStats(current).words),
  })

  useEffect(() => {
    editor.setEditable(!disabled, false)
  }, [editor, disabled])

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      ...memoStats(current),
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      heading: current.isActive("heading", { level: 2 }),
      subheading: current.isActive("heading", { level: 3 }),
      bullets: current.isActive("bulletList"),
      numbers: current.isActive("orderedList"),
    }),
  })

  const sections = task.config.required_sections ?? []
  const minWords = task.config.min_words ?? 0
  const allSections = sections.every((name) => state.headings.has(sectionKey(name)))
  const enoughWords = state.words > 0 && state.words >= minWords
  const chain = () => editor.chain().focus()

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[#E6EBEB] bg-white">
      {!disabled ? (
        <div className="flex flex-wrap gap-1 border-b border-[#EEF2F6] p-2" role="toolbar" aria-label="Formatting">
          <ToolButton label="Heading" active={state.heading} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolButton>
          <ToolButton label="Subheading" active={state.subheading} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolButton>
          <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold size={16} /></ToolButton>
          <ToolButton label="Italics" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic size={16} /></ToolButton>
          <ToolButton label="Bulleted list" active={state.bullets} onClick={() => chain().toggleBulletList().run()}><List size={16} /></ToolButton>
          <ToolButton label="Numbered list" active={state.numbers} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={16} /></ToolButton>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto bg-[#F6F7F9] p-5">
        <div className="mx-auto max-w-3xl rounded-md border border-[#E6EBEB] bg-white px-12 py-10 shadow-sm">
          <MemoLetterhead />
          <EditorContent editor={editor} className="mt-2 [&>div]:min-h-[360px]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#EEF2F6] p-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1">
          <Check ok={enoughWords}>
            <span aria-live="polite">{state.words} {state.words === 1 ? "word" : "words"}</span>
            {minWords ? ` of ${minWords} minimum` : ""}
          </Check>
          {sections.map((name) => (
            <Check key={name} ok={state.headings.has(sectionKey(name))}>{name}</Check>
          ))}
        </div>
        {isSubmitted ? (
          <span className="text-sm font-semibold text-[#067647]">Memo submitted</span>
        ) : !disabled ? (
          <button
            type="button"
            onClick={() => onSubmit(editor.getJSON())}
            disabled={!enoughWords || !allSections}
            title={enoughWords && allSections ? undefined : "Finish the checks on the left first"}
            className="inline-flex items-center gap-2 rounded-md bg-[#0B1D3A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1B3452] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} aria-hidden="true" /> Submit memo
          </button>
        ) : null}
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

function ToolButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-md transition ${
        active ? "bg-[#0B1D3A] text-white" : "text-[#0B1D3A] hover:bg-[#F6F7F9]"
      }`}
    >
      {children}
    </button>
  )
}

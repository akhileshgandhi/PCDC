import { Maximize2, X } from "lucide-react"
import { useState } from "react"

interface ExpandableTextareaProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

// An editable textarea with an "Expand" affordance that opens the same value
// in a large fullscreen editor — for content worth writing/reading
// comfortably rather than squeezed into a fixed-height box. Both views share
// the same controlled value, so edits in either place are live.
export default function ExpandableTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 8,
  className,
}: ExpandableTextareaProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="grid gap-1.5">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={className}
        />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 justify-self-start text-xs font-semibold text-[#0B1D3A] transition hover:text-[#C9A227]"
        >
          <Maximize2 size={13} aria-hidden="true" />
          Expand to full screen
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102033]/45 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expandable-textarea-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6EBEB] px-6 py-4">
              <h2 id="expandable-textarea-title" className="text-base font-semibold text-[#0B1D3A]">
                {label}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Done"
                className="rounded-md p-1.5 text-[#6B7280] transition hover:bg-[#F6F7F9] hover:text-[#111827]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              autoFocus
              className="flex-1 resize-none px-6 py-5 text-sm leading-7 text-[#374151] outline-none"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}

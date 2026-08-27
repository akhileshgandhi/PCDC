import { Maximize2, X } from "lucide-react"
import { useState } from "react"

interface ExpandableTextProps {
  label: string
  text: string
  className?: string
}

// Shows text inline as usual, plus a "View full" affordance that opens it in
// a dedicated fullscreen reading view — for content that's worth reading
// comfortably rather than squeezed into a fixed-height card.
export default function ExpandableText({ label, text, className }: ExpandableTextProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className={className}>
        <p className="whitespace-pre-line">{text}</p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1D3A] transition hover:text-[#C9A227]"
        >
          <Maximize2 size={13} aria-hidden="true" />
          View full
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102033]/45 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expandable-text-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6EBEB] px-6 py-4">
              <h2 id="expandable-text-title" className="text-base font-semibold text-[#0B1D3A]">
                {label}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 text-[#6B7280] transition hover:bg-[#F6F7F9] hover:text-[#111827]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <p className="whitespace-pre-line text-sm leading-7 text-[#374151]">{text}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

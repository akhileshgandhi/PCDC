import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102033]/45 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl sm:p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              danger ? "bg-[#fff5f5] text-[#b42318]" : "bg-[#eafaf5] text-[#0b6b52]"
            }`}
          >
            <AlertTriangle size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-[#17202a]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[#667085]">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#dde4ec] px-4 py-2 text-sm font-semibold text-[#17202a] transition hover:bg-[#f5f7fa]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition ${
              danger ? "bg-[#b42318] hover:bg-[#912016]" : "bg-[#102033] hover:bg-[#1b3452]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

import { Download } from "lucide-react"
import { useState } from "react"

import {
  bulkUploadFacultyCases,
  downloadBulkUploadCaseTemplate,
  type FacultyCaseBulkUploadResult,
} from "../../api/faculty"
import { ModalShell, apiErrorDetail, errorBanner, secondaryBtn } from "../bank/shared"

/** Upload one or more Word (.docx) / PDF documents, each containing one or
 * more case studies. AI splits every document (if it holds multiple cases)
 * and extracts each case's fields — title, description, difficulty,
 * capabilities, objectives, and all 3 written questions — from the
 * document's own text. Every case lands as a draft for admin to review,
 * edit, and publish — same as any other faculty-created case. */
export default function BulkUploadCaseDialog({ onClose, onDone }: {
  onClose: () => void
  onDone: () => void
}) {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<FacultyCaseBulkUploadResult | null>(null)

  function addFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return
    setFiles((prev) => [...prev, ...Array.from(picked)])
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleDownloadTemplate() {
    setError("")
    setIsDownloadingTemplate(true)
    try {
      await downloadBulkUploadCaseTemplate()
    } catch (downloadError: unknown) {
      setError(apiErrorDetail(downloadError, "Could not download the template."))
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError("Choose at least one .docx or .pdf file first.")
      return
    }
    setError("")
    setIsUploading(true)
    try {
      const data = await bulkUploadFacultyCases(files)
      setResult(data)
    } catch (uploadError: unknown) {
      setError(apiErrorDetail(uploadError, "Bulk upload failed."))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <ModalShell title="Bulk upload case studies" onClose={onClose} wide>
      {error ? <div className={errorBanner}>{error}</div> : null}

      <p className="mb-3 text-sm leading-6 text-[#6b7280]">
        Upload one or more Word or PDF documents — a single case study per file, several
        concatenated in one file, or any mix. Every case is created as a{" "}
        <strong>draft</strong> for an admin to review, edit, and publish.
      </p>

      <button
        type="button"
        onClick={() => void handleDownloadTemplate()}
        disabled={isDownloadingTemplate}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0b1d3a] hover:underline disabled:opacity-60"
      >
        <Download size={15} />
        {isDownloadingTemplate ? "Downloading…" : "Download case study template"}
      </button>
      <p className="mb-4 -mt-2 text-xs leading-5 text-[#6b7280]">
        Every document must follow the template's labeled sections — download it, fill it in, and
        upload that file. Parsing is done directly with no AI involved, so it's instant and can't
        mis-map a field. A document that doesn't follow the template will fail with a clear error
        instead of being guessed at.
      </p>

      <label className="block cursor-pointer rounded-md border-2 border-dashed border-[#e6e8eb] px-4 py-6 text-center text-sm text-[#6b7280] transition hover:border-[#c9a227] hover:bg-[#fdfaf1]">
        <input
          type="file"
          accept=".docx,.pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ""
          }}
        />
        {files.length > 0
          ? `📎 ${files.length} file${files.length === 1 ? "" : "s"} selected — click to add more`
          : "Click to choose one or more .docx or .pdf files"}
      </label>

      {files.length > 0 && !result ? (
        <ul className="mt-3 divide-y divide-[#e6e8eb] rounded-md border border-[#e6e8eb]">
          {files.map((f, index) => (
            <li key={`${f.name}-${index}`} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="truncate text-[#111827]">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={isUploading}
                className="ml-3 shrink-0 text-xs font-semibold text-[#b42318] hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {isUploading ? (
        <p className="mt-4 text-sm font-medium text-[#6b7280]">
          Reading {files.length > 1 ? `${files.length} documents` : "the document"} and
          extracting each case — this can take a few minutes for larger batches…
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-[#111827]">
            {result.created_count} case{result.created_count === 1 ? "" : "s"} created
            {result.error_count > 0 ? `, ${result.error_count} case${result.error_count === 1 ? "" : "s"} failed` : ""}.
          </p>
          {result.created.length > 0 ? (
            <div className="rounded-md border border-[#e6e8eb]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f6f7fb] text-xs font-semibold uppercase text-[#6b7280]">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Title</th>
                  </tr>
                </thead>
                <tbody>
                  {result.created.map((item) => (
                    <tr key={item.id} className="border-t border-[#e6e8eb]">
                      <td className="px-3 py-2">{item.row}</td>
                      <td className="px-3 py-2 text-[#6b7280]">{item.file}</td>
                      <td className="px-3 py-2">{item.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {result.errors.length > 0 ? (
            <div className="rounded-md border border-[#f3c4c4]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#fff5f5] text-xs font-semibold uppercase text-[#b42318]">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((item) => (
                    <tr key={item.row} className="border-t border-[#f3c4c4]">
                      <td className="px-3 py-2">{item.row}</td>
                      <td className="px-3 py-2 text-[#6b7280]">{item.file}</td>
                      <td className="px-3 py-2">{item.title}</td>
                      <td className="px-3 py-2 text-[#b42318]">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={secondaryBtn} onClick={result ? onDone : onClose} disabled={isUploading}>
          {result ? "Done" : "Cancel"}
        </button>
        {!result ? (
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={isUploading || files.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] shadow-sm transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Processing…" : "Upload"}
          </button>
        ) : null}
      </div>
    </ModalShell>
  )
}

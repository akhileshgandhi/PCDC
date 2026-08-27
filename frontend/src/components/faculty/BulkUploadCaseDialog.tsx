import { useState } from "react"

import { bulkUploadFacultyCases, type FacultyCaseBulkUploadResult } from "../../api/faculty"
import { ModalShell, apiErrorDetail, errorBanner, secondaryBtn } from "../bank/shared"

/** Upload a single Word (.docx) or PDF document containing one or more case
 * studies. AI splits the document (if it holds multiple cases) and extracts
 * each case's fields — title, description, difficulty, capabilities,
 * objectives, and all 3 written questions — from the document's own text.
 * Every case lands as a draft for admin to review, edit, and publish — same
 * as any other faculty-created case. */
export default function BulkUploadCaseDialog({ onClose, onDone }: {
  onClose: () => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<FacultyCaseBulkUploadResult | null>(null)

  async function handleUpload() {
    if (!file) {
      setError("Choose a .docx or .pdf file first.")
      return
    }
    setError("")
    setIsUploading(true)
    try {
      const data = await bulkUploadFacultyCases(file)
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

      <p className="mb-4 text-sm leading-6 text-[#6b7280]">
        Upload a single Word or PDF document — one case study, or several concatenated in the
        same file. AI reads the document and extracts each case's title, description, difficulty,
        capabilities, objectives, and all 3 written questions from its own text. Every case is
        created as a <strong>draft</strong> for an admin to review, edit, and publish. Larger
        documents with several cases can take a few minutes to process.
      </p>

      <label className="block cursor-pointer rounded-md border-2 border-dashed border-[#e6e8eb] px-4 py-6 text-center text-sm text-[#6b7280] transition hover:border-[#c9a227] hover:bg-[#fdfaf1]">
        <input
          type="file"
          accept=".docx,.pdf"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {file ? `📎 ${file.name}` : "Click to choose a .docx or .pdf file"}
      </label>

      {isUploading ? (
        <p className="mt-4 text-sm font-medium text-[#6b7280]">
          Reading the document and extracting each case — this can take a few minutes for
          documents with several cases…
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
                    <th className="px-3 py-2">Title</th>
                  </tr>
                </thead>
                <tbody>
                  {result.created.map((item) => (
                    <tr key={item.id} className="border-t border-[#e6e8eb]">
                      <td className="px-3 py-2">{item.row}</td>
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
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((item) => (
                    <tr key={item.row} className="border-t border-[#f3c4c4]">
                      <td className="px-3 py-2">{item.row}</td>
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
            disabled={isUploading || !file}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-2.5 text-sm font-semibold text-[#0b1d3a] shadow-sm transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Processing…" : "Upload"}
          </button>
        ) : null}
      </div>
    </ModalShell>
  )
}

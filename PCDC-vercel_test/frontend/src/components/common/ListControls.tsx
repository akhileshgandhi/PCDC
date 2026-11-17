import { Search } from "lucide-react"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/** Search box + rows-per-page selector for a listing screen. */
export function ListToolbar({
  query,
  onQueryChange,
  pageSize,
  onPageSizeChange,
  placeholder = "Search...",
}: {
  query: string
  onQueryChange: (value: string) => void
  pageSize: number
  onPageSizeChange: (value: number) => void
  placeholder?: string
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <label className="relative flex-1 sm:max-w-xs">
        <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-[#dde4ec] bg-white pl-9 pr-3 text-sm font-medium outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold text-[#667085]">
        Rows per page
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-10 rounded-md border border-[#dde4ec] bg-white px-2 text-sm font-medium outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

/** Prev/Next pager with a "Showing X-Y of Z" readout. */
export function Pager({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  if (total === 0) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-[#eef2f7] pt-3 text-sm text-[#667085] sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}-{end} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-[#dde4ec] px-3 py-1.5 font-semibold text-[#17202a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <span className="px-1 py-1.5 text-xs font-medium text-[#98a2b3]">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-[#dde4ec] px-3 py-1.5 font-semibold text-[#17202a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

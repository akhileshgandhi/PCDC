import { useMemo, useState } from "react"

type CellValue = string | number | boolean | null

interface DatasetGridProps {
  columns: string[]
  rows: CellValue[][]
}

const ROW_HEIGHT = 30
const ROW_NUMBER_WIDTH = 56
const COLUMN_WIDTH = 150
const OVERSCAN = 8

function columnLetters(index: number) {
  let letters = ""
  let n = index + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

function cellText(value: CellValue) {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
  return String(value)
}

/**
 * The read-only "Data" sheet: column letters on top, row numbers on the left,
 * row 1 holds the column names and data starts at row 2, so references such
 * as =SUM(C2:C2001) line up with what the student sees. Only the rows in view
 * are drawn, so a 2,000-row dataset stays fast.
 */
export default function DatasetGrid({ columns, rows }: DatasetGridProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(600)
  const gridTemplate = `${ROW_NUMBER_WIDTH}px repeat(${columns.length}, ${COLUMN_WIDTH}px)`
  const totalWidth = ROW_NUMBER_WIDTH + columns.length * COLUMN_WIDTH

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const last = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN)
  const visible = useMemo(() => rows.slice(first, last), [rows, first, last])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#D0D5DD] bg-white">
      <div
        className="min-h-0 flex-1 overflow-auto font-mono text-[12px]"
        ref={(node) => {
          if (node && node.clientHeight && node.clientHeight !== viewportHeight) {
            setViewportHeight(node.clientHeight)
          }
        }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        role="grid"
        aria-label="Data sheet (read only)"
        aria-rowcount={rows.length + 1}
      >
        <div style={{ width: totalWidth }}>
          {/* column letters + the header row (row 1) stay in view */}
          <div className="sticky top-0 z-10 bg-white">
            <div className="grid border-b border-[#D0D5DD] bg-[#F2F4F7] text-center text-[#667085]" style={{ gridTemplateColumns: gridTemplate, height: 24 }}>
              <div className="sticky left-0 border-r border-[#D0D5DD] bg-[#F2F4F7]" />
              {columns.map((_, index) => (
                <div key={index} className="flex items-center justify-center border-r border-[#E4E7EC]">
                  {columnLetters(index)}
                </div>
              ))}
            </div>
            <div className="grid border-b border-[#D0D5DD]" style={{ gridTemplateColumns: gridTemplate, height: ROW_HEIGHT }} role="row">
              <div className="sticky left-0 flex items-center justify-center border-r border-[#D0D5DD] bg-[#F2F4F7] text-[#667085]">1</div>
              {columns.map((name, index) => (
                <div key={index} className="flex items-center truncate border-r border-[#E4E7EC] bg-[#F9FAFB] px-2 font-sans font-semibold text-[#111827]" title={name}>
                  {name}
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: rows.length * ROW_HEIGHT, position: "relative" }}>
            <div style={{ transform: `translateY(${first * ROW_HEIGHT}px)` }}>
              {visible.map((row, offset) => {
                const rowNumber = first + offset + 2
                return (
                  <div key={rowNumber} className="grid border-b border-[#EEF2F6]" style={{ gridTemplateColumns: gridTemplate, height: ROW_HEIGHT }} role="row">
                    <div className="sticky left-0 flex items-center justify-center border-r border-[#D0D5DD] bg-[#F2F4F7] text-[#667085]">
                      {rowNumber}
                    </div>
                    {columns.map((_, index) => {
                      const value = row[index] ?? null
                      return (
                        <div
                          key={index}
                          className={`flex items-center truncate border-r border-[#EEF2F6] px-2 text-[#344054] ${
                            typeof value === "number" ? "justify-end tabular-nums" : ""
                          }`}
                          title={cellText(value)}
                        >
                          {cellText(value)}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-[#D0D5DD] bg-[#F9FAFB] px-3 py-1.5 text-xs text-[#667085]">
        <span className="rounded bg-white px-2 py-0.5 font-semibold text-[#0B1D3A] shadow-sm">Data</span>
        <span>
          {rows.length.toLocaleString("en-IN")} rows · {columns.length} columns · read only. Refer to it as Data!B2 or B2.
        </span>
      </div>
    </div>
  )
}

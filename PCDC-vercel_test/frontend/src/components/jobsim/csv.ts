import type { DatasetCell, SimulationDataset } from "../../api/jobsim"

export const MAX_UPLOAD_ROWS = 2000
export const MAX_UPLOAD_COLUMNS = 30

/** Split CSV text into rows of fields (handles quotes, "" escapes, CRLF). */
function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += ch
    }
  }
  if (field !== "" || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

function toCell(raw: string): DatasetCell {
  const value = raw.trim()
  if (value === "") return null
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true"
  const plain = value.replace(/,/g, "")
  if (/^-?\d+(\.\d+)?$/.test(plain)) return Number(plain)
  return value
}

/**
 * Read an uploaded CSV into a dataset: first row = column names. Numbers
 * (with or without thousands commas) and TRUE/FALSE are converted; empty
 * cells stay blank. Throws an Error with a readable message when it's not usable.
 */
export function parseDatasetCsv(text: string): SimulationDataset {
  const rows = splitCsv(text.replace(/^﻿/, ""))
  if (rows.length < 2) throw new Error("The file needs a header row and at least one data row.")
  const columns = rows[0].map((name, i) => name.trim().replace(/\s+/g, "") || `Column${i + 1}`)
  if (columns.length > MAX_UPLOAD_COLUMNS) throw new Error(`Use at most ${MAX_UPLOAD_COLUMNS} columns.`)
  const data = rows.slice(1)
  if (data.length > MAX_UPLOAD_ROWS) throw new Error(`Use at most ${MAX_UPLOAD_ROWS.toLocaleString("en-IN")} data rows.`)
  return {
    columns,
    rows: data.map((r) => columns.map((_, i) => toCell(r[i] ?? ""))),
  }
}

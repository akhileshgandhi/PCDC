import { useMemo, useState } from "react"

/**
 * Client-side search + pagination for a listing screen. Resets to page 1
 * whenever the search term, page size, or the underlying item count changes,
 * so a filter never leaves the view stuck on a page that no longer exists.
 */
export function useListControls<T>(
  items: T[],
  matches: (item: T, query: string) => boolean,
  defaultPageSize = 25,
) {
  const [query, setQueryState] = useState("")
  const [pageSize, setPageSizeState] = useState(defaultPageSize)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((item) => matches(item, q)) : items
  }, [items, query, matches])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  )

  function setQuery(value: string) {
    setQueryState(value)
    setPage(1)
  }

  function setPageSize(value: number) {
    setPageSizeState(value)
    setPage(1)
  }

  return {
    query,
    setQuery,
    pageSize,
    setPageSize,
    page: safePage,
    setPage,
    totalPages,
    total: filtered.length,
    paged,
  }
}

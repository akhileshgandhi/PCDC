import { useState } from "react"

import { getNewAssignmentsCount, NewAssignmentsCount } from "../api/student"
import { useAdminAlertRefresh } from "./usePendingTeachingCount"

const EMPTY: NewAssignmentsCount = { case_studies: 0, simulations: 0, total: 0 }

/** Live counts of case studies / simulations assigned to this student that
 * they haven't opened the list for yet. Drives the sidebar red dots and the
 * notification bell. Re-checked every 30s and when the tab comes back into
 * view, same as the faculty sent-back badge. */
export function useNewAssignmentsCount(): NewAssignmentsCount {
  const [counts, setCounts] = useState<NewAssignmentsCount>(EMPTY)
  useAdminAlertRefresh(() => {
    getNewAssignmentsCount()
      .then(setCounts)
      .catch(() => undefined)
  })
  return counts
}

import { useState } from "react"

import { getSentBackSimulationCount } from "../api/jobsim"
import { useAdminAlertRefresh } from "./usePendingTeachingCount"

/** Live count of this faculty's simulations an admin sent back that they
 * haven't opened yet (0 until the first response). Re-checked every 30s and
 * when the tab comes back into view. */
export function useSentBackSimulationCount(): number {
  const [count, setCount] = useState(0)
  useAdminAlertRefresh(() => {
    getSentBackSimulationCount()
      .then((data) => setCount(data.sent_back))
      .catch(() => undefined)
  })
  return count
}

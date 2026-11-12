import { useState } from "react"

import { getPendingSimulationCount } from "../api/jobsim"
import { useAdminAlertRefresh } from "./usePendingTeachingCount"

/** Live count of simulations approved by faculty and waiting for this admin
 * to publish (null until the first response). Re-checked on the same 30s
 * timer as the teaching-approval badge. */
export function usePendingSimulationCount(): number | null {
  const [count, setCount] = useState<number | null>(null)
  useAdminAlertRefresh(() => {
    getPendingSimulationCount()
      .then((data) => setCount(data.pending))
      .catch(() => undefined)
  })
  return count
}

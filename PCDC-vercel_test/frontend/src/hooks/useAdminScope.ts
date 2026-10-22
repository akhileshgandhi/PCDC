import { useEffect, useState } from "react"

import { getAdminMe, type AdminMe, type AdminScopeInstitution } from "../api/admin"
import { getCurrentUser } from "../utils/auth"

export interface AdminScope {
  loading: boolean
  /** Central Admin — manages admins and every institute. */
  isSuperadmin: boolean
  /** Sees every institute: the Central Admin, or an admin that existed before
   * institutes were scoped. Can change platform-wide settings and create admins. */
  isUnrestricted: boolean
  /** Limited to `institutions` (an institute admin). */
  isScoped: boolean
  institutions: AdminScopeInstitution[]
}

// One /auth/me request shared by the layout and every admin page; refreshed
// after something changes the admin's own institutes (e.g. creating one).
let cached: AdminMe | null = null
let inflight: Promise<AdminMe> | null = null
const listeners = new Set<(me: AdminMe) => void>()

function load(force = false): Promise<AdminMe> {
  if (cached && !force) return Promise.resolve(cached)
  if (!inflight || force) {
    inflight = getAdminMe()
      .then((me) => {
        cached = me
        listeners.forEach((listener) => listener(me))
        return me
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Re-fetch the admin's scope, e.g. after they create their own institute. */
export function refreshAdminScope() {
  return load(true)
}

/** Drop the cached scope (call on logout so the next admin starts clean). */
export function clearAdminScope() {
  cached = null
}

function toScope(me: AdminMe | null): AdminScope {
  const role = me?.role ?? getCurrentUser()?.role
  const isSuperadmin = role === "superadmin"
  // Until /auth/me answers, assume today's (unrestricted) behaviour so
  // existing admins never see a flash of a restricted UI.
  const isUnrestricted = me ? isSuperadmin || Boolean(me.admin_unrestricted) : true
  return {
    loading: me === null,
    isSuperadmin,
    isUnrestricted,
    isScoped: !isUnrestricted,
    institutions: me?.institutions ?? [],
  }
}

export function useAdminScope(): AdminScope {
  const [me, setMe] = useState<AdminMe | null>(cached)

  useEffect(() => {
    const listener = (next: AdminMe) => setMe(next)
    listeners.add(listener)
    load().then(setMe).catch(() => undefined)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return toScope(me)
}

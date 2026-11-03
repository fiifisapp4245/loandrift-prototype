"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * List state (scope, tab, search, filters, the open record) lives in the URL, so a reload, a
 * shared link and the Back button from a record all return to the same view.
 */
export function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function set(patch: Record<string, string | null | undefined>) {
    const q = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") q.delete(key)
      else q.set(key, value)
    }
    const qs = q.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  /** A link to this view with some parameters changed, for real anchors (open in new tab, Back). */
  function href(patch: Record<string, string | null | undefined>) {
    const q = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") q.delete(key)
      else q.set(key, value)
    }
    const qs = q.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return { get: (key: string) => params.get(key) ?? "", set, href }
}

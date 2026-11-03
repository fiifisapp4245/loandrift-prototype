"use client"

import { useEffect, useRef, useState } from "react"

type Settled<T> = { requestKey: string; data?: T; dataKey?: string; error?: Error }

/**
 * A minimal request hook with the states the dashboard must keep apart:
 * - loading: no data yet for this key → show skeletons, never zeros
 * - refreshing: re-requesting a key we already have data for → keep showing it
 * - error: the request for this key failed and there's nothing to show
 * - stale: a refresh failed, so the data on screen is older than the user asked for
 */
export function useQuery<T>(key: string, fetcher: (attempt: number) => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>({ requestKey: "" })
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const requestKey = `${key}#${attempt}`
  useEffect(() => {
    let live = true
    fetcherRef.current(attempt).then(
      (data) => live && setSettled({ requestKey, data, dataKey: key }),
      (error: Error) => live && setSettled((s) => ({ ...s, requestKey, error })),
    )
    return () => {
      live = false
    }
  }, [requestKey, key, attempt])

  const isSettled = settled.requestKey === requestKey
  const hasData = settled.dataKey === key
  return {
    data: hasData ? settled.data : undefined,
    loading: !isSettled && !hasData,
    refreshing: !isSettled && hasData,
    error: isSettled && !hasData ? settled.error : undefined,
    staleError: isSettled && hasData ? settled.error : undefined,
    refetch: () => setAttempt((a) => a + 1),
  }
}

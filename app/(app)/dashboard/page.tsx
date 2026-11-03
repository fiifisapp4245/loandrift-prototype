import type { Metadata } from "next"
import { Suspense } from "react"
import { DashboardView } from "@/components/dashboard/dashboard-view"

export const metadata: Metadata = { title: "Dashboard" }

/** Applied period lives in the URL (?from=&to=), read on the client so changes don't round-trip. */
export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  )
}

import type { Metadata } from "next"
import { Suspense } from "react"
import { ApprovalsView } from "@/components/workspace/approvals-view"

export const metadata: Metadata = { title: "My Approvals" }

export default function ApprovalsPage() {
  return (
    <Suspense>
      <ApprovalsView />
    </Suspense>
  )
}

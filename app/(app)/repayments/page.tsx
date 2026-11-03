import type { Metadata } from "next"
import { Suspense } from "react"
import { RepaymentsView } from "@/components/repayments/repayments-view"

export const metadata: Metadata = { title: "Repayments" }

export default function RepaymentsPage() {
  return (
    <Suspense>
      <RepaymentsView />
    </Suspense>
  )
}

import type { Metadata } from "next"
import { Suspense } from "react"
import { LoansView } from "@/components/lending/loans-view"

export const metadata: Metadata = { title: "All Loans" }

export default function LoansPage() {
  return (
    <Suspense>
      <LoansView />
    </Suspense>
  )
}

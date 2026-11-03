import type { Metadata } from "next"
import { Suspense } from "react"
import { CreditScoreView } from "@/components/credit/credit-score-view"

export const metadata: Metadata = { title: "Credit Score" }

export default function CreditScorePage() {
  return (
    <Suspense>
      <CreditScoreView />
    </Suspense>
  )
}

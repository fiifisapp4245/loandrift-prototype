import type { Metadata } from "next"
import { Suspense } from "react"
import { CollateralView } from "@/components/collateral/collateral-view"

export const metadata: Metadata = { title: "Collateral" }

export default function CollateralPage() {
  return (
    <Suspense>
      <CollateralView />
    </Suspense>
  )
}

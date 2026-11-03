import type { Metadata } from "next"
import { Suspense } from "react"
import { CollectionsView } from "@/components/collections/collections-view"

export const metadata: Metadata = { title: "Collections" }

export default function CollectionsPage() {
  return (
    <Suspense>
      <CollectionsView />
    </Suspense>
  )
}

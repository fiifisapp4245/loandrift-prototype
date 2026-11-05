import type { Metadata } from "next"
import { Suspense } from "react"
import { GroupsView } from "@/components/groups/groups-view"

export const metadata: Metadata = { title: "Groups" }

export default function GroupsPage() {
  return (
    <Suspense>
      <GroupsView />
    </Suspense>
  )
}

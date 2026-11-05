import type { Metadata } from "next"
import { Suspense } from "react"
import { GroupDetailView } from "@/components/groups/group-detail-view"
import { getGroup } from "@/lib/api/groups"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: getGroup(decodeURIComponent(id))?.name ?? "Group" }
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params
  return (
    <Suspense>
      <GroupDetailView id={decodeURIComponent(id)} />
    </Suspense>
  )
}

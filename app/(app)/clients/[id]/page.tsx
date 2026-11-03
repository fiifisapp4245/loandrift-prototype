import type { Metadata } from "next"
import { Suspense } from "react"
import { ClientProfileView } from "@/components/lending/client-profile-view"
import { getClient } from "@/lib/api/lending"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: getClient(decodeURIComponent(id))?.name ?? "Client" }
}

export default async function ClientPage({ params }: Props) {
  const { id } = await params
  return (
    <Suspense>
      <ClientProfileView id={decodeURIComponent(id)} />
    </Suspense>
  )
}

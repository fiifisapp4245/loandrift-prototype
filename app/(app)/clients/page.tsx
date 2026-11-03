import type { Metadata } from "next"
import { Suspense } from "react"
import { ClientsView } from "@/components/lending/clients-view"

export const metadata: Metadata = { title: "Clients" }

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsView />
    </Suspense>
  )
}

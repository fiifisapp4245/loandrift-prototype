import type { Metadata } from "next"
import { ClientForm } from "@/components/lending/client-form"

export const metadata: Metadata = { title: "Add client" }

export default function NewClientPage() {
  return <ClientForm />
}

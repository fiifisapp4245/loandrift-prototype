import type { Metadata } from "next"
import { ApplicationForm } from "@/components/lending/application-form"

export const metadata: Metadata = { title: "New loan application" }

type Props = { searchParams: Promise<{ client?: string }> }

export default async function NewApplicationPage({ searchParams }: Props) {
  const { client } = await searchParams
  return <ApplicationForm initialClientId={client} />
}

import type { Metadata } from "next"
import { GroupLoanForm } from "@/components/groups/group-loan-form"

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Apply for a group loan" }

export default async function GroupLoanPage({ params }: Props) {
  const { id } = await params
  return <GroupLoanForm id={decodeURIComponent(id)} />
}

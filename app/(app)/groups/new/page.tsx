import type { Metadata } from "next"
import { GroupForm } from "@/components/groups/group-form"

export const metadata: Metadata = { title: "Form a group" }

export default function FormGroupPage() {
  return <GroupForm />
}

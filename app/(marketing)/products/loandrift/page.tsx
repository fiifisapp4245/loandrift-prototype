import type { Metadata } from "next"
import { LoanDriftLanding } from "@/components/marketing/landing"

export const metadata: Metadata = {
  title: { absolute: "LoanDrift: lending operations software" },
  description: "Capture applications, route approvals, record repayments and work your collections in one place.",
}

type Props = { searchParams: Promise<{ mode?: string }> }

export default async function LoanDriftPage({ searchParams }: Props) {
  const { mode } = await searchParams
  return <LoanDriftLanding release={mode === "release"} />
}

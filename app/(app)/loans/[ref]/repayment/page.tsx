import type { Metadata } from "next"
import { Suspense } from "react"
import { RepaymentView } from "@/components/repayment/repayment-view"

type Props = { params: Promise<{ ref: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ref } = await params
  return { title: `Repayment · ${decodeURIComponent(ref)}` }
}

export default async function RepaymentPage({ params }: Props) {
  const { ref } = await params
  return (
    <Suspense>
      <RepaymentView reference={decodeURIComponent(ref)} />
    </Suspense>
  )
}

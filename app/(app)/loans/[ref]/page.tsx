import type { Metadata } from "next"
import { Suspense } from "react"
import { LoanDetailView } from "@/components/lending/loan-detail-view"

type Props = { params: Promise<{ ref: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ref } = await params
  return { title: decodeURIComponent(ref) }
}

export default async function LoanPage({ params }: Props) {
  const { ref } = await params
  return (
    <Suspense>
      <LoanDetailView reference={decodeURIComponent(ref)} />
    </Suspense>
  )
}

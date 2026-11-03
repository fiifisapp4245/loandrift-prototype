"use client"

import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { StateMessage } from "@/components/patterns/state-message"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { fetchReceiptDocument } from "@/lib/api/repayments"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"
import { useQuery } from "@/lib/use-query"
import { demoContext } from "@/lib/fixtures"

function Row({ term, hint, children }: { term: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">
        {term}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/**
 * Receipt preview (F57). Always one predictable surface: a loading state, the receipt, or an error
 * with Retry and a fallback route to the loan's repayment overview. No print, download or email.
 */
export function ReceiptDrawer({ receiptNo, fail, onClose }: { receiptNo: string; fail?: boolean; onClose: () => void }) {
  const doc = useQuery(`receipt:${receiptNo}:${fail ? "fail" : "ok"}`, () => fetchReceiptDocument(receiptNo, fail))
  const r = doc.data
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-md"
        onCloseAutoFocus={(e) => {
          const origin = document.querySelector<HTMLElement>(`[data-receipt-no="${receiptNo}"]`)
          if (origin) {
            e.preventDefault()
            origin.focus()
          }
        }}
      >
        <SheetHeader className="border-b">
          <p className="font-mono text-xs text-muted-foreground">Receipt</p>
          <SheetTitle className="text-lg">{receiptNo}</SheetTitle>
          <SheetDescription>{r ? `${formatMoney(r.amount)} received ${formatDate(r.receivedOn)}` : doc.error ? "Preview unavailable" : "Loading the receipt"}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {doc.error ? (
            <StateMessage
              state="error"
              title="Couldn't show this receipt"
              description={`${doc.error.message} The payment itself is recorded; only the preview failed.`}
              onRetry={doc.refetch}
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/transactions?q=${receiptNo}`}>Find it in Transactions</Link>
                </Button>
              }
            />
          ) : !r ? (
            <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Preparing the receipt preview…
            </p>
          ) : (
            <>
              <article aria-label={`Receipt ${r.receiptNo}`} className="rounded-2xl border p-4">
                <p className="text-sm font-semibold">{demoContext.business}</p>
                <p className="text-xs text-muted-foreground">{demoContext.branch} · Fictional demo receipt</p>
                <p className="mt-4 text-xs text-muted-foreground">Amount received</p>
                <p className="text-2xl font-semibold tabular">{formatMoney(r.amount)}</p>
                <dl className="mt-3 divide-y">
                  <Row term="Receipt">
                    <span className="font-mono text-xs">{r.receiptNo}</span>
                  </Row>
                  <Row term="Received" hint="When the money came in">
                    {formatDate(r.receivedOn)}
                  </Row>
                  <Row term="Recorded" hint="When it was entered">
                    {formatDateTime(r.recordedAt)}
                    {r.recordedAt.slice(0, 10) !== r.receivedOn && <span className="mt-0.5 block text-xs text-warning">Entered after the day it was received.</span>}
                  </Row>
                  <Row term="Loan">
                    <EntityRef reference={r.loanRef} href={`/loans/${r.loanRef}`} context={r.borrower} />
                  </Row>
                  <Row term="Method">{r.method ?? <span className="text-muted-foreground">Not recorded</span>}</Row>
                  <Row term="Payer reference">{r.externalRef ? <span className="font-mono text-xs">{r.externalRef}</span> : <span className="text-muted-foreground">None given</span>}</Row>
                  <Row term="Balance after" hint="Historical, at the time">
                    {r.balanceAfter ? formatMoney(r.balanceAfter) : <span className="text-muted-foreground">Not recorded</span>}
                  </Row>
                  <Row term="Loan status now">{r.loanStatusNow}</Row>
                </dl>
              </article>

              <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                <li>
                  <Link href={`/loans/${r.loanRef}/repayment`} className="flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-muted/60">
                    Repayment overview for <span className="font-mono text-xs">{r.loanRef}</span>
                    <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
                  </Link>
                </li>
                <li>
                  <Link href={`/transactions?tx=${r.txId}`} className="flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-muted/60">
                    This payment in Transactions
                    <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
                  </Link>
                </li>
              </ul>

              <div className="mt-4 flex flex-col gap-1.5 rounded-2xl border p-3">
                <Button variant="outline" size="sm" disabled className="w-fit">
                  Print or download
                </Button>
                <p className="text-xs text-muted-foreground">Not available in this prototype. Nothing is printed, emailed or regenerated from here.</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

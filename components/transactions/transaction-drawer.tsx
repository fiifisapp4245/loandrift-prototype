"use client"

import Link from "next/link"
import { ArrowRight, Copy } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { StateMessage } from "@/components/patterns/state-message"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DIRECTIONS, TX_TYPES, getTransaction } from "@/lib/api/transactions"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"
import { DirectionTag } from "@/components/transactions/direction-tag"

function Row({ term, hint, children }: { term: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">
        {term}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/**
 * One transaction, read-only: its human reference and unique ID, what it means for cash, both
 * times with their meanings, and the precise records it links to. Opened from ?tx=.
 */
export function TransactionDrawer({ id, txHref, onClose }: { id: string; txHref: (id: string) => string; onClose: () => void }) {
  const found = getTransaction(id)
  const t = found?.tx
  const recordedDay = t ? new Date(t.recordedAt).toISOString().slice(0, 10) : ""
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-md"
        onCloseAutoFocus={(e) => {
          const origin = document.querySelector<HTMLElement>(`[data-tx-id="${id}"]`)
          if (origin) {
            e.preventDefault()
            origin.focus()
          }
        }}
      >
        {!t || !found ? (
          <>
            <SheetHeader>
              <SheetTitle>Transaction {id}</SheetTitle>
              <SheetDescription className="sr-only">Not found</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <StateMessage state="unavailable" title="This transaction isn't in the ledger" description="Check the reference, or search Transactions." />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="border-b">
              <p className="font-mono text-xs text-muted-foreground">{t.ref}</p>
              <SheetTitle className="text-lg">
                {TX_TYPES[t.type].label} · <span className="tabular">{formatMoney(t.amount)}</span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <DirectionTag direction={t.direction} />
                <span>{TX_TYPES[t.type].meaning}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <dl className="divide-y">
                <Row term="Loan">
                  <EntityRef reference={t.loanRef} href={`/loans/${t.loanRef}`} context={t.borrower} />
                </Row>
                <Row term="Amount">
                  <span className="font-semibold tabular">{formatMoney(t.amount)}</span>{" "}
                  <span className="text-muted-foreground">({DIRECTIONS[t.direction].toLowerCase()})</span>
                </Row>
                <Row term="Method">{t.method ?? <span className="text-muted-foreground">Not applicable</span>}</Row>
                <Row term="Payer reference">{t.externalRef ? <span className="font-mono text-xs">{t.externalRef}</span> : <span className="text-muted-foreground">None given</span>}</Row>
                <Row term="Effective" hint={t.direction === "adjustment" ? "When it applies" : "When money moved"}>
                  {formatDate(t.effectiveOn)}
                </Row>
                <Row term="Recorded" hint="When it was entered">
                  {formatDateTime(t.recordedAt)}
                  {recordedDay !== t.effectiveOn && <span className="mt-0.5 block text-xs text-warning">Entered after the effective date (backdated).</span>}
                </Row>
                <Row term="Status">{t.status}</Row>
              </dl>

              <h3 className="mt-5 mb-2 text-sm font-semibold">Linked records</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                <li>
                  <Link href={`/loans/${t.loanRef}`} className="flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-muted/60">
                    Loan record <span className="font-mono text-xs text-muted-foreground">{t.loanRef}</span>
                    <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
                  </Link>
                </li>
                {t.type === "repayment" && (
                  <li>
                    <Link href={`/loans/${t.loanRef}/repayment`} className="flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-muted/60">
                      Receipt <span className="font-mono text-xs text-muted-foreground">{t.ref}</span> in the repayment overview
                      <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
                    </Link>
                  </li>
                )}
                {t.activityId ? (
                  <li>
                    <Link href={`/activities?event=${t.activityId}`} className="flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-muted/60">
                      Activity and accounting entries
                      <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ) : (
                  <li className="px-1 text-xs text-muted-foreground">No activity event recorded for this transaction in the last 90 days.</li>
                )}
              </ul>

              {found.similar.length > 0 && (
                <>
                  <h3 className="mt-5 mb-1 flex items-center gap-1.5 text-sm font-semibold">
                    <Copy aria-hidden className="size-4 text-muted-foreground" />
                    Similar on the same day
                  </h3>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Same loan, type, amount and date, but a separate transaction. Listed, not merged: matching details don&rsquo;t prove a duplicate.
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {found.similar.map((x) => (
                      <li key={x.id}>
                        <Link href={txHref(x.id)} scroll={false} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm hover:bg-muted/60">
                          <span className="font-mono text-xs">{x.ref}</span>
                          <span className="text-muted-foreground">recorded {formatDateTime(x.recordedAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <details className="mt-5 rounded-xl border px-3 py-2 text-sm">
                <summary className="cursor-pointer font-medium">Technical details</summary>
                <dl className="mt-2 divide-y">
                  <Row term="Transaction ID">
                    <span className="font-mono text-xs">{t.id}</span>
                  </Row>
                  <Row term="Recorded (UTC)">
                    <span className="font-mono text-xs">{t.recordedAt}</span>
                  </Row>
                </dl>
              </details>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

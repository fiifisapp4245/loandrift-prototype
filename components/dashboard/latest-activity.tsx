import Link from "next/link"
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { Skeleton } from "@/components/ui/skeleton"
import type { PeriodActivity } from "@/lib/api/dashboard"
import type { DemoEventKind } from "@/lib/fixtures"
import { formatDate, formatMoney } from "@/lib/format"

/**
 * Direction is said in words ("Received", "Paid out", "Charged"), not by +/− or red/green, so a
 * fee charged is never read as cash and a disbursement never reads as a loss.
 */
const KIND: Record<DemoEventKind, { label: string; icon: typeof ArrowUpRight; tint: string }> = {
  repayment: { label: "Received", icon: ArrowDownLeft, tint: "bg-success-subtle text-success" },
  disbursement: { label: "Paid out", icon: ArrowUpRight, tint: "bg-brand-subtle text-brand-subtle-foreground" },
  fee_charged: { label: "Fee charged", icon: ReceiptText, tint: "bg-muted text-muted-foreground" },
}

export function LatestActivity({ activity, loading }: { activity?: PeriodActivity; loading: boolean }) {
  return (
    <section aria-labelledby="latest" className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="latest" className="text-base font-semibold">
          Latest in this period
        </h2>
        <Link href="/transactions" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          View all
        </Link>
      </div>
      {loading || !activity ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : activity.recent.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">Nothing recorded in this period.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {activity.recent.map((e) => {
            const k = KIND[e.kind]
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60">
                <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-full ${k.tint}`}>
                  <k.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.borrower}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <EntityRef reference={e.loanRef} href={`/loans/${e.loanRef}`} className="inline-flex" />
                    <span aria-hidden>·</span>
                    <time dateTime={e.on}>{formatDate(e.on)}</time>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-semibold">{formatMoney(e.amount)}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

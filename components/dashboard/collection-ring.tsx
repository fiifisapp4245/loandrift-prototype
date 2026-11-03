import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Figure } from "@/components/patterns/figure"
import { InfoTip } from "@/components/patterns/info-tip"
import { Skeleton } from "@/components/ui/skeleton"
import type { PeriodActivity } from "@/lib/api/dashboard"
import { UNAVAILABLE_LABEL, formatMoney, plural } from "@/lib/format"
import { isUnavailable } from "@/lib/types"

const R = 52
const C = 2 * Math.PI * R
/** The unpaid part of the ring. Lavender, so it reads as "still to come" next to the purple paid arc. */
const UNPAID = "#ddd6fe"

/**
 * Collection rate as a ring: the purple arc is what was paid, the lavender track is what's still
 * unpaid, of installments that fell due in the period. The legend under it names both amounts and
 * the total due, so the ring is never the only way to read it. With no denominator the ring is an
 * empty track and the centre says Unavailable, never 0%.
 */
export function CollectionRing({ activity, loading, className }: { activity?: PeriodActivity; loading: boolean; className?: string }) {
  const c = activity?.collection
  const rate = c?.rate
  const value = rate && !isUnavailable(rate) ? Math.min(1, rate.value) : null
  const hasDue = !!c && c.installmentsDue > 0
  return (
    <section aria-busy={loading || undefined} className={`flex min-w-0 flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6 ${className ?? ""}`}>
      <div className="flex items-center gap-1">
        <h3 className="text-sm font-medium text-muted-foreground">Collection rate</h3>
        <InfoTip label="Collection rate">
          Paid ÷ due, for installments that fell due in the period. Today&rsquo;s installments count once the day ends.
        </InfoTip>
      </div>

      <div className="flex flex-1 items-center justify-center py-2">
        {loading ? (
          <>
            <Skeleton className="size-40 rounded-full" />
            <span className="sr-only">Loading Collection rate</span>
          </>
        ) : (
          <div className="relative size-40">
            <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
              <circle cx="64" cy="64" r={R} fill="none" stroke={hasDue ? UNPAID : "var(--muted)"} strokeWidth="12" />
              {value !== null && value > 0 && (
                <circle
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${value * C} ${C}`}
                />
              )}
            </svg>
            <p className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {rate && !isUnavailable(rate) ? (
                <>
                  <Figure text={rate.label} className="text-3xl font-semibold" />
                  <span className="text-xs text-muted-foreground">collected</span>
                </>
              ) : (
                <span className="px-4 text-sm font-medium text-muted-foreground">{UNAVAILABLE_LABEL}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {!loading && rate && isUnavailable(rate) && <p className="text-center text-xs text-muted-foreground">{rate.reason}</p>}

      {!loading && c && hasDue && (
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="ml-auto tabular font-medium">{formatMoney(c.collected)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full ring-1 ring-[#a78bfa] ring-inset" style={{ background: UNPAID }} />
            <dt className="text-muted-foreground">Unpaid</dt>
            <dd className="ml-auto tabular font-medium">{formatMoney(c.dueUnpaid)}</dd>
          </div>
          <div className="flex items-center gap-2 border-t pt-2">
            <span aria-hidden className="size-2.5" />
            <dt className="text-muted-foreground">Due, {plural(c.installmentsDue, "installment")}</dt>
            <dd className="ml-auto tabular font-semibold">{formatMoney(c.due)}</dd>
          </div>
        </dl>
      )}

      <Link href="/collections" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
        View collections
        <span className="sr-only"> for Collection rate</span>
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </section>
  )
}

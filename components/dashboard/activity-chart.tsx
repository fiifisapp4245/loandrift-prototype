"use client"

import { useState } from "react"
import { InfoTip } from "@/components/patterns/info-tip"
import type { ActivityBucket, PeriodActivity } from "@/lib/api/dashboard"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

const SERIES = [
  { key: "disbursed", label: "Disbursed", color: "var(--chart-1)" },
  { key: "repaid", label: "Repayments received", color: "var(--chart-2)" },
] as const

/** A clean axis maximum: 1, 2, 2.5 or 5 × a power of ten, at or above the largest value. */
function niceMax(minor: number) {
  if (minor <= 0) return 100_00
  const major = minor / 100
  const pow = 10 ** Math.floor(Math.log10(major))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= major)! * pow
  return step * 100
}

function compact(minor: number) {
  const major = minor / 100
  if (major >= 1000) return `GH₵${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(major / 1000)}K`
  return `GH₵${major}`
}

const BUCKET_NOUN = { day: "day", week: "week", month: "month" } as const

/**
 * Disbursed vs received per bucket, in cedis only. The bars come from the same buckets the
 * service sums for the cards, and the footer restates those totals, so the chart reconciles
 * with its labelled source values by construction.
 */
export function ActivityChart({ activity, bare }: { activity: PeriodActivity; /** No card chrome, inside a larger card. */ bare?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const { buckets } = activity
  const max = niceMax(Math.max(...buckets.flatMap((b) => [b.disbursed.minor, b.repaid.minor])))
  const labelStep = buckets.length > 8 ? 2 : 1
  const empty = buckets.every((b) => b.disbursed.minor === 0 && b.repaid.minor === 0)
  const ticks = [max, max / 2, 0]

  const describe = (b: ActivityBucket) =>
    `${b.label}: disbursed ${formatMoney(b.disbursed)}, repayments received ${formatMoney(b.repaid)}`

  return (
    <figure className={cn("flex flex-col gap-3", !bare && "rounded-2xl border bg-card p-5")}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="flex items-center gap-1 text-sm font-semibold">
          Cash movement by {BUCKET_NOUN[activity.bucketSize]}
          <InfoTip label="this chart">
            Cedis only. Bars add up to the Disbursed and Repayments received cards. Fees are charges, not cash, so they aren&rsquo;t
            charted.
          </InfoTip>
        </span>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      </figcaption>

      {empty ? (
        <p className="rounded-md bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          No cedi disbursements or repayments were recorded in this period.
        </p>
      ) : (
        <div className="relative flex gap-2">
          {/* Y axis: three clean ticks, recessive. */}
          <div className="flex h-44 w-12 shrink-0 flex-col justify-between text-right text-[11px] text-muted-foreground tabular" aria-hidden>
            {ticks.map((t) => (
              <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
                {compact(t)}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-44">
              <div aria-hidden className="absolute inset-x-0 top-0 border-t border-border" />
              <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-border" />
              <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-foreground/30" />
              <ul className="absolute inset-0 flex items-end" aria-label="Activity by period">
                {buckets.map((b, i) => (
                  <li
                    key={b.from}
                    tabIndex={0}
                    aria-label={describe(b)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className={cn("relative flex h-full flex-1 items-end justify-center gap-[3px] rounded-lg outline-offset-0", hover === i && "bg-brand-subtle/70")}
                  >
                    {SERIES.map((s) => {
                      const v = b[s.key].minor
                      return (
                        <span
                          key={s.key}
                          aria-hidden
                          className="w-full max-w-5 rounded-t-full"
                          style={{ height: v === 0 ? 0 : `max(2px, ${(v / max) * 100}%)`, background: s.color }}
                        />
                      )
                    })}
                    {hover === i && (
                      <div
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute bottom-full z-10 mb-2 w-max rounded-2xl bg-foreground px-3.5 py-2.5 text-xs text-background shadow-lg",
                          i < buckets.length / 2 ? "left-0" : "right-0",
                        )}
                      >
                        <p className="mb-1 font-medium">{b.label}</p>
                        {SERIES.map((s) => (
                          <p key={s.key} className="flex items-center gap-1.5">
                            <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                            <span className="opacity-70">{s.label}</span>
                            <span className="ml-auto pl-3 font-medium tabular">{formatMoney(b[s.key])}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-1.5 flex" aria-hidden>
              {buckets.map((b, i) => (
                <span key={b.from} className="flex-1 truncate px-0.5 text-center text-[11px] text-muted-foreground">
                  {i % labelStep === 0 ? b.label : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <details className="text-sm">
        <summary className="w-fit cursor-pointer text-xs font-medium text-primary">Show as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Cedi cash movement by {BUCKET_NOUN[activity.bucketSize]}</caption>
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  Period
                </th>
                {SERIES.map((s) => (
                  <th key={s.key} scope="col" className="py-1.5 pr-3 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.from} className="border-b last:border-0">
                  <th scope="row" className="py-1.5 pr-3 font-normal">
                    {b.label}
                  </th>
                  <td className="py-1.5 pr-3 text-right tabular">{formatMoney(b.disbursed)}</td>
                  <td className="py-1.5 pr-3 text-right tabular">{formatMoney(b.repaid)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <th scope="row" className="py-1.5 pr-3">
                  Total
                </th>
                <td className="py-1.5 pr-3 text-right tabular">{formatMoney(activity.disbursed.total)}</td>
                <td className="py-1.5 pr-3 text-right tabular">{formatMoney(activity.repaid.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </figure>
  )
}

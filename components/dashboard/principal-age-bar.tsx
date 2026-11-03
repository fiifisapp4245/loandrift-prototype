import { InfoTip } from "@/components/patterns/info-tip"
import type { PortfolioSnapshot } from "@/lib/api/dashboard"
import { formatMoney, formatPercent } from "@/lib/format"

/** Status colours, because these buckets are states (healthy → serious). Each also has a text label. */
const COLOR = { current: "var(--success)", "1-30": "var(--warning)", "30-plus": "var(--danger)" } as const

/**
 * Principal outstanding split by how overdue each loan is. Segments are separated by a 2px gap,
 * and every segment is named with its amount and share below, so colour is never the only key.
 */
export function PrincipalAgeBar({ parts }: { parts: NonNullable<PortfolioSnapshot["principalByAge"]> }) {
  const total = parts.reduce((t, p) => t + p.amount.minor, 0)
  if (total === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <p className="text-sm font-medium text-muted-foreground">Principal by days overdue</p>
        <InfoTip label="principal by days overdue">
          Each loan&rsquo;s principal outstanding, grouped by its oldest overdue installment. The parts add up to principal outstanding.
        </InfoTip>
      </div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
        {parts
          .filter((p) => p.amount.minor > 0)
          .map((p) => (
            <span key={p.id} style={{ width: `${(p.amount.minor / total) * 100}%`, background: COLOR[p.id] }} />
          ))}
      </div>
      <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-0.5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: COLOR[p.id] }} />
              {p.label}
            </span>
            <span className="ml-auto tabular font-medium sm:ml-0 sm:pl-[18px]">{formatMoney(p.amount)}</span>
            <span className="sr-only">, {formatPercent(p.amount.minor / total)} of principal outstanding</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { InfoTip } from "@/components/patterns/info-tip"
import type { LoanFinancials } from "@/lib/api/lending"
import { formatMoney, formatPercent } from "@/lib/format"
import { isUnavailable } from "@/lib/types"

/**
 * "GH₵200.00 of GH₵1,200.00 paid" with a bar. The amounts are always labelled; the bar only
 * reinforces them (F23). No schedule reads as such, with the reason, never as 0%.
 */
export function RepaymentProgress({ financials, compact }: { financials: LoanFinancials; compact?: boolean }) {
  const { paid, totalPayable, progress } = financials
  if (isUnavailable(totalPayable) || isUnavailable(paid) || progress === null) {
    const reason = isUnavailable(totalPayable) ? totalPayable.reason : "No schedule."
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        No schedule
        <InfoTip label="no schedule">{reason}</InfoTip>
      </span>
    )
  }
  return (
    <span className={`flex flex-col gap-1 ${compact ? "min-w-36" : "min-w-48"}`}>
      <span className="text-xs whitespace-nowrap">
        <span className="tabular font-medium">{formatMoney(paid)}</span>
        <span className="text-muted-foreground"> of {formatMoney(totalPayable)} paid</span>
      </span>
      <span
        role="meter"
        aria-label="Repaid"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${formatPercent(progress)} repaid`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </span>
    </span>
  )
}

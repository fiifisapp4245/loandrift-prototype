import { toneClass, toneIcon } from "@/components/patterns/tone"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { REPAYMENT_HEALTH, loanStatus, type StatusPresentation } from "@/lib/format"
import type { RepaymentHealth } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A labelled pill with an icon. The text is the status; the colour only reinforces it. */
export function StatusBadge({ status, className }: { status: StatusPresentation; className?: string }) {
  const Icon = toneIcon[status.tone]
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap",
        toneClass[status.tone],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {status.label}
    </span>
  )
}

/** Workflow stage. Unknown values read as "Unrecognised status", never "Pending". */
export function LoanStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge status={loanStatus(status)} />
}

/**
 * Repayment health sits next to, never inside, the workflow status. A null health means the
 * source didn't establish it; we say so rather than guess "On track".
 */
export function HealthBadge({ health }: { health: RepaymentHealth | null | undefined }) {
  if (!health) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4">
            Health unavailable
          </span>
        </TooltipTrigger>
        <TooltipContent>Repayment health was not supplied for this loan.</TooltipContent>
      </Tooltip>
    )
  }
  return <StatusBadge status={REPAYMENT_HEALTH[health]} />
}

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UNAVAILABLE_LABEL, formatMoneyValue, unavailableReason } from "@/lib/format"
import type { MoneyValue } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * A money value in a table cell or sentence. Available amounts use tabular figures.
 * Unavailable amounts say "Unavailable" and expose the reason on hover and focus.
 */
export function Amount({ value, className }: { value: MoneyValue | null | undefined; className?: string }) {
  const reason = unavailableReason(value)
  if (reason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn("text-muted-foreground underline decoration-dotted underline-offset-4", className)}
          >
            {UNAVAILABLE_LABEL}
            <span className="sr-only">: {reason}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{reason}</TooltipContent>
      </Tooltip>
    )
  }
  return <span className={cn("tabular whitespace-nowrap", className)}>{formatMoneyValue(value)}</span>
}

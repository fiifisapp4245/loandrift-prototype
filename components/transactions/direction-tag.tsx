import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react"
import type { Direction } from "@/lib/api/transactions"
import { cn } from "@/lib/utils"

const TAG: Record<Direction, { label: string; icon: typeof ArrowDownLeft; className: string }> = {
  cash_in: { label: "Cash in", icon: ArrowDownLeft, className: "bg-success-subtle text-success" },
  cash_out: { label: "Cash out", icon: ArrowUpRight, className: "bg-brand-subtle text-brand-subtle-foreground" },
  adjustment: { label: "Adjustment", icon: Scale, className: "bg-muted text-foreground" },
}

/** Whether money moved, in words with an icon. Never a +/− sign or colour alone. */
export function DirectionTag({ direction, className }: { direction: Direction; className?: string }) {
  const t = TAG[direction]
  return (
    <span className={cn("inline-flex h-6 w-fit items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap", t.className, className)}>
      <t.icon aria-hidden className="size-3.5" />
      {t.label}
    </span>
  )
}

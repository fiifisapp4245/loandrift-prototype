import Link from "next/link"
import { InfoTip } from "@/components/patterns/info-tip"
import { Skeleton } from "@/components/ui/skeleton"
import { COUNT_SCOPE, formatCount } from "@/lib/format"
import type { CountScope } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * A count that always says whose items it counts. "3 · Waiting on you" and "12 · Branch-wide"
 * can sit side by side without contradicting each other (F04, F05). The scope is a short visible
 * tag; what it means is in the info tip.
 */
export function ScopedCount({
  label,
  count,
  scope,
  href,
  loading,
  className,
}: {
  label: string
  count: number
  scope: CountScope
  href?: string
  loading?: boolean
  className?: string
}) {
  const s = COUNT_SCOPE[scope]
  const linked = href && !loading
  return (
    <div
      aria-busy={loading || undefined}
      className={cn(
        "relative flex min-w-0 flex-col gap-1 rounded-2xl border bg-card p-4",
        linked && "transition-colors focus-within:border-primary/40 hover:border-primary/40 hover:bg-brand-subtle/40",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        {linked ? (
          // The whole card is the link's hit area; the info tip sits above it.
          <Link href={href} className="text-sm font-medium after:absolute after:inset-0 after:rounded-2xl">
            {label}
            <span className="sr-only">, {s.label.toLowerCase()}</span>
          </Link>
        ) : (
          <span className="text-sm font-medium">{label}</span>
        )}
        <InfoTip label={`${label}, ${s.label.toLowerCase()}`}>{s.description}</InfoTip>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-10" />
      ) : (
        <span className="tabular text-2xl leading-8 font-semibold">{formatCount(count)}</span>
      )}
      <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{s.label}</span>
    </div>
  )
}

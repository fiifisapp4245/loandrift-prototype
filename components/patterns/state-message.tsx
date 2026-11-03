import { AlertOctagon, Inbox, Loader2, Lock, SearchX, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ViewState = "loading" | "empty" | "filtered-empty" | "unavailable" | "permission" | "error"

const icons = {
  loading: Loader2,
  empty: Inbox,
  "filtered-empty": SearchX,
  unavailable: Unplug,
  permission: Lock,
  error: AlertOctagon,
} as const

/**
 * One component for the six states a list or panel can be in. Each has its own wording so a
 * filtered result never reads as "no data" (F41, F49, F58) and a failure never reads as empty.
 *
 * - empty: the dataset truly has nothing. May offer a create action.
 * - filtered-empty: the filters matched nothing. Names what was searched; offers Clear, never Create.
 * - unavailable: the source can't supply this view (e.g. API limitation). Says what to use instead.
 * - permission: the user's role can't see it. Says who can.
 * - error: the request failed. Offers Retry; nothing is implied about the data.
 */
export function StateMessage({
  state,
  title,
  description,
  action,
  onRetry,
  className,
}: {
  state: ViewState
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  onRetry?: () => void
  className?: string
}) {
  const Icon = icons[state]
  const isError = state === "error"
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? undefined : "polite"}
      className={cn("flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-card px-6 py-10 text-center", className)}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground",
          isError && "bg-danger-subtle text-danger",
          state === "permission" && "bg-warning-subtle text-warning",
        )}
      >
        <Icon aria-hidden className={cn("size-5", state === "loading" && "animate-spin")} />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description && <div className="max-w-md text-sm text-muted-foreground">{description}</div>}
      {(action || onRetry) && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  )
}

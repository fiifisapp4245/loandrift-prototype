"use client"

import { useId } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { COUNT_SCOPE, formatCount } from "@/lib/format"
import { cn } from "@/lib/utils"

export type ActiveFilter = { id: string; label: string; value: string }

/**
 * Search, filter controls, removable chips for what's applied, and a result count that says
 * what it counts. Controlled: the page owns the applied state (and puts it in the URL).
 */
export function FilterToolbar({
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  filters,
  active,
  onRemove,
  onClearAll,
  resultCount,
  totalCount,
  noun,
  className,
}: {
  /** Visible label, e.g. "Search loans" */
  searchLabel: string
  searchPlaceholder?: string
  search: string
  onSearchChange: (value: string) => void
  /** Filter controls (Selects, date ranges). Each must carry its own visible label. */
  filters?: React.ReactNode
  active: ActiveFilter[]
  onRemove: (id: string) => void
  onClearAll: () => void
  /** Null while loading: no count is shown rather than a premature zero. */
  resultCount: number | null
  /** The unfiltered population, when known. */
  totalCount?: number
  /** Plural noun for the result line, e.g. "loans" */
  noun: string
  className?: string
}) {
  const searchId = useId()
  const hasAny = active.length > 0 || search.trim().length > 0
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1.5">
          <label htmlFor={searchId} className="text-xs font-medium text-muted-foreground">
            {searchLabel}
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={searchId}
              type="search"
              value={search}
              placeholder={searchPlaceholder}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        {filters}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p aria-live="polite" className="text-muted-foreground">
          {resultCount === null ? (
            <span className="sr-only">Loading {noun}</span>
          ) : hasAny ? (
            <>
              <span className="font-medium text-foreground">{formatCount(resultCount)}</span> {COUNT_SCOPE.matching.label.toLowerCase()} {noun}
              {totalCount != null && <> of {formatCount(totalCount)}</>}
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{formatCount(resultCount)}</span> {noun}
            </>
          )}
        </p>
        {active.length > 0 && (
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="Applied filters">
            {active.map((f) => (
              <li key={f.id}>
                <span className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pr-1 pl-2.5 text-xs">
                  <span className="text-muted-foreground">{f.label}:</span>
                  <span className="font-medium">{f.value}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(f.id)}
                    className="ml-0.5 flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove filter ${f.label}: ${f.value}`}
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {hasAny && (
          <Button variant="link" size="sm" className="h-7 px-1" onClick={onClearAll}>
            Clear all
          </Button>
        )}
      </div>
    </div>
  )
}

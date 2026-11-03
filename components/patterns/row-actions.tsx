"use client"

import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type RowAction = {
  label: string
  onSelect?: () => void
  href?: string
  /** If set, the action is shown disabled with this reason, instead of being hidden or enabled. */
  disabledReason?: string
  /** Consequential actions (decide, disburse, delete) are grouped apart from routine ones. */
  kind?: "routine" | "consequential" | "destructive"
}

/**
 * Every row gets one always-visible primary link (View loan) plus a menu of contextual actions.
 * Which actions are allowed comes from the source's permitted transitions, not from the badge
 * colour (F24, F46). Routine actions come first; consequential and destructive ones are separated.
 */
export function RowActions({
  primary,
  actions = [],
  recordLabel,
}: {
  primary: { label: string; href: string }
  actions?: RowAction[]
  /** Names the row for screen readers: "DEMO-LN-001" */
  recordLabel: string
}) {
  const routine = actions.filter((a) => (a.kind ?? "routine") === "routine")
  const consequential = actions.filter((a) => a.kind === "consequential" || a.kind === "destructive")

  const item = (a: RowAction) => (
    <DropdownMenuItem
      key={a.label}
      disabled={!!a.disabledReason}
      variant={a.kind === "destructive" ? "destructive" : "default"}
      onSelect={a.onSelect}
      asChild={!!a.href && !a.disabledReason}
      className="flex-col items-start gap-0"
    >
      {a.href && !a.disabledReason ? (
        <Link href={a.href}>{a.label}</Link>
      ) : (
        <span className="flex flex-col">
          <span>{a.label}</span>
          {a.disabledReason && <span className="text-xs text-muted-foreground">{a.disabledReason}</span>}
        </span>
      )}
    </DropdownMenuItem>
  )

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="sm" asChild>
        {/* Visible text starts the accessible name, so voice control ("click View loan") still works. */}
        <Link href={primary.href} aria-label={`${primary.label} ${recordLabel}`}>
          {primary.label}
        </Link>
      </Button>
      {actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${recordLabel}`}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">{recordLabel}</DropdownMenuLabel>
            {routine.length > 0 && <DropdownMenuGroup>{routine.map(item)}</DropdownMenuGroup>}
            {routine.length > 0 && consequential.length > 0 && <DropdownMenuSeparator />}
            {consequential.length > 0 && <DropdownMenuGroup>{consequential.map(item)}</DropdownMenuGroup>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

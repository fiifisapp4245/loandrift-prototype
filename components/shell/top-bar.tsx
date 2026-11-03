"use client"

import Link from "next/link"
import { Bell, Building2, ChevronDown, FlaskConical } from "lucide-react"
import { LoanDriftMark } from "@/components/shell/brand"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useUnreadCount } from "@/lib/api/workspace"
import { demoContext } from "@/lib/fixtures"


function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

/** Business and branch stay visible on every screen, so staff always know which books they're in. */
function BusinessContext() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Building2 aria-hidden className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
      {/* Two lines, so the branch never gets truncated away behind a long business name. */}
      <p className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium">
          <span className="sr-only">Business: </span>
          {demoContext.business}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          <span className="sr-only">Branch: </span>
          {demoContext.branch}
        </span>
      </p>
      <Badge variant="outline" className="hidden gap-1 text-muted-foreground md:inline-flex">
        <FlaskConical aria-hidden />
        Demo data
      </Badge>
    </div>
  )
}

function UserMenu() {
  const { user } = demoContext
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-1.5 px-1.5">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-subtle-foreground">
            {initials(user.name)}
          </span>
          <span className="sr-only">Account menu for {user.name}</span>
          <ChevronDown aria-hidden className="hidden size-3.5 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium text-foreground">{user.name}</span>
          <span className="block text-xs text-muted-foreground">{user.role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/foundations">UI foundations</Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Sign out (not in prototype)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TopBar() {
  // An unread count, not a count of unresolved work. Shared with the Notifications page.
  const unread = useUnreadCount()
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
      <SidebarTrigger className="-ml-1" />
      <Link href="/dashboard" className="md:hidden" aria-label="LoanDrift home">
        <LoanDriftMark className="size-6" />
      </Link>
      <Separator orientation="vertical" className="mx-1 hidden h-4 md:block" />
      <BusinessContext />

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/workspace/notifications" aria-label={`Notifications, ${unread} unread alerts`}>
                <Bell aria-hidden />
                {unread > 0 && (
                  <span
                    aria-hidden
                    className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                  >
                    {unread}
                  </span>
                )}
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications · {unread} unread alerts</TooltipContent>
        </Tooltip>
        <UserMenu />
      </div>
    </header>
  )
}

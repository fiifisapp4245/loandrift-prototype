"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { LoanDriftMark } from "@/components/shell/brand"
import { designNav, groupedNav, isActivePath, topNav, type NavItem } from "@/lib/nav"

// Active item: subtle purple fill, deep purple text and a medium weight, so selection never relies on colour alone.
const activeClass =
  "data-active:bg-brand-subtle data-active:text-brand-subtle-foreground data-active:font-medium [&[data-active=true]_svg]:text-brand-subtle-foreground"

/** Closes the mobile drawer after choosing a destination, so focus lands on the new page. */
function useCloseOnNavigate() {
  const { isMobile, setOpenMobile } = useSidebar()
  return () => {
    if (isMobile) setOpenMobile(false)
  }
}

/**
 * Tooltips only when the sidebar is icon-only. Elsewhere the label is already visible, and a
 * hidden-but-open tooltip would swallow the first Escape press in the mobile drawer.
 */
function useCollapsedTooltip(label: string) {
  const { state, isMobile } = useSidebar()
  return state === "collapsed" && !isMobile ? label : undefined
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActivePath(pathname, item.href)
  const close = useCloseOnNavigate()
  const tooltip = useCollapsedTooltip(item.label)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={tooltip} className={activeClass}>
        <Link href={item.href} aria-current={active ? "page" : undefined} onClick={close}>
          <item.icon aria-hidden />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * An item with sub-destinations (none today; Loan Features was removed). Expanded sidebar: an inline disclosure.
 * Collapsed to icons: the same destinations in a menu beside the icon, so none become unreachable.
 */
function NavParent({ item, pathname }: { item: NavItem & { children: NonNullable<NavItem["children"]> }; pathname: string }) {
  const { state, isMobile } = useSidebar()
  const close = useCloseOnNavigate()
  const tooltip = useCollapsedTooltip(item.label)
  const childActive = item.children.some((c) => isActivePath(pathname, c.href))
  // Opens whenever you arrive on one of its pages; you can still collapse it.
  const [open, setOpen] = useState(childActive)
  const [wasActive, setWasActive] = useState(childActive)
  if (childActive !== wasActive) {
    setWasActive(childActive)
    if (childActive) setOpen(true)
  }

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={tooltip} isActive={childActive} className={activeClass}>
              <item.icon aria-hidden />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-48">
            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {item.children.map((c) => {
              const active = isActivePath(pathname, c.href)
              return (
                <DropdownMenuItem key={c.href} asChild className={active ? "bg-brand-subtle font-medium text-brand-subtle-foreground" : undefined}>
                  <Link href={c.href} aria-current={active ? "page" : undefined}>
                    {c.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className={childActive && !open ? "font-medium text-brand-subtle-foreground" : undefined}>
            <item.icon aria-hidden />
            <span>{item.label}</span>
            <ChevronRight aria-hidden className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((c) => {
              const active = isActivePath(pathname, c.href)
              return (
                <SidebarMenuSubItem key={c.href}>
                  <SidebarMenuSubButton asChild isActive={active} className={activeClass}>
                    <Link href={c.href} aria-current={active ? "page" : undefined} onClick={close}>
                      {c.label}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      {/* One landmark for the brand link and the menu, so no sidebar content sits outside a landmark. */}
      <nav aria-label="Main" className="contents">
      <SidebarHeader>
        {/* The visible text is the accessible name ("LoanDrift by TroveSuite"), so voice control matches it. */}
        <Link
          href="/dashboard"
          className="flex h-10 items-center gap-2 rounded-md px-1.5 group-data-[collapsible=icon]:px-0"
          title="LoanDrift home"
        >
          <LoanDriftMark className="size-7 shrink-0" />
          <span className="min-w-0 leading-tight group-data-[collapsible=icon]:sr-only">
            <span className="block text-sm font-semibold text-foreground">LoanDrift</span>{" "}
            <span className="block text-xs text-muted-foreground">by TroveSuite</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {topNav.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {groupedNav.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu aria-label={group.label}>
                  {group.items.map((item) =>
                    item.children ? (
                      <NavParent key={item.href} item={{ ...item, children: item.children }} pathname={pathname} />
                    ) : (
                      <NavLink key={item.href} item={item} pathname={pathname} />
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>
      </nav>

      <SidebarFooter>
        <nav aria-label="Prototype" className="contents">
          <SidebarMenu>
            <NavLink item={designNav} pathname={pathname} />
          </SidebarMenu>
        </nav>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

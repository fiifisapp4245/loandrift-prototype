import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  Gauge,
  HandCoins,
  History,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type NavItem = { label: string; href: string; icon: LucideIcon; children?: NavChild[] }
export type NavChild = { label: string; href: string }
export type NavGroup = { label: string; items: NavItem[] }

/**
 * Sidebar structure. Dashboard, Activities and Workspace come from the redesign brief.
 * Lending items are the ones observed in the audit. The nine Loan Features queues were removed as
 * duplicates of All Loans filtered by status; their old paths redirect (lib/legacy-routes.ts).
 *
 * ASSUMPTION — check against the real app: the audit names Money and System groups and
 * mentions Savings, Investments, Accounting, Reports, Settings and Bulk Upload, but does not
 * record their paths or order. Paths below are placeholders for those destinations.
 */
export const topNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Activities", href: "/activities", icon: History },
]

export const workspaceNav: NavGroup = {
  label: "Workspace",
  items: [
    { label: "My Approvals", href: "/workspace/approvals", icon: ClipboardCheck },
    { label: "Notifications", href: "/workspace/notifications", icon: Bell },
  ],
}


export const lendingNav: NavGroup = {
  label: "Lending",
  items: [
    { label: "Clients", href: "/clients", icon: Users },
    { label: "All Loans", href: "/loans", icon: Landmark },
    { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
    { label: "Repayments", href: "/repayments", icon: HandCoins },
    { label: "Collections", href: "/collections", icon: Banknote },
    { label: "Collateral", href: "/collateral", icon: ShieldCheck },
    { label: "Groups", href: "/groups", icon: UsersRound },
    { label: "Credit Score", href: "/credit-score", icon: Gauge },
    { label: "Calendar", href: "/calendar", icon: CalendarDays },
  ],
}

export const moneyNav: NavGroup = {
  label: "Money",
  items: [
    { label: "Savings", href: "/savings", icon: PiggyBank },
    { label: "Investments", href: "/investments", icon: Wallet },
    { label: "Expenses", href: "/expenses", icon: Receipt },
    { label: "Accounting", href: "/accounting", icon: BookOpen },
    { label: "Reports", href: "/reports", icon: BarChart3 },
  ],
}

export const systemNav: NavGroup = {
  label: "System",
  items: [
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Bulk Upload", href: "/bulk-upload", icon: Upload },
  ],
}

export const groupedNav: NavGroup[] = [workspaceNav, lendingNav, moneyNav, systemNav]

export const designNav: NavItem = { label: "UI foundations", href: "/foundations", icon: Boxes }

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Every destination, flattened, for page titles and the placeholder route. */
export function allDestinations(): { label: string; href: string; group?: string }[] {
  const out: { label: string; href: string; group?: string }[] = topNav.map((i) => ({ label: i.label, href: i.href }))
  for (const g of groupedNav) {
    for (const i of g.items) {
      // A parent with sub-destinations is a disclosure, not a page.
      if (!i.children) out.push({ label: i.label, href: i.href, group: g.label })
      for (const c of i.children ?? []) out.push({ label: c.label, href: c.href, group: `${g.label} · ${i.label}` })
    }
  }
  return out
}

export function findDestination(pathname: string) {
  return allDestinations().find((d) => d.href === pathname)
}

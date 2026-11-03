import Link from "next/link"
import { LoanDriftMark } from "@/components/shell/brand"
import { Button } from "@/components/ui/button"

/**
 * ASSUMPTION: the real TroveSuite marketing navigation wasn't available. These links stand in for
 * it (product, plans, FAQs, contact, sign in) and should be swapped for the existing navigation.
 */
export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-6">
        {/* No aria-label: the visible text is the name, so voice control can say what it sees. */}
        <Link href="/products/loandrift" className="flex items-center gap-2">
          <LoanDriftMark className="size-8" />
          <span className="leading-tight">
            <span className="block text-sm font-semibold">LoanDrift</span>{" "}
            <span className="block text-xs text-muted-foreground">by TroveSuite</span>
          </span>
        </Link>
        <nav aria-label="Site" className="ml-6 hidden items-center gap-1 text-sm md:flex">
          <Link href="/products/loandrift#capabilities" className="rounded-full px-3 py-1.5 hover:bg-muted">
            Product
          </Link>
          <Link href="/products/loandrift#plans" className="rounded-full px-3 py-1.5 hover:bg-muted">
            Plans
          </Link>
          <Link href="/products/loandrift#faqs" className="rounded-full px-3 py-1.5 hover:bg-muted">
            FAQs
          </Link>
          <Link href="/contact?product=loandrift" className="rounded-full px-3 py-1.5 hover:bg-muted">
            Contact
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* Phones: the same links in a disclosure menu, so nothing is unreachable below md. */}
          <details className="group relative md:hidden">
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-full px-3 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <nav aria-label="Site" className="absolute right-0 mt-2 flex w-48 flex-col rounded-2xl border bg-popover p-2 text-sm shadow-lg">
              {[
                ["/products/loandrift#capabilities", "Product"],
                ["/products/loandrift#plans", "Plans"],
                ["/products/loandrift#faqs", "FAQs"],
                ["/contact?product=loandrift", "Contact"],
                ["/dashboard", "Sign in"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="rounded-xl px-3 py-2 hover:bg-muted">
                  {label}
                </Link>
              ))}
            </nav>
          </details>
          <Button variant="ghost" className="hidden rounded-full sm:inline-flex" asChild>
            <Link href="/dashboard">Sign in</Link>
          </Button>
          <Button className="rounded-full" asChild>
            <Link href="/contact?product=loandrift&intent=demo">Book a demo</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

export function MarketingFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:px-6">
        <p>LoanDrift is part of TroveSuite. Prototype: all figures shown are fictional.</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/products/loandrift#faqs" className="hover:text-foreground">
            FAQs
          </Link>
          <Link href="/contact?product=loandrift" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  )
}

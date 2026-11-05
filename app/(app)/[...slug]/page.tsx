import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { Button } from "@/components/ui/button"
import { allDestinations, findDestination } from "@/lib/nav"
import { plannedIncrement } from "@/lib/roadmap"

type Props = { params: Promise<{ slug: string[] }> }

/** Destinations with their own page. The placeholder never claims these. */
const BUILT = new Set(["/dashboard", "/activities", "/loans", "/clients", "/transactions", "/repayments", "/collections", "/collateral", "/groups", "/credit-score", "/calendar", "/workspace/approvals", "/workspace/notifications"])

export function generateStaticParams() {
  return allDestinations()
    .filter((d) => !BUILT.has(d.href))
    .map((d) => ({ slug: d.href.slice(1).split("/") }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: findDestination(`/${slug.join("/")}`)?.label ?? "Not found" }
}

/**
 * Every sidebar destination resolves to a real route, so no link is dead. Screens not built
 * in this increment say so plainly instead of showing invented content.
 */
export default async function PlaceholderPage({ params }: Props) {
  const { slug } = await params
  const pathname = `/${slug.join("/")}`
  const destination = findDestination(pathname)
  if (!destination) notFound()
  const planned = plannedIncrement(pathname)

  return (
    <PageBody>
      <PageHeader title={destination.label} eyebrow={destination.group} />
      <StateMessage
        state="unavailable"
        title="Not built in this prototype increment"
        description={
          <>
            <p>
              {planned ? (
                <>
                  {destination.label} is planned in <span className="font-medium text-foreground">{planned.increment}</span>.
                  {planned.blocked && <> It&rsquo;s on hold for now. {planned.blocked} Nothing here is guessed in the meantime.</>}
                </>
              ) : (
                <>{destination.label} isn&rsquo;t in any planned increment yet.</>
              )}
            </p>
            <p className="mt-2 font-mono text-xs">{pathname}</p>
          </>
        }
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/foundations">See the UI foundations</Link>
          </Button>
        }
      />
    </PageBody>
  )
}

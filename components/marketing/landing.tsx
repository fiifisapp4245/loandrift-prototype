import Link from "next/link"
import { AlertTriangle, Check, ChevronDown, ClipboardCheck, Eye, HandCoins, Minus, PhoneCall } from "lucide-react"
import { ProductPreview } from "@/components/marketing/product-preview"
import { Button } from "@/components/ui/button"
import {
  COMMERCIAL_TERMS,
  FAQS,
  FEATURES,
  HELD_CLAIMS,
  INTEGRATIONS_NOTE,
  PLANS,
  visible,
  type Entitlement,
  type Feature,
} from "@/lib/marketing-content"
import { cn } from "@/lib/utils"

const DEMO_HREF = "/contact?product=loandrift&intent=demo"

/** Owner-facing marker for unconfirmed content. Never rendered in the release preview. */
function ReviewTag({ children = "To confirm" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning">
      <AlertTriangle aria-hidden className="size-3" />
      {children}
    </span>
  )
}

function Cell({ value, release }: { value: Entitlement; release: boolean }) {
  if (value === "included")
    return (
      <span className="inline-flex items-center gap-1.5 text-success">
        <Check aria-hidden className="size-4" />
        <span className="text-sm text-foreground">Included</span>
      </span>
    )
  if (value === "not-included")
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Minus aria-hidden className="size-4" />
        <span className="text-sm">Not included</span>
      </span>
    )
  return release ? <span className="text-sm text-muted-foreground">Ask us</span> : <ReviewTag />
}

const BENEFITS = [
  {
    icon: ClipboardCheck,
    title: "Decide with the full picture",
    body: "Capture applications once, route them to the right approver, and see evidence and blockers before anyone signs off. Maker-checker is built in.",
  },
  {
    icon: HandCoins,
    title: "Know what every borrower owes",
    body: "Schedules, payments and balances follow one set of definitions, so the dashboard, the loan and the receipt always agree.",
  },
  {
    icon: PhoneCall,
    title: "Work your arrears every morning",
    body: "See who is due today and who is overdue, by age, and keep a record of every contact and promise to pay.",
  },
]

function Section({ id, eyebrow, title, intro, children, className }: { id: string; eyebrow: string; title: string; intro?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-32 py-14 sm:py-20", className)}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h2 id={`${id}-title`} className="mt-1 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {intro && <p className="mt-2 max-w-2xl text-muted-foreground">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  )
}

export function LoanDriftLanding({ release }: { release: boolean }) {
  const features = visible(FEATURES, release)
  const faqs = visible(FAQS, release)
  const highlightsFor = (plan: "basic" | "advance") =>
    features.filter((f) => f.highlight && (f.plans[plan] === "included" || (!release && f.plans[plan] === "tbc")))
  const jump = [
    ["benefits", "Benefits"],
    ["capabilities", "Capabilities"],
    ...(release ? [] : [["proof", "Proof"]]),
    ["plans", "Plans"],
    ["compare", "Compare"],
    ["faqs", "FAQs"],
  ]

  return (
    <>
      {/* Draft versus release: the owner sees every unconfirmed item labelled; the release preview hides it. */}
      <div className={cn("border-b text-sm", release ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning")}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 md:px-6">
          <Eye aria-hidden className="size-4" />
          {release ? (
            <span>Release preview: items still under review are hidden.</span>
          ) : (
            <span>
              Draft for owner review. Copy is a draft; items marked <strong>To confirm</strong> or <strong>Held</strong> aren&rsquo;t verified commercial facts.
            </span>
          )}
          <Link href={release ? "/products/loandrift" : "/products/loandrift?mode=release"} className="ml-auto font-medium underline underline-offset-4">
            {release ? "Back to draft" : "Preview as released"}
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "var(--hero-gradient)" }} />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-20 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
          <div className="text-white">
            <p className="text-sm font-medium text-white/80">LoanDrift by TroveSuite</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Run your lending business, from application to collection.</h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">
              Capture applications, route approvals, record repayments and work your collections in one place, for every branch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-11 rounded-full bg-white px-6 text-foreground hover:bg-white/90">
                <Link href={DEMO_HREF}>Book a demo</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-white/40 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
                <Link href="#plans">See plans</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/75">LoanDrift is software for lenders. It doesn&rsquo;t provide loans.</p>
          </div>
          <ProductPreview />
        </div>
      </div>

      {/* Jump links */}
      <nav aria-label="On this page" className="sticky top-16 z-20 border-b bg-background/90 backdrop-blur">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 text-sm md:px-6">
          {jump.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-full px-3 py-1.5 whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="benefits" eyebrow="Across the loan lifecycle" title="From the first application to the last repayment">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex flex-col gap-3 rounded-3xl border bg-card p-6">
              <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-brand-subtle text-brand-subtle-foreground">
                <b.icon className="size-5" />
              </span>
              <h3 className="text-lg font-semibold">{b.title}</h3>
              <p className="text-muted-foreground">{b.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="capabilities" eyebrow="What's inside" title="Everything a lending team works with every day" className="bg-background">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.id} className="flex gap-3">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">{f.label}</span>
                <span className="block text-sm text-muted-foreground">{f.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        {!release && (
          <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <ReviewTag>Integrations</ReviewTag> {INTEGRATIONS_NOTE}
          </p>
        )}
      </Section>

      {!release && (
        <Section
          id="proof"
          eyebrow="Proof"
          title="Customer proof goes here once it's approved"
          intro="No customer logos, quotes or statistics are shown until the business provides approved, real examples."
        >
          <div className="rounded-3xl border border-dashed bg-card p-6">
            <p className="mb-3 flex items-center gap-2 font-medium">
              <ReviewTag>Held</ReviewTag> Claims from the current site that can&rsquo;t be used yet
            </p>
            <ul className="flex flex-col gap-3">
              {HELD_CLAIMS.map((c) => (
                <li key={c.claim} className="text-sm">
                  <span className="font-medium">{c.claim}.</span> <span className="text-muted-foreground">{c.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section id="plans" eyebrow="Plans" title="Two plans, one product" intro="Both plans run the same LoanDrift. They differ in scale and in a few team features.">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PLANS.map((p) => (
            <li key={p.id} className={cn("flex flex-col gap-4 rounded-3xl border bg-card p-6", p.id === "advance" && "border-primary/40 ring-1 ring-primary/20")}>
              <div>
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.audience}</p>
              </div>
              <p className="text-lg font-semibold">
                {release ? "Contact us for pricing" : (
                  <span className="flex flex-wrap items-center gap-2">
                    Price <ReviewTag />
                  </span>
                )}
              </p>
              <ul className="flex flex-col gap-2 text-sm">
                {highlightsFor(p.id).map((f: Feature) => (
                  <li key={f.id} className="flex items-center gap-2">
                    {f.plans[p.id] === "included" ? <Check aria-hidden className="size-4 text-success" /> : <AlertTriangle aria-hidden className="size-4 text-warning" />}
                    <span>{f.label}</span>
                    {f.plans[p.id] === "tbc" && <ReviewTag />}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-auto w-fit rounded-full" variant={p.id === "advance" ? "default" : "outline"}>
                <Link href={`${DEMO_HREF}&plan=${p.id}`}>
                  Book a demo<span className="sr-only"> of the {p.name} plan</span>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
        {!release && (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COMMERCIAL_TERMS.map((t) => (
              <li key={t.id} className="rounded-2xl border bg-card p-4 text-sm">
                <p className="flex items-center justify-between gap-2 font-medium">
                  {t.label} <ReviewTag />
                </p>
                <p className="mt-1 text-muted-foreground">{t.note}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="compare" eyebrow="Compare" title="What each plan includes" className="bg-background">
        <div tabIndex={0} role="region" aria-label="Plan comparison, scrolls sideways" className="overflow-x-auto rounded-3xl border bg-card">
          <table className="w-full min-w-[36rem] text-left">
            <caption className="sr-only">LoanDrift plan comparison</caption>
            <thead className="border-b text-sm">
              <tr>
                <th scope="col" className="px-5 py-4 font-medium text-muted-foreground">
                  Feature
                </th>
                {PLANS.map((p) => (
                  <th key={p.id} scope="col" className="w-40 px-5 py-4 font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <th scope="row" className="px-5 py-4 align-top font-normal">
                    <span className="font-medium">{f.label}</span>
                    <span className="block text-sm text-muted-foreground">{f.detail}</span>
                    {!release && f.reviewNote && <span className="mt-1 block text-xs text-warning">{f.reviewNote}</span>}
                  </th>
                  {PLANS.map((p) => (
                    <td key={p.id} className="px-5 py-4 align-top">
                      <Cell value={f.plans[p.id]} release={release} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="faqs" eyebrow="FAQs" title="Questions lenders ask">
        <div className="flex max-w-3xl flex-col gap-2">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border bg-card px-5 py-4 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                <span className="flex flex-wrap items-center gap-2">
                  {f.q}
                  {!release && f.status === "review" && <ReviewTag>Held</ReviewTag>}
                </span>
                <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section aria-labelledby="cta-title" className="px-4 pb-20 md:px-6">
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 text-white sm:px-10">
          <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "linear-gradient(135deg, #1e0b3d, #6d28d9)" }} />
          <h2 id="cta-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            See LoanDrift with your own process in mind
          </h2>
          <p className="mt-2 max-w-xl text-white/85">Tell us how your branches work today. We&rsquo;ll contact you to arrange a walkthrough.</p>
          <Button asChild className="mt-6 h-11 rounded-full bg-white px-6 text-foreground hover:bg-white/90">
            <Link href={DEMO_HREF}>Book a demo</Link>
          </Button>
        </div>
      </section>
    </>
  )
}

"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowRight, Bell, ClipboardCheck, RefreshCw } from "lucide-react"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { CollectionRing } from "@/components/dashboard/collection-ring"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { LatestActivity } from "@/components/dashboard/latest-activity"
import { PrincipalAgeBar } from "@/components/dashboard/principal-age-bar"
import { InfoTip } from "@/components/patterns/info-tip"
import { KpiCard } from "@/components/patterns/kpi-card"
import { PageBody } from "@/components/patterns/page-header"
import { ScopedCount } from "@/components/patterns/scoped-count"
import { StateMessage } from "@/components/patterns/state-message"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchActivity, fetchSnapshot, type PeriodActivity, type PortfolioSnapshot, type Simulation } from "@/lib/api/dashboard"
import { parseRangeParams, rangeLabel, type DateRange } from "@/lib/date-range"
import { DEMO_AS_OF, DEMO_TODAY, demoContext } from "@/lib/fixtures"
import { BRANCH_TIMEZONE, formatAsOf, formatCount, formatDateTime, formatMoney, formatMoneyValue, plural } from "@/lib/format"
import { moneyNav } from "@/lib/nav"
import { useQuery } from "@/lib/use-query"
import { cn } from "@/lib/utils"

const SIMULATIONS: Simulation[] = ["slow", "error", "refresh-error"]

/** White pill buttons on the purple hero. */
const heroPill = "h-10 rounded-full border-0 bg-white px-5 text-foreground shadow-sm hover:bg-white/90"

function greeting(asOf: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: BRANCH_TIMEZONE }).format(new Date(asOf)))
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

/** A white panel on the canvas. Large radius, no shadow; the hero above carries the colour. */
function Panel({
  id,
  title,
  info,
  aside,
  className,
  children,
}: {
  id: string
  title: string
  info?: React.ReactNode
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className={cn("@container flex min-w-0 flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-1">
          <h2 id={id} className="text-base font-semibold">
            {title}
          </h2>
          {info && <InfoTip label={title}>{info}</InfoTip>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** "1 USD loan, USD 980.00 principal" with the reason it's apart behind an info tip. */
function OtherCurrencyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {children}
      <InfoTip label="other currencies">Shown apart: currencies are never added together without a conversion policy.</InfoTip>
    </p>
  )
}

// ── Needs attention: the accent card ─────────────────────────────────────

function NeedsAttention({ snapshot, loading }: { snapshot?: PortfolioSnapshot; loading: boolean }) {
  const a = snapshot?.attention
  const tile = "rounded-2xl border-0 bg-card p-4"
  return (
    <section aria-labelledby="attention" className="@container flex h-full min-w-0 flex-col gap-4 rounded-3xl bg-brand-subtle p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 id="attention" className="text-base font-semibold text-brand-subtle-foreground">
          Needs attention
        </h2>
        <span className="flex size-9 items-center justify-center rounded-full bg-card text-brand-subtle-foreground" aria-hidden>
          <ClipboardCheck className="size-4" />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 @xl:grid-cols-4">
        <ScopedCount className={tile} label="Approvals" count={a?.approvalsMine ?? 0} scope="personal" loading={loading} href="/workspace/approvals?scope=mine" />
        <ScopedCount className={tile} label="Approvals" count={a?.approvalsBranch ?? 0} scope="branch" loading={loading} href="/workspace/approvals?scope=branch" />
        <ScopedCount className={tile} label="Due today" count={a?.dueTodayAccounts ?? 0} scope="branch" loading={loading} href="/repayments?view=due-today" />
        <ScopedCount className={tile} label="Overdue" count={a?.overdueAccounts ?? 0} scope="branch" loading={loading} href="/collections" />
      </div>
      {a && a.approvalsMine === 0 && a.approvalsBranch > 0 && (
        <p className="text-sm text-brand-subtle-foreground">Nothing is waiting on you; {formatCount(a.approvalsBranch)} waiting on others.</p>
      )}
      {/* Alerts sit apart from work: reading one doesn't settle the debt or approval behind it. */}
      <div className="mt-auto flex items-center gap-1.5 rounded-full bg-card px-3 py-2 text-sm">
        <Bell aria-hidden className="size-4 text-muted-foreground" />
        {loading || !a ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <Link href="/workspace/notifications" className="font-medium text-primary underline-offset-4 hover:underline">
            {formatCount(a.unreadAlerts)} unread alerts
          </Link>
        )}
        <InfoTip label="unread alerts">Alerts are not tasks. Reading one doesn&rsquo;t resolve the approval or debt behind it.</InfoTip>
      </div>
    </section>
  )
}

// ── Portfolio today: the white snapshot card ─────────────────────────────

function Portfolio({ snapshot, loading }: { snapshot?: PortfolioSnapshot; loading: boolean }) {
  return (
    <Panel
      id="portfolio"
      title="Portfolio today"
      info="A snapshot of balances now, in cedis. It doesn't change with the period below."
      aside={snapshot && <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{formatAsOf(snapshot.asOf)}</span>}
      className="xl:col-span-8"
    >
      <div className="grid grid-cols-1 gap-5 @xl:grid-cols-3 @xl:gap-0 @xl:divide-x">
        <KpiCard
          variant="plain"
          className="@xl:pr-5"
          label="Arrears"
          value={snapshot?.arrears ?? null}
          loading={loading}
          definition="Unpaid amounts on installments that fell due before today. Amounts due today aren't arrears yet."
          href="/collections"
          hrefLabel="View collections"
        />
        <KpiCard
          variant="plain"
          className="@xl:px-5"
          label="PAR 30"
          value={snapshot?.par30 ?? null}
          loading={loading}
          definition="Portfolio at risk: principal on loans with an installment more than 30 days overdue, as a share of all principal outstanding."
          secondary={snapshot && { label: "At risk", value: snapshot.par30Numerator }}
          href="/collections?age=30-plus"
          hrefLabel="View accounts"
        />
        <KpiCard
          variant="plain"
          className="@xl:pl-5"
          label="Active borrowers"
          value={snapshot ? { text: formatCount(snapshot.borrowersWithOutstanding) } : null}
          loading={loading}
          definition="Distinct borrowers with at least one disbursed loan carrying a balance, in any currency."
          href="/clients?filter=outstanding"
          hrefLabel="View clients"
        />
      </div>
      <div className="mt-auto flex flex-col gap-4 border-t pt-5">
        {loading ? <Skeleton className="h-16 w-full rounded-xl" /> : snapshot?.principalByAge && <PrincipalAgeBar parts={snapshot.principalByAge} />}
        {snapshot?.excluded.map((x) => (
          <OtherCurrencyNote key={x.currency}>
            Not included: {plural(x.loans, `${x.currency} loan`)}, {formatMoneyValue(x.principalOutstanding)} principal.
          </OtherCurrencyNote>
        ))}
      </div>
    </Panel>
  )
}

// ── Activity in selected period ──────────────────────────────────────────

function Activity({
  activity,
  loading,
  error,
  onRetry,
  range,
  onApply,
}: {
  activity?: PeriodActivity
  loading: boolean
  error?: Error
  onRetry: () => void
  range: DateRange
  onApply: (r: DateRange) => void
}) {
  return (
    <Panel
      id="activity"
      title="Activity in selected period"
      info="Money that moved between the chosen dates (inclusive, branch time), by effective date. Amounts in cedis."
      aside={<DateRangePicker value={range} today={DEMO_TODAY} onApply={onApply} />}
      className="xl:col-span-8"
    >
      {error ? (
        <StateMessage state="error" title="Couldn't load activity for this period" description={error.message} onRetry={onRetry} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 @md:grid-cols-2 @md:gap-0 @md:divide-x">
            <KpiCard
              variant="plain"
              className="@md:pr-5"
              label="Disbursed"
              value={activity?.disbursed.total ?? null}
              loading={loading}
              definition="Cedi loans paid out to borrowers in the period."
              secondary={activity && { label: "Loans", value: formatCount(activity.disbursed.count) }}
              href={activity && `/transactions?type=disbursement&from=${activity.range.from}&to=${activity.range.to}`}
              hrefLabel="View disbursements"
            />
            <KpiCard
              variant="plain"
              className="@md:pl-5"
              label="Repayments received"
              value={activity?.repaid.total ?? null}
              loading={loading}
              definition="Cedi receipts recorded in the period, by payment date. Includes late payments on older installments."
              secondary={activity && { label: "Receipts", value: formatCount(activity.repaid.count) }}
              href={activity && `/repayments?from=${activity.range.from}&to=${activity.range.to}`}
              hrefLabel="View receipts"
            />
          </div>

          {loading && <Skeleton className="h-56 w-full rounded-2xl" />}
          {activity?.noActivity && (
            <StateMessage
              state="empty"
              className="border-0 bg-muted/60"
              title="No disbursements, repayments or fees in this period"
              description={
                activity.collection.installmentsDue > 0
                  ? `${plural(activity.collection.installmentsDue, "installment")} still fell due. See the collection rate.`
                  : "Nothing fell due either."
              }
            />
          )}
          {activity && !activity.noActivity && <ActivityChart activity={activity} bare />}

          {activity?.otherCurrencies.map((o) => (
            <OtherCurrencyNote key={o.currency}>
              Not included: {formatMoney(o.disbursed)} disbursed, {formatMoney(o.repaid)} received.
            </OtherCurrencyNote>
          ))}
        </>
      )}
    </Panel>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export function DashboardView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { range, invalidUrl } = parseRangeParams({ from: params.get("from") ?? undefined, to: params.get("to") ?? undefined }, DEMO_TODAY)
  const demo = params.get("demo")
  const sim: Simulation = SIMULATIONS.includes(demo as Simulation) ? (demo as Simulation) : "none"

  const snapshot = useQuery(`snapshot:${sim}`, (attempt) => fetchSnapshot(sim, attempt))
  const activity = useQuery(`activity:${range.from}:${range.to}:${sim}`, (attempt) => fetchActivity(range, sim, attempt))

  function applyRange(next: DateRange) {
    const q = new URLSearchParams(params.toString())
    q.set("from", next.from)
    q.set("to", next.to)
    router.replace(`${pathname}?${q.toString()}`, { scroll: false })
  }

  const refreshing = snapshot.refreshing || activity.refreshing
  const staleError = snapshot.staleError ?? activity.staleError
  const refresh = () => {
    snapshot.refetch()
    activity.refetch()
  }
  const firstName = demoContext.user.name.split(" ")[0]

  return (
    <div className="relative isolate">
      {/* The brand colour lives in the hero: deep plum to violet, fading into the canvas behind the cards. */}
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[38rem] sm:h-[36rem]" style={{ background: "var(--hero-gradient)" }} />

      <PageBody className="gap-5">
        <div className="grid gap-6 pt-4 pb-6 sm:pt-8 sm:pb-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:items-end">
          <div className="text-white">
            <p className="text-sm text-white/75">
              {demoContext.business} · {demoContext.branch}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
              <span className="sr-only">Dashboard: </span>
              {greeting(DEMO_AS_OF)}, {firstName}
            </h1>
            <p className="mt-2 text-sm text-white/75 sm:text-base">Here&rsquo;s what needs you, and how the book stands today.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button className={heroPill} onClick={refresh} disabled={refreshing || snapshot.loading} aria-busy={refreshing || undefined}>
                <RefreshCw aria-hidden className={refreshing ? "animate-spin" : undefined} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
              <Button className={heroPill} asChild>
                <Link href="/workspace/approvals?scope=branch">
                  <ClipboardCheck aria-hidden />
                  Approvals
                </Link>
              </Button>
            </div>
          </div>

          {!snapshot.error && (
            <section aria-labelledby="headline">
              <h2 id="headline" className="sr-only">
                Portfolio headline
              </h2>
              <KpiCard
                variant="hero"
                label="Principal outstanding"
                value={snapshot.data?.principalOutstanding ?? null}
                loading={snapshot.loading}
                definition="Principal still owed on disbursed cedi loans. Excludes interest, fees and penalties."
                basis={snapshot.data && formatAsOf(snapshot.data.asOf)}
                secondary={snapshot.data && { label: "With interest", value: snapshot.data.balanceInclInterest }}
                href="/loans?status=active"
                hrefLabel="View loans"
              />
            </section>
          )}
        </div>

        {staleError && (
          <Alert role="alert" className="rounded-2xl border-warning/40 bg-warning-subtle">
            <AlertTriangle aria-hidden className="text-warning" />
            <AlertTitle>Couldn&rsquo;t refresh</AlertTitle>
            <AlertDescription>
              <p>Showing figures from {snapshot.data ? formatDateTime(snapshot.data.asOf) : "the last load"}; they may be out of date.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={refresh}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {invalidUrl && (
          <Alert className="rounded-2xl">
            <AlertTriangle aria-hidden />
            <AlertTitle>The link&rsquo;s date range wasn&rsquo;t valid</AlertTitle>
            <AlertDescription>Showing {rangeLabel(range, DEMO_TODAY)} instead.</AlertDescription>
          </Alert>
        )}

        {snapshot.error ? (
          <StateMessage
            state="error"
            className="rounded-3xl"
            title="Couldn't load the portfolio snapshot"
            description={snapshot.error.message}
            onRetry={snapshot.refetch}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <Portfolio snapshot={snapshot.data} loading={snapshot.loading} />
            <div className="xl:col-span-4">
              <NeedsAttention snapshot={snapshot.data} loading={snapshot.loading} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <Activity
            activity={activity.data}
            loading={activity.loading}
            error={activity.error}
            onRetry={activity.refetch}
            range={range}
            onApply={applyRange}
          />
          <div className="flex flex-col gap-5 xl:col-span-4">
            {/* flex-1: the ring card grows so this column matches the Activity card's height. */}
            {!activity.error && <CollectionRing activity={activity.data} loading={activity.loading} className="flex-1" />}
            {!activity.error && (
              <KpiCard
                label="Fees charged"
                value={activity.data?.feesCharged.total ?? null}
                loading={activity.loading}
                definition="Fees added to cedi loans in the period. Amounts owed by borrowers, not cash received."
                secondary={activity.data && { label: "Fees", value: formatCount(activity.data.feesCharged.count) }}
                className="rounded-3xl"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <LatestActivity activity={activity.data} loading={activity.loading} />
          </div>
          <Panel id="more" title="Other modules" className="xl:col-span-4">
            <ul className="flex flex-col gap-1">
              {moneyNav.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium hover:bg-muted/60">
                    <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-muted">
                      <item.icon className="size-4 text-muted-foreground" />
                    </span>
                    {item.label}
                    <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </PageBody>
    </div>
  )
}

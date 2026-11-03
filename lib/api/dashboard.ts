/**
 * Dashboard service. In the real app these are API calls; here they compute from fictional
 * fixtures with the same shapes, so the UI is built against a contract rather than a mockup.
 *
 * All money arithmetic is in integer minor units. Only GHS is totalled; loans and events in other
 * currencies are reported separately because there is no verified conversion policy.
 */
import { addDays, endOfMonth, endOfWeek, format, max as maxDate, min as minDate, parseISO, startOfMonth, startOfWeek } from "date-fns"
import { daysInRange, type DateRange } from "@/lib/date-range"
import {
  DEMO_AS_OF,
  DEMO_TODAY,
  demoContext,
  demoEvents,
  demoInstallments,
  demoLoans,
  type DemoEvent,
  type DemoEventKind,
} from "@/lib/fixtures"
import { approvalCounts, unreadCount } from "@/lib/api/workspace"
import { OUTSTANDING_STATUSES, loanPosition } from "@/lib/domain/loan-position"
import { formatDate, ratio, sumMoney, type MoneySum, type Ratio } from "@/lib/format"
import { isUnavailable, type CurrencyCode, type Money, type MoneyValue } from "@/lib/types"

export const PRIMARY_CURRENCY: CurrencyCode = "GHS"

/** Lifecycle stages that carry a balance. */

const money = (minor: number, currency: CurrencyCode = PRIMARY_CURRENCY): Money => ({ minor, currency })

function totalOf(sum: MoneySum): MoneyValue {
  if (sum.kind === "total") return sum.money
  if (sum.kind === "mixed") return { unavailable: true, reason: `Mixes ${sum.currencies.join(" and ")}.` }
  return { unavailable: true, reason: sum.reasons.join(" ") }
}

// ── Portfolio snapshot ───────────────────────────────────────────────────

export type PortfolioSnapshot = {
  asOf: string
  currency: CurrencyCode
  /** Principal only. Excludes interest, fees and penalties. */
  principalOutstanding: MoneyValue
  /** Everything still owed, including interest. */
  balanceInclInterest: MoneyValue
  /** Unpaid amounts on installments that fell due before today. */
  arrears: MoneyValue
  /** Principal outstanding on loans with an installment more than 30 days overdue ÷ principal outstanding. */
  par30: Ratio
  par30Numerator: MoneyValue
  /**
   * Principal outstanding split by each loan's oldest overdue installment. The parts add up to
   * principalOutstanding, so the bar reconciles with the headline. Unavailable if that is.
   */
  principalByAge: { id: "current" | "1-30" | "30-plus"; label: string; amount: Money }[] | null
  /** Distinct borrowers with at least one loan carrying a balance, in any currency. */
  borrowersWithOutstanding: number
  /** Loans left out of the money figures because they are in another currency. */
  excluded: { currency: CurrencyCode; loans: number; principalOutstanding: MoneyValue }[]
  attention: {
    approvalsMine: number
    approvalsBranch: number
    dueTodayAccounts: number
    overdueAccounts: number
    unreadAlerts: number
  }
}

function overdueDays(dueDate: string, today: string) {
  return Math.round((parseISO(today).getTime() - parseISO(dueDate).getTime()) / 86_400_000)
}

export function computeSnapshot(today = DEMO_TODAY, asOf = DEMO_AS_OF): PortfolioSnapshot {
  const outstanding = demoLoans.filter((l) => OUTSTANDING_STATUSES.has(l.status))
  const inPrimary = outstanding.filter((l) => !isUnavailable(l.principal) && l.principal.currency === PRIMARY_CURRENCY)
  const primaryRefs = new Set(inPrimary.map((l) => l.reference))
  const outstandingRefs = new Set(outstanding.map((l) => l.reference))

  const unpaid = demoInstallments.filter((i) => outstandingRefs.has(i.loanRef) && i.paid.minor < i.due.minor)
  const pastDue = unpaid.filter((i) => i.dueDate < today)

  // Arrears and due-today come from each loan's canonical position, the same figures the loan
  // record and repayment overview show (Prompt 6).
  const positions = outstanding.map((l) => loanPosition(l, today)!)
  const minorOf = (v: MoneyValue) => (isUnavailable(v) ? 0 : v.minor)
  const arrearsMinor = positions.filter((p) => primaryRefs.has(p.ref)).reduce((t, p) => t + minorOf(p.pastDue), 0)

  const par30Refs = new Set(pastDue.filter((i) => overdueDays(i.dueDate, today) > 30).map((i) => i.loanRef))
  const principalOutstanding = totalOf(sumMoney(inPrimary.map((l) => l.principalOutstanding)))
  const par30Numerator = totalOf(sumMoney(inPrimary.filter((l) => par30Refs.has(l.reference)).map((l) => l.principalOutstanding)))
  const par30 =
    isUnavailable(principalOutstanding) || isUnavailable(par30Numerator)
      ? { unavailable: true as const, reason: "Principal outstanding is unavailable for at least one loan." }
      : ratio(par30Numerator.minor, principalOutstanding.minor, "No principal is outstanding, so there is no portfolio at risk.")

  const oldestOverdue = (ref: string) =>
    Math.max(0, ...pastDue.filter((i) => i.loanRef === ref).map((i) => overdueDays(i.dueDate, today)))
  const ageBucket = (ref: string) => {
    const d = oldestOverdue(ref)
    return d === 0 ? "current" : d <= 30 ? "1-30" : "30-plus"
  }
  const principalByAge = inPrimary.some((l) => isUnavailable(l.principalOutstanding))
    ? null
    : (
        [
          { id: "current", label: "Current" },
          { id: "1-30", label: "1–30 days" },
          { id: "30-plus", label: "30+ days" },
        ] as const
      ).map((b) => ({
        ...b,
        amount: money(
          inPrimary
            .filter((l) => ageBucket(l.reference) === b.id)
            .reduce((t, l) => t + (l.principalOutstanding as Money).minor, 0),
        ),
      }))

  const others = new Map<CurrencyCode, MoneyValue[]>()
  for (const l of outstanding) {
    if (primaryRefs.has(l.reference) || isUnavailable(l.principal)) continue
    others.set(l.principal.currency, [...(others.get(l.principal.currency) ?? []), l.principalOutstanding])
  }

  const approvals = approvalCounts(demoContext.user.id)
  return {
    asOf,
    currency: PRIMARY_CURRENCY,
    principalOutstanding,
    balanceInclInterest: totalOf(sumMoney(inPrimary.map((l) => l.balanceInclInterest))),
    arrears: money(arrearsMinor),
    par30,
    par30Numerator,
    principalByAge,
    borrowersWithOutstanding: new Set(outstanding.map((l) => l.borrower.id)).size,
    excluded: [...others].map(([currency, values]) => ({
      currency,
      loans: values.length,
      principalOutstanding: totalOf(sumMoney(values, currency)),
    })),
    attention: {
      approvalsMine: approvals.mine,
      approvalsBranch: approvals.branch,
      dueTodayAccounts: positions.filter((p) => minorOf(p.dueToday) > 0).length,
      overdueAccounts: positions.filter((p) => minorOf(p.pastDue) > 0).length,
      unreadAlerts: unreadCount(),
    },
  }
}

// ── Period activity ──────────────────────────────────────────────────────

export type ActivityTotal = { total: Money; count: number }

export type ActivityBucket = { label: string; from: string; to: string; disbursed: Money; repaid: Money }

export type PeriodActivity = {
  range: DateRange
  currency: CurrencyCode
  disbursed: ActivityTotal
  repaid: ActivityTotal
  /** Fees charged to loans. An amount owed, not cash received. */
  feesCharged: ActivityTotal
  /** Installments that fell due in the period (up to today) and how much of them has been paid. */
  collection: { installmentsDue: number; due: Money; collected: Money; dueUnpaid: Money; rate: Ratio }
  /** Activity in other currencies, reported but never added to the GHS totals. */
  otherCurrencies: { currency: CurrencyCode; disbursed: Money; repaid: Money; events: number }[]
  bucketSize: "day" | "week" | "month"
  buckets: ActivityBucket[]
  /** True when no event of any kind (in any currency) falls in the period. */
  noActivity: boolean
  /** The latest events in the period, newest first, each in its own currency. */
  recent: (DemoEvent & { borrower: string })[]
}

/** "4 Oct", "5–11 Oct", "26 Oct–1 Nov" */
function spanLabel(from: Date, to: Date) {
  if (format(from, "yyyy-MM-dd") === format(to, "yyyy-MM-dd")) return format(from, "d MMM")
  if (format(from, "MM") === format(to, "MM")) return `${format(from, "d")}–${format(to, "d MMM")}`
  return `${format(from, "d MMM")}–${format(to, "d MMM")}`
}

function bucketsFor(range: DateRange): { size: PeriodActivity["bucketSize"]; spans: { from: string; to: string; label: string }[] } {
  const days = daysInRange(range)
  const start = parseISO(range.from)
  const end = parseISO(range.to)
  const iso = (d: Date) => format(d, "yyyy-MM-dd")
  const spans: { from: string; to: string; label: string }[] = []
  if (days <= 14) {
    for (let d = start; d <= end; d = addDays(d, 1)) spans.push({ from: iso(d), to: iso(d), label: format(d, "d MMM") })
    return { size: "day", spans }
  }
  if (days <= 92) {
    for (let d = startOfWeek(start, { weekStartsOn: 1 }); d <= end; d = addDays(d, 7)) {
      const from = maxDate([d, start])
      const to = minDate([endOfWeek(d, { weekStartsOn: 1 }), end])
      spans.push({ from: iso(from), to: iso(to), label: spanLabel(from, to) })
    }
    return { size: "week", spans }
  }
  for (let d = startOfMonth(start); d <= end; d = startOfMonth(addDays(endOfMonth(d), 1))) {
    const from = maxDate([d, start])
    const to = minDate([endOfMonth(d), end])
    spans.push({ from: iso(from), to: iso(to), label: format(from, "MMM yyyy") })
  }
  return { size: "month", spans }
}

export function computeActivity(range: DateRange, today = DEMO_TODAY): PeriodActivity {
  const inRange = demoEvents.filter((e) => e.on >= range.from && e.on <= range.to)
  const primary = inRange.filter((e) => e.amount.currency === PRIMARY_CURRENCY)
  const tally = (kind: DemoEventKind): ActivityTotal => {
    const events = primary.filter((e) => e.kind === kind)
    return { total: money(events.reduce((t, e) => t + e.amount.minor, 0)), count: events.length }
  }

  const others = new Map<CurrencyCode, { disbursed: number; repaid: number; events: number }>()
  for (const e of inRange) {
    if (e.amount.currency === PRIMARY_CURRENCY) continue
    const o = others.get(e.amount.currency) ?? { disbursed: 0, repaid: 0, events: 0 }
    if (e.kind === "disbursement") o.disbursed += e.amount.minor
    if (e.kind === "repayment") o.repaid += e.amount.minor
    o.events += 1
    others.set(e.amount.currency, o)
  }

  // RULE TO CONFIRM: installments due today aren't late until the day ends, so the rate counts
  // installments due up to yesterday. Due-today work is shown under "Needs attention" instead.
  const yesterday = format(addDays(parseISO(today), -1), "yyyy-MM-dd")
  const dueThrough = range.to < yesterday ? range.to : yesterday
  const dueLines = demoInstallments.filter(
    (i) => i.due.currency === PRIMARY_CURRENCY && i.dueDate >= range.from && i.dueDate <= dueThrough,
  )
  const due = dueLines.reduce((t, i) => t + i.due.minor, 0)
  const collected = dueLines.reduce((t, i) => t + i.paid.minor, 0)

  const { size, spans } = bucketsFor(range)
  const buckets = spans.map((s) => {
    const within = primary.filter((e) => e.on >= s.from && e.on <= s.to)
    const sum = (kind: DemoEventKind) => money(within.filter((e) => e.kind === kind).reduce((t, e) => t + e.amount.minor, 0))
    return { ...s, disbursed: sum("disbursement"), repaid: sum("repayment") }
  })

  return {
    range,
    currency: PRIMARY_CURRENCY,
    disbursed: tally("disbursement"),
    repaid: tally("repayment"),
    feesCharged: tally("fee_charged"),
    collection: {
      installmentsDue: dueLines.length,
      due: money(due),
      collected: money(collected),
      dueUnpaid: money(due - collected),
      rate: ratio(
        collected,
        due,
        dueLines.length === 0
          ? dueThrough < range.from
            ? "Installments due today are counted once the day ends."
            : `No installments fell due between ${formatDate(range.from)} and ${formatDate(dueThrough)}.`
          : "The installments due in this period total zero.",
      ),
    },
    otherCurrencies: [...others].map(([currency, o]) => ({
      currency,
      disbursed: money(o.disbursed, currency),
      repaid: money(o.repaid, currency),
      events: o.events,
    })),
    bucketSize: size,
    buckets,
    noActivity: inRange.length === 0,
    recent: [...inRange]
      .sort((a, b) => b.on.localeCompare(a.on) || b.id.localeCompare(a.id))
      .slice(0, 5)
      .map((e) => ({ ...e, borrower: demoLoans.find((l) => l.reference === e.loanRef)?.borrower.name ?? "Unknown borrower" })),
  }
}

// ── Simulated transport ──────────────────────────────────────────────────

/**
 * Prototype-only failure modes, chosen with ?demo= on the Dashboard URL:
 * - slow: every request takes 2.5s (shows loading skeletons)
 * - error: every request fails (shows the failed-request state)
 * - refresh-error: the first load works, refreshes fail (shows stale data with a warning)
 */
export type Simulation = "none" | "slow" | "error" | "refresh-error"

export class DashboardRequestError extends Error {}

async function respond<T>(compute: () => T, sim: Simulation, attempt: number): Promise<T> {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 350))
  if (sim === "error" || (sim === "refresh-error" && attempt > 0)) {
    throw new DashboardRequestError("The server didn't respond. Nothing was changed.")
  }
  return compute()
}

export function fetchSnapshot(sim: Simulation = "none", attempt = 0) {
  return respond(() => computeSnapshot(), sim, attempt)
}

export function fetchActivity(range: DateRange, sim: Simulation = "none", attempt = 0) {
  return respond(() => computeActivity(range), sim, attempt)
}

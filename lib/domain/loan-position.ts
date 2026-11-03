/**
 * THE financial presentation contract for one loan (Prompt 6). Dashboard, loan record, repayment
 * overview and payment preview all read these figures from here, so they can't disagree.
 *
 * Every figure is computed in integer minor units from the repayment schedule, or taken from a
 * named source field. Nothing is guessed: when a rule isn't established (fees, penalties, early
 * settlement) or two sources disagree, the figure is Unavailable with the reason.
 * Definitions and open questions: FINANCIAL-CONTRACT.md.
 */
import { DEMO_TODAY, demoInstallments, demoLoans, type DemoInstallment, type DemoLoan } from "@/lib/fixtures"
import { formatMoney } from "@/lib/format"
import { isUnavailable, unavailable, type Money, type MoneyValue, type Unavailable } from "@/lib/types"

export type ScheduleLine = { number: number; dueDate: string; due: Money; paid: Money }

export type LoanPosition = {
  ref: string
  currency: string
  asOf: string
  /** LIVE: sum of scheduled installments (principal + interest). */
  totalPayable: MoneyValue
  /** LIVE: allocated to installments so far. */
  paid: MoneyValue
  /** LIVE: total payable − paid. Cross-checked against the loan record's balance field. */
  totalBalance: MoneyValue
  /** SOURCE FIELD: principal still owed, as the loan record states it. */
  principalOutstanding: MoneyValue
  /** LIVE: the scheduled installment amount when all installments are equal. */
  regularInstallment: MoneyValue
  /** LIVE: unpaid on installments due before the as-of date. */
  pastDue: MoneyValue
  /** LIVE: unpaid on installments due on the as-of date. */
  dueToday: MoneyValue
  /** LIVE: past due + due today. */
  toBringCurrent: MoneyValue
  /** LIVE: the first unpaid installment due AFTER the as-of date (today's is "due today", not "next"). */
  nextScheduled: { dueDate: string; amount: Money } | null
  /** LIVE: the earliest unpaid installment due on or before the as-of date. */
  oldestUnpaid: { dueDate: string; daysOverdue: number } | null
  /** NOT IN SOURCE: fee and penalty balances. */
  feesAndPenalties: Unavailable
  /** RULE NOT ESTABLISHED: early settlement amount. */
  settlement: Unavailable
  /** Source disagreements found while building this position. */
  conflicts: string[]
}

const RULES = {
  fees: unavailable("Fee and penalty balances aren't in the source, and how they're treated isn't established."),
  settlement: unavailable("The early-settlement rule (interest rebate, fees) isn't established, so no settlement amount is quoted."),
}

const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const m = (minor: number, currency: string): Money => ({ minor, currency })

function noScheduleReason(status: string) {
  if (status === "registered" || status === "captured") return "Terms aren't captured yet, so there is no schedule."
  if (status === "approved") return "Not disbursed yet, so there is no schedule."
  if (status === "rejected") return "Rejected: never disbursed."
  return "The source record has no repayment schedule."
}

/** The position implied by a schedule. Also used to show the result of a proposed payment. */
export function positionFromSchedule(
  rows: ScheduleLine[],
  opts: { ref: string; asOf?: string; principalOutstanding?: MoneyValue; sourceBalance?: MoneyValue },
): LoanPosition {
  const asOf = opts.asOf ?? DEMO_TODAY
  const principalOutstanding = opts.principalOutstanding ?? unavailable("Not supplied.")
  if (rows.length === 0) {
    const none = unavailable("No repayment schedule.")
    return {
      ref: opts.ref,
      currency: isUnavailable(principalOutstanding) ? "GHS" : principalOutstanding.currency,
      asOf,
      totalPayable: none,
      paid: none,
      totalBalance: none,
      principalOutstanding,
      regularInstallment: none,
      pastDue: none,
      dueToday: none,
      toBringCurrent: none,
      nextScheduled: null,
      oldestUnpaid: null,
      feesAndPenalties: RULES.fees,
      settlement: RULES.settlement,
      conflicts: [],
    }
  }
  const currency = rows[0]!.due.currency
  const left = (r: ScheduleLine) => r.due.minor - r.paid.minor
  const total = rows.reduce((t, r) => t + r.due.minor, 0)
  const paid = rows.reduce((t, r) => t + r.paid.minor, 0)
  const pastDue = rows.filter((r) => r.dueDate < asOf).reduce((t, r) => t + left(r), 0)
  const dueToday = rows.filter((r) => r.dueDate === asOf).reduce((t, r) => t + left(r), 0)
  const next = rows.find((r) => r.dueDate > asOf && left(r) > 0)
  const oldest = rows.find((r) => r.dueDate <= asOf && left(r) > 0)
  const amounts = new Set(rows.map((r) => r.due.minor))

  const conflicts: string[] = []
  let totalBalance: MoneyValue = m(total - paid, currency)
  const src = opts.sourceBalance
  if (src && !isUnavailable(src) && (src.currency !== currency || src.minor !== total - paid)) {
    const msg = `Sources disagree: the schedule gives ${formatMoney(m(total - paid, currency))}, the loan record gives ${formatMoney(src)}. Not shown until resolved.`
    conflicts.push(msg)
    totalBalance = unavailable(msg)
  }

  return {
    ref: opts.ref,
    currency,
    asOf,
    totalPayable: m(total, currency),
    paid: m(paid, currency),
    totalBalance,
    principalOutstanding,
    regularInstallment: amounts.size === 1 ? m(rows[0]!.due.minor, currency) : unavailable("Installments vary; see the schedule."),
    pastDue: m(pastDue, currency),
    dueToday: m(dueToday, currency),
    toBringCurrent: m(pastDue + dueToday, currency),
    nextScheduled: next ? { dueDate: next.dueDate, amount: m(left(next), currency) } : null,
    oldestUnpaid: oldest ? { dueDate: oldest.dueDate, daysOverdue: Math.max(0, days(oldest.dueDate, asOf)) } : null,
    feesAndPenalties: RULES.fees,
    settlement: RULES.settlement,
    conflicts,
  }
}

/** Loans whose installments are still collectable: what due work, arrears and the calendar count. */
export const OUTSTANDING_STATUSES = new Set<string>(["disbursed", "active", "defaulted"])

export function scheduleFor(ref: string): DemoInstallment[] {
  return demoInstallments.filter((i) => i.loanRef === ref).sort((a, b) => a.number - b.number)
}

/** The canonical position of a loan as of a date. */
export function loanPosition(loanOrRef: DemoLoan | string, asOf = DEMO_TODAY): LoanPosition | null {
  const loan = typeof loanOrRef === "string" ? demoLoans.find((l) => l.reference === loanOrRef) : loanOrRef
  if (!loan) return null
  const rows = scheduleFor(loan.reference)
  const position = positionFromSchedule(rows, {
    ref: loan.reference,
    asOf,
    principalOutstanding: loan.principalOutstanding,
    sourceBalance: loan.balanceInclInterest,
  })
  if (rows.length === 0) {
    const none = unavailable(noScheduleReason(loan.status))
    return { ...position, totalPayable: none, paid: none, totalBalance: none, regularInstallment: none, pastDue: none, dueToday: none, toBringCurrent: none }
  }
  return position
}

// ── Payment allocation (preview only) ────────────────────────────────────

export type AllocationLine = { number: number; dueDate: string; applied: Money; remaining: Money; status: "past due" | "due today" | "upcoming" }

export type PaymentPreview = {
  amount: Money
  lines: AllocationLine[]
  /** Amount not allocated to any installment. Always zero here: over-payments are refused. */
  unallocated: Money
  before: LoanPosition
  after: LoanPosition
}

/**
 * ASSUMED RULE (to confirm): a payment pays the oldest unpaid installment first, then the next.
 * How each installment splits between interest and principal isn't established, so the preview
 * doesn't show one.
 */
export function previewPayment(ref: string, amountMinor: number, asOf = DEMO_TODAY): PaymentPreview | null {
  const loan = demoLoans.find((l) => l.reference === ref)
  const before = loan && loanPosition(loan, asOf)
  if (!loan || !before || isUnavailable(before.totalPayable)) return null
  const rows: ScheduleLine[] = scheduleFor(ref).map((r) => ({ ...r }))
  const currency = before.currency
  let remaining = amountMinor
  const lines: AllocationLine[] = []
  for (const r of rows) {
    const owed = r.due.minor - r.paid.minor
    if (owed <= 0 || remaining <= 0) continue
    const applied = Math.min(owed, remaining)
    remaining -= applied
    r.paid = m(r.paid.minor + applied, currency)
    lines.push({
      number: r.number,
      dueDate: r.dueDate,
      applied: m(applied, currency),
      remaining: m(owed - applied, currency),
      status: r.dueDate < asOf ? "past due" : r.dueDate === asOf ? "due today" : "upcoming",
    })
  }
  // The proposed payment reduces the balance; a matching record update is assumed, so no conflict.
  const after = positionFromSchedule(rows, { ref, asOf, principalOutstanding: unavailable("Principal and interest split isn't established.") })
  return { amount: m(amountMinor, currency), lines, unallocated: m(remaining, currency), before, after }
}

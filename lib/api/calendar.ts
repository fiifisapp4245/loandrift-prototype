/**
 * Calendar (R3, F71). Two separate sources, never merged:
 * - Scheduled obligations come from the canonical schedule (scheduleFor), the same rows the
 *   dashboard's due work and each loan's schedule use, judged against the same as-of date.
 * - Receipts come from the ledger (repayments only: cash in).
 * So a day with no receipts can still have amounts due. The live audit's empty November calendar
 * can't be explained from UI evidence alone; this shows what the canonical schedule says.
 */
import { addDays, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns"
import { demoTransactions } from "@/lib/api/transactions"
import { OUTSTANDING_STATUSES, scheduleFor } from "@/lib/domain/loan-position"
import { DEMO_TODAY, demoLoans } from "@/lib/fixtures"
import type { Money } from "@/lib/types"

export type InstallmentState = "paid" | "due_today" | "missed" | "part_paid_past_due" | "upcoming" | "not_collected"

export const INSTALLMENT_STATE: Record<InstallmentState, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  paid: { label: "Paid", tone: "success" },
  due_today: { label: "Due today", tone: "warning" },
  missed: { label: "Missed", tone: "danger" },
  part_paid_past_due: { label: "Part paid, past due", tone: "danger" },
  upcoming: { label: "Upcoming", tone: "info" },
  not_collected: { label: "Not collected (loan closed)", tone: "neutral" },
}

export type ScheduledItem = {
  kind: "scheduled"
  loanRef: string
  borrower: string
  number: number
  of: number
  dueDate: string
  due: Money
  paid: Money
  remaining: Money
  state: InstallmentState
}

export type ReceiptItem = { kind: "receipt"; id: string; ref: string; loanRef: string; borrower: string; on: string; amount: Money; method: string | null }

function stateOf(dueDate: string, due: number, paid: number, collectable: boolean, asOf: string): InstallmentState {
  if (paid >= due) return "paid"
  if (!collectable) return "not_collected"
  if (dueDate === asOf) return "due_today"
  if (dueDate > asOf) return "upcoming"
  return paid > 0 ? "part_paid_past_due" : "missed"
}

export function scheduledItems(asOf = DEMO_TODAY): ScheduledItem[] {
  return demoLoans.flatMap((loan) => {
    const rows = scheduleFor(loan.reference)
    // Outstanding loans are collectable. A completed loan is fully paid anyway; a written-off or
    // closed one still shows its schedule, but unpaid rows read "not collected", never "missed".
    const collectable = OUTSTANDING_STATUSES.has(loan.status)
    return rows.map((r) => ({
      kind: "scheduled" as const,
      loanRef: loan.reference,
      borrower: loan.borrower.name,
      number: r.number,
      of: rows.length,
      dueDate: r.dueDate,
      due: r.due,
      paid: r.paid,
      remaining: { minor: Math.max(0, r.due.minor - r.paid.minor), currency: r.due.currency },
      state: stateOf(r.dueDate, r.due.minor, r.paid.minor, collectable, asOf),
    }))
  })
}

export function receiptItems(): ReceiptItem[] {
  return demoTransactions
    .filter((t) => t.direction === "cash_in")
    .map((t) => ({ kind: "receipt" as const, id: t.id, ref: t.ref, loanRef: t.loanRef, borrower: t.borrower, on: t.effectiveOn, amount: t.amount, method: t.method }))
}

export type DaySummary = {
  date: string
  scheduled: ScheduledItem[]
  receipts: ReceiptItem[]
  /** Installments with something still owed and collectable, due on or before this day's date. */
  dueCount: number
  missedCount: number
}

export type CalendarView = "month" | "week"

/** The visible days for a view: whole Monday-to-Sunday weeks covering the month, or one week. */
export function visibleRange(view: CalendarView, anchor: string) {
  const d = parseISO(anchor)
  const start = view === "month" ? startOfWeek(startOfMonth(d), { weekStartsOn: 1 }) : startOfWeek(d, { weekStartsOn: 1 })
  const end = view === "month" ? endOfWeek(endOfMonth(d), { weekStartsOn: 1 }) : endOfWeek(d, { weekStartsOn: 1 })
  const days: string[] = []
  for (let x = start; x <= end; x = addDays(x, 1)) days.push(format(x, "yyyy-MM-dd"))
  return days
}

export function calendarDays(days: string[], asOf = DEMO_TODAY): DaySummary[] {
  const scheduled = scheduledItems(asOf)
  const receipts = receiptItems()
  return days.map((date) => {
    const s = scheduled.filter((x) => x.dueDate === date)
    return {
      date,
      scheduled: s,
      receipts: receipts.filter((r) => r.on === date),
      dueCount: s.filter((x) => x.state === "due_today" || x.state === "upcoming").length,
      missedCount: s.filter((x) => x.state === "missed" || x.state === "part_paid_past_due").length,
    }
  })
}

export function shiftAnchor(view: CalendarView, anchor: string, step: -1 | 1) {
  const d = parseISO(anchor)
  if (view === "week") return format(addDays(d, 7 * step), "yyyy-MM-dd")
  // Move to the first of the neighbouring month, so the 31st never skips a month.
  const first = new Date(d.getFullYear(), d.getMonth() + step, 1)
  return format(first, "yyyy-MM-dd")
}

export function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime()) && format(parseISO(s), "yyyy-MM-dd") === s
}

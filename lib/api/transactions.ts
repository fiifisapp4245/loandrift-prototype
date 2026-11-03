/**
 * Transactions ledger (Phase 2 B2-04). Built from the same fictional events and receipts the
 * dashboard and repayment screens use, so every screen tells one story. Filtering, totals and
 * pagination run over the whole ledger (as a real API would), never over the visible page.
 * Read-only: nothing here posts or reverses anything.
 */
import { demoActivityEvents } from "@/lib/activity-fixtures"
import type { DateRange } from "@/lib/date-range"
import { demoEvents, demoLoans, ghs, type DemoEvent } from "@/lib/fixtures"
import { demoLoanRecords, demoReceipts, type DemoReceipt } from "@/lib/lending-fixtures"
import type { Money } from "@/lib/types"

export const TX_PAGE_SIZE = 10

export type TxType = "repayment" | "disbursement" | "fee_charged" | "penalty_charged" | "penalty_waived"

/**
 * Whether money actually moved. Charges and waivers change what a borrower owes; no cash moves.
 * This is the "non-cash adjustment" distinction the audit praised: keep it, make it explicit.
 */
export type Direction = "cash_in" | "cash_out" | "adjustment"

export const TX_TYPES: Record<TxType, { label: string; direction: Direction; meaning: string }> = {
  repayment: { label: "Repayment", direction: "cash_in", meaning: "Money received from the borrower." },
  disbursement: { label: "Disbursement", direction: "cash_out", meaning: "Loan money paid out to the borrower." },
  fee_charged: { label: "Fee charged", direction: "adjustment", meaning: "A fee added to what the borrower owes. No cash moved." },
  penalty_charged: { label: "Penalty charged", direction: "adjustment", meaning: "A penalty added to what the borrower owes. No cash moved." },
  penalty_waived: { label: "Penalty waived", direction: "adjustment", meaning: "A penalty removed from what the borrower owes. No cash moved." },
}

export const DIRECTIONS: Record<Direction, string> = {
  cash_in: "Cash in",
  cash_out: "Cash out",
  adjustment: "Adjustment (not cash)",
}

export type Transaction = {
  /** Unique system ID. Kept in the detail view; never used to merge rows. */
  id: string
  /** The human reference staff quote: receipt, disbursement or adjustment number. */
  ref: string
  type: TxType
  direction: Direction
  loanRef: string
  borrower: string
  amount: Money
  method: string | null
  /** The payer's or bank's own reference, if one was given. Null = none given. */
  externalRef: string | null
  /** The date the money moved, or the charge applies. Calendar date, branch time. */
  effectiveOn: string
  /** When it was entered into LoanDrift. */
  recordedAt: string
  status: "Posted"
  /** An Activities event for this transaction, when one is recorded. */
  activityId: string | null
}

const DISBURSE_METHOD: Record<string, string> = {
  "DEMO-LN-001": "Mobile money",
  "DEMO-LN-002": "Bank transfer",
  "DEMO-LN-003": "Mobile money",
  "DEMO-LN-005": "Bank transfer",
  "DEMO-LN-006": "Cash",
  "DEMO-LN-008": "Bank transfer",
  "DEMO-LN-009": "Cash",
}

/** External references the payer gave. Most receipts have none, as in the audit. */
const EXTERNAL_REFS: Record<string, string> = {
  "DEMO-RC-0042": "MM-000042-FICT",
  "DEMO-RC-0036": "MM-000036-FICT",
  "DEMO-RC-0011": "BANK-TRF-0011-FICT",
}

/** Entered later than it happened: a backdated receipt, to show both times. */
const RECORDED_LATE: Record<string, string> = { "DEMO-RC-0039": "2026-10-25T08:20:00Z" }

const borrowerOf = (ref: string) => demoLoans.find((l) => l.reference === ref)?.borrower.name ?? "Unknown borrower"

function activityFor(e: { loanRef: string; on: string; kind: string }) {
  const action = e.kind === "repayment" ? "repayment_recorded" : e.kind === "disbursement" ? "disbursed" : null
  if (!action) return null
  return demoActivityEvents.find((a) => a.action === action && a.entity.ref === e.loanRef && a.occurred_at.startsWith(e.on)) ?? null
}

function build(): Transaction[] {
  const unused = [...demoReceipts]
  const takeReceipt = (e: DemoEvent): DemoReceipt | undefined => {
    const i = unused.findIndex((r) => r.loanRef === e.loanRef && r.receivedOn === e.on && r.amount.minor === e.amount.minor)
    return i >= 0 ? unused.splice(i, 1)[0] : undefined
  }
  let minute = 0
  const stamp = (on: string) => `${on}T${String(9 + Math.floor(minute / 60) % 8).padStart(2, "0")}:${String(minute++ % 60).padStart(2, "0")}:00Z`

  const rows: Transaction[] = demoEvents.map((e, i) => {
    const type: TxType = e.kind === "fee_charged" ? "fee_charged" : e.kind
    const receipt = e.kind === "repayment" ? takeReceipt(e) : undefined
    const ref = receipt?.receiptNo ?? (e.kind === "disbursement" ? `DEMO-DB-${e.loanRef.slice(-3)}` : `DEMO-FEE-${String(i).padStart(3, "0")}`)
    const activity = activityFor(e)
    return {
      id: `TXN-${String(1000 + i)}`,
      ref,
      type,
      direction: TX_TYPES[type].direction,
      loanRef: e.loanRef,
      borrower: borrowerOf(e.loanRef),
      amount: e.amount,
      method: receipt?.method ?? (e.kind === "disbursement" ? DISBURSE_METHOD[e.loanRef] ?? null : null),
      externalRef: receipt ? EXTERNAL_REFS[receipt.receiptNo] ?? null : null,
      effectiveOn: e.on,
      // Where the Activities feed recorded this event, its time is the recorded time, so both screens agree.
      recordedAt: (receipt && RECORDED_LATE[receipt.receiptNo]) ?? activity?.recorded_at ?? activity?.occurred_at ?? stamp(e.on),
      status: "Posted",
      activityId: activity?.id ?? null,
    }
  })

  // A penalty and its waiver: both adjustments, and the waiver is not a payment.
  rows.push(
    {
      id: "TXN-2001",
      ref: "DEMO-PEN-001",
      type: "penalty_charged",
      direction: "adjustment",
      loanRef: "DEMO-LN-002",
      borrower: borrowerOf("DEMO-LN-002"),
      amount: ghs(50),
      method: null,
      externalRef: null,
      effectiveOn: "2026-08-20",
      recordedAt: "2026-08-20T06:00:00Z",
      status: "Posted",
      activityId: null,
    },
    {
      id: "TXN-2002",
      ref: "DEMO-WVR-001",
      type: "penalty_waived",
      direction: "adjustment",
      loanRef: "DEMO-LN-002",
      borrower: borrowerOf("DEMO-LN-002"),
      amount: ghs(50),
      method: null,
      externalRef: null,
      effectiveOn: "2026-08-25",
      recordedAt: "2026-08-25T11:40:00Z",
      status: "Posted",
      activityId: null,
    },
  )
  // Stable order: newest effective date first, then recorded time, then ID, so ties never swap pages.
  return rows.sort((a, b) => b.effectiveOn.localeCompare(a.effectiveOn) || b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id))
}

export const demoTransactions: Transaction[] = build()

export type TxFilters = { q?: string; type?: string; direction?: string; range?: DateRange | null; page?: number }

/** Charges and waivers are totalled apart: one adds to what's owed, the other removes. Neither is cash. */
export type TxTotals = { cashIn: Money; cashOut: Money; charged: Money; waived: Money; otherCurrencies: string[] }

export function queryTransactions(f: TxFilters) {
  const needle = f.q?.trim().toLowerCase() ?? ""
  const matched = demoTransactions.filter(
    (t) =>
      (!needle || [t.ref, t.loanRef, t.borrower, t.externalRef ?? "", t.id].some((v) => v.toLowerCase().includes(needle))) &&
      (!f.type || t.type === f.type) &&
      (!f.direction || t.direction === f.direction) &&
      (!f.range || (t.effectiveOn >= f.range.from && t.effectiveOn <= f.range.to)),
  )
  // Totals cover every matching row, in cedis only; other currencies are named, not added.
  const ghsRows = matched.filter((t) => t.amount.currency === "GHS")
  const sum = (keep: (t: Transaction) => boolean): Money => ({ minor: ghsRows.filter(keep).reduce((s, t) => s + t.amount.minor, 0), currency: "GHS" })
  const totals: TxTotals = {
    cashIn: sum((t) => t.direction === "cash_in"),
    cashOut: sum((t) => t.direction === "cash_out"),
    charged: sum((t) => t.type === "fee_charged" || t.type === "penalty_charged"),
    waived: sum((t) => t.type === "penalty_waived"),
    otherCurrencies: [...new Set(matched.filter((t) => t.amount.currency !== "GHS").map((t) => t.amount.currency))],
  }
  const pageCount = Math.max(1, Math.ceil(matched.length / TX_PAGE_SIZE))
  const page = Math.min(Math.max(1, f.page ?? 1), pageCount)
  return {
    rows: matched.slice((page - 1) * TX_PAGE_SIZE, page * TX_PAGE_SIZE),
    total: matched.length,
    ledgerTotal: demoTransactions.length,
    page,
    pageCount,
    totals,
  }
}

export function getTransaction(id: string) {
  const t = demoTransactions.find((x) => x.id === id)
  if (!t) return null
  // Similar rows are listed, never merged: matching borrower, amount and method doesn't prove a duplicate.
  const similar = demoTransactions.filter(
    (x) => x.id !== t.id && x.loanRef === t.loanRef && x.effectiveOn === t.effectiveOn && x.type === t.type && x.amount.minor === t.amount.minor,
  )
  return { tx: t, similar, hasRepaymentRecord: t.type === "repayment" && !!demoLoanRecords[t.loanRef] }
}

export type Simulation = "none" | "slow" | "error"

export async function fetchTransactions(f: TxFilters, sim: Simulation = "none") {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 300))
  if (sim === "error") throw new Error("The server didn't respond. Nothing was changed.")
  return queryTransactions(f)
}

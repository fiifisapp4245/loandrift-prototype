/**
 * Repayments index (Phase 2 B2-05, F53–F57): recorded receipts only. What's *due* lives in the
 * schedule (Calendar, dashboard due work), never here. Built from the same ledger rows as
 * Transactions, so references and recorded times agree, plus each receipt's balance snapshot.
 *
 * Deliberately absent: a "Total balance" KPI. Each receipt carries the loan's balance *after that
 * receipt*, a historical snapshot; adding them up across receipts (the live page's 53,529.45)
 * double-counts loans and isn't anyone's exposure. Current balances are on each loan record.
 */
import { demoTransactions } from "@/lib/api/transactions"
import { DEMO_TODAY, demoLoans } from "@/lib/fixtures"
import { demoReceipts } from "@/lib/lending-fixtures"
import { loanStatus } from "@/lib/format"
import type { DateRange } from "@/lib/date-range"
import type { CurrencyCode, Money } from "@/lib/types"

export type Receipt = {
  /** Ledger transaction ID, for the Transactions drawer. */
  txId: string
  receiptNo: string
  loanRef: string
  borrower: string
  receivedOn: string
  recordedAt: string
  amount: Money
  method: string | null
  externalRef: string | null
  /** HISTORICAL: the loan's balance straight after this receipt, as recorded then. */
  balanceAfter: Money | null
  /** The loan's status today, so a settled loan reads as settled. */
  loanStatusNow: string
}

export const receipts: Receipt[] = demoTransactions
  .filter((t) => t.type === "repayment")
  .map((t) => {
    const r = demoReceipts.find((x) => x.receiptNo === t.ref)
    const loan = demoLoans.find((l) => l.reference === t.loanRef)
    return {
      txId: t.id,
      receiptNo: t.ref,
      loanRef: t.loanRef,
      borrower: t.borrower,
      receivedOn: t.effectiveOn,
      recordedAt: t.recordedAt,
      amount: t.amount,
      method: t.method,
      externalRef: t.externalRef,
      balanceAfter: r?.balanceAfter ?? null,
      loanStatusNow: loanStatus(loan?.status).label,
    }
  })
  .sort((a, b) => b.receivedOn.localeCompare(a.receivedOn) || b.recordedAt.localeCompare(a.recordedAt) || b.receiptNo.localeCompare(a.receiptNo))

export const RECEIPT_PAGE_SIZE = 10

export type ReceiptFilters = {
  /** "today" (default): received on the business date. "history": every receipt, today included. */
  tab?: string
  q?: string
  method?: string
  range?: DateRange | null
  page?: number
}

export type ReceiptSummary = {
  count: number
  /** Totals per currency, never added together. Zero receipts give an empty list. */
  received: { currency: CurrencyCode; minor: number }[]
  loans: number
}

export function summarise(rows: Receipt[]): ReceiptSummary {
  const by = new Map<CurrencyCode, number>()
  for (const r of rows) by.set(r.amount.currency, (by.get(r.amount.currency) ?? 0) + r.amount.minor)
  // The branch currency first, then any others, each on its own.
  const received = [...by].map(([currency, minor]) => ({ currency, minor })).sort((a, b) => (a.currency === "GHS" ? -1 : b.currency === "GHS" ? 1 : a.currency.localeCompare(b.currency)))
  return { count: rows.length, received, loans: new Set(rows.map((r) => r.loanRef)).size }
}

export function queryReceipts(f: ReceiptFilters, today = DEMO_TODAY) {
  const needle = f.q?.trim().toLowerCase() ?? ""
  const base = f.tab === "history" ? receipts : receipts.filter((r) => r.receivedOn === today)
  const matching = base.filter(
    (r) =>
      (!needle || [r.receiptNo, r.loanRef, r.borrower, r.externalRef ?? ""].some((v) => v.toLowerCase().includes(needle))) &&
      (!f.method || r.method === f.method) &&
      (!f.range || (r.receivedOn >= f.range.from && r.receivedOn <= f.range.to)),
  )
  const pageCount = Math.max(1, Math.ceil(matching.length / RECEIPT_PAGE_SIZE))
  const page = Math.min(Math.max(1, f.page ?? 1), pageCount)
  return {
    rows: matching.slice((page - 1) * RECEIPT_PAGE_SIZE, page * RECEIPT_PAGE_SIZE),
    total: matching.length,
    tabTotal: base.length,
    page,
    pageCount,
    summary: summarise(matching),
  }
}

export type Simulation = "none" | "slow" | "error"

export async function fetchReceipts(f: ReceiptFilters, sim: Simulation = "none") {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 150))
  if (sim === "error") throw new Error("Receipts couldn't be loaded. Nothing has changed; try again.")
  return queryReceipts(f)
}

/**
 * The receipt document. A mock of the preview service: it can be slow or fail (?demo=receipt-error)
 * so the drawer's loading, error and fallback paths are real. Never prints, emails or regenerates.
 */
export async function fetchReceiptDocument(receiptNo: string, fail = false) {
  await new Promise((r) => setTimeout(r, 500))
  if (fail) throw new Error("The receipt preview couldn't be generated.")
  const r = receipts.find((x) => x.receiptNo === receiptNo)
  if (!r) throw new Error(`No receipt ${receiptNo} is on record.`)
  return r
}

export const METHODS = [...new Set(receipts.map((r) => r.method).filter(Boolean))] as string[]

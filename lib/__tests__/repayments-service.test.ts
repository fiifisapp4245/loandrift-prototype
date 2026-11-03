import { describe, expect, it } from "vitest"
import { queryReceipts, receipts, summarise } from "@/lib/api/repayments"
import { demoTransactions } from "@/lib/api/transactions"

describe("repayments index (B2-05, F53–F56)", () => {
  it("lists the same receipts as the ledger, with the same recorded times", () => {
    const ledger = demoTransactions.filter((t) => t.type === "repayment")
    expect(receipts).toHaveLength(ledger.length)
    for (const r of receipts) expect(ledger.find((t) => t.ref === r.receiptNo)?.recordedAt).toBe(r.recordedAt)
  })

  it("shows nothing received today, while history is populated and includes today", () => {
    expect(queryReceipts({}).total).toBe(0)
    expect(queryReceipts({ tab: "history" }).total).toBe(receipts.length)
  })

  it("keeps several receipts for one loan distinguishable by date and reference", () => {
    const ln2 = queryReceipts({ tab: "history", q: "DEMO-LN-002" }).rows
    expect(ln2).toHaveLength(4)
    expect(new Set(ln2.map((r) => r.receiptNo)).size).toBe(4)
    const sameDay = ln2.filter((r) => r.receivedOn === "2026-07-15")
    expect(sameDay.map((r) => r.balanceAfter?.minor)).toEqual([480000, 560000])
  })

  it("shows a settled loan's last receipt with a zero balance after and the status now", () => {
    const last = queryReceipts({ tab: "history", q: "DEMO-RC-0029" }).rows[0]
    expect(last.balanceAfter?.minor).toBe(0)
    expect(last.loanStatusNow).toBe("Completed")
  })

  it("includes both range boundaries", () => {
    const oct = queryReceipts({ tab: "history", range: { from: "2026-10-01", to: "2026-10-31" } })
    expect(oct.rows.map((r) => r.receivedOn).sort()).toEqual(["2026-10-01", "2026-10-19", "2026-10-24", "2026-10-27"])
    expect(queryReceipts({ tab: "history", range: { from: "2026-10-02", to: "2026-10-26" } }).total).toBe(2)
  })

  it("totals each currency on its own and never sums balance snapshots", () => {
    const s = summarise(receipts)
    expect(s.received.map((x) => x.currency).sort()).toEqual(["GHS", "USD"])
    expect(s.received.find((x) => x.currency === "USD")?.minor).toBe(120000)
    expect(Object.keys(s)).toEqual(["count", "received", "loans"])
    expect(s.loans).toBe(6)
  })
})

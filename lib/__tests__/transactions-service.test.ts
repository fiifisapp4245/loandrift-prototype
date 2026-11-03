import { describe, expect, it } from "vitest"
import { TX_PAGE_SIZE, demoTransactions, getTransaction, queryTransactions } from "@/lib/api/transactions"
import { computeActivity } from "@/lib/api/dashboard"
import { demoEvents, demoReceipts } from "@/lib/__tests__/ledger-sources"

const ghs = (cedis: number) => ({ minor: Math.round(cedis * 100), currency: "GHS" })

describe("transactions ledger", () => {
  it("has one row per ledger event plus the penalty and waiver, each with a unique ID", () => {
    expect(demoTransactions).toHaveLength(demoEvents.length + 2)
    expect(new Set(demoTransactions.map((t) => t.id)).size).toBe(demoTransactions.length)
    expect(new Set(demoTransactions.map((t) => t.ref)).size).toBe(demoTransactions.length)
  })

  it("keeps two similar same-day payments as two transactions with their own references", () => {
    const jul = demoTransactions.filter((t) => t.loanRef === "DEMO-LN-002" && t.effectiveOn === "2026-07-15")
    expect(jul.map((t) => t.ref).sort()).toEqual(["DEMO-RC-0017", "DEMO-RC-0018"])
    const detail = getTransaction(jul[0]!.id)!
    expect(detail.similar.map((s) => s.ref)).toEqual([jul[1]!.ref])
  })

  it("links every repayment to its receipt", () => {
    const receipts = demoTransactions.filter((t) => t.type === "repayment").map((t) => t.ref).sort()
    expect(receipts).toEqual(demoReceipts.map((r) => r.receiptNo).sort())
  })

  it("never treats a charge or waiver as cash", () => {
    for (const t of demoTransactions.filter((x) => ["fee_charged", "penalty_charged", "penalty_waived"].includes(x.type))) {
      expect(t.direction).toBe("adjustment")
    }
    const totals = queryTransactions({}).totals
    expect(totals.charged).toEqual(ghs(160))
    expect(totals.waived).toEqual(ghs(50))
  })

  it("agrees with the dashboard's October cash figures", () => {
    const oct = queryTransactions({ range: { from: "2026-10-01", to: "2026-10-31" } }).totals
    const dash = computeActivity({ from: "2026-10-01", to: "2026-10-31" })
    expect(oct.cashIn).toEqual(dash.repaid.total)
    expect(oct.cashOut).toEqual(dash.disbursed.total)
    expect(oct.charged).toEqual(dash.feesCharged.total)
    expect(oct.otherCurrencies).toEqual(["USD"])
  })

  it("shows when a receipt was recorded after the money moved", () => {
    const late = demoTransactions.find((t) => t.ref === "DEMO-RC-0039")!
    expect(late.effectiveOn).toBe("2026-10-24")
    expect(late.recordedAt).toBe("2026-10-25T08:20:00Z")
  })

  it("takes recorded times from the Activities feed where it has the event", () => {
    const t = demoTransactions.find((x) => x.ref === "DEMO-RC-0042")!
    expect(t.activityId).toBe("DEMO-EV-0117")
    expect(t.recordedAt).toBe("2026-10-27T15:31:12Z")
  })

  it("filters and paginates over the whole ledger with a stable order", () => {
    const p1 = queryTransactions({})
    const p2 = queryTransactions({ page: 2 })
    expect(p1.rows).toHaveLength(TX_PAGE_SIZE)
    expect(p1.pageCount).toBe(Math.ceil(demoTransactions.length / TX_PAGE_SIZE))
    expect(p1.rows.some((r) => p2.rows.includes(r))).toBe(false)
    expect(queryTransactions({ type: "penalty_waived" }).rows.map((t) => t.ref)).toEqual(["DEMO-WVR-001"])
    expect(queryTransactions({ type: "penalty_waived", range: { from: "2026-10-01", to: "2026-10-31" } }).total).toBe(0)
    expect(queryTransactions({ q: "mm-000042" }).rows.map((t) => t.ref)).toEqual(["DEMO-RC-0042"])
  })
})

import { describe, expect, it } from "vitest"
import { computeSnapshot } from "@/lib/api/dashboard"
import { getLoan, listLoans, loanFinancials } from "@/lib/api/lending"
import { loanPosition, previewPayment } from "@/lib/domain/loan-position"
import { DEMO_TODAY, demoLoans } from "@/lib/fixtures"
import { formatScore } from "@/lib/format"
import { demoReceipts } from "@/lib/lending-fixtures"
import { isUnavailable } from "@/lib/types"

const ghs = (cedis: number) => ({ minor: Math.round(cedis * 100), currency: "GHS" })
const pos = (ref: string) => loanPosition(ref)!

describe("the contract on the competitor pack's fixture (DEMO-LN-001, as of 2 Nov 2026)", () => {
  const p = pos("DEMO-LN-001")

  it("keeps past due, due today and to-bring-current consistent (F01, F02)", () => {
    expect(p.regularInstallment).toEqual(ghs(300))
    expect(p.pastDue).toEqual(ghs(100))
    expect(p.dueToday).toEqual(ghs(300))
    expect(p.toBringCurrent).toEqual(ghs(400))
    expect(p.totalBalance).toEqual(ghs(1000))
  })

  it("separates the next scheduled date from today's installment, and names the oldest unpaid", () => {
    expect(p.nextScheduled).toEqual({ dueDate: "2026-11-09", amount: ghs(300) })
    expect(p.oldestUnpaid).toEqual({ dueDate: "2026-10-26", daysOverdue: 7 })
  })

  it("refuses to guess fees, penalties or a settlement amount", () => {
    expect(p.feesAndPenalties.unavailable).toBe(true)
    expect(p.settlement.reason).toMatch(/isn't established/)
  })
})

describe("due today versus past due", () => {
  it("a loan with only today's installment unpaid isn't in arrears", () => {
    const p = pos("DEMO-LN-009")
    expect(p.pastDue).toEqual(ghs(0))
    expect(p.dueToday).toEqual(ghs(400))
    expect(p.oldestUnpaid).toEqual({ dueDate: DEMO_TODAY, daysOverdue: 0 })
  })
})

describe("every screen agrees (same fixture, same as-of date)", () => {
  const outstanding = demoLoans.filter((l) => ["active", "defaulted", "disbursed"].includes(l.status))

  it("dashboard arrears and counts equal the sum of loan positions", () => {
    const s = computeSnapshot()
    const ghsPositions = outstanding.map((l) => pos(l.reference)).filter((p) => p.currency === "GHS")
    const arrears = ghsPositions.reduce((t, p) => t + (isUnavailable(p.pastDue) ? 0 : p.pastDue.minor), 0)
    expect(s.arrears).toEqual({ minor: arrears, currency: "GHS" })
    expect(s.attention.dueTodayAccounts).toBe(outstanding.filter((l) => (pos(l.reference).dueToday as { minor: number }).minor > 0).length)
  })

  it("the loan list, loan record, repayment overview and payment preview show the same figures", () => {
    for (const l of demoLoans) {
      const p = pos(l.reference)
      const fromList = listLoans({ q: l.reference }).rows[0]!.financials
      const fromRecord = getLoan(l.reference)!.financials
      for (const f of [loanFinancials(l), fromList, fromRecord]) {
        expect(f.totalBalance).toEqual(p.totalBalance)
        expect(f.pastDue).toEqual(p.pastDue)
        expect(f.dueToday).toEqual(p.dueToday)
        expect(f.toBringCurrent).toEqual(p.toBringCurrent)
        expect(f.nextScheduled).toEqual(p.nextScheduled)
      }
      const preview = previewPayment(l.reference, 100)
      if (preview) expect(preview.before).toEqual(p)
    }
  })

  it("the latest historical receipt matches today's live balance where no payment came since", () => {
    for (const ref of ["DEMO-LN-001", "DEMO-LN-009", "DEMO-LN-002"]) {
      const last = demoReceipts.filter((r) => r.loanRef === ref).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn) || b.receiptNo.localeCompare(a.receiptNo))[0]!
      expect(last.balanceAfter).toEqual(pos(ref).totalBalance)
    }
  })
})

describe("conflicting and unavailable data", () => {
  it("shows a source disagreement instead of picking a number", () => {
    const p = pos("DEMO-LN-005")
    expect(p.conflicts).toHaveLength(1)
    expect(p.totalBalance).toMatchObject({ unavailable: true })
    expect(p.conflicts[0]).toBe("Sources disagree: the schedule gives USD 300.00, the loan record gives USD 1,080.00. Not shown until resolved.")
  })

  it("explains a loan with no schedule and offers no payment preview", () => {
    const p = pos("DEMO-LN-012")
    expect(p.totalBalance).toEqual({ unavailable: true, reason: "Terms aren't captured yet, so there is no schedule." })
    expect(previewPayment("DEMO-LN-012", 100)).toBeNull()
    expect(loanFinancials(demoLoans.find((l) => l.reference === "DEMO-LN-012")!).progress).toBeNull()
  })

  it("never puts legacy and current scores on one scale", () => {
    expect(formatScore(demoLoans.find((l) => l.reference === "DEMO-LN-002")!.score)).toBe("54 / 100 · Legacy model")
    expect(formatScore(demoLoans.find((l) => l.reference === "DEMO-LN-001")!.score)).toBe("712 / 900 · Current model")
  })
})

describe("payment preview", () => {
  it("allocates a partial payment oldest first", () => {
    const p = previewPayment("DEMO-LN-001", 25000)!
    expect(p.lines.map((l) => [l.number, l.status, l.applied.minor, l.remaining.minor])).toEqual([
      [1, "past due", 10000, 0],
      [2, "due today", 15000, 15000],
    ])
    expect(p.after.toBringCurrent).toEqual(ghs(150))
    expect(p.after.pastDue).toEqual(ghs(0))
    expect(p.after.totalBalance).toEqual(ghs(750))
    expect(p.after.nextScheduled).toEqual({ dueDate: "2026-11-09", amount: ghs(300) })
    expect(p.unallocated).toEqual(ghs(0))
  })

  it("a full payment leaves nothing owed and nothing scheduled", () => {
    const p = previewPayment("DEMO-LN-001", 100000)!
    expect(p.after.totalBalance).toEqual(ghs(0))
    expect(p.after.nextScheduled).toBeNull()
    expect(p.after.oldestUnpaid).toBeNull()
  })

  it("leaves the real schedule untouched", () => {
    previewPayment("DEMO-LN-001", 100000)
    expect(pos("DEMO-LN-001").totalBalance).toEqual(ghs(1000))
  })
})

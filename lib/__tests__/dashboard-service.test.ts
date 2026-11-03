import { describe, expect, it } from "vitest"
import { computeActivity, computeSnapshot } from "@/lib/api/dashboard"
import { presetRange } from "@/lib/date-range"
import { DEMO_TODAY, demoEvents } from "@/lib/fixtures"

const ghs = (cedis: number) => ({ minor: Math.round(cedis * 100), currency: "GHS" })
const OCT = { from: "2026-10-01", to: "2026-10-31" }

describe("portfolio snapshot", () => {
  const s = computeSnapshot()

  it("keeps principal and the interest-inclusive balance separate", () => {
    expect(s.principalOutstanding).toEqual(ghs(8583.33))
    expect(s.balanceInclInterest).toEqual(ghs(9900))
  })

  it("counts arrears only from installments due before today", () => {
    // DEMO-LN-001 #1 (GH₵100 left) + DEMO-LN-002 #4–6 (3 × GH₵1,600). Today's installments are excluded.
    expect(s.arrears).toEqual(ghs(4900))
  })

  it("computes PAR 30 from principal on loans more than 30 days overdue", () => {
    expect(s.par30Numerator).toEqual(ghs(4000))
    expect(s.par30).toMatchObject({ label: "46.6%" })
  })

  it("splits principal by days overdue, and the parts add up to the headline", () => {
    expect(s.principalByAge).toEqual([
      { id: "current", label: "Current", amount: ghs(3750) },
      { id: "1-30", label: "1–30 days", amount: ghs(833.33) },
      { id: "30-plus", label: "30+ days", amount: ghs(4000) },
    ])
    expect(s.principalByAge!.reduce((t, p) => t + p.amount.minor, 0)).toBe((s.principalOutstanding as { minor: number }).minor)
    // The 30+ bucket is the PAR 30 numerator.
    expect(s.principalByAge![2]!.amount).toEqual(s.par30Numerator)
  })

  it("leaves the USD loan out of cedi figures and reports it", () => {
    expect(s.excluded).toEqual([{ currency: "USD", loans: 1, principalOutstanding: { minor: 98000, currency: "USD" } }])
    expect(s.borrowersWithOutstanding).toBe(5)
  })

  it("separates personal from branch work and unread alerts from tasks", () => {
    expect(s.attention).toEqual({ approvalsMine: 0, approvalsBranch: 3, dueTodayAccounts: 2, overdueAccounts: 2, unreadAlerts: 3 })
  })
})

describe("period activity", () => {
  it("totals October in cedis only", () => {
    const a = computeActivity(OCT)
    expect(a.disbursed).toEqual({ total: ghs(5500), count: 3 })
    expect(a.repaid).toEqual({ total: ghs(1000), count: 3 })
    expect(a.feesCharged).toEqual({ total: ghs(110), count: 3 })
    expect(a.otherCurrencies).toEqual([
      { currency: "USD", disbursed: { minor: 0, currency: "USD" }, repaid: { minor: 30000, currency: "USD" }, events: 1 },
    ])
  })

  it("rates collection on installments due in the period, with due-but-unpaid alongside", () => {
    const c = computeActivity(OCT).collection
    expect(c).toMatchObject({ installmentsDue: 4, due: ghs(2700), collected: ghs(1000), dueUnpaid: ghs(1700) })
    expect(c.rate).toMatchObject({ label: "37%" })
  })

  it("does not count today's installments as missed yet", () => {
    expect(computeActivity({ from: DEMO_TODAY, to: DEMO_TODAY }).collection.rate).toEqual({
      unavailable: true,
      reason: "Installments due today are counted once the day ends.",
    })
  })

  it("reports no denominator as unavailable, not 0%", () => {
    const a = computeActivity({ from: "2026-03-01", to: "2026-03-31" })
    expect(a.noActivity).toBe(true)
    expect(a.collection.rate).toMatchObject({ unavailable: true })
  })

  it("tells due-but-unpaid apart from no activity", () => {
    // 15 Aug: DEMO-LN-002 #4 fell due and went unpaid, but nothing was recorded that day.
    const a = computeActivity({ from: "2026-08-15", to: "2026-08-15" })
    expect(a.noActivity).toBe(true)
    expect(a.collection.dueUnpaid).toEqual(ghs(1600))
  })

  it.each([
    ["1–31 Oct (weekly)", OCT, "week"],
    ["last 7 days (daily)", presetRange("last-7", DEMO_TODAY), "day"],
    ["Apr–Nov (monthly)", { from: "2026-04-01", to: "2026-11-02" }, "month"],
  ] as const)("chart buckets reconcile with the totals: %s", (_, range, size) => {
    const a = computeActivity(range)
    expect(a.bucketSize).toBe(size)
    expect(a.buckets[0]!.from).toBe(range.from)
    expect(a.buckets.at(-1)!.to).toBe(range.to)
    expect(a.buckets.reduce((t, b) => t + b.disbursed.minor, 0)).toBe(a.disbursed.total.minor)
    expect(a.buckets.reduce((t, b) => t + b.repaid.minor, 0)).toBe(a.repaid.total.minor)
  })

  it("labels buckets that cross a month boundary with both months", () => {
    const labels = computeActivity(presetRange("last-30", DEMO_TODAY)).buckets.map((b) => b.label)
    expect(labels).toContain("26 Oct–1 Nov")
    expect(labels[0]).toBe("4 Oct")
  })

  it("never double-counts an event at a bucket edge", () => {
    const a = computeActivity({ from: "2026-04-01", to: "2026-11-02" })
    const cedi = demoEvents.filter((e) => e.amount.currency === "GHS" && e.on >= "2026-04-01")
    expect(a.repaid.count + a.disbursed.count + a.feesCharged.count).toBe(cedi.length)
  })
})

import { describe, expect, it } from "vitest"
import { calendarDays, scheduledItems, shiftAnchor, visibleRange } from "@/lib/api/calendar"
import { computeSnapshot } from "@/lib/api/dashboard"
import { loanPosition, scheduleFor } from "@/lib/domain/loan-position"
import { DEMO_TODAY } from "@/lib/fixtures"

const day = (d: string) => calendarDays([d])[0]

describe("calendar (R3, F71)", () => {
  it("shows the dashboard's due work on 2 November, though no receipts were recorded that day", () => {
    const today = day(DEMO_TODAY)
    const dueToday = today.scheduled.filter((x) => x.state === "due_today")
    expect(dueToday.map((x) => x.loanRef).sort()).toEqual(["DEMO-LN-001", "DEMO-LN-009"])
    expect(today.receipts).toHaveLength(0)
    expect(dueToday.length).toBe(computeSnapshot().attention.dueTodayAccounts)
  })

  it("uses the same schedule rows as the loan record, and the same position for DEMO-LN-001", () => {
    const ln1 = scheduledItems().filter((x) => x.loanRef === "DEMO-LN-001")
    expect(ln1.map((x) => x.dueDate)).toEqual(scheduleFor("DEMO-LN-001").map((r) => r.dueDate))
    expect(ln1.map((x) => x.state)).toEqual(["part_paid_past_due", "due_today", "upcoming", "upcoming"])
    const pos = loanPosition("DEMO-LN-001")!
    const pastDue = ln1.filter((x) => x.state === "part_paid_past_due").reduce((t, x) => t + x.remaining.minor, 0)
    expect("minor" in pos.pastDue && pos.pastDue.minor).toBe(pastDue) // 100
    expect(ln1[1].remaining.minor).toBe(30000) // 300 due today
  })

  it("keeps a receipt separate from the installment it paid", () => {
    const oct24 = day("2026-10-24")
    expect(oct24.scheduled).toHaveLength(0)
    expect(oct24.receipts.map((r) => r.loanRef)).toEqual(["DEMO-LN-001"])
    const nov1 = day("2026-11-01")
    expect(nov1.scheduled[0].state).toBe("paid")
    expect(nov1.receipts[0].amount.currency).toBe("USD")
  })

  it("never calls a written-off loan's unpaid installments missed", () => {
    const ln6 = scheduledItems().filter((x) => x.loanRef === "DEMO-LN-006" && x.paid.minor < x.due.minor)
    expect(ln6.every((x) => x.state === "not_collected")).toBe(true)
  })

  it("covers whole Monday-to-Sunday weeks and moves by month without skipping", () => {
    const nov = visibleRange("month", "2026-11-02")
    expect(nov[0]).toBe("2026-10-26")
    expect(nov.at(-1)).toBe("2026-12-06")
    expect(visibleRange("week", "2026-11-04")).toHaveLength(7)
    expect(shiftAnchor("month", "2026-10-31", 1)).toBe("2026-11-01")
    expect(shiftAnchor("week", "2026-11-02", -1)).toBe("2026-10-26")
  })
})

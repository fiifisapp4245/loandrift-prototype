import { describe, expect, it } from "vitest"
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyValue,
  formatPercent,
  formatScore,
  humanize,
  loanStatus,
  ratio,
  sumMoney,
} from "@/lib/format"
import { unavailable } from "@/lib/types"

const ghs = (minor: number) => ({ minor, currency: "GHS" as const })

describe("money", () => {
  it("formats cedis with GH₵ and two decimals", () => {
    expect(formatMoney(ghs(120000))).toBe("GH₵1,200.00")
    expect(formatMoney(ghs(5))).toBe("GH₵0.05")
  })

  it("leads other currencies with their code so they can't pass as cedis", () => {
    expect(formatMoney({ minor: 150000, currency: "USD" })).toBe("USD 1,500.00")
  })

  it("keeps zero and unavailable distinct", () => {
    expect(formatMoneyValue(ghs(0))).toBe("GH₵0.00")
    expect(formatMoneyValue(unavailable("no source"))).toBe("Unavailable")
    expect(formatMoneyValue(null)).toBe("Unavailable")
  })

  it("uses a true minus sign", () => {
    expect(formatMoney(ghs(-4550))).toBe("−GH₵45.50")
  })

  it("adds in minor units without floating-point drift", () => {
    const sum = sumMoney([ghs(10), ghs(20)])
    expect(sum).toEqual({ kind: "total", money: ghs(30) })
  })

  it("refuses to add different currencies", () => {
    expect(sumMoney([ghs(100), { minor: 100, currency: "USD" }])).toEqual({ kind: "mixed", currencies: ["GHS", "USD"] })
  })

  it("refuses to total when any part is unavailable, and keeps the reasons", () => {
    const sum = sumMoney([ghs(100), unavailable("Loan B has no balance")])
    expect(sum).toEqual({ kind: "unavailable", reasons: ["Loan B has no balance"] })
  })

  it("totals an empty list to a known zero in the given currency", () => {
    expect(sumMoney([])).toEqual({ kind: "total", money: ghs(0) })
  })
})

describe("rates", () => {
  it("treats a zero denominator as unavailable, not 0%", () => {
    const r = ratio(0, 0, "Nothing fell due")
    expect(r).toEqual({ unavailable: true, reason: "Nothing fell due" })
  })

  it("formats real rates", () => {
    expect(ratio(7, 8, "")).toMatchObject({ label: "87.5%" })
    expect(formatPercent(0.5)).toBe("50%")
    expect(formatPercent(0)).toBe("0%")
  })
})

describe("dates", () => {
  it("never shifts a calendar date", () => {
    expect(formatDate("2026-10-31")).toBe("31 Oct 2026")
  })

  it("shows instants in branch time with the zone named", () => {
    expect(formatDateTime("2026-11-02T09:41:00Z")).toBe("2 Nov 2026, 09:41 GMT")
  })

  it("says when a date is missing", () => {
    expect(formatDate(null)).toBe("Not recorded")
  })
})

describe("statuses", () => {
  it("labels the stored 'active' value as Active", () => {
    expect(loanStatus("active").label).toBe("Active")
    expect(loanStatus("written_off").label).toBe("Written off")
  })

  it("never turns an unknown or missing status into Pending (F42)", () => {
    expect(loanStatus("MIGRATED_CLOSED").label).toBe("Unrecognised status (Migrated closed)")
    expect(loanStatus(null).label).toBe("Status not recorded")
    expect(loanStatus("").label).not.toMatch(/pending/i)
  })

  it("humanizes raw enum values", () => {
    expect(humanize("penalty_waived")).toBe("Penalty waived")
  })
})

describe("scores", () => {
  it("names the model with every score", () => {
    const legacy = { value: 54, scaleMax: 100, model: { id: "l", label: "Legacy model", legacy: true } }
    expect(formatScore(legacy)).toBe("54 / 100 · Legacy model")
    expect(formatScore(null)).toBe("No score")
  })
})

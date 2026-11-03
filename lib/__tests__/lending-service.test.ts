import { describe, expect, it } from "vitest"
import {
  STAGE_COLUMN,
  allowedActions,
  stageDetail,
  statusCounts,
  canSeeIdNumbers,
  clientHistory,
  clientSummary,
  getLoan,
  installmentState,
  listClients,
  listLoans,
  loanFinancials,
  maskId,
  submitClient,
  validateClientDraft,
  type ClientDraft,
} from "@/lib/api/lending"
import { currentUser } from "@/lib/api/workspace"
import { demoLoans } from "@/lib/fixtures"

const ghs = (cedis: number) => ({ minor: Math.round(cedis * 100), currency: "GHS" })
const loan = (ref: string) => demoLoans.find((l) => l.reference === ref)!

describe("loan financials", () => {
  it("derives total payable, paid, past due and the next installment from the schedule", () => {
    // The competitor pack's coherent fixture: 4 × GH₵300, GH₵200 paid toward #1.
    const f = loanFinancials(loan("DEMO-LN-001"))
    expect(f.totalPayable).toEqual(ghs(1200))
    expect(f.paid).toEqual(ghs(200))
    expect(f.pastDue).toEqual(ghs(100))
    expect(f.dueToday).toEqual(ghs(300))
    expect(f.toBringCurrent).toEqual(ghs(400))
    expect(f.totalBalance).toEqual(ghs(1000))
    // Today's installment is "due today", not "next".
    expect(f.nextScheduled).toEqual({ dueDate: "2026-11-09", amount: ghs(300) })
    expect(f.progress).toBeCloseTo(1 / 6)
  })

  it("explains a missing schedule instead of showing zeros", () => {
    const f = loanFinancials(loan("DEMO-LN-012"))
    expect(f.totalPayable).toEqual({ unavailable: true, reason: "Terms aren't captured yet, so there is no schedule." })
    expect(f.progress).toBeNull()
    expect(loanFinancials(loan("DEMO-LN-011")).paid).toMatchObject({ reason: "Not disbursed yet, so there is no schedule." })
  })

  it("words installment states precisely", () => {
    const s = getLoan("DEMO-LN-001")!.schedule
    expect(s.map((i) => installmentState(i).label)).toEqual(["Overdue, part paid", "Due today", "Upcoming", "Upcoming"])
  })
})

describe("permitted actions", () => {
  it("come from the lifecycle stage, and always include viewing the borrower", () => {
    const labels = (ref: string) => allowedActions(loan(ref)).map((a) => a.label)
    expect(labels("DEMO-LN-012")).toEqual(["View borrower", "Capture terms"])
    expect(labels("DEMO-LN-011")).toContain("Disburse")
    expect(labels("DEMO-LN-006")).toContain("Record recovery")
    expect(labels("DEMO-LN-003")).toEqual(["View borrower"])
    expect(allowedActions(loan("DEMO-LN-011")).filter((a) => a.kind === "consequential").every((a) => a.disabledReason)).toBe(true)
    // Recording a payment opens a flow with its own review step, so it's a link, not a disabled item.
    expect(allowedActions(loan("DEMO-LN-001")).find((a) => a.label === "Record external payment")?.href).toBe("/loans/DEMO-LN-001/repayment?record=1")
  })
})

describe("All Loans", () => {
  it("paginates every loan and includes Written off in status filtering", () => {
    const p1 = listLoans({})
    expect(p1.total).toBe(12)
    expect(p1.pageCount).toBe(2)
    expect(listLoans({ status: "written_off" }).rows.map((l) => l.reference)).toEqual(["DEMO-LN-006"])
    expect(listLoans({ status: "unrecognised" }).rows.map((l) => l.reference)).toEqual(["DEMO-LN-007"])
  })

  it("finds all of one borrower's loans", () => {
    expect(listLoans({ q: "kojo" }).rows.map((l) => l.reference).sort()).toEqual(["DEMO-LN-002", "DEMO-LN-003", "DEMO-LN-012"])
  })
})

describe("Clients", () => {
  it("keeps branch totals independent of search", () => {
    expect(clientSummary()).toEqual({ total: 11, withActiveLoan: 5, newThisMonth: 1 })
    expect(listClients({ q: "zzz" }).total).toBe(0)
  })

  it("searches by name, ID, phone and business", () => {
    expect(listClients({ q: "DEMO-CL-07" }).rows[0]!.name).toBe("Efua Demo")
    expect(listClients({ q: "020 000 0008" }).rows[0]!.name).toBe("Kofi Sample")
    expect(listClients({ q: "hardware" }).rows[0]!.name).toBe("Kojo Example")
    expect(listClients({ loans: "none" }).rows.every((c) => !["DEMO-CL-01", "DEMO-CL-02"].includes(c.id))).toBe(true)
  })

  it("shows history with canonical statuses and separate amounts (F42, F43)", () => {
    const h = clientHistory("DEMO-CL-02")
    expect(h.loans.map((x) => [x.loan.reference, x.status.label])).toEqual([
      ["DEMO-LN-012", "Registered"],
      ["DEMO-LN-002", "Defaulted"],
      ["DEMO-LN-003", "Completed"],
    ])
    const completed = h.loans.find((x) => x.loan.reference === "DEMO-LN-003")!
    expect(completed.loan.principal).toEqual(ghs(2000))
    expect(completed.financials.totalPayable).toEqual(ghs(2060))
    expect(completed.financials.paid).toEqual(ghs(2060))
    expect([h.repaidCount, h.closedCount]).toEqual([1, 1])
  })

  it("makes completion unavailable with no closed loans, not 0%", () => {
    expect(clientHistory("DEMO-CL-01").completion).toEqual({ unavailable: true, reason: "No closed loans yet." })
  })

  it("masks ID numbers for roles that can't see them", () => {
    expect(maskId("GHA-000000001-0")).toBe("•••-••••••001-0")
    expect(canSeeIdNumbers(currentUser(null))).toBe(true)
    expect(canSeeIdNumbers(currentUser("officer"))).toBe(false)
  })
})

describe("client form", () => {
  const valid: ClientDraft = {
    firstName: "Test",
    lastName: "Person",
    phone: "020 000 0099",
    altPhone: "",
    email: "",
    idType: "Ghana Card",
    idNumber: "GHA-000000099-0",
    businessName: "",
    businessType: "",
    monthlyIncome: "",
  }

  it("checks required fields and formats in the browser", () => {
    expect(validateClientDraft(valid)).toEqual({})
    const e = validateClientDraft({ ...valid, firstName: "", phone: "12345", altPhone: "12345", email: "nope", monthlyIncome: "lots" })
    expect(Object.keys(e).sort()).toEqual(["altPhone", "email", "firstName", "monthlyIncome", "phone"])
  })

  it("lets the server catch a duplicate ID the browser can't know about", async () => {
    expect(await submitClient(valid)).toEqual({ ok: true })
    const dup = await submitClient({ ...valid, idNumber: "GHA-000000003-0" })
    expect(dup.ok).toBe(false)
    expect(!dup.ok && dup.errors.idNumber).toMatch(/already registered to client DEMO-CL-03/)
  })
})

describe("stage detail in All Loans (replaces the Loan Features queues)", () => {
  it("counts every loan once per stage", () => {
    const c = statusCounts()
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(demoLoans.length)
    expect(c).toMatchObject({ registered: 1, captured: 1, approved: 1, rejected: 1, active: 4, defaulted: 1, completed: 1, written_off: 1, unrecognised: 1 })
  })

  it("shows readiness for a captured loan from its approval request, blockers first", () => {
    expect(stageDetail(loan("DEMO-LN-004"))).toEqual({
      primary: "1 blocker: Guarantor form missing",
      secondary: "Level 1 of 2 · Adjoa Analyst · waiting 22 h",
      warn: true,
    })
  })

  it("shows signatures for an approved loan and the reason for a rejected one", () => {
    expect(stageDetail(loan("DEMO-LN-011"))).toMatchObject({ primary: "1 of 2 signed", secondary: "Waiting on: Branch manager", warn: true })
    expect(stageDetail(loan("DEMO-LN-010"))).toEqual({
      primary: "Existing arrears on another lender's facility.",
      secondary: "Abena Demo · 22 Oct 2026",
      warn: false,
    })
  })

  it("uses the financial contract for arrears and records for closed loans", () => {
    expect(stageDetail(loan("DEMO-LN-002"))).toMatchObject({ primary: "GH₵4,800.00 past due", secondary: "Oldest 79 days overdue" })
    expect(stageDetail(loan("DEMO-LN-003"))).toMatchObject({ primary: "Repaid 14 Sep 2026" })
    expect(stageDetail(loan("DEMO-LN-006"))).toEqual({ primary: "GH₵1,800.00 written off", secondary: "GH₵100.00 recovered · 2 Aug 2026" })
  })

  it("adds no stage column for stages whose list already says enough", () => {
    expect(STAGE_COLUMN.active).toBeUndefined()
    expect(stageDetail(loan("DEMO-LN-001"))).toBeNull()
  })
})

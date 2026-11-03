import { describe, expect, it } from "vitest"
import {
  EMPTY_APPLICATION,
  SECTIONS,
  calculationState,
  checkApplication,
  clientBlockers,
  clientFor,
  requirements,
  sectionState,
  type ApplicationDraft,
} from "@/lib/api/applications"

const COMPLETE: ApplicationDraft = {
  ...EMPTY_APPLICATION,
  clientId: "DEMO-CL-03",
  product: "Weekly trader loan",
  principal: "1000",
  rate: "5",
  interestPeriod: "Week",
  basis: "Flat",
  frequency: "Weekly",
  installments: "4",
  firstRepaymentOn: "2026-11-09",
  penaltyType: "None",
}

describe("loan application capture (R2)", () => {
  it("keeps the nine Phase 2 sections, in order", () => {
    expect(SECTIONS.map((s) => s.title)).toEqual([
      "Client details",
      "Loan details",
      "Penalty",
      "Guarantors",
      "Businesses",
      "Client worth",
      "Comments",
      "Documents",
      "Review and save",
    ])
  })

  it("locks every later section until a client is chosen", () => {
    for (const s of SECTIONS.slice(1)) expect(sectionState(s.id, EMPTY_APPLICATION)).toBe("locked")
    expect(sectionState("loan", { ...EMPTY_APPLICATION, clientId: "DEMO-CL-03" })).toBe("todo")
  })

  it("blocks a client without an ID or primary phone, using only evidence the client form already requires", () => {
    expect(clientBlockers(clientFor("DEMO-CL-06")!)).toHaveLength(1) // no ID
    expect(clientBlockers(clientFor("DEMO-CL-05")!)).toHaveLength(1) // no phone
    expect(clientBlockers(clientFor("DEMO-CL-03")!)).toHaveLength(0)
  })

  it("says Calculation incomplete until the terms are valid, then never computes interest", () => {
    const partial = calculationState({ ...COMPLETE, rate: "" })
    expect(partial.state).toBe("incomplete")
    expect(partial.state === "incomplete" && partial.missing).toContain("Enter the interest rate from the product sheet.")
    const full = calculationState(COMPLETE)
    expect(full.state).toBe("unavailable")
  })

  it("rejects a first repayment that isn't after the business date", () => {
    expect(requirements({ ...COMPLETE, firstRepaymentOn: "2026-11-02" }).find((r) => r.label.startsWith("Repayment"))?.met).toBe(false)
  })

  it("treats None as a valid penalty choice, but needs a value for any other", () => {
    expect(requirements(COMPLETE).every((r) => r.met)).toBe(true)
    expect(requirements({ ...COMPLETE, penaltyType: "Fixed amount per missed installment" }).find((r) => r.section === "penalty")?.met).toBe(false)
  })

  it("passes a complete draft through the mocked check without saving, and names maker-checker", async () => {
    const ok = await checkApplication(COMPLETE)
    expect(ok.ok).toBe(true)
    expect(ok.ok && ok.approvalNote).toMatch(/different user/)
    const bad = await checkApplication({ ...COMPLETE, clientId: "DEMO-CL-06" })
    expect(bad.ok).toBe(false)
    expect(!bad.ok && bad.message).toMatch(/Nothing was saved/)
  })
})

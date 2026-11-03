import { describe, expect, it } from "vitest"
import { assessments, getAssessment, queryAssessments, scoreText } from "@/lib/api/credit"
import { demoLoans } from "@/lib/fixtures"

describe("credit assessments (R3, F69, F70)", () => {
  it("agrees with every loan record: the latest assessment is the score the loan shows", () => {
    for (const loan of demoLoans) {
      const latest = assessments.find((x) => x.loanRef === loan.reference && x.latest)
      if (!loan.score) {
        // No score on the record: either never assessed, or the latest assessment is incomplete.
        expect(latest?.value ?? null, loan.reference).toBeNull()
      } else {
        expect(latest?.value, loan.reference).toBe(loan.score.value)
        expect(latest?.model.scaleMax, loan.reference).toBe(loan.score.scaleMax)
        expect(latest?.modelId, loan.reference).toBe(loan.score.model.id)
      }
    }
  })

  it("shows one row per loan by default, and every assessment in All", () => {
    const latest = queryAssessments({})
    expect(latest.total).toBe(new Set(assessments.map((x) => x.loanRef)).size)
    expect(queryAssessments({ view: "all" }).total).toBe(assessments.length)
  })

  it("keeps two same-day re-runs as separate, distinguishable records", () => {
    const sameDay = assessments.filter((x) => x.loanRef === "DEMO-LN-001" && x.assessedAt.startsWith("2026-10-18"))
    expect(sameDay).toHaveLength(2)
    expect(new Set(sameDay.map((x) => x.assessedAt)).size).toBe(2)
    expect(sameDay.filter((x) => x.latest)).toHaveLength(1)
  })

  it("keeps a loan's models apart, and never turns an incomplete assessment into zero", () => {
    const ln5 = getAssessment(assessments.find((x) => x.loanRef === "DEMO-LN-005")!.id)!
    expect(new Set(ln5.history.map((x) => x.model.scaleMax))).toEqual(new Set([100, 900]))
    const incomplete = queryAssessments({ state: "incomplete", view: "all" })
    expect(incomplete.total).toBe(1)
    expect(incomplete.rows[0].value).toBeNull()
    expect(scoreText(incomplete.rows[0])).toBe("Incomplete, no score")
    expect(incomplete.rows[0].model.scaleMin).toBe(300)
  })

  it("searches by borrower name and loan reference across the whole history", () => {
    expect(queryAssessments({ q: "kojo", view: "all" }).rows.every((x) => x.borrower === "Kojo Example")).toBe(true)
    expect(queryAssessments({ q: "ln-001", view: "all" }).total).toBe(3)
  })

  it("reports counts per model and nothing averaged", () => {
    const r = queryAssessments({ view: "all" })
    expect(r.byModel.reduce((t, m) => t + m.count, 0)).toBe(r.total)
    expect(Object.keys(r)).not.toContain("average")
  })
})

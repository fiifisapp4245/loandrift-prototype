import { describe, expect, it } from "vitest"
import { assetActions, coverage, assets, exceptionCounts, getAsset, queryAssets, validateLien, validateRegistration, validateValuation } from "@/lib/api/collateral"

const action = (ref: string, id: string) => assetActions(getAsset(ref)!).find((x) => x.id === id)!

describe("collateral register (B2-07, F60–F63)", () => {
  it("names the value basis: estimate only vs recorded valuation, and never a zero forced-sale value", () => {
    const est = getAsset("DEMO-COL-01")!
    expect(est.valueUsed.basis).toBe("Registration estimate")
    expect(est.valuation).toBeNull()
    const internal = getAsset("DEMO-COL-04")!
    expect(internal.valueUsed).toEqual({ value: { minor: 350000, currency: "GHS" }, basis: "Internal valuation", on: "2026-10-03" })
    expect(internal.valuation?.forcedSaleValue).toBeNull()
    expect(getAsset("DEMO-COL-03")!.valueUsed.basis).toBe("Independent valuation")
  })

  it("totals each basis and currency separately, counting only assets that have the figure", () => {
    const c = coverage(assets)
    expect(c.pledged).toBe(4)
    expect(c.valued.totals).toEqual([{ currency: "GHS", minor: 2550000 }])
    expect(c.estimateOnly.totals.map((t) => t.currency).sort()).toEqual(["GHS", "USD"])
    expect(c.forcedSale).toMatchObject({ counted: 1, of: 4 })
  })

  it("gives each exception its own count and a filter that opens just those assets", () => {
    const counts = Object.fromEntries(exceptionCounts().map((x) => [x.id, x.count]))
    expect(counts).toEqual({ awaiting_verification: 1, no_lien: 2, estimate_only: 3 })
    expect(queryAssets({ exception: "no_lien" }).rows.map((a) => a.ref)).toEqual(["DEMO-COL-01", "DEMO-COL-06"])
    // Awaiting verification on an undisbursed loan isn't also a missing-lien exception.
    expect(getAsset("DEMO-COL-02")!.exceptions).toEqual(["awaiting_verification", "estimate_only"])
  })

  it("offers removal only before disbursement, and recovery or release by loan state (F62)", () => {
    expect(action("DEMO-COL-02", "remove").available).toBe(true) // captured loan
    expect(action("DEMO-COL-03", "remove").available).toBe(false) // written off
    expect(action("DEMO-COL-03", "remove").reason).toMatch(/already been disbursed/)
    expect(action("DEMO-COL-03", "recover").available).toBe(true)
    expect(action("DEMO-COL-04", "recover").available).toBe(false) // active
    expect(action("DEMO-COL-05", "release").available).toBe(false) // already released
    expect(action("DEMO-COL-05", "record_valuation").available).toBe(false)
  })

  it("keeps third-party ownership and consent", () => {
    const a = getAsset("DEMO-COL-03")!
    expect(a.owner).toMatchObject({ kind: "third_party", name: "Kwesi Fixture", consentSignedOn: "2026-04-22" })
  })

  it("has no defaults that look like evidence: basis and lien status must be chosen (F63)", () => {
    const v = validateValuation({ basis: "", valuer: "", marketValue: "", forcedSaleValue: "", on: "", report: "" })
    expect(v.basis).toBeTruthy()
    expect(validateValuation({ basis: "Independent valuation", valuer: "X", marketValue: "100", forcedSaleValue: "", on: "2026-10-01", report: "" }).report).toMatch(/report/)
    expect(validateValuation({ basis: "Internal valuation", valuer: "X", marketValue: "100", forcedSaleValue: "", on: "2026-10-01", report: "" })).toEqual({})
    expect(validateLien({ state: "", registry: "", reference: "", on: "", evidence: "" }).state).toBeTruthy()
    expect(validateLien({ state: "not_registered", registry: "", reference: "", on: "", evidence: "" })).toEqual({})
    expect(Object.keys(validateLien({ state: "registered", registry: "", reference: "", on: "", evidence: "" })).sort()).toEqual(["evidence", "on", "reference", "registry"])
  })

  it("requires type-specific and third-party owner fields only when they apply", () => {
    const base = { loanRef: "DEMO-LN-004", type: "", description: "x", regNumber: "", makeModel: "", location: "", titleRef: "", serial: "", owner: "", ownerName: "", ownerPhone: "", ownerRelationship: "", estimate: "100" } as const
    expect(validateRegistration({ ...base, type: "vehicle", owner: "borrower" })).toHaveProperty("regNumber")
    expect(validateRegistration({ ...base, type: "equipment", owner: "borrower" })).toEqual({})
    expect(Object.keys(validateRegistration({ ...base, type: "property", owner: "third_party" })).sort()).toEqual(["location", "ownerName", "ownerPhone", "ownerRelationship", "titleRef"])
  })
})

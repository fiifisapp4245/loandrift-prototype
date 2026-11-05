import { describe, expect, it } from "vitest"
import {
  activeGroupOf,
  checkGroupLoan,
  emptyGroupLoan,
  getGroup,
  groupCalculation,
  memberCandidates,
  queryGroups,
  readyCount,
  removalNotes,
  totalPrincipal,
  validateAddMember,
  validateGroup,
  validateGroupLoan,
  validateRoleChange,
  type GroupLoanDraft,
} from "@/lib/api/groups"
import { validateTerms } from "@/lib/api/applications"
import { EMPTY_APPLICATION } from "@/lib/api/applications"

const TERMS = { product: "Weekly trader loan", rate: "5", interestPeriod: "Week", basis: "Flat", frequency: "Weekly", installments: "8", firstRepaymentOn: "2026-11-10" }

function draft(groupId: string, members: Record<string, string>, extra: Partial<GroupLoanDraft> = {}): GroupLoanDraft {
  const g = getGroup(groupId)!
  const d = { ...emptyGroupLoan(g), ...TERMS, liability: "joint", ...extra }
  for (const [id, amount] of Object.entries(members)) d.members[id] = { included: true, amount }
  return d
}

describe("groups list (F68)", () => {
  it("keeps branch totals when a search matches nothing", () => {
    const all = queryGroups({})
    const none = queryGroups({ q: "zzz" })
    expect(none.total).toBe(0)
    expect(none.registerTotal).toBe(3)
    expect(none.branch).toEqual(all.branch)
    expect(all.branch).toEqual({ activeGroups: 2, activeMembers: 7, awaitingApproval: 1 })
  })

  it("finds a group by code or member name", () => {
    expect(queryGroups({ q: "lab-02" }).rows.map((g) => g.id)).toEqual(["DEMO-GR-02"])
    expect(queryGroups({ q: "efua" }).rows.map((g) => g.id)).toEqual(["DEMO-GR-03"])
  })

  it("keeps missing meeting details as null rather than guessing them (F67)", () => {
    const g = getGroup("LAB-02")!
    expect(g.meetingPlace).toBeNull()
    expect(g.notes).toBeNull()
    expect(g.meetingDay).toBe("Friday")
  })
})

describe("membership (F64)", () => {
  it("lists clients in another active group as not selectable, with the reason", () => {
    const found = memberCandidates("DEMO-GR-02", "ama")
    const ama = found.find((c) => c.client.id === "DEMO-CL-01")!
    expect(ama.blocked).toMatch(/Already in Osu Market Traders \(OSU-01\)\. A client can be in one active group at a time/)
  })

  it("lets a member of an inactive group join an active one", () => {
    expect(activeGroupOf("DEMO-CL-07")).toBeNull()
    expect(memberCandidates("DEMO-GR-01", "efua")[0].blocked).toBeNull()
  })

  it("doesn't list current members or search on one character", () => {
    expect(memberCandidates("DEMO-GR-02", "nana")).toHaveLength(0)
    expect(memberCandidates("DEMO-GR-02", "k")).toHaveLength(0)
  })

  it("needs a client and a role before adding", () => {
    expect(validateAddMember("DEMO-GR-02", { clientId: "", role: "" })).toEqual({ client: "Search for a client and select them.", role: "Choose the member's role." })
    expect(validateAddMember("DEMO-GR-02", { clientId: "DEMO-CL-01", role: "member" }).client).toMatch(/another active group/)
    expect(validateAddMember("DEMO-GR-02", { clientId: "DEMO-CL-06", role: "member" })).toEqual({})
  })

  it("refuses a role change to the same role", () => {
    const kojo = getGroup("DEMO-GR-02")!.members.find((m) => m.clientId === "DEMO-CL-02")!
    expect(validateRoleChange(kojo, "member").role).toMatch(/already member/)
    expect(validateRoleChange(kojo, "treasurer")).toEqual({})
  })

  it("shows what's still owed before removal, without deciding the rule", () => {
    const kojo = getGroup("DEMO-GR-02")!.members.find((m) => m.clientId === "DEMO-CL-02")!
    expect(removalNotes(kojo)[0]).toMatch(/still owes on DEMO-LN-002.*set by policy/)
    const nana = getGroup("DEMO-GR-02")!.members.find((m) => m.clientId === "DEMO-CL-09")!
    expect(removalNotes(nana)).toEqual(["Nana Fictional is the group's chairperson. Someone else may need the role."])
  })
})

describe("group loan application (F65, F66)", () => {
  it("starts with nobody included and no liability chosen", () => {
    const d = emptyGroupLoan(getGroup("DEMO-GR-01")!)
    expect(Object.values(d.members).every((m) => !m.included && m.amount === "")).toBe(true)
    expect(d.liability).toBe("")
    expect(readyCount(d, getGroup("DEMO-GR-01")!)).toBe(0)
  })

  it("refuses zero included members", () => {
    const g = getGroup("DEMO-GR-02")!
    expect(validateGroupLoan(draft("DEMO-GR-02", {}), g).members).toBe("Include at least one member, with an amount.")
  })

  it("names the member whose amount is invalid, and counts only valid ones", () => {
    const g = getGroup("DEMO-GR-02")!
    const d = draft("DEMO-GR-02", { "DEMO-CL-09": "700", "DEMO-CL-02": "0" })
    expect(validateGroupLoan(d, g)["member-DEMO-CL-02"]).toMatch(/^Kojo Example: Enter an amount above zero/)
    expect(readyCount(d, g)).toBe(1)
    expect(totalPrincipal(d, g)).toEqual({ minor: 70000, currency: "GHS" })
  })

  it("won't include a member who lacks what any borrower needs", () => {
    const g = getGroup("DEMO-GR-02")!
    const d = draft("DEMO-GR-02", { "DEMO-CL-05": "500" })
    expect(validateGroupLoan(d, g)["member-DEMO-CL-05"]).toMatch(/Akos Fixture can't be included: No primary phone/)
    expect(readyCount(d, g)).toBe(0)
  })

  it("uses the product's currency for every amount", () => {
    const g = getGroup("DEMO-GR-02")!
    const d = draft("DEMO-GR-02", { "DEMO-CL-09": "100" }, { product: "Equipment loan (USD)" })
    expect(totalPrincipal(d, g)?.currency).toBe("USD")
    // No product yet: the amount counts as ready, but no currency is assumed.
    const none = draft("DEMO-GR-02", { "DEMO-CL-09": "100" }, { product: "" })
    expect(readyCount(none, g)).toBe(1)
    expect(totalPrincipal(none, g)).toBeNull()
  })

  it("checks terms exactly as an individual application does", () => {
    const g = getGroup("DEMO-GR-02")!
    const d = draft("DEMO-GR-02", { "DEMO-CL-09": "700" }, { installments: "0", firstRepaymentOn: "2026-11-01" })
    const individual = validateTerms({ ...EMPTY_APPLICATION, ...d, principal: "700" })
    const group = validateGroupLoan(d, g)
    expect(group.installments).toBe(individual.installments)
    expect(group.firstRepaymentOn).toBe(individual.firstRepaymentOn)
  })

  it("needs a liability choice", () => {
    const g = getGroup("DEMO-GR-02")!
    expect(validateGroupLoan(draft("DEMO-GR-02", { "DEMO-CL-09": "700" }, { liability: "" }), g).liability).toMatch(/responsible/)
  })

  it("shows no group formula: complete terms give the same unavailable calculation", () => {
    expect(groupCalculation(draft("DEMO-GR-02", { "DEMO-CL-09": "700" })).state).toBe("unavailable")
    expect(groupCalculation(draft("DEMO-GR-02", {}, { rate: "" })).state).toBe("incomplete")
  })

  it("passes a complete application without saving it", async () => {
    const g = getGroup("DEMO-GR-02")!
    const r = await checkGroupLoan(draft("DEMO-GR-02", { "DEMO-CL-09": "700", "DEMO-CL-02": "1250.50" }), g)
    expect(r.ok).toBe(true)
  })
})

describe("form a group (F67)", () => {
  it("needs a name, a unique code and a past formed date; meeting details are optional", () => {
    const e = validateGroup({ name: "", code: "OSU-01", formedOn: "2026-12-01", meetingDay: "", meetingFrequency: "", meetingPlace: "", notes: "" })
    expect(e).toEqual({ name: "Enter the group's name.", code: "OSU-01 is already used by another group.", formedOn: "The formed date can't be in the future." })
    expect(validateGroup({ name: "New", code: "new-04", formedOn: "2026-11-01", meetingDay: "", meetingFrequency: "", meetingPlace: "", notes: "" })).toEqual({})
  })
})

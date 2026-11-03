import { afterEach, describe, expect, it } from "vitest"
import {
  DEFAULT_CONTACT_AT,
  accounts,
  contactsFor,
  logContact,
  outcomesFor,
  promiseStatus,
  queryAccounts,
  resetLoggedContacts,
  validateContact,
  type ContactDraft,
} from "@/lib/api/collections"
import { computeSnapshot } from "@/lib/api/dashboard"
import { loanPosition } from "@/lib/domain/loan-position"

const blank: ContactDraft = { channel: "", outcome: "", at: DEFAULT_CONTACT_AT, amount: "", by: "", note: "" }
const ln2 = () => accounts().find((a) => a.ref === "DEMO-LN-002")!

afterEach(() => resetLoggedContacts())

describe("collections (B2-06, F58, F59)", () => {
  it("lists the accounts with past-due amounts, matching the dashboard and the loan record", () => {
    const list = accounts()
    expect(list.map((a) => [a.ref, a.daysOverdue])).toEqual([
      ["DEMO-LN-002", 79],
      ["DEMO-LN-001", 7],
    ])
    expect(list.length).toBe(computeSnapshot().attention.overdueAccounts)
    const p1 = loanPosition("DEMO-LN-001")!
    expect(list[1].position.pastDue).toEqual(p1.pastDue) // GH₵100, not the GH₵1,100 balance
    expect(list[1].position.totalBalance).toEqual(p1.totalBalance)
  })

  it("keeps branch totals unchanged by filters, and names an empty age band precisely", () => {
    const r = queryAccounts({ age: "31-60" })
    expect(r.total).toBe(0)
    expect(r.branch.accounts).toBe(2)
    expect(r.branch.pastDue).toEqual([{ currency: "GHS", minor: 490000 }])
    expect(queryAccounts({ age: "60+" }).rows.map((a) => a.ref)).toEqual(["DEMO-LN-002"])
  })

  it("works out promise status from receipts: kept, broken and open", () => {
    const status = contactsFor("DEMO-LN-002")
      .filter((x) => x.promise)
      .map((x) => [x.id, promiseStatus(x)!.status])
    expect(Object.fromEntries(status)).toEqual({ "DEMO-CT-01": "kept", "DEMO-CT-03": "broken", "DEMO-CT-04": "broken", "DEMO-CT-06": "open" })
    expect(ln2().openPromise?.id).toBe("DEMO-CT-06")
  })

  it("has no prior contact for DEMO-LN-001", () => {
    expect(accounts().find((a) => a.ref === "DEMO-LN-001")!.lastContact).toBeNull()
  })

  it("offers only outcomes the channel can produce, and rejects contradictions", () => {
    expect(outcomesFor("email")).not.toContain("no_answer")
    expect(outcomesFor("in_person")).toContain("not_found")
    expect(validateContact({ ...blank, channel: "email", outcome: "no_answer" }, ln2()).outcome).toMatch(/isn't possible by Email/)
  })

  it("requires amount and date for every promise, and refuses future contacts", () => {
    for (const channel of ["call", "sms", "email", "whatsapp", "in_person"] as const) {
      const e = validateContact({ ...blank, channel, outcome: "promised" }, ln2())
      expect(e.amount, channel).toBeTruthy()
      expect(e.by, channel).toBeTruthy()
    }
    expect(validateContact({ ...blank, channel: "call", outcome: "no_answer", at: "2026-11-03T10:00" }, ln2()).at).toMatch(/future/)
    expect(validateContact({ ...blank, channel: "call", outcome: "promised", amount: "500", by: "2026-10-01" }, ln2()).by).toMatch(/before the contact/)
  })

  it("logs a contact in memory only, and says-paid never creates a payment", async () => {
    const before = accounts().find((a) => a.ref === "DEMO-LN-001")!
    const r = await logContact("DEMO-LN-001", { ...blank, channel: "call", outcome: "says_paid" }, before)
    expect(r.ok).toBe(true)
    const after = accounts().find((a) => a.ref === "DEMO-LN-001")!
    expect(after.lastContact?.outcome).toBe("says_paid")
    expect(after.position.pastDue).toEqual(before.position.pastDue)
  })
})

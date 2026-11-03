import { describe as group, expect, it } from "vitest"
import {
  PAGE_SIZE,
  RETENTION_START,
  describe,
  formatFieldValue,
  getActivity,
  parseDecimal,
  queryActivities,
  sentenceText,
} from "@/lib/api/activities"
import { demoActivityEvents } from "@/lib/activity-fixtures"
import { presetRange } from "@/lib/date-range"
import { DEMO_TODAY } from "@/lib/fixtures"

const LAST_30 = presetRange("last-30", DEMO_TODAY)
const byId = (id: string) => demoActivityEvents.find((e) => e.id === id)!

group("values", () => {
  it("parses six-decimal amounts into minor units without floats", () => {
    expect(parseDecimal("400.000000", "GHS")).toEqual({ minor: 40000, currency: "GHS" })
    expect(parseDecimal("1234.567000", "GHS").minor).toBe(123457)
    expect(parseDecimal("0.004999", "GHS").minor).toBe(0)
    expect(parseDecimal("0.005000", "GHS").minor).toBe(1)
    expect(parseDecimal("-30.000000", "GHS").minor).toBe(-3000)
  })

  it("never shows raw None, snake_case or six decimals", () => {
    expect(formatFieldValue("business_type", "None")).toBe("Not set")
    expect(formatFieldValue("business_type", null)).toBe("Not set")
    expect(formatFieldValue("requested_amount", "10000.000000")).toBe("GH₵10,000.00")
    expect(formatFieldValue("interest_rate", "12.500000")).toBe("12.5%")
    expect(formatFieldValue("repayment_frequency", "MONTHLY")).toBe("Monthly")
  })
})

group("sentences", () => {
  it("reads as actor, verb, reference and amount", () => {
    expect(sentenceText(describe(byId("DEMO-EV-0117")))).toBe("Kwesi Officer recorded a repayment on DEMO-LN-009 (GH₵400.00)")
    expect(describe(byId("DEMO-EV-0116")).actor).toBe("System")
  })

  it("labels a save with no differences truthfully", () => {
    expect(describe(byId("DEMO-EV-0124"))).toMatchObject({ verb: "saved", object: "Branch settings", context: "no fields changed" })
  })

  it("summarises status changes in words", () => {
    expect(describe(byId("DEMO-EV-0119")).context).toBe("Active → Defaulted")
  })
})

group("grouping", () => {
  it("groups accounting entries under their cause only with a shared correlation ID", () => {
    const page = queryActivities({ range: { from: "2026-10-27", to: "2026-10-27" } })
    expect(page.items).toHaveLength(1)
    expect(page.items[0]!.event.id).toBe("DEMO-EV-0117")
    expect(page.items[0]!.related.map((r) => r.id).sort()).toEqual(["DEMO-EV-0115", "DEMO-EV-0116"])
  })

  it("keeps same-moment events apart when nothing links them", () => {
    const page = queryActivities({ range: { from: "2026-10-24", to: "2026-10-24" } })
    expect(page.items.map((i) => i.event.id)).toEqual(["DEMO-EV-0113", "DEMO-EV-0112"])
    expect(page.items.every((i) => i.related.length === 0)).toBe(true)
  })

  it("finds an event's linked events regardless of filters", () => {
    expect(getActivity("DEMO-EV-0116")!.related.map((r) => r.id).sort()).toEqual(["DEMO-EV-0115", "DEMO-EV-0117"])
    expect(getActivity("nope")).toBeNull()
  })
})

group("query", () => {
  it("paginates grouped items over the whole range", () => {
    const p1 = queryActivities({ range: LAST_30 })
    expect(p1.total).toBe(18)
    expect(p1.pageCount).toBe(Math.ceil(18 / PAGE_SIZE))
    expect(p1.items).toHaveLength(PAGE_SIZE)
  })

  it("flags a page that starts mid-day, so the date heading repeats", () => {
    expect(queryActivities({ range: LAST_30, page: 2 }).continuesDay).toBe(true)
    expect(queryActivities({ range: LAST_30, page: 1 }).continuesDay).toBe(false)
  })

  it("searches every page, not only the visible one", () => {
    const hits = queryActivities({ range: LAST_30, q: "kofi" }).items.map((i) => i.event.id)
    expect(hits).toEqual(["DEMO-EV-0117", "DEMO-EV-0106"])
    // DEMO-EV-0106 sits on page 3 when unfiltered.
    expect(queryActivities({ range: LAST_30, page: 3 }).items.some((i) => i.event.id === "DEMO-EV-0106")).toBe(true)
  })

  it("keeps linked accounting entries with a matching business event", () => {
    const item = queryActivities({ range: LAST_30, q: "DEMO-LN-009" }).items.find((i) => i.event.id === "DEMO-EV-0117")!
    expect(item.related.map((r) => r.id).sort()).toEqual(["DEMO-EV-0115", "DEMO-EV-0116"])
  })

  it("filters by actor, module and action", () => {
    expect(queryActivities({ range: LAST_30, actor: "system" }).items.every((i) => i.event.actor_id === null)).toBe(true)
    expect(queryActivities({ range: LAST_30, module: "accounting" }).total).toBe(3)
    expect(queryActivities({ range: LAST_30, action: "disbursed" }).total).toBe(3)
  })

  it("discloses the retention window instead of pretending older history is empty", () => {
    const page = queryActivities({ range: { from: "2026-07-01", to: DEMO_TODAY } })
    expect(page.clippedFrom).toBe(RETENTION_START)
    expect(RETENTION_START).toBe("2026-08-05")
    expect(queryActivities({ range: LAST_30 }).clippedFrom).toBeNull()
  })
})

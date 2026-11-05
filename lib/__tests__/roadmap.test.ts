import { describe, expect, it } from "vitest"
import { allDestinations } from "@/lib/nav"
import { plannedIncrement } from "@/lib/roadmap"

describe("placeholder scope labels (F75)", () => {
  it("no longer lists Credit Score, Calendar or Groups as placeholders, now that they're built", () => {
    expect(plannedIncrement("/credit-score")).toBeNull()
    expect(plannedIncrement("/calendar")).toBeNull()
    expect(plannedIncrement("/groups")).toBeNull()
  })

  it("marks the uninspected modules as blocked rather than planned as if ready", () => {
    for (const path of ["/savings", "/investments", "/expenses", "/accounting", "/reports", "/bulk-upload"]) {
      expect(plannedIncrement(path)?.blocked, path).toBeTruthy()
    }
  })

  it("gives Expenses a destination of its own", () => {
    expect(allDestinations().some((d) => d.href === "/expenses" && d.group === "Money")).toBe(true)
  })
})

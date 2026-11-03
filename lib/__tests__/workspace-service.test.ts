import { afterEach, describe, expect, it } from "vitest"
import { computeSnapshot } from "@/lib/api/dashboard"
import {
  PermissionError,
  approvalCounts,
  computeApprovals,
  currentUser,
  decisionBlocker,
  resetReadState,
  setNotificationRead,
  unreadCount,
} from "@/lib/api/workspace"
import { demoApprovals } from "@/lib/workspace-fixtures"

const manager = currentUser(null)
const officer = currentUser("officer")
const byId = (id: string) => demoApprovals.find((a) => a.id === id)!

describe("approval scopes", () => {
  it("personal scope: waiting means assigned to you; other tabs mean you raised or acted on it", () => {
    const mine = computeApprovals("mine", manager)
    expect(mine.counts).toEqual({ waiting: 0, in_progress: 1, completed: 3 })
    expect(mine.rows.map((a) => a.id).sort()).toEqual(["DEMO-AP-04", "DEMO-AP-05", "DEMO-AP-06", "DEMO-AP-08"])
  })

  it("branch scope covers every request", () => {
    expect(computeApprovals("branch", manager).counts).toEqual({ waiting: 3, in_progress: 1, completed: 4 })
  })

  it("keeps completed decisions for 30 days and counts the older ones", () => {
    expect(computeApprovals("branch", manager).olderCompleted).toBe(1)
    expect(computeApprovals("branch", manager).rows.some((a) => a.id === "DEMO-AP-09")).toBe(false)
  })

  it("refuses branch scope to roles without access", () => {
    expect(() => computeApprovals("branch", officer)).toThrow(PermissionError)
    expect(computeApprovals("mine", officer).counts).toEqual({ waiting: 0, in_progress: 1, completed: 4 })
  })

  it("gives the dashboard the same counts as the Approvals page", () => {
    const counts = approvalCounts(manager.id)
    expect(counts).toEqual({
      mine: computeApprovals("mine", manager).counts.waiting,
      branch: computeApprovals("branch", manager).counts.waiting,
    })
    expect(computeSnapshot().attention).toMatchObject({ approvalsMine: counts.mine, approvalsBranch: counts.branch })
  })
})

describe("decision blockers", () => {
  it("applies maker-checker before anything else", () => {
    expect(decisionBlocker(byId("DEMO-AP-03"), manager.id)).toMatch(/maker-checker/)
  })

  it("names who must act", () => {
    expect(decisionBlocker(byId("DEMO-AP-01"), manager.id)).toBe("Only the assigned approver can decide at level 1.")
    expect(decisionBlocker(byId("DEMO-AP-01"), "DEMO-USR-03")).toBeNull()
  })

  it("explains sent-back and completed requests", () => {
    expect(decisionBlocker(byId("DEMO-AP-04"), manager.id)).toMatch(/Sent back/)
    expect(decisionBlocker(byId("DEMO-AP-05"), manager.id)).toMatch(/final decision/)
  })
})

describe("notification read state", () => {
  afterEach(() => resetReadState())

  it("starts with 3 unread and changes only in this session's memory", async () => {
    expect(unreadCount()).toBe(3)
    await setNotificationRead(["DEMO-NT-01"], true)
    expect(unreadCount()).toBe(2)
    expect(computeSnapshot().attention.unreadAlerts).toBe(2)
    await setNotificationRead(["DEMO-NT-01"], false)
    expect(unreadCount()).toBe(3)
  })
})

/**
 * Workspace services: approvals and notifications. Read-only except for the notification
 * read state, which lives in memory for this browser session only (a mocked service boundary).
 * Nothing here can approve, reject or change a real record.
 */
import { useSyncExternalStore } from "react"
import { DEMO_AS_OF } from "@/lib/fixtures"
import {
  demoApprovals,
  demoNotifications,
  demoUsers,
  type ApprovalState,
  type DemoApprovalRequest,
  type DemoNotification,
  type DemoUser,
} from "@/lib/workspace-fixtures"

export class PermissionError extends Error {}
export class RequestError extends Error {}

/** Prototype-only: ?as=officer views the Workspace as a loan officer without branch access. */
export function currentUser(as?: string | null): DemoUser {
  return demoUsers.find((u) => u.id === (as === "officer" ? "DEMO-USR-02" : "DEMO-USR-01"))!
}

export type Simulation = "none" | "slow" | "error"

async function respond<T>(compute: () => T, sim: Simulation): Promise<T> {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 300))
  if (sim === "error") throw new RequestError("The server didn't respond. Nothing was changed.")
  return compute()
}

// ── Approvals ────────────────────────────────────────────────────────────

export type ApprovalScope = "mine" | "branch"

/** Completed decisions older than this are only in the audit history (documented rule). */
export const COMPLETED_HISTORY_DAYS = 30

const DAY = 86_400_000

export function involves(a: DemoApprovalRequest, userId: string) {
  return a.assigneeId === userId || a.requesterId === userId || a.decisions.some((d) => d.by === userId)
}

/**
 * Personal scope, per tab:
 * - Waiting: assigned to you to decide now
 * - In progress: sent back, on requests you raised or acted on
 * - Completed: decided, on requests you raised or acted on
 */
export function inScope(a: DemoApprovalRequest, scope: ApprovalScope, userId: string) {
  if (scope === "branch") return true
  return a.state === "waiting" ? a.assigneeId === userId : involves(a, userId)
}

export function withinHistory(a: DemoApprovalRequest, asOf = DEMO_AS_OF) {
  return a.state !== "completed" || new Date(asOf).getTime() - new Date(a.completedAt!).getTime() <= COMPLETED_HISTORY_DAYS * DAY
}

export type ApprovalList = {
  scope: ApprovalScope
  rows: DemoApprovalRequest[]
  counts: Record<ApprovalState, number>
  /** Completed decisions in scope but older than the history window. */
  olderCompleted: number
}

export function computeApprovals(scope: ApprovalScope, user: DemoUser): ApprovalList {
  if (scope === "branch" && !user.canSeeBranchApprovals) {
    throw new PermissionError("Branch-wide approvals are limited to managers, supervisors and analysts.")
  }
  const scoped = demoApprovals.filter((a) => inScope(a, scope, user.id))
  const rows = scoped.filter((a) => withinHistory(a))
  return {
    scope,
    rows,
    counts: {
      waiting: rows.filter((a) => a.state === "waiting").length,
      in_progress: rows.filter((a) => a.state === "in_progress").length,
      completed: rows.filter((a) => a.state === "completed").length,
    },
    olderCompleted: scoped.length - rows.length,
  }
}

export function fetchApprovals(scope: ApprovalScope, user: DemoUser, sim: Simulation = "none") {
  return respond(() => computeApprovals(scope, user), sim)
}

/** Why the current user can or can't decide. Decisions themselves aren't wired in the prototype. */
export function decisionBlocker(a: DemoApprovalRequest, userId: string): string | null {
  if (a.state === "completed") return "A final decision has been recorded."
  if (a.state === "in_progress") return "Sent back to the requester. It can be decided once they resubmit."
  if (a.requesterId === userId) return "You raised this request, so someone else must decide it (maker-checker)."
  if (a.assigneeId !== userId) return `Only the assigned approver can decide at level ${a.level.current}.`
  return null
}

/** Approval counts the dashboard shows, from the same scoping rule. */
export function approvalCounts(userId: string) {
  const waiting = demoApprovals.filter((a) => a.state === "waiting")
  return { mine: waiting.filter((a) => inScope(a, "mine", userId)).length, branch: waiting.length }
}

// ── Notifications ────────────────────────────────────────────────────────

/**
 * In-memory read state for this session, layered over the fixtures. The top bar, dashboard and
 * Notifications page all read it, so unread counts agree everywhere.
 */
const readOverrides = new Map<string, boolean>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version += 1
  listeners.forEach((l) => l())
}

export function isRead(n: DemoNotification) {
  return readOverrides.get(n.id) ?? n.read
}

export function unreadCount() {
  return demoNotifications.filter((n) => !isRead(n)).length
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Re-renders when any read state changes. */
export function useReadStateVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0)
}

export function useUnreadCount() {
  useReadStateVersion()
  return unreadCount()
}

/** Mocked mutation. Changes only this session's in-memory state; never a real notification. */
export async function setNotificationRead(ids: string[], read: boolean) {
  await new Promise((r) => setTimeout(r, 120))
  ids.forEach((id) => readOverrides.set(id, read))
  emit()
}

/** Tests only. */
export function resetReadState() {
  readOverrides.clear()
  emit()
}

export function fetchNotifications(sim: Simulation = "none") {
  return respond(() => demoNotifications, sim)
}

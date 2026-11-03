/**
 * FICTIONAL Workspace data: staff, approval requests and notifications. Invented for the
 * prototype; the real app loads these from its approval and notification services.
 */
import { ghs } from "@/lib/fixtures"
import type { Money } from "@/lib/types"

export type DemoUser = { id: string; name: string; role: string; canSeeBranchApprovals: boolean }

export const demoUsers: DemoUser[] = [
  { id: "DEMO-USR-01", name: "Abena Demo", role: "Branch manager", canSeeBranchApprovals: true },
  { id: "DEMO-USR-02", name: "Kwesi Officer", role: "Loan officer", canSeeBranchApprovals: false },
  { id: "DEMO-USR-03", name: "Adjoa Analyst", role: "Credit analyst", canSeeBranchApprovals: true },
  { id: "DEMO-USR-04", name: "Yaa Supervisor", role: "Operations supervisor", canSeeBranchApprovals: true },
]

export const userName = (id: string | null) => demoUsers.find((u) => u.id === id)?.name ?? "Unassigned"

// ── Approvals ────────────────────────────────────────────────────────────

/**
 * - waiting: needs a decision at its current level
 * - in_progress: sent back to the requester for more information; nobody can decide until they respond
 * - completed: a final decision was recorded
 */
export type ApprovalState = "waiting" | "in_progress" | "completed"

export type ApprovalDecision = {
  by: string
  level: number
  outcome: "approved" | "rejected" | "returned"
  at: string
  note?: string
}

export type DemoApprovalRequest = {
  id: string
  kind: string
  loanRef: string
  borrower: string
  amount: Money
  requesterId: string
  /** Who must act next. Null once completed. */
  assigneeId: string | null
  level: { current: number; total: number }
  state: ApprovalState
  submittedAt: string
  completedAt?: string
  outcome?: "approved" | "rejected"
  decisions: ApprovalDecision[]
  evidence: { label: string; provided: boolean }[]
  /** Recorded eligibility blockers. Empty = none recorded, not "eligible". */
  blockers: string[]
}

export const demoApprovals: DemoApprovalRequest[] = [
  {
    id: "DEMO-AP-01",
    kind: "Loan approval",
    loanRef: "DEMO-LN-004",
    borrower: "Esi Placeholder",
    amount: ghs(10000),
    requesterId: "DEMO-USR-02",
    assigneeId: "DEMO-USR-03",
    level: { current: 1, total: 2 },
    state: "waiting",
    submittedAt: "2026-11-01T10:15:00Z",
    decisions: [],
    evidence: [
      { label: "Ghana Card (ID)", provided: true },
      { label: "Business records, 6 months", provided: true },
      { label: "Guarantor form", provided: false },
    ],
    blockers: ["Guarantor form missing"],
  },
  {
    id: "DEMO-AP-02",
    kind: "Collateral verification",
    loanRef: "DEMO-LN-004",
    borrower: "Esi Placeholder",
    amount: ghs(3000),
    requesterId: "DEMO-USR-02",
    assigneeId: "DEMO-USR-04",
    level: { current: 1, total: 1 },
    state: "waiting",
    submittedAt: "2026-10-30T14:40:00Z",
    decisions: [],
    evidence: [
      { label: "Vehicle registration", provided: true },
      { label: "Valuation report", provided: false },
    ],
    blockers: [],
  },
  {
    id: "DEMO-AP-03",
    kind: "Write-off",
    loanRef: "DEMO-LN-002",
    borrower: "Kojo Example",
    amount: ghs(4000),
    requesterId: "DEMO-USR-01",
    assigneeId: "DEMO-USR-04",
    level: { current: 1, total: 2 },
    state: "waiting",
    submittedAt: "2026-10-26T08:05:00Z",
    decisions: [],
    evidence: [
      { label: "Collections history", provided: true },
      { label: "Recovery assessment", provided: true },
    ],
    blockers: [],
  },
  {
    id: "DEMO-AP-04",
    kind: "Penalty waiver",
    loanRef: "DEMO-LN-009",
    borrower: "Kofi Sample",
    amount: ghs(30),
    requesterId: "DEMO-USR-02",
    assigneeId: "DEMO-USR-02",
    level: { current: 1, total: 1 },
    state: "in_progress",
    submittedAt: "2026-10-29T11:20:00Z",
    decisions: [
      { by: "DEMO-USR-01", level: 1, outcome: "returned", at: "2026-10-30T09:12:00Z", note: "Attach the borrower's written request." },
    ],
    evidence: [{ label: "Borrower's written request", provided: false }],
    blockers: [],
  },
  {
    id: "DEMO-AP-05",
    kind: "Disbursement",
    loanRef: "DEMO-LN-008",
    borrower: "Efua Demo",
    amount: ghs(3000),
    requesterId: "DEMO-USR-02",
    assigneeId: null,
    level: { current: 1, total: 1 },
    state: "completed",
    outcome: "approved",
    submittedAt: "2026-10-04T15:00:00Z",
    completedAt: "2026-10-05T08:30:00Z",
    decisions: [{ by: "DEMO-USR-01", level: 1, outcome: "approved", at: "2026-10-05T08:30:00Z" }],
    evidence: [{ label: "Signed agreement", provided: true }],
    blockers: [],
  },
  {
    id: "DEMO-AP-06",
    kind: "Loan approval",
    loanRef: "DEMO-LN-009",
    borrower: "Kofi Sample",
    amount: ghs(1500),
    requesterId: "DEMO-USR-02",
    assigneeId: null,
    level: { current: 2, total: 2 },
    state: "completed",
    outcome: "approved",
    submittedAt: "2026-10-09T09:00:00Z",
    completedAt: "2026-10-11T13:45:00Z",
    decisions: [
      { by: "DEMO-USR-03", level: 1, outcome: "approved", at: "2026-10-10T10:00:00Z" },
      { by: "DEMO-USR-01", level: 2, outcome: "approved", at: "2026-10-11T13:45:00Z" },
    ],
    evidence: [
      { label: "Ghana Card (ID)", provided: true },
      { label: "Market stall permit", provided: true },
    ],
    blockers: [],
  },
  {
    id: "DEMO-AP-07",
    kind: "Loan approval",
    loanRef: "DEMO-LN-001",
    borrower: "Ama Sample",
    amount: ghs(1000),
    requesterId: "DEMO-USR-02",
    assigneeId: null,
    level: { current: 1, total: 1 },
    state: "completed",
    outcome: "approved",
    submittedAt: "2026-10-16T12:00:00Z",
    completedAt: "2026-10-18T16:20:00Z",
    decisions: [{ by: "DEMO-USR-03", level: 1, outcome: "approved", at: "2026-10-18T16:20:00Z" }],
    evidence: [{ label: "Ghana Card (ID)", provided: true }],
    blockers: [],
  },
  {
    id: "DEMO-AP-08",
    kind: "Loan approval",
    loanRef: "DEMO-LN-010",
    borrower: "Nana Fictional",
    amount: ghs(6000),
    requesterId: "DEMO-USR-02",
    assigneeId: null,
    level: { current: 1, total: 2 },
    state: "completed",
    outcome: "rejected",
    submittedAt: "2026-10-20T10:30:00Z",
    completedAt: "2026-10-22T11:05:00Z",
    decisions: [
      { by: "DEMO-USR-01", level: 1, outcome: "rejected", at: "2026-10-22T11:05:00Z", note: "Existing arrears on another lender's facility." },
    ],
    evidence: [{ label: "Credit bureau report", provided: true }],
    blockers: ["Arrears with another lender"],
  },
  {
    // Older than 30 days: outside the Completed tab, reachable through the audit history route.
    id: "DEMO-AP-09",
    kind: "Loan approval",
    loanRef: "DEMO-LN-003",
    borrower: "Kojo Example",
    amount: ghs(2000),
    requesterId: "DEMO-USR-02",
    assigneeId: null,
    level: { current: 1, total: 1 },
    state: "completed",
    outcome: "approved",
    submittedAt: "2026-08-01T09:00:00Z",
    completedAt: "2026-08-02T09:00:00Z",
    decisions: [{ by: "DEMO-USR-01", level: 1, outcome: "approved", at: "2026-08-02T09:00:00Z" }],
    evidence: [],
    blockers: [],
  },
]

// ── Notifications ────────────────────────────────────────────────────────

export type NotificationType = "repayment_due" | "payment_received" | "arrears" | "approval_requested" | "approval_decided" | "document"

export const NOTIFICATION_TYPES: Record<NotificationType, string> = {
  repayment_due: "Repayment due",
  payment_received: "Payment received",
  arrears: "Arrears",
  approval_requested: "Approval requested",
  approval_decided: "Approval decided",
  document: "Document",
}

export type Urgency = "high" | "normal" | "low"

export type DemoNotification = {
  id: string
  at: string
  type: NotificationType
  urgency: Urgency
  title: string
  detail: string
  borrower?: string
  loanRef?: string
  /** Where "Open record" goes. */
  href: string
  read: boolean
  /**
   * The work behind the alert, from its own source of truth. Independent of `read`:
   * reading the alert doesn't resolve it. Null = informational, no task.
   */
  task: { label: string; resolved: boolean } | null
}

export const demoNotifications: DemoNotification[] = [
  {
    id: "DEMO-NT-01",
    at: "2026-11-02T07:00:00Z",
    type: "repayment_due",
    urgency: "normal",
    title: "Installment due today",
    detail: "Installment 2 of 4, GH₵300.00",
    borrower: "Ama Sample",
    loanRef: "DEMO-LN-001",
    href: "/loans/DEMO-LN-001",
    read: false,
    task: { label: "Collect GH₵400.00 to bring current", resolved: false },
  },
  {
    id: "DEMO-NT-02",
    at: "2026-11-02T07:00:00Z",
    type: "repayment_due",
    urgency: "normal",
    title: "Installment due today",
    detail: "Installment 3 of 4, GH₵400.00",
    borrower: "Kofi Sample",
    loanRef: "DEMO-LN-009",
    href: "/loans/DEMO-LN-009",
    read: true,
    task: { label: "Collect GH₵400.00", resolved: false },
  },
  {
    id: "DEMO-NT-03",
    at: "2026-11-01T10:15:00Z",
    type: "approval_requested",
    urgency: "normal",
    title: "Loan approval requested",
    detail: "GH₵10,000.00, waiting on Adjoa Analyst (level 1 of 2)",
    borrower: "Esi Placeholder",
    loanRef: "DEMO-LN-004",
    href: "/workspace/approvals?scope=branch&id=DEMO-AP-01",
    read: false,
    task: { label: "Decision pending", resolved: false },
  },
  {
    id: "DEMO-NT-04",
    at: "2026-11-01T06:00:00Z",
    type: "arrears",
    urgency: "high",
    title: "Account 79 days overdue",
    detail: "GH₵4,800.00 in arrears across 3 installments",
    borrower: "Kojo Example",
    loanRef: "DEMO-LN-002",
    href: "/collections",
    read: false,
    task: { label: "Follow up on arrears", resolved: false },
  },
  {
    id: "DEMO-NT-05",
    at: "2026-10-30T09:12:00Z",
    type: "approval_decided",
    urgency: "low",
    title: "Penalty waiver sent back",
    detail: "Returned to Kwesi Officer for the borrower's written request",
    borrower: "Kofi Sample",
    loanRef: "DEMO-LN-009",
    href: "/workspace/approvals?scope=branch&tab=in_progress&id=DEMO-AP-04",
    read: true,
    task: null,
  },
  {
    id: "DEMO-NT-06",
    at: "2026-10-27T15:30:00Z",
    type: "payment_received",
    urgency: "low",
    title: "Payment received",
    detail: "GH₵400.00 by mobile money",
    borrower: "Kofi Sample",
    loanRef: "DEMO-LN-009",
    href: "/repayments",
    read: true,
    task: null,
  },
  {
    id: "DEMO-NT-07",
    at: "2026-10-26T07:00:00Z",
    type: "repayment_due",
    urgency: "normal",
    title: "Installment due today",
    detail: "Installment 2 of 4, GH₵400.00",
    borrower: "Kofi Sample",
    loanRef: "DEMO-LN-009",
    href: "/loans/DEMO-LN-009",
    read: true,
    // Paid the next day: the alert is old, the task behind it is done.
    task: { label: "Collect GH₵400.00", resolved: true },
  },
  {
    id: "DEMO-NT-08",
    at: "2026-10-24T12:00:00Z",
    type: "document",
    urgency: "low",
    title: "Agreement signed",
    detail: "All signatures recorded",
    borrower: "Ama Sample",
    loanRef: "DEMO-LN-001",
    href: "/loans/DEMO-LN-001",
    read: true,
    task: null,
  },
]

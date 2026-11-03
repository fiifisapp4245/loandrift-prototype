/**
 * FICTIONAL activity history, shaped like a raw audit feed would arrive from a backend: snake_case
 * field names, "None" for missing values, six-decimal amount strings, and correlation IDs only on
 * some events. The UI must translate all of this; nothing here is shown verbatim in the main feed.
 */

export type ActivityModule = "loans" | "repayments" | "clients" | "approvals" | "accounting" | "collections" | "collateral" | "settings"

export type ActivityAction =
  | "created"
  | "updated"
  | "submitted"
  | "approved"
  | "rejected"
  | "returned"
  | "disbursed"
  | "repayment_recorded"
  | "journal_posted"
  | "status_changed"

export type RawChange = { field: string; before: string | null; after: string | null }

export type RawActivityEvent = {
  id: string
  /** When it happened (source time). */
  occurred_at: string
  /** When the system wrote it, if different. */
  recorded_at?: string
  /** Null = done by the system. */
  actor_id: string | null
  module: ActivityModule
  action: ActivityAction
  entity: { type: string; ref: string; label?: string }
  /** Raw decimal string with six places, e.g. "400.000000". */
  amount?: { value: string; currency: string }
  /** [] = saved with no differences. undefined = the source didn't record a diff. */
  changes?: RawChange[]
  /** Present only when the backend links side effects (e.g. journals) to their cause. */
  correlation_id: string | null
  note?: string
  payload: Record<string, unknown>
}

const amt = (value: string, currency = "GHS") => ({ value, currency })

export const demoActivityEvents: RawActivityEvent[] = [
  {
    id: "DEMO-EV-0125",
    occurred_at: "2026-11-02T08:55:00Z",
    actor_id: "DEMO-USR-02",
    module: "clients",
    action: "updated",
    entity: { type: "client", ref: "DEMO-CL-03", label: "Esi Placeholder" },
    changes: [
      { field: "business_type", before: "None", after: "Retail" },
      { field: "monthly_income", before: "None", after: "2500.000000" },
    ],
    correlation_id: null,
    payload: { client_id: 3, business_type: "Retail", monthly_income: "2500.000000", updated_via: "web" },
  },
  {
    id: "DEMO-EV-0124",
    occurred_at: "2026-11-02T08:40:00Z",
    actor_id: "DEMO-USR-01",
    module: "settings",
    action: "updated",
    entity: { type: "settings", ref: "BRANCH-SETTINGS", label: "Branch settings" },
    changes: [],
    correlation_id: null,
    payload: { section: "branch_profile", fields_submitted: 6, fields_changed: 0 },
  },
  {
    id: "DEMO-EV-0123",
    occurred_at: "2026-11-01T10:15:00Z",
    actor_id: "DEMO-USR-02",
    module: "approvals",
    action: "submitted",
    entity: { type: "approval", ref: "DEMO-AP-01", label: "Loan approval for DEMO-LN-004" },
    amount: amt("10000.000000"),
    correlation_id: null,
    payload: { approval_id: "DEMO-AP-01", level: 1, of_levels: 2, assignee: "DEMO-USR-03" },
  },
  {
    id: "DEMO-EV-0122",
    occurred_at: "2026-11-01T09:30:00Z",
    actor_id: "DEMO-USR-02",
    module: "loans",
    action: "created",
    entity: { type: "loan", ref: "DEMO-LN-004", label: "Esi Placeholder" },
    amount: amt("10000.000000"),
    correlation_id: null,
    payload: { loan_id: 4, product: "MONTHLY_SME", requested_amount: "10000.000000", status: "REGISTERED", guarantor_id: null },
  },
  {
    id: "DEMO-EV-0121",
    occurred_at: "2026-10-30T14:40:00Z",
    actor_id: "DEMO-USR-02",
    module: "approvals",
    action: "submitted",
    entity: { type: "approval", ref: "DEMO-AP-02", label: "Collateral verification for DEMO-LN-004" },
    amount: amt("3000.000000"),
    correlation_id: null,
    payload: { approval_id: "DEMO-AP-02", level: 1, of_levels: 1 },
  },
  {
    id: "DEMO-EV-0120",
    occurred_at: "2026-10-30T09:12:00Z",
    actor_id: "DEMO-USR-01",
    module: "approvals",
    action: "returned",
    entity: { type: "approval", ref: "DEMO-AP-04", label: "Penalty waiver for DEMO-LN-009" },
    note: "Attach the borrower's written request.",
    correlation_id: null,
    payload: { approval_id: "DEMO-AP-04", decision: "RETURNED", level: 1 },
  },
  {
    id: "DEMO-EV-0119",
    occurred_at: "2026-10-30T06:00:00Z",
    actor_id: null,
    module: "loans",
    action: "status_changed",
    entity: { type: "loan", ref: "DEMO-LN-002", label: "Kojo Example" },
    changes: [{ field: "status", before: "ACTIVE", after: "DEFAULTED" }],
    correlation_id: null,
    payload: { loan_id: 2, rule: "DAYS_PAST_DUE_GT_60", days_past_due: 76 },
  },
  {
    id: "DEMO-EV-0118",
    occurred_at: "2026-10-29T11:20:00Z",
    actor_id: "DEMO-USR-02",
    module: "approvals",
    action: "submitted",
    entity: { type: "approval", ref: "DEMO-AP-04", label: "Penalty waiver for DEMO-LN-009" },
    amount: amt("30.000000"),
    correlation_id: null,
    payload: { approval_id: "DEMO-AP-04", level: 1, of_levels: 1 },
  },
  {
    id: "DEMO-EV-0117",
    occurred_at: "2026-10-27T15:30:00Z",
    recorded_at: "2026-10-27T15:31:12Z",
    actor_id: "DEMO-USR-02",
    module: "repayments",
    action: "repayment_recorded",
    entity: { type: "loan", ref: "DEMO-LN-009", label: "Kofi Sample" },
    amount: amt("400.000000"),
    correlation_id: "COR-7f3a",
    payload: { receipt_no: "DEMO-RC-0042", method: "MOBILE_MONEY", reference: null, allocated_to_installment: 2 },
  },
  {
    id: "DEMO-EV-0116",
    occurred_at: "2026-10-27T15:31:12Z",
    actor_id: null,
    module: "accounting",
    action: "journal_posted",
    entity: { type: "journal", ref: "DEMO-JRN-2026-10-27-000184" },
    amount: amt("350.000000"),
    correlation_id: "COR-7f3a",
    payload: { lines: [{ account: "1010 Cash - Mobile money", debit: "350.000000" }, { account: "1200 Loans receivable", credit: "350.000000" }] },
  },
  {
    id: "DEMO-EV-0115",
    occurred_at: "2026-10-27T15:31:12Z",
    actor_id: null,
    module: "accounting",
    action: "journal_posted",
    entity: { type: "journal", ref: "DEMO-JRN-2026-10-27-000185" },
    amount: amt("50.000000"),
    correlation_id: "COR-7f3a",
    payload: { lines: [{ account: "1010 Cash - Mobile money", debit: "50.000000" }, { account: "4100 Interest income", credit: "50.000000" }] },
  },
  {
    id: "DEMO-EV-0114",
    occurred_at: "2026-10-26T08:05:00Z",
    actor_id: "DEMO-USR-01",
    module: "approvals",
    action: "submitted",
    entity: { type: "approval", ref: "DEMO-AP-03", label: "Write-off for DEMO-LN-002" },
    amount: amt("4000.000000"),
    correlation_id: null,
    payload: { approval_id: "DEMO-AP-03", level: 1, of_levels: 2 },
  },
  {
    // Legacy path: no correlation ID, so its journal (DEMO-EV-0112) stays a separate event.
    id: "DEMO-EV-0113",
    occurred_at: "2026-10-24T12:10:00Z",
    actor_id: "DEMO-USR-02",
    module: "repayments",
    action: "repayment_recorded",
    entity: { type: "loan", ref: "DEMO-LN-001", label: "Ama Sample" },
    amount: amt("200.000000"),
    correlation_id: null,
    payload: { receipt_no: "DEMO-RC-0039", method: "CASH", reference: "None", allocated_to_installment: 1 },
  },
  {
    id: "DEMO-EV-0112",
    occurred_at: "2026-10-24T12:10:00Z",
    actor_id: null,
    module: "accounting",
    action: "journal_posted",
    entity: { type: "journal", ref: "DEMO-JRN-2026-10-24-000171" },
    amount: amt("200.000000"),
    correlation_id: null,
    payload: { lines: [{ account: "1000 Cash on hand", debit: "200.000000" }, { account: "1200 Loans receivable", credit: "200.000000" }] },
  },
  {
    id: "DEMO-EV-0111",
    occurred_at: "2026-10-22T11:05:00Z",
    actor_id: "DEMO-USR-01",
    module: "approvals",
    action: "rejected",
    entity: { type: "approval", ref: "DEMO-AP-08", label: "Loan approval for DEMO-LN-010" },
    amount: amt("6000.000000"),
    note: "Existing arrears on another lender's facility.",
    correlation_id: null,
    payload: { approval_id: "DEMO-AP-08", decision: "REJECTED", level: 1 },
  },
  {
    id: "DEMO-EV-0110",
    occurred_at: "2026-10-20T16:00:00Z",
    actor_id: "DEMO-USR-03",
    module: "loans",
    action: "updated",
    entity: { type: "loan", ref: "DEMO-LN-004", label: "Esi Placeholder" },
    changes: [
      { field: "requested_amount", before: "8000.000000", after: "10000.000000" },
      { field: "repayment_frequency", before: "WEEKLY", after: "MONTHLY" },
      { field: "interest_rate", before: "12.500000", after: "11.000000" },
    ],
    correlation_id: null,
    payload: { loan_id: 4, edited_fields: 3 },
  },
  {
    id: "DEMO-EV-0109",
    occurred_at: "2026-10-19T10:00:00Z",
    actor_id: "DEMO-USR-01",
    module: "loans",
    action: "disbursed",
    entity: { type: "loan", ref: "DEMO-LN-001", label: "Ama Sample" },
    amount: amt("1000.000000"),
    correlation_id: "COR-51bc",
    payload: { loan_id: 1, channel: "MOBILE_MONEY", fee_deducted: "20.000000" },
  },
  {
    id: "DEMO-EV-0108",
    occurred_at: "2026-10-19T10:00:04Z",
    actor_id: null,
    module: "accounting",
    action: "journal_posted",
    entity: { type: "journal", ref: "DEMO-JRN-2026-10-19-000150" },
    amount: amt("1000.000000"),
    correlation_id: "COR-51bc",
    payload: { lines: [{ account: "1200 Loans receivable", debit: "1000.000000" }, { account: "1010 Cash - Mobile money", credit: "1000.000000" }] },
  },
  {
    id: "DEMO-EV-0107",
    occurred_at: "2026-10-18T16:20:00Z",
    actor_id: "DEMO-USR-03",
    module: "approvals",
    action: "approved",
    entity: { type: "approval", ref: "DEMO-AP-07", label: "Loan approval for DEMO-LN-001" },
    amount: amt("1000.000000"),
    correlation_id: null,
    payload: { approval_id: "DEMO-AP-07", decision: "APPROVED", level: 1 },
  },
  {
    id: "DEMO-EV-0106",
    occurred_at: "2026-10-12T09:45:00Z",
    actor_id: "DEMO-USR-01",
    module: "loans",
    action: "disbursed",
    entity: { type: "loan", ref: "DEMO-LN-009", label: "Kofi Sample" },
    amount: amt("1500.000000"),
    correlation_id: null,
    payload: { loan_id: 9, channel: "CASH" },
  },
  {
    id: "DEMO-EV-0105",
    occurred_at: "2026-10-05T08:30:00Z",
    actor_id: "DEMO-USR-01",
    module: "loans",
    action: "disbursed",
    entity: { type: "loan", ref: "DEMO-LN-008", label: "Efua Demo" },
    amount: amt("3000.000000"),
    correlation_id: null,
    payload: { loan_id: 8, channel: "BANK_TRANSFER" },
  },
  {
    // The source didn't record a diff for this save: the drawer must say so, not show "no changes".
    id: "DEMO-EV-0104",
    occurred_at: "2026-10-03T13:15:00Z",
    actor_id: "DEMO-USR-02",
    module: "collateral",
    action: "updated",
    entity: { type: "collateral", ref: "DEMO-COL-01", label: "Vehicle pledged on DEMO-LN-002" },
    correlation_id: null,
    payload: { collateral_id: 1, diff: null },
  },
  {
    id: "DEMO-EV-0103",
    occurred_at: "2026-09-14T17:00:00Z",
    actor_id: null,
    module: "loans",
    action: "status_changed",
    entity: { type: "loan", ref: "DEMO-LN-003", label: "Kojo Example" },
    changes: [{ field: "status", before: "ACTIVE", after: "COMPLETED" }],
    correlation_id: null,
    payload: { loan_id: 3, rule: "BALANCE_ZERO" },
  },
]

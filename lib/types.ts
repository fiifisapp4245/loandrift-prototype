/**
 * Presentation types shared by every LoanDrift screen.
 *
 * These describe what the UI is given, not how the backend calculates it. Amounts arrive in
 * minor units (pesewas for GHS) as integers so the UI never does floating-point money maths.
 */

export type CurrencyCode = "GHS" | "USD" | (string & {})

/** An amount in minor units with its own currency. Never a bare number. */
export type Money = { minor: number; currency: CurrencyCode }

/** A value the source could not establish. Rendered as "Unavailable", never as zero. */
export type Unavailable = { unavailable: true; reason: string }

export type MoneyValue = Money | Unavailable

export function isUnavailable(v: unknown): v is Unavailable {
  return typeof v === "object" && v !== null && (v as Unavailable).unavailable === true
}

export function unavailable(reason: string): Unavailable {
  return { unavailable: true, reason }
}

/**
 * Loan lifecycle (workflow) status: the nine stages in the audit, filterable in All Loans.
 * "active" is the stored value; the UI label is "Active" everywhere (the old sidebar said "Activated").
 */
export type LoanStatus =
  | "registered"
  | "captured"
  | "approved"
  | "rejected"
  | "disbursed"
  | "active"
  | "defaulted"
  | "completed"
  | "written_off"

/** Repayment health is separate from workflow status (audit F44). */
export type RepaymentHealth = "on_track" | "due_today" | "in_arrears" | "settled" | "not_started"

/** Credit scores carry their model so legacy and current scales are never compared. */
export type CreditScore = {
  value: number
  scaleMax: number
  model: { id: string; label: string; legacy: boolean }
}

/** Which population a count describes. Shown next to every count. */
export type CountScope = "personal" | "branch" | "matching" | "unread"

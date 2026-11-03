/**
 * Lending service for Clients, All Loans and the loan record. Computes from fictional fixtures in
 * integer minor units. Read-only, except the client form's mocked submit, which never saves.
 */
import { demoActivityEvents } from "@/lib/activity-fixtures"
import type { RowAction } from "@/components/patterns/row-actions"
import { DEMO_TODAY, demoEvents, demoLoans, type DemoInstallment, type DemoLoan } from "@/lib/fixtures"
import { LOAN_STATUS, loanStatus, ratio, type Ratio, type StatusPresentation } from "@/lib/format"
import { demoClients, demoLoanRecords, demoReceipts, demoWriteOffs, type DemoClient } from "@/lib/lending-fixtures"
import { demoApprovals, userName } from "@/lib/workspace-fixtures"
import { DEMO_AS_OF } from "@/lib/fixtures"
import { formatAge, formatDate, formatMoney, plural } from "@/lib/format"
import { loanPosition, scheduleFor } from "@/lib/domain/loan-position"
import { isUnavailable, type Money, type MoneyValue } from "@/lib/types"
import type { DemoUser } from "@/lib/workspace-fixtures"

export const LOANS_PAGE_SIZE = 8
export const CLIENTS_PAGE_SIZE = 8

const OUTSTANDING = new Set(["disbursed", "active", "defaulted"])

// ── Loan financials ──────────────────────────────────────────────────────

/** The list and record views' slice of the canonical position (lib/domain/loan-position.ts). */
export type LoanFinancials = {
  totalPayable: MoneyValue
  paid: MoneyValue
  totalBalance: MoneyValue
  /** paid ÷ total payable, 0–1. Null when either is unavailable. */
  progress: number | null
  pastDue: MoneyValue
  dueToday: MoneyValue
  toBringCurrent: MoneyValue
  /** First unpaid installment due after today. */
  nextScheduled: { dueDate: string; amount: Money } | null
}

export function scheduleOf(ref: string): DemoInstallment[] {
  return scheduleFor(ref)
}

export function loanFinancials(loan: DemoLoan, today = DEMO_TODAY): LoanFinancials {
  const p = loanPosition(loan, today)!
  const progress = !isUnavailable(p.totalPayable) && !isUnavailable(p.paid) && p.totalPayable.minor > 0 ? p.paid.minor / p.totalPayable.minor : null
  return {
    totalPayable: p.totalPayable,
    paid: p.paid,
    totalBalance: p.totalBalance,
    progress,
    pastDue: p.pastDue,
    dueToday: p.dueToday,
    toBringCurrent: p.toBringCurrent,
    nextScheduled: p.nextScheduled,
  }
}

/** Each schedule line's state, worded so partial payments and today's dues are never mislabelled. */
export function installmentState(i: DemoInstallment, today = DEMO_TODAY): StatusPresentation {
  const left = i.due.minor - i.paid.minor
  if (left <= 0) return { label: "Paid", tone: "success", description: "Paid in full." }
  const part = i.paid.minor > 0
  if (i.dueDate < today) return { label: part ? "Overdue, part paid" : "Overdue", tone: "danger", description: "Fell due before today." }
  if (i.dueDate === today) return { label: part ? "Due today, part paid" : "Due today", tone: "info", description: "Falls due today." }
  return { label: part ? "Upcoming, part paid" : "Upcoming", tone: "neutral", description: "Not due yet." }
}

/**
 * Next steps the server permits for a loan's stage. In the real app this list comes from the API;
 * the UI never infers actions from a badge colour (F24, F46). Consequential actions are disabled in
 * the prototype with a reason.
 */
export function allowedActions(loan: DemoLoan): RowAction[] {
  const off = "Prototype: no live actions."
  const routine: RowAction[] = [{ label: "View borrower", href: `/clients/${loan.borrower.id}` }]
  const next: Record<string, RowAction[]> = {
    registered: [{ label: "Capture terms", kind: "consequential", disabledReason: off }],
    captured: [
      { label: "Calculate score", kind: "routine", disabledReason: off },
      { label: "Approve or reject", kind: "consequential", disabledReason: off },
    ],
    approved: [
      { label: "Agreement and signing", kind: "routine", href: `/loans/${loan.reference}?tab=agreement` },
      { label: "Disburse", kind: "consequential", disabledReason: off },
    ],
    // Opens the record-payment flow, which has its own review step and never saves in the prototype.
    active: [{ label: "Record external payment", kind: "consequential", href: `/loans/${loan.reference}/repayment?record=1` }],
    defaulted: [{ label: "Record external payment", kind: "consequential", href: `/loans/${loan.reference}/repayment?record=1` }],
    written_off: [{ label: "Record recovery", kind: "consequential", disabledReason: off }],
  }
  return [...routine, ...(next[loan.status] ?? [])]
}

// ── Stage detail (what the old Loan Features queues were for) ────────────

/** Column header shown in All Loans when one lifecycle stage is filtered. */
export const STAGE_COLUMN: Partial<Record<string, string>> = {
  registered: "Next step",
  captured: "Decision readiness",
  approved: "Agreement",
  rejected: "Decision",
  defaulted: "Arrears",
  completed: "Closed",
  written_off: "Write-off",
}

export type StageDetail = { primary: string; secondary?: string; warn?: boolean } | null

/**
 * The stage-specific facts each old queue was meant to surface (Phase 2 F45, F46, B2-03), built
 * only from recorded data. Missing data says so; it never becomes a green "ready".
 */
export function stageDetail(loan: DemoLoan): StageDetail {
  const ref = loan.reference
  switch (loan.status) {
    case "registered":
      return { primary: "Capture terms", secondary: `Registered ${formatDate(loan.updatedOn)}` }
    case "captured": {
      const ap = demoApprovals.find((a) => a.loanRef === ref && a.kind === "Loan approval" && a.state !== "completed")
      if (!ap) return { primary: "No approval request yet", secondary: "Submit for approval to start the decision", warn: true }
      const provided = ap.evidence.filter((e) => e.provided).length
      return {
        primary: ap.blockers.length ? `${plural(ap.blockers.length, "blocker")}: ${ap.blockers.join(", ")}` : `Evidence ${provided} of ${ap.evidence.length}`,
        secondary: `Level ${ap.level.current} of ${ap.level.total} · ${userName(ap.assigneeId)} · waiting ${formatAge(ap.submittedAt, DEMO_AS_OF)}`,
        warn: ap.blockers.length > 0 || provided < ap.evidence.length,
      }
    }
    case "approved": {
      const sigs = demoLoanRecords[ref]?.signatures ?? []
      if (sigs.length === 0) return { primary: "Agreement not generated", warn: true }
      const missing = sigs.filter((x) => !x.signedOn)
      return missing.length
        ? { primary: `${sigs.length - missing.length} of ${sigs.length} signed`, secondary: `Waiting on: ${missing.map((m) => m.party).join(", ")}`, warn: true }
        : { primary: "All signed", secondary: "Ready to disburse once permitted" }
    }
    case "rejected": {
      const ap = demoApprovals.find((a) => a.loanRef === ref && a.outcome === "rejected")
      const d = ap?.decisions.find((x) => x.outcome === "rejected")
      if (!ap || !d) return { primary: "Reason not recorded", warn: true }
      return { primary: d.note ?? "Reason not recorded", secondary: `${userName(d.by)} · ${formatDate(d.at)}`, warn: !d.note }
    }
    case "defaulted": {
      const p = loanPosition(loan)
      if (!p || isUnavailable(p.pastDue)) return { primary: "Unavailable", warn: true }
      return {
        primary: `${formatMoney(p.pastDue)} past due`,
        secondary: p.oldestUnpaid ? `Oldest ${plural(p.oldestUnpaid.daysOverdue, "day")} overdue` : undefined,
        warn: true,
      }
    }
    case "completed": {
      const last = demoReceipts.filter((r) => r.loanRef === ref).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn) || b.receiptNo.localeCompare(a.receiptNo))[0]
      return last ? { primary: `Repaid ${formatDate(last.receivedOn)}`, secondary: `Last receipt ${last.receiptNo}` } : { primary: "Closing date not recorded", warn: true }
    }
    case "written_off": {
      const w = demoWriteOffs[ref]
      if (!w) return { primary: "Write-off amount not recorded", warn: true }
      return { primary: `${formatMoney(w.writtenOff)} written off`, secondary: `${formatMoney(w.recovered)} recovered · ${formatDate(w.on)}` }
    }
    default:
      return null
  }
}

/** Loans per stage, for the status filter. */
export function statusCounts() {
  const counts: Record<string, number> = { unrecognised: 0 }
  for (const l of demoLoans) {
    if (l.status in LOAN_STATUS) counts[l.status] = (counts[l.status] ?? 0) + 1
    else counts.unrecognised += 1
  }
  return counts
}

// ── All Loans ────────────────────────────────────────────────────────────

export type LoanFilters = { q?: string; status?: string; health?: string; page?: number }

export type LoanRow = DemoLoan & { financials: LoanFinancials }

export function listLoans(f: LoanFilters) {
  const needle = f.q?.trim().toLowerCase() ?? ""
  const all = [...demoLoans].sort((a, b) => b.updatedOn.localeCompare(a.updatedOn) || b.reference.localeCompare(a.reference))
  const matched = all.filter(
    (l) =>
      (!needle || l.reference.toLowerCase().includes(needle) || l.borrower.name.toLowerCase().includes(needle)) &&
      (!f.status || (f.status === "unrecognised" ? !(l.status in LOAN_STATUS) : l.status === f.status)) &&
      (!f.health || l.health === f.health),
  )
  const pageCount = Math.max(1, Math.ceil(matched.length / LOANS_PAGE_SIZE))
  const page = Math.min(Math.max(1, f.page ?? 1), pageCount)
  return {
    rows: matched.slice((page - 1) * LOANS_PAGE_SIZE, page * LOANS_PAGE_SIZE).map((l) => ({ ...l, financials: loanFinancials(l) })),
    total: matched.length,
    branchTotal: all.length,
    page,
    pageCount,
  }
}

export function getLoan(ref: string) {
  const loan = demoLoans.find((l) => l.reference === ref)
  if (!loan) return null
  return {
    loan,
    record: demoLoanRecords[ref] ?? null,
    financials: loanFinancials(loan),
    schedule: scheduleOf(ref),
    payments: demoEvents.filter((e) => e.loanRef === ref && e.kind === "repayment").sort((a, b) => b.on.localeCompare(a.on)),
    client: demoClients.find((c) => c.id === loan.borrower.id) ?? null,
    otherLoans: demoLoans.filter((l) => l.borrower.id === loan.borrower.id && l.reference !== ref),
    history: demoActivityEvents.filter((e) => e.entity.ref === ref).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
  }
}

// ── Clients ──────────────────────────────────────────────────────────────

export type ClientFilters = { q?: string; loans?: string; page?: number }

export function loansOf(clientId: string) {
  return demoLoans.filter((l) => l.borrower.id === clientId)
}

export function hasActiveLoan(clientId: string) {
  return loansOf(clientId).some((l) => OUTSTANDING.has(l.status))
}

/** Branch-wide counts. They don't change with search, and the page says so. */
export function clientSummary(today = DEMO_TODAY) {
  const month = today.slice(0, 7)
  return {
    total: demoClients.length,
    withActiveLoan: demoClients.filter((c) => hasActiveLoan(c.id)).length,
    newThisMonth: demoClients.filter((c) => c.registeredOn.startsWith(month)).length,
  }
}

export function listClients(f: ClientFilters) {
  const needle = f.q?.trim().toLowerCase() ?? ""
  const matched = [...demoClients]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(
      (c) =>
        (!needle || [c.name, c.id, c.phone ?? "", c.business?.name ?? ""].some((v) => v.toLowerCase().includes(needle))) &&
        (!f.loans || (f.loans === "active" ? hasActiveLoan(c.id) : !hasActiveLoan(c.id))),
    )
  const pageCount = Math.max(1, Math.ceil(matched.length / CLIENTS_PAGE_SIZE))
  const page = Math.min(Math.max(1, f.page ?? 1), pageCount)
  return { rows: matched.slice((page - 1) * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE), total: matched.length, page, pageCount }
}

/**
 * A client's loan history with canonical statuses and separate principal / total payable / paid
 * (F42, F43). Completion is "repaid in full ÷ closed loans" and is unavailable with no closed loans.
 */
export function clientHistory(clientId: string) {
  const loans = loansOf(clientId)
    .sort((a, b) => b.updatedOn.localeCompare(a.updatedOn))
    .map((l) => ({ loan: l, status: loanStatus(l.status), financials: loanFinancials(l) }))
  const closed = loans.filter((x) => x.loan.status === "completed" || x.loan.status === "written_off")
  const repaid = closed.filter((x) => x.loan.status === "completed")
  const completion: Ratio = ratio(repaid.length, closed.length, "No closed loans yet.")
  return { loans, closedCount: closed.length, repaidCount: repaid.length, completion }
}

export function getClient(id: string) {
  return demoClients.find((c) => c.id === id) ?? null
}

/** ID numbers are shown in full only to roles allowed to see them. */
export function canSeeIdNumbers(user: DemoUser) {
  return user.role !== "Loan officer"
}

export function maskId(value: string) {
  return value.replace(/[A-Za-z0-9](?=(?:[^A-Za-z0-9]*[A-Za-z0-9]){4})/g, "•")
}

// ── Client form (mocked submit) ──────────────────────────────────────────

export type ClientDraft = {
  firstName: string
  lastName: string
  phone: string
  altPhone: string
  email: string
  idType: string
  idNumber: string
  businessName: string
  businessType: string
  monthlyIncome: string
}

export type FieldErrors = Partial<Record<keyof ClientDraft, string>>

/** Quick checks in the browser. The server re-checks everything and has the final say. */
export function validateClientDraft(d: ClientDraft): FieldErrors {
  const e: FieldErrors = {}
  if (!d.firstName.trim()) e.firstName = "Enter the client's first name."
  if (!d.lastName.trim()) e.lastName = "Enter the client's last name."
  if (!d.phone.trim()) e.phone = "Enter a primary phone number. It's used for repayment reminders."
  else if (!/^0\d{2} ?\d{3} ?\d{4}$/.test(d.phone.trim())) e.phone = "Use a 10-digit number starting with 0, for example 020 000 0000."
  if (d.altPhone.trim() && d.altPhone.trim() === d.phone.trim()) e.altPhone = "This is the same as the primary number."
  if (d.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) e.email = "Enter an email address like name@example.com, or leave it blank."
  if (!d.idType) e.idType = "Choose the type of ID."
  if (!d.idNumber.trim()) e.idNumber = "Enter the ID number exactly as printed."
  if (d.monthlyIncome.trim() && !/^\d+(\.\d{1,2})?$/.test(d.monthlyIncome.trim().replace(/,/g, "")))
    e.monthlyIncome = "Enter an amount in cedis, for example 2500 or 2500.50."
  return e
}

export type SubmitResult = { ok: true } | { ok: false; errors: FieldErrors; message: string }

/**
 * Mocked server validation. Shows that the backend is authoritative (it catches a duplicate ID the
 * browser can't know about). Never saves anything.
 */
export async function submitClient(d: ClientDraft): Promise<SubmitResult> {
  await new Promise((r) => setTimeout(r, 400))
  const dup = demoClients.find((c) => c.idDocument && c.idDocument.number.toLowerCase() === d.idNumber.trim().toLowerCase())
  if (dup) {
    return {
      ok: false,
      message: "The server found a problem. Nothing was saved.",
      errors: { idNumber: `This ID number is already registered to client ${dup.id}. Open that profile instead of adding a duplicate.` },
    }
  }
  return { ok: true }
}

export function clientStatusFor(c: DemoClient) {
  return hasActiveLoan(c.id) ? "Active borrower" : loansOf(c.id).length ? "Past borrower" : "No loans yet"
}

export { isUnavailable }

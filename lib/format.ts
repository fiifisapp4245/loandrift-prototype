/**
 * Formatting only. Nothing here calculates a financial figure: sums, balances and allocations
 * belong to the domain/service layer. `sumMoney` exists so the UI can total amounts it was
 * given without silently mixing currencies.
 */
import { format, parseISO } from "date-fns"
import {
  isUnavailable,
  type CountScope,
  type CreditScore,
  type CurrencyCode,
  type LoanStatus,
  type Money,
  type MoneyValue,
  type RepaymentHealth,
  type Unavailable,
} from "@/lib/types"

/** Minor units per major unit. GHS has 100 pesewas to the cedi. */
const MINOR_DIGITS: Record<string, number> = { GHS: 2, USD: 2 }

/** Branch timezone. Ghana is GMT all year (no daylight saving). */
export const BRANCH_TIMEZONE = "Africa/Accra"
export const BRANCH_TIMEZONE_LABEL = "GMT"

export const UNAVAILABLE_LABEL = "Unavailable"

// ── Money ────────────────────────────────────────────────────────────────

/**
 * "GH₵1,200.00" for cedis; other currencies lead with their ISO code ("USD 1,200.00")
 * so a foreign amount can never be mistaken for cedis.
 */
export function formatMoney(value: Money, opts: { decimals?: boolean } = {}): string {
  const digits = MINOR_DIGITS[value.currency] ?? 2
  const major = value.minor / 10 ** digits
  const fractionDigits = opts.decimals === false ? 0 : digits
  const number = new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Math.abs(major))
  const sign = value.minor < 0 ? "−" : ""
  return value.currency === "GHS" ? `${sign}GH₵${number}` : `${sign}${value.currency} ${number}`
}

/** Formats a value that may be unavailable. Unavailable is a word, never "0.00" or "—". */
export function formatMoneyValue(value: MoneyValue | null | undefined, opts?: { decimals?: boolean }): string {
  if (value == null || isUnavailable(value)) return UNAVAILABLE_LABEL
  return formatMoney(value, opts)
}

/** The reason a value is unavailable, or null if it has one. */
export function unavailableReason(value: MoneyValue | null | undefined): string | null {
  if (value == null) return "No value was supplied."
  return isUnavailable(value) ? value.reason : null
}

export type MoneySum =
  | { kind: "total"; money: Money }
  | { kind: "mixed"; currencies: CurrencyCode[] }
  | { kind: "unavailable"; reasons: string[] }

/**
 * Adds amounts only when they share one currency and all are available. Anything else
 * returns a result the UI must explain — there is no conversion policy to apply.
 */
export function sumMoney(values: MoneyValue[], emptyCurrency: CurrencyCode = "GHS"): MoneySum {
  const missing = values.filter(isUnavailable) as Unavailable[]
  if (missing.length) return { kind: "unavailable", reasons: [...new Set(missing.map((m) => m.reason))] }
  const money = values as Money[]
  const currencies = [...new Set(money.map((m) => m.currency))]
  if (currencies.length > 1) return { kind: "mixed", currencies }
  const minor = money.reduce((total, m) => total + m.minor, 0)
  return { kind: "total", money: { minor, currency: currencies[0] ?? emptyCurrency } }
}

// ── Numbers ──────────────────────────────────────────────────────────────

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n)
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`
}

export type Ratio = { value: number; label: string } | Unavailable

/**
 * A rate from its parts. A zero denominator is unavailable ("no loans were due"), not 0%.
 */
export function ratio(numerator: number, denominator: number, noDenominatorReason: string): Ratio {
  if (denominator === 0) return { unavailable: true, reason: noDenominatorReason }
  const value = numerator / denominator
  return { value, label: formatPercent(value) }
}

/** 0.1234 → "12.3%". Whole percentages drop the decimal. */
export function formatPercent(fraction: number): string {
  const pct = fraction * 100
  const digits = Number.isInteger(Math.round(pct * 10) / 10) ? 0 : 1
  return `${pct.toFixed(digits)}%`
}

// ── Dates ────────────────────────────────────────────────────────────────

/** Calendar date ("2026-11-02") → "2 Nov 2026". Dates without a time are never shifted by timezone. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Not recorded"
  return format(parseISO(isoDate.slice(0, 10)), "d MMM yyyy")
}

/** Instant ("2026-11-02T09:41:00Z") → "2 Nov 2026, 09:41 GMT" in the branch timezone. */
export function formatDateTime(isoInstant: string | null | undefined): string {
  if (!isoInstant) return "Not recorded"
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BRANCH_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoInstant))
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? ""
  return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")} ${BRANCH_TIMEZONE_LABEL}`
}

/** "As of 2 Nov 2026, 09:41 GMT" — the basis line under every snapshot figure. */
export function formatAsOf(isoInstant: string): string {
  return `As of ${formatDateTime(isoInstant)}`
}

/** How long something has waited: "3 h", "1 day", "6 days". */
export function formatAge(fromInstant: string, toInstant: string): string {
  const hours = Math.max(0, Math.floor((new Date(toInstant).getTime() - new Date(fromInstant).getTime()) / 3_600_000))
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? "day" : "days"}`
}

export function ageInDays(fromInstant: string, toInstant: string): number {
  return (new Date(toInstant).getTime() - new Date(fromInstant).getTime()) / 86_400_000
}

export function formatDateRange(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`
}

// ── Statuses ─────────────────────────────────────────────────────────────

export type Tone = "neutral" | "info" | "review" | "success" | "warning" | "danger"

export type StatusPresentation = { label: string; tone: Tone; description: string }

/** One mapping for loan lifecycle status, used by every list, queue, badge and filter. */
export const LOAN_STATUS: Record<LoanStatus, StatusPresentation> = {
  registered: { label: "Registered", tone: "neutral", description: "Application registered; terms not yet captured." },
  captured: { label: "Captured", tone: "info", description: "Terms captured; awaiting a decision." },
  approved: { label: "Approved", tone: "review", description: "Approved; not yet disbursed." },
  rejected: { label: "Rejected", tone: "danger", description: "Application declined." },
  disbursed: { label: "Disbursed", tone: "info", description: "Funds released; repayment not yet active." },
  active: { label: "Active", tone: "success", description: "Disbursed and in repayment." },
  defaulted: { label: "Defaulted", tone: "danger", description: "Marked as defaulted under the product's rules." },
  completed: { label: "Completed", tone: "success", description: "Fully repaid and closed." },
  written_off: { label: "Written off", tone: "neutral", description: "Balance written off; recoveries may still be recorded." },
}

/**
 * Unknown or legacy values are shown as what they are. They are never defaulted to
 * "Pending" — that is how completed loans came to read as pending (audit F42).
 */
export function loanStatus(value: string | null | undefined): StatusPresentation {
  if (value && value in LOAN_STATUS) return LOAN_STATUS[value as LoanStatus]
  return {
    label: value ? `Unrecognised status (${humanize(value)})` : "Status not recorded",
    tone: "warning",
    description: "This record's status does not match a known lifecycle stage. Check the source record.",
  }
}

export const REPAYMENT_HEALTH: Record<RepaymentHealth, StatusPresentation> = {
  on_track: { label: "On track", tone: "success", description: "Nothing overdue." },
  due_today: { label: "Due today", tone: "info", description: "An installment falls due today; nothing overdue before today." },
  in_arrears: { label: "In arrears", tone: "danger", description: "At least one installment is overdue." },
  settled: { label: "Settled", tone: "neutral", description: "No balance remains." },
  not_started: { label: "Not started", tone: "neutral", description: "No installment has fallen due yet." },
}

/** snake_case or SCREAMING_CASE → "Sentence case". For enum values with no mapping yet. */
export function humanize(value: string): string {
  const words = value.replace(/[_-]+/g, " ").trim().toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// ── Scores ───────────────────────────────────────────────────────────────

/** "712 / 900 · Current model". Scores from different models are never shown on one scale. */
export function formatScore(score: CreditScore | null | undefined): string {
  if (!score) return "No score"
  return `${formatCount(score.value)} / ${formatCount(score.scaleMax)} · ${score.model.label}`
}

// ── Scopes ───────────────────────────────────────────────────────────────

export const COUNT_SCOPE: Record<CountScope, { label: string; description: string }> = {
  personal: { label: "Waiting on you", description: "Only items assigned to you." },
  branch: { label: "Branch-wide", description: "Every item in this branch, whoever it is assigned to." },
  matching: { label: "Matching", description: "Only items matching the current search and filters." },
  unread: { label: "Unread alerts", description: "Notifications you have not opened. Reading one does not resolve the task behind it." },
}

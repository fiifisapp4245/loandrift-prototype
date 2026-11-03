/**
 * Activities service and presentation. Filtering and pagination run over the whole history here
 * (as a real API would), never over the visible page. Read-only: nothing changes activity history.
 *
 * API ASSUMPTIONS TO CONFIRM (see CHANGES.md): server-side search, actor/module/action/date
 * filters, a stable sort, a 90-day retention window, and correlation IDs linking side effects.
 */
import { addDays, format, parseISO } from "date-fns"
import { demoActivityEvents, type ActivityAction, type ActivityModule, type RawActivityEvent } from "@/lib/activity-fixtures"
import type { DateRange } from "@/lib/date-range"
import { DEMO_TODAY } from "@/lib/fixtures"
import { BRANCH_TIMEZONE, formatMoney, humanize } from "@/lib/format"
import type { Money } from "@/lib/types"
import { userName } from "@/lib/workspace-fixtures"

export const PAGE_SIZE = 6
/** The feed keeps this many days. Older activity lives in the audit report. */
export const RETENTION_DAYS = 90
export const RETENTION_START = format(addDays(parseISO(DEMO_TODAY), -(RETENTION_DAYS - 1)), "yyyy-MM-dd")

export const MODULE_LABELS: Record<ActivityModule, string> = {
  loans: "Loans",
  repayments: "Repayments",
  clients: "Clients",
  approvals: "Approvals",
  accounting: "Accounting",
  collections: "Collections",
  collateral: "Collateral",
  settings: "Settings",
}

export const ACTION_LABELS: Record<ActivityAction, string> = {
  created: "Created",
  updated: "Updated",
  submitted: "Submitted for approval",
  approved: "Approved",
  rejected: "Rejected",
  returned: "Sent back",
  disbursed: "Disbursed",
  repayment_recorded: "Repayment recorded",
  journal_posted: "Journal posted",
  status_changed: "Status changed",
}

// ── Values ───────────────────────────────────────────────────────────────

/** "400.000000" → 40000 minor units, rounding half up in integer arithmetic (no floats). */
export function parseDecimal(value: string, currency: string): Money {
  const negative = value.trim().startsWith("-")
  const [whole = "0", frac = ""] = value.trim().replace(/^[-+]/, "").split(".")
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2)) + (Number(frac[2] ?? "0") >= 5 ? 1 : 0)
  return { minor: negative ? -cents : cents, currency }
}

const FIELD_LABELS: Record<string, string> = {
  monthly_income: "Monthly income",
  requested_amount: "Requested amount",
  repayment_frequency: "Repayment frequency",
  interest_rate: "Interest rate",
  business_type: "Business type",
  status: "Status",
}
const MONEY_FIELDS = new Set(["monthly_income", "requested_amount"])
const PERCENT_FIELDS = new Set(["interest_rate"])

export function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? humanize(field)
}

/** Readable value for the before/after table. Raw "None", null and "" read as "Not set". */
export function formatFieldValue(field: string, raw: string | null, currency = "GHS"): string {
  if (raw == null || raw === "" || raw === "None" || raw === "null") return "Not set"
  if (MONEY_FIELDS.has(field)) return formatMoney(parseDecimal(raw, currency))
  if (PERCENT_FIELDS.has(field)) return `${Number(raw)}%`
  if (/^[A-Z][A-Z0-9_]+$/.test(raw)) return humanize(raw)
  return raw
}

export function actorName(e: RawActivityEvent) {
  return e.actor_id ? userName(e.actor_id) : "System"
}

export function eventAmount(e: RawActivityEvent): Money | null {
  return e.amount ? parseDecimal(e.amount.value, e.amount.currency) : null
}

/** "15:30 GMT" in branch time. */
export function formatTime(instant: string) {
  const t = new Intl.DateTimeFormat("en-GB", { timeZone: BRANCH_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(instant))
  return `${t} GMT`
}

/** Calendar day of an instant in branch time, "2026-10-27". */
export function branchDay(instant: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BRANCH_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant))
}

export function formatDayHeading(day: string) {
  return format(parseISO(day), "EEEE, d MMMM yyyy")
}

export type Sentence = {
  actor: string
  verb: string
  object: string
  /** False when the object is a plain label ("Branch settings") rather than a record reference. */
  isRef: boolean
  amount: string | null
  context: string | null
}

/** One human sentence per event: actor, verb, entity reference, and amount where relevant. */
export function describe(e: RawActivityEvent): Sentence {
  const money = eventAmount(e)
  const amount = money ? formatMoney(money) : null
  const ref = e.entity.ref
  const base = { actor: actorName(e), amount, context: e.entity.label ?? null, isRef: true }
  switch (e.action) {
    case "created":
      return { ...base, verb: `created ${e.entity.type}`, object: ref }
    case "updated":
      if (e.changes && e.changes.length === 0)
        return { ...base, verb: "saved", object: e.entity.label ?? ref, isRef: !e.entity.label, context: "no fields changed" }
      if (!e.changes) return { ...base, verb: `updated ${e.entity.type}`, object: ref }
      return {
        ...base,
        verb: `updated ${e.changes.length === 1 ? fieldLabel(e.changes[0]!.field).toLowerCase() + " on" : e.changes.length + " fields on"}`,
        object: ref,
      }
    case "submitted":
      return { ...base, verb: "submitted", object: ref, context: e.entity.label ?? null }
    case "approved":
      return { ...base, verb: "approved", object: ref }
    case "rejected":
      return { ...base, verb: "rejected", object: ref }
    case "returned":
      return { ...base, verb: "sent back", object: ref }
    case "disbursed":
      return { ...base, verb: "disbursed", object: ref }
    case "repayment_recorded":
      return { ...base, verb: "recorded a repayment on", object: ref }
    case "journal_posted":
      return { ...base, verb: "posted journal", object: ref, context: "Accounting entry" }
    case "status_changed": {
      const c = e.changes?.find((x) => x.field === "status")
      return {
        ...base,
        verb: "changed the status of",
        object: ref,
        context: c ? `${formatFieldValue("status", c.before)} → ${formatFieldValue("status", c.after)}` : base.context,
      }
    }
  }
}

/** Plain-text sentence, for accessible names and search. */
export function sentenceText(s: Sentence) {
  return [s.actor, s.verb, s.object, s.amount && `(${s.amount})`].filter(Boolean).join(" ")
}

// ── Query ────────────────────────────────────────────────────────────────

export type ActivityFilters = {
  q?: string
  range: DateRange
  actor?: string
  module?: string
  action?: string
  page?: number
}

/** An event plus side effects that share its correlation ID (only when one exists). */
export type ActivityItem = { event: RawActivityEvent; related: RawActivityEvent[] }

export type ActivityPage = {
  items: ActivityItem[]
  total: number
  page: number
  pageCount: number
  /** The retention start, when the chosen range begins before it. */
  clippedFrom: string | null
  /** The first day on this page also appeared at the end of the previous page. */
  continuesDay: boolean
}

const sorted = [...demoActivityEvents].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.id.localeCompare(a.id))

function matches(e: RawActivityEvent, f: ActivityFilters, from: string) {
  const day = branchDay(e.occurred_at)
  if (day < from || day > f.range.to) return false
  if (f.actor && (e.actor_id ?? "system") !== f.actor) return false
  if (f.module && e.module !== f.module) return false
  if (f.action && e.action !== f.action) return false
  if (f.q) {
    const needle = f.q.trim().toLowerCase()
    const hay = [actorName(e), e.entity.ref, e.entity.label, MODULE_LABELS[e.module], sentenceText(describe(e))].join(" ").toLowerCase()
    if (!hay.includes(needle)) return false
  }
  return true
}

/**
 * Groups side effects under their cause only when they share a correlation ID. Events that merely
 * happen at the same moment stay separate: timing alone doesn't prove they belong together.
 */
export function groupByCorrelation(events: RawActivityEvent[]): ActivityItem[] {
  const items: ActivityItem[] = []
  const byCorrelation = new Map<string, ActivityItem>()
  for (const e of events) {
    if (!e.correlation_id) {
      items.push({ event: e, related: [] })
      continue
    }
    const existing = byCorrelation.get(e.correlation_id)
    if (!existing) {
      const item = { event: e, related: [] as RawActivityEvent[] }
      byCorrelation.set(e.correlation_id, item)
      items.push(item)
    } else if (existing.event.module === "accounting" && e.module !== "accounting") {
      // The business event leads; accounting entries follow it.
      existing.related.push(existing.event)
      existing.event = e
    } else {
      existing.related.push(e)
    }
  }
  return items
}

export function queryActivities(f: ActivityFilters): ActivityPage {
  const from = f.range.from < RETENTION_START ? RETENTION_START : f.range.from
  const matched = sorted.filter((e) => matches(e, f, from))
  // A matching business event keeps its linked accounting entries, even when the entries themselves
  // don't match the search (a journal doesn't mention the loan's borrower).
  const causes = new Set(matched.filter((e) => e.correlation_id && e.module !== "accounting").map((e) => e.correlation_id))
  const withLinked = sorted.filter((e) => matched.includes(e) || (e.module === "accounting" && causes.has(e.correlation_id)))
  const items = groupByCorrelation(withLinked)
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, f.page ?? 1), pageCount)
  const start = (page - 1) * PAGE_SIZE
  const continuesDay =
    page > 1 && branchDay(items[start - 1]!.event.occurred_at) === branchDay(items[start]!.event.occurred_at)
  return {
    items: items.slice(start, start + PAGE_SIZE),
    continuesDay,
    total: items.length,
    page,
    pageCount,
    clippedFrom: f.range.from < RETENTION_START ? RETENTION_START : null,
  }
}

/** One event and everything correlated with it, regardless of filters (for the drawer). */
export function getActivity(id: string): ActivityItem | null {
  const e = demoActivityEvents.find((x) => x.id === id)
  if (!e) return null
  const related = e.correlation_id ? sorted.filter((x) => x.correlation_id === e.correlation_id && x.id !== e.id) : []
  return { event: e, related }
}

export type Simulation = "none" | "slow" | "error"

export async function fetchActivities(f: ActivityFilters, sim: Simulation = "none") {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 300))
  if (sim === "error") throw new Error("The server didn't respond. Nothing was changed.")
  return queryActivities(f)
}

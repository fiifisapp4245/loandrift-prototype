/**
 * Collections (Phase 2 B2-06, F58, F59; extends F25 and F33). The worklist is every collectable
 * loan with something past due, from the shared financial contract (loanPosition), so arrears here
 * match the dashboard and the loan record. Past due and total balance stay separate figures.
 *
 * Contact logging keeps three things apart:
 * - channel: how contact was attempted (call, SMS, email, WhatsApp, in person)
 * - outcome: what happened, limited to what that channel can produce
 * - promise: a commitment with an amount and a date, created only by a "promised to pay" outcome
 * A promise's status is never typed in: it's worked out from receipts in the ledger. Logging
 * "says already paid" records what the borrower said; it never creates a payment.
 * Saving is mocked: new entries live in memory for this browser session only.
 */
import { demoTransactions } from "@/lib/api/transactions"
import { OUTSTANDING_STATUSES, loanPosition, scheduleFor, type LoanPosition } from "@/lib/domain/loan-position"
import { DEMO_AS_OF, DEMO_TODAY, demoLoans } from "@/lib/fixtures"
import { isUnavailable, type CurrencyCode, type Money } from "@/lib/types"

export const CHANNELS = {
  call: "Phone call",
  sms: "SMS",
  email: "Email",
  whatsapp: "WhatsApp",
  in_person: "In person",
} as const
export type Channel = keyof typeof CHANNELS

export const OUTCOMES = {
  no_answer: { label: "No answer", channels: ["call"] },
  wrong_number: { label: "Wrong number", channels: ["call", "sms", "whatsapp"] },
  no_reply: { label: "Sent, no reply yet", channels: ["sms", "email", "whatsapp"] },
  not_found: { label: "Borrower not found", channels: ["in_person"] },
  promised: { label: "Promised to pay", channels: ["call", "sms", "email", "whatsapp", "in_person"] },
  says_paid: { label: "Says they've already paid", channels: ["call", "sms", "email", "whatsapp", "in_person"] },
  refused: { label: "Refused to pay", channels: ["call", "whatsapp", "in_person"] },
  callback: { label: "Asked to be contacted later", channels: ["call", "sms", "email", "whatsapp", "in_person"] },
} as const satisfies Record<string, { label: string; channels: Channel[] }>
export type Outcome = keyof typeof OUTCOMES

export function outcomesFor(channel: Channel | ""): Outcome[] {
  if (!channel) return []
  return (Object.keys(OUTCOMES) as Outcome[]).filter((o) => (OUTCOMES[o].channels as readonly Channel[]).includes(channel))
}

export type Contact = {
  id: string
  loanRef: string
  /** When the contact happened, UTC. Ghana is GMT, so this is also branch time. */
  at: string
  channel: Channel
  outcome: Outcome
  promise: { amount: Money; by: string } | null
  note: string
  by: string
}

const c = (id: string, loanRef: string, at: string, channel: Channel, outcome: Outcome, note = "", promise: Contact["promise"] = null): Contact => ({
  id,
  loanRef,
  at,
  channel,
  outcome,
  promise,
  note,
  by: "Yaw Officer",
})
const ghs = (cedis: number): Money => ({ minor: cedis * 100, currency: "GHS" })

/** FICTIONAL contact history. DEMO-LN-001 deliberately has none. */
const seed: Contact[] = [
  c("DEMO-CT-01", "DEMO-LN-002", "2026-07-10T10:15:00Z", "call", "promised", "Will pay the July installment on the due date.", { amount: ghs(1600), by: "2026-07-15" }),
  c("DEMO-CT-02", "DEMO-LN-002", "2026-08-20T09:40:00Z", "call", "no_answer"),
  c("DEMO-CT-03", "DEMO-LN-002", "2026-08-22T14:05:00Z", "call", "promised", "Waiting on a customer payment.", { amount: ghs(1600), by: "2026-08-29" }),
  c("DEMO-CT-04", "DEMO-LN-002", "2026-09-10T11:30:00Z", "in_person", "promised", "Visited the shop. Part payment offered.", { amount: ghs(800), by: "2026-09-15" }),
  c("DEMO-CT-05", "DEMO-LN-002", "2026-10-20T15:20:00Z", "call", "says_paid", "Says a bank transfer went through last week."),
  c("DEMO-CT-06", "DEMO-LN-002", "2026-10-30T08:50:00Z", "whatsapp", "promised", "Confirmed by message.", { amount: ghs(1600), by: "2026-11-06" }),
]

// Mocked persistence: survives client navigation, not a reload.
let logged: Contact[] = []
const listeners = new Set<() => void>()
export function subscribeContacts(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function contactsVersion() {
  return logged.length
}
export function resetLoggedContacts() {
  logged = []
  listeners.forEach((l) => l())
}

export function contactsFor(ref: string): Contact[] {
  return [...seed, ...logged].filter((x) => x.loanRef === ref).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
}

export type PromiseStatus = "open" | "kept" | "broken"

export const PROMISE_STATUS: Record<PromiseStatus, { label: string; tone: "info" | "success" | "danger" }> = {
  open: { label: "Open", tone: "info" },
  kept: { label: "Kept", tone: "success" },
  broken: { label: "Broken", tone: "danger" },
}

/** Kept = receipts on this loan, from the day of the promise to its date, cover the amount. */
export function promiseStatus(x: Contact, today = DEMO_TODAY): { status: PromiseStatus; received: Money } | null {
  if (!x.promise) return null
  const from = x.at.slice(0, 10)
  const minor = demoTransactions
    .filter((t) => t.type === "repayment" && t.loanRef === x.loanRef && t.effectiveOn >= from && t.effectiveOn <= x.promise!.by)
    .reduce((s, t) => s + t.amount.minor, 0)
  const received = { minor, currency: x.promise.amount.currency }
  if (minor >= x.promise.amount.minor) return { status: "kept", received }
  return { status: x.promise.by < today ? "broken" : "open", received }
}

/** Arrears age bands, by the oldest past-due installment. */
export const AGES = [
  { value: "1-30", label: "1–30 days", min: 1, max: 30 },
  { value: "31-60", label: "31–60 days", min: 31, max: 60 },
  { value: "60+", label: "60+ days", min: 61, max: Infinity },
] as const

export type Account = {
  ref: string
  borrower: string
  borrowerId: string
  position: LoanPosition
  daysOverdue: number
  oldestDue: string
  pastDueInstallments: number
  lastContact: Contact | null
  openPromise: Contact | null
  /** The latest promise of any status, for filtering. */
  promiseState: PromiseStatus | "none"
}

export function accounts(today = DEMO_TODAY): Account[] {
  return demoLoans
    .filter((l) => OUTSTANDING_STATUSES.has(l.status))
    .map((l) => ({ loan: l, position: loanPosition(l, today) }))
    .filter(({ position }) => position && !isUnavailable(position.pastDue) && position.pastDue.minor > 0)
    .map(({ loan, position }) => {
      const p = position!
      const history = contactsFor(loan.reference)
      const promises = history.filter((x) => x.promise)
      const latestPromise = promises[0] ?? null
      const latestState: PromiseStatus | "none" = latestPromise ? promiseStatus(latestPromise, today)!.status : "none"
      return {
        ref: loan.reference,
        borrower: loan.borrower.name,
        borrowerId: loan.borrower.id,
        position: p,
        daysOverdue: p.oldestUnpaid?.daysOverdue ?? 0,
        oldestDue: p.oldestUnpaid?.dueDate ?? "",
        pastDueInstallments: 0,
        lastContact: history[0] ?? null,
        openPromise: promises.find((x) => promiseStatus(x, today)?.status === "open") ?? null,
        promiseState: latestState,
      }
    })
    .map((a) => ({ ...a, pastDueInstallments: countPastDue(a.ref, today) }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue || a.ref.localeCompare(b.ref))
}

function countPastDue(ref: string, today: string) {
  return scheduleFor(ref).filter((r) => r.dueDate < today && r.paid.minor < r.due.minor).length
}

export type CollectionFilters = { q?: string; age?: string; promise?: string }

/** Branch totals: every account in arrears, never narrowed by the filters. */
export function branchTotals(list: Account[]) {
  const by = new Map<CurrencyCode, number>()
  for (const a of list) if (!isUnavailable(a.position.pastDue)) by.set(a.position.pastDue.currency, (by.get(a.position.pastDue.currency) ?? 0) + a.position.pastDue.minor)
  return {
    accounts: list.length,
    pastDue: [...by].map(([currency, minor]) => ({ currency, minor })),
    openPromises: list.filter((a) => a.openPromise).length,
  }
}

export function queryAccounts(f: CollectionFilters, today = DEMO_TODAY) {
  const all = accounts(today)
  const needle = f.q?.trim().toLowerCase() ?? ""
  const band = AGES.find((b) => b.value === f.age)
  const rows = all.filter(
    (a) =>
      (!needle || a.ref.toLowerCase().includes(needle) || a.borrower.toLowerCase().includes(needle)) &&
      (!band || (a.daysOverdue >= band.min && a.daysOverdue <= band.max)) &&
      (!f.promise || a.promiseState === f.promise),
  )
  return { rows, total: rows.length, branch: branchTotals(all) }
}

export async function fetchAccounts(f: CollectionFilters, sim: "none" | "slow" | "error" = "none") {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 150))
  if (sim === "error") throw new Error("Collections couldn't be loaded. Nothing has changed; try again.")
  return queryAccounts(f)
}

// ── Logging a contact (mocked) ───────────────────────────────────────────

export type ContactDraft = { channel: Channel | ""; outcome: Outcome | ""; at: string; amount: string; by: string; note: string }
export type ContactErrors = Partial<Record<keyof ContactDraft, string>>

/** The form's default: the business date and time, as a local datetime value (GMT = Accra). */
export const DEFAULT_CONTACT_AT = DEMO_AS_OF.slice(0, 16)

export function validateContact(d: ContactDraft, account: Pick<Account, "position">, now = DEMO_AS_OF): ContactErrors {
  const e: ContactErrors = {}
  if (!d.channel) e.channel = "Choose how you contacted the borrower."
  if (!d.outcome) e.outcome = "Choose what happened."
  else if (d.channel && !outcomesFor(d.channel).includes(d.outcome)) e.outcome = `"${OUTCOMES[d.outcome].label}" isn't possible by ${CHANNELS[d.channel]}. Choose another outcome.`
  if (!d.at) e.at = "Enter when the contact happened."
  else if (`${d.at}:00Z` > now) e.at = "This is in the future. Enter when the contact actually happened."
  if (d.outcome === "promised") {
    const amount = d.amount.trim().replace(/,/g, "")
    const balance = account.position.totalBalance
    if (!amount) e.amount = "Enter the amount the borrower promised."
    else if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) e.amount = "Enter an amount above zero, for example 800 or 800.50."
    else if (!isUnavailable(balance) && Math.round(Number(amount) * 100) > balance.minor) e.amount = "This is more than the loan's total balance. Check the amount."
    if (!d.by) e.by = "Enter the date the borrower promised to pay by."
    else if (d.at && d.by < d.at.slice(0, 10)) e.by = "The promised date can't be before the contact."
  }
  return e
}

export async function logContact(ref: string, d: ContactDraft, account: Pick<Account, "position">) {
  await new Promise((r) => setTimeout(r, 300))
  const errors = validateContact(d, account)
  if (Object.keys(errors).length) return { ok: false as const, errors }
  const currency = account.position.currency
  const entry: Contact = {
    id: `DEMO-CT-L${logged.length + 1}`,
    loanRef: ref,
    at: `${d.at}:00Z`,
    channel: d.channel as Channel,
    outcome: d.outcome as Outcome,
    promise: d.outcome === "promised" ? { amount: { minor: Math.round(Number(d.amount.replace(/,/g, "")) * 100), currency }, by: d.by } : null,
    note: d.note.trim(),
    by: "Abena Demo",
  }
  logged = [...logged, entry]
  listeners.forEach((l) => l())
  return { ok: true as const, entry }
}

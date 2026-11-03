/**
 * Loan application capture (R2, F47/F48). A mock: nothing is saved or sent. The nine capture
 * sections come from the Phase 2 audit. The only hard requirements are ones this prototype already
 * enforces elsewhere (a client needs an ID and a primary phone, a loan needs complete terms). Policy
 * that isn't established (guarantor counts, concurrent loans, penalty amounts, the interest
 * formula) is captured as stated and never decided here.
 */
import { DEMO_TODAY, demoLoans } from "@/lib/fixtures"
import { demoClients, type DemoClient } from "@/lib/lending-fixtures"
import { hasActiveLoan } from "@/lib/api/lending"
import type { CurrencyCode } from "@/lib/types"

export const SECTIONS = [
  { id: "client", title: "Client details" },
  { id: "loan", title: "Loan details" },
  { id: "penalty", title: "Penalty" },
  { id: "guarantors", title: "Guarantors" },
  { id: "businesses", title: "Businesses" },
  { id: "worth", title: "Client worth" },
  { id: "comments", title: "Comments" },
  { id: "documents", title: "Documents" },
  { id: "review", title: "Review and save" },
] as const

export type SectionId = (typeof SECTIONS)[number]["id"]

/** Products as they appear on existing loans, with the currency those loans are in. */
export const PRODUCTS: { name: string; currency: CurrencyCode }[] = [...new Map(
  demoLoans.map((l) => [l.product, l.product.includes("(USD)") ? "USD" : "GHS"] as const),
)].map(([name, currency]) => ({ name, currency }))

export const PERIODS = ["Week", "Month"] as const
export const FREQUENCIES = ["Weekly", "Monthly"] as const
export const BASES = ["Flat", "Reducing balance"] as const
export const PENALTY_TYPES = ["None", "Fixed amount per missed installment", "Percentage of the overdue amount"] as const

export type Guarantor = { name: string; phone: string; relationship: string }
export type Business = { name: string; type: string; years: string }

export type ApplicationDraft = {
  clientId: string
  product: string
  principal: string
  rate: string
  interestPeriod: string
  basis: string
  frequency: string
  installments: string
  firstRepaymentOn: string
  penaltyType: string
  penaltyValue: string
  graceDays: string
  guarantors: Guarantor[]
  businesses: Business[]
  monthlyIncome: string
  monthlyExpenses: string
  assets: string
  comments: string
  documents: { name: string; kind: string }[]
}

export const EMPTY_APPLICATION: ApplicationDraft = {
  clientId: "",
  product: "",
  principal: "",
  rate: "",
  interestPeriod: "",
  basis: "",
  frequency: "",
  installments: "",
  firstRepaymentOn: "",
  penaltyType: "",
  penaltyValue: "",
  graceDays: "",
  guarantors: [],
  businesses: [],
  monthlyIncome: "",
  monthlyExpenses: "",
  assets: "",
  comments: "",
  documents: [],
}

export type AppErrors = Partial<Record<keyof ApplicationDraft | `guarantor-${number}` | `business-${number}`, string>>

const AMOUNT = /^\d+(\.\d{1,2})?$/
const amount = (v: string) => v.trim().replace(/,/g, "")

export function clientFor(id: string): DemoClient | null {
  return demoClients.find((c) => c.id === id) ?? null
}

export function currencyFor(product: string): CurrencyCode | null {
  return PRODUCTS.find((p) => p.name === product)?.currency ?? null
}

/** What stops this client borrowing in this prototype: only evidence the client form already requires. */
export function clientBlockers(c: DemoClient): string[] {
  const out: string[] = []
  if (!c.idDocument) out.push("No ID on file. Add it on the client's profile first.")
  if (!c.phone) out.push("No primary phone on file, so repayment reminders can't be sent. Add it on the client's profile first.")
  return out
}

/** Worth knowing, but not a blocker: the policy on it isn't established. */
export function clientNotes(c: DemoClient): string[] {
  return hasActiveLoan(c.id) ? ["Already has an active loan. Whether a second loan is allowed is for the approver; this form doesn't decide it."] : []
}

export function validateTerms(d: ApplicationDraft, today = DEMO_TODAY): AppErrors {
  const e: AppErrors = {}
  if (!d.product) e.product = "Choose the loan product."
  if (!amount(d.principal)) e.principal = "Enter the principal to register."
  else if (!AMOUNT.test(amount(d.principal)) || Number(amount(d.principal)) <= 0) e.principal = "Enter an amount above zero, for example 1200 or 1200.50."
  if (!d.rate.trim()) e.rate = "Enter the interest rate from the product sheet."
  else if (!/^\d+(\.\d{1,3})?$/.test(d.rate.trim()) || Number(d.rate) > 100) e.rate = "Enter a percentage between 0 and 100, for example 5 or 4.5."
  if (!d.interestPeriod) e.interestPeriod = "Choose the period the rate applies to."
  if (!d.basis) e.basis = "Choose how interest is charged."
  if (!d.frequency) e.frequency = "Choose how often the client repays."
  if (!d.installments.trim()) e.installments = "Enter the number of installments."
  else if (!/^\d+$/.test(d.installments.trim()) || Number(d.installments) < 1 || Number(d.installments) > 120)
    e.installments = "Enter a whole number from 1 to 120."
  if (!d.firstRepaymentOn) e.firstRepaymentOn = "Choose the first repayment date."
  else if (d.firstRepaymentOn <= today) e.firstRepaymentOn = "The first repayment must be after today."
  return e
}

export function validatePenalty(d: ApplicationDraft): AppErrors {
  const e: AppErrors = {}
  if (!d.penaltyType) e.penaltyType = "Choose a penalty, or None."
  else if (d.penaltyType !== "None") {
    if (!amount(d.penaltyValue)) e.penaltyValue = "Enter the penalty as captured."
    else if (!AMOUNT.test(amount(d.penaltyValue)) || Number(amount(d.penaltyValue)) <= 0) e.penaltyValue = "Enter a number above zero."
    else if (d.penaltyType.startsWith("Percentage") && Number(amount(d.penaltyValue)) > 100) e.penaltyValue = "A percentage can't be over 100."
    if (d.graceDays.trim() && !/^\d+$/.test(d.graceDays.trim())) e.graceDays = "Enter whole days, or leave it blank."
  }
  return e
}

export function validateOptional(d: ApplicationDraft): AppErrors {
  const e: AppErrors = {}
  d.guarantors.forEach((g, i) => {
    if (!g.name.trim()) e[`guarantor-${i}`] = `Guarantor ${i + 1} needs a name, or remove them.`
    else if (g.phone.trim() && !/^0\d{2} ?\d{3} ?\d{4}$/.test(g.phone.trim())) e[`guarantor-${i}`] = `Guarantor ${i + 1}'s phone should be 10 digits starting with 0.`
  })
  d.businesses.forEach((b, i) => {
    if (!b.name.trim()) e[`business-${i}`] = `Business ${i + 1} needs a name, or remove it.`
  })
  for (const k of ["monthlyIncome", "monthlyExpenses", "assets"] as const) {
    if (amount(d[k]) && !AMOUNT.test(amount(d[k]))) e[k] = "Enter an amount, for example 2500, or leave it blank."
  }
  return e
}

export type SectionState = "complete" | "attention" | "optional" | "locked" | "todo"

/** One requirement on the checklist the form shows up front and again at review. */
export type Requirement = { section: SectionId; label: string; met: boolean }

export function requirements(d: ApplicationDraft, today = DEMO_TODAY): Requirement[] {
  const client = clientFor(d.clientId)
  const terms = validateTerms(d, today)
  return [
    { section: "client", label: "A registered client", met: !!client },
    { section: "client", label: "Client has an ID and a primary phone on file", met: !!client && clientBlockers(client).length === 0 },
    { section: "loan", label: "Product, principal and interest rate", met: !terms.product && !terms.principal && !terms.rate },
    { section: "loan", label: "Interest period and basis", met: !terms.interestPeriod && !terms.basis },
    { section: "loan", label: "Repayment frequency, installments and first date", met: !terms.frequency && !terms.installments && !terms.firstRepaymentOn },
    { section: "penalty", label: "A penalty choice (None is a valid choice)", met: Object.keys(validatePenalty(d)).length === 0 },
  ]
}

export function sectionState(id: SectionId, d: ApplicationDraft, today = DEMO_TODAY): SectionState {
  const client = clientFor(d.clientId)
  if (id === "client") return !client ? "todo" : clientBlockers(client).length ? "attention" : "complete"
  if (!client) return "locked"
  const reqs = requirements(d, today).filter((r) => r.section === id)
  if (reqs.length) return reqs.every((r) => r.met) ? "complete" : "todo"
  if (id === "review") return "todo"
  const opt = validateOptional(d)
  const bad =
    (id === "guarantors" && Object.keys(opt).some((k) => k.startsWith("guarantor-"))) ||
    (id === "businesses" && Object.keys(opt).some((k) => k.startsWith("business-"))) ||
    (id === "worth" && (opt.monthlyIncome || opt.monthlyExpenses || opt.assets))
  return bad ? "attention" : "optional"
}

export const LOCKED_REASON = "Choose a client first. Guarantors, businesses and worth all belong to the client."

/**
 * Derived totals. There's no verified calculation service (flat vs reducing balance isn't
 * confirmed, FINANCIAL-CONTRACT.md §9), so even complete terms give no figures: this never computes
 * interest. Incomplete terms say what's missing.
 */
export function calculationState(d: ApplicationDraft, today = DEMO_TODAY): { state: "incomplete"; missing: string[] } | { state: "unavailable"; reason: string } {
  const e = validateTerms(d, today)
  const missing = Object.values(e) as string[]
  if (missing.length) return { state: "incomplete", missing }
  return {
    state: "unavailable",
    reason: "The terms are complete, but this prototype has no verified calculation service, so no interest, totals or schedule are shown. The server calculates them when the application is saved.",
  }
}

export type ApplicationCheck = { ok: true; approvalNote: string } | { ok: false; message: string; unmet: Requirement[]; errors: AppErrors }

/**
 * Mocked submission check. Never saves. Submitting sends the application for approval by someone
 * other than its maker; this form has no approve action, so maker-checker can't be bypassed here.
 */
export async function checkApplication(d: ApplicationDraft, today = DEMO_TODAY): Promise<ApplicationCheck> {
  await new Promise((r) => setTimeout(r, 400))
  const unmet = requirements(d, today).filter((r) => !r.met)
  const errors = { ...validateTerms(d, today), ...validatePenalty(d), ...validateOptional(d) }
  if (unmet.length || Object.keys(errors).length) {
    return { ok: false, message: "Some details need attention. Nothing was saved.", unmet, errors }
  }
  return { ok: true, approvalNote: "In the real app this goes to Approvals, where a different user decides. You can't approve your own application." }
}

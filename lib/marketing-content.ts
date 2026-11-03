/**
 * LoanDrift product page content (Prompt 7). Every commercial statement carries a review status so
 * draft copy is never mistaken for a verified fact:
 *
 * - "draft":  plausible copy, written from the product's actual scope, awaiting owner sign-off
 * - "review": known contradiction or unsubstantiated claim; hidden in the release preview
 *
 * Nothing here is "verified": no commercial source of truth was available. Prices, currencies,
 * limits, proof and integrations are deliberately absent rather than invented.
 */

export type ReviewStatus = "draft" | "review"

export type PlanId = "basic" | "advance"

/** "tbc" = to be confirmed by the commercial owner. */
export type Entitlement = "included" | "not-included" | "tbc"

export type Feature = {
  id: string
  label: string
  /** One-line explanation for the comparison table. */
  detail: string
  plans: Record<PlanId, Entitlement>
  status: ReviewStatus
  /** Why it needs review, shown to the owner in draft mode. */
  reviewNote?: string
  /** Show on the plan card as a highlight (taken from this dataset, never typed separately). */
  highlight?: boolean
}

export const PLANS: { id: PlanId; name: string; audience: string }[] = [
  { id: "basic", name: "Basic", audience: "For a single branch getting its lending off spreadsheets." },
  { id: "advance", name: "Advance", audience: "For lenders with several branches, approvers and collections teams." },
]

/**
 * ONE entitlement dataset. Plan cards and the comparison table both read it, so they can't disagree
 * (the audit found the Basic card offering online repayments that the comparison gave only to Advance).
 */
export const FEATURES: Feature[] = [
  {
    id: "clients",
    label: "Client records",
    detail: "Profiles, identification, contacts and loan history in one place.",
    plans: { basic: "included", advance: "included" },
    status: "draft",
    highlight: true,
  },
  {
    id: "loans",
    label: "Loan applications and approvals",
    detail: "Capture terms, route approvals with maker-checker, and track every stage.",
    plans: { basic: "included", advance: "included" },
    status: "draft",
    highlight: true,
  },
  {
    id: "schedules",
    label: "Repayment schedules and receipts",
    detail: "Schedules, payments recorded against installments, and receipt history.",
    plans: { basic: "included", advance: "included" },
    status: "draft",
    highlight: true,
  },
  {
    id: "collections",
    label: "Collections worklist",
    detail: "Arrears by age, contact logging and promises to pay.",
    plans: { basic: "tbc", advance: "included" },
    status: "draft",
    reviewNote: "Confirm whether Basic includes collections.",
    highlight: true,
  },
  {
    id: "online-repayments",
    label: "Online repayments",
    detail: "Borrowers repay by mobile money with a signed mandate.",
    plans: { basic: "tbc", advance: "tbc" },
    status: "review",
    reviewNote:
      "Contradiction in the current site: the Basic plan card lists online card payments, but the comparison table gives online repayments only to Advance. The commercial owner must confirm which plan includes it.",
    highlight: true,
  },
  {
    id: "collateral",
    label: "Collateral register",
    detail: "Pledged assets, valuations and lien status per loan.",
    plans: { basic: "tbc", advance: "included" },
    status: "draft",
    reviewNote: "Confirm whether Basic includes the collateral register.",
  },
  {
    id: "groups",
    label: "Group lending",
    detail: "Groups, member roles and group loan applications.",
    plans: { basic: "tbc", advance: "tbc" },
    status: "draft",
    reviewNote: "Confirm plan availability.",
  },
  {
    id: "branches",
    label: "Multiple branches",
    detail: "Run several branches with branch-scoped work and reporting.",
    plans: { basic: "not-included", advance: "included" },
    status: "draft",
    reviewNote: "Confirm the branch limit on each plan.",
  },
  {
    id: "audit",
    label: "Activity history",
    detail: "Who did what and when, with before-and-after values.",
    plans: { basic: "included", advance: "included" },
    status: "draft",
  },
]

/** Commercial terms that must not be stated until confirmed. Shown as "To be confirmed" in draft. */
export const COMMERCIAL_TERMS = [
  { id: "price", label: "Price", note: "No price is shown until the owner confirms it." },
  { id: "currency", label: "Billing currency", note: "Cedis, dollars or both: to confirm." },
  { id: "basis", label: "Billing basis", note: "Per business, per branch or per location: to confirm." },
  { id: "limits", label: "Included limits", note: "Users, branches or active loans per plan: to confirm." },
]

/** Claims seen on the current site that can't be used until substantiated. Hidden on release. */
export const HELD_CLAIMS = [
  { claim: "Real-time AI credit scoring", reason: "No evidence of an AI model in the product. The scores in LoanDrift are labelled by model version and aren't described as AI." },
  { claim: "Scoring from point-of-sale (POS) data", reason: "No POS integration has been confirmed." },
  { claim: "Customer logos, testimonials and statistics", reason: "None approved by the business. Nothing is shown until real, approved proof exists." },
]

export const INTEGRATIONS_NOTE =
  "Which integrations exist (mobile money, credit bureau, SMS) and which plan includes them isn't confirmed, so none are listed yet."

export const FAQS: { q: string; a: string; status: ReviewStatus }[] = [
  {
    q: "Does LoanDrift lend money?",
    a: "No. LoanDrift is software that lending businesses use to run their own loans: applications, approvals, repayments and collections. It doesn't provide financing.",
    status: "draft",
  },
  {
    q: "Who is LoanDrift for?",
    a: "Microfinance institutions, savings and loans companies, and other lenders that manage borrowers, approvals and collections across one or more branches.",
    status: "draft",
  },
  {
    q: "How much does it cost?",
    a: "Pricing, billing currency and whether plans are charged per branch are being confirmed. Book a demo and we'll talk through the options for your business.",
    status: "draft",
  },
  {
    q: "Can borrowers repay online?",
    a: "Automatic mobile money collection needs a mandate signed by each borrower. Which plans include it is being confirmed.",
    status: "review",
  },
  {
    q: "What happens after I book a demo?",
    a: "Someone from the TroveSuite team contacts you by email to agree a time. Nothing is booked until you confirm it.",
    status: "draft",
  },
]

export function visible<T extends { status: ReviewStatus }>(items: T[], release: boolean) {
  return release ? items.filter((i) => i.status !== "review") : items
}

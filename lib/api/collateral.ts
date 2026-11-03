/**
 * Collateral register (B2-07, F60–F63). Read-only plus mocked forms: nothing here records a lien or
 * valuation, removes, releases or recovers an asset, or edits ownership.
 *
 * Value basis, always named:
 * - Registration estimate: the officer's figure when the asset was registered.
 * - Recorded market valuation: replaces the estimate as the value used, once recorded.
 * - Forced-sale value: only if a valuer gave one. Otherwise "Not recorded", never zero.
 *
 * Exceptions are separate queues. "Pledged with no lien recorded" is an ASSUMED rule (any pledged
 * asset on a disbursed loan): which asset types actually need a registered lien is product and
 * legal policy, not established here.
 */
import { demoAssets, ASSET_TYPES, COLLATERAL_STATUS, type AssetType, type CollateralStatus, type DemoAsset, type Valuation } from "@/lib/collateral-fixtures"
import { DEMO_TODAY, demoLoans } from "@/lib/fixtures"
import { loanStatus } from "@/lib/format"
import type { CurrencyCode, Money } from "@/lib/types"

const DISBURSED = new Set(["disbursed", "active", "defaulted", "written_off", "completed", "MIGRATED_CLOSED"])
const NOT_YET_DISBURSED = new Set(["registered", "captured", "approved"])

export type Asset = DemoAsset & {
  borrower: string
  borrowerId: string
  loanStatus: string
  loanStatusLabel: string
  /** The latest recorded valuation, or null when only the estimate exists. */
  valuation: Valuation | null
  /** The value used: the latest valuation's market value, else the estimate. */
  valueUsed: { value: Money; basis: "Registration estimate" | Valuation["basis"]; on: string }
  exceptions: ExceptionId[]
}

export const EXCEPTIONS = {
  awaiting_verification: { label: "Awaiting verification", description: "Registered but not yet verified, so it isn't securing the loan yet." },
  no_lien: { label: "Pledged with no lien recorded", description: "Pledged to a disbursed loan with no lien on record. Which asset types need one is policy to confirm." },
  estimate_only: { label: "Estimate only, no valuation", description: "Only the registration estimate exists; no market valuation has been recorded." },
} as const
export type ExceptionId = keyof typeof EXCEPTIONS

function enrich(a: DemoAsset): Asset {
  const loan = demoLoans.find((l) => l.reference === a.loanRef)
  const status = loan?.status ?? "unknown"
  const valuation = [...a.valuations].sort((x, y) => y.on.localeCompare(x.on))[0] ?? null
  const exceptions: ExceptionId[] = []
  if (a.status === "awaiting_verification") exceptions.push("awaiting_verification")
  if (a.status === "pledged" && !a.lien && DISBURSED.has(status)) exceptions.push("no_lien")
  if (a.status !== "released" && !valuation) exceptions.push("estimate_only")
  return {
    ...a,
    borrower: loan?.borrower.name ?? "Unknown borrower",
    borrowerId: loan?.borrower.id ?? "",
    loanStatus: status,
    loanStatusLabel: loanStatus(status).label,
    valuation,
    valueUsed: valuation
      ? { value: valuation.marketValue, basis: valuation.basis, on: valuation.on }
      : { value: a.estimate.value, basis: "Registration estimate", on: a.estimate.on },
    exceptions,
  }
}

export const assets: Asset[] = demoAssets.map(enrich)

export function collateralForLoan(ref: string) {
  return assets.filter((a) => a.loanRef === ref)
}

export function getAsset(ref: string) {
  return assets.find((a) => a.ref === ref) ?? null
}

export type ActionId = "remove" | "release" | "recover" | "record_valuation" | "record_lien"
export type AssetAction = { id: ActionId; label: string; description: string; available: boolean; reason: string }

/**
 * Which operations fit this asset's and loan's state. Removal, release and recovery are different
 * operations. "Available" means the state allows it; the server still checks permission, and every
 * action is disabled in this prototype.
 */
export function assetActions(a: Asset): AssetAction[] {
  const s = a.loanStatus
  const live = a.status !== "released"
  return [
    {
      id: "remove",
      label: "Remove from loan",
      description: "Take the asset off a loan that hasn't been disbursed.",
      available: live && NOT_YET_DISBURSED.has(s),
      reason: !live ? "Already released." : NOT_YET_DISBURSED.has(s) ? "" : `Not possible: the loan is ${a.loanStatusLabel.toLowerCase()}, so it has already been disbursed.`,
    },
    {
      id: "release",
      label: "Release to owner",
      description: "Return the asset once the loan is repaid. Needs approval.",
      available: a.status === "pledged" && s === "completed",
      reason: a.status !== "pledged" ? (live ? "Only a pledged asset can be released." : "Already released.") : s === "completed" ? "" : "Only after the loan is fully repaid.",
    },
    {
      id: "recover",
      label: "Start recovery",
      description: "Begin recovering the asset against an unpaid loan. Needs approval and follows the recovery policy.",
      available: a.status === "pledged" && (s === "defaulted" || s === "written_off"),
      reason: a.status !== "pledged" ? "Only a pledged asset can be recovered." : s === "defaulted" || s === "written_off" ? "" : "Only for a defaulted or written-off loan.",
    },
    {
      id: "record_valuation",
      label: "Record a valuation",
      description: "Add a market valuation. It replaces the estimate as the value used.",
      available: live,
      reason: live ? "" : "Already released.",
    },
    {
      id: "record_lien",
      label: a.lien ? "Update the lien" : "Record a lien",
      description: "Record a lien registration you have evidence for.",
      available: live,
      reason: live ? "" : "Already released.",
    },
  ]
}

export type CollateralFilters = { q?: string; type?: string; status?: string; exception?: string }

/** Totals of pledged assets, per currency and per basis. Never adds estimates to valuations. */
export function coverage(list: Asset[]) {
  const pledged = list.filter((a) => a.status === "pledged")
  const sum = (pick: (a: Asset) => Money | null) => {
    const by = new Map<CurrencyCode, number>()
    let counted = 0
    for (const a of pledged) {
      const m = pick(a)
      if (!m) continue
      counted++
      by.set(m.currency, (by.get(m.currency) ?? 0) + m.minor)
    }
    return { totals: [...by].map(([currency, minor]) => ({ currency, minor })), counted, of: pledged.length }
  }
  return {
    pledged: pledged.length,
    estimateOnly: sum((a) => (a.valuation ? null : a.estimate.value)),
    valued: sum((a) => a.valuation?.marketValue ?? null),
    forcedSale: sum((a) => a.valuation?.forcedSaleValue ?? null),
  }
}

export function exceptionCounts(list: Asset[] = assets) {
  return (Object.keys(EXCEPTIONS) as ExceptionId[]).map((id) => ({ id, ...EXCEPTIONS[id], count: list.filter((a) => a.exceptions.includes(id)).length }))
}

export function queryAssets(f: CollateralFilters) {
  const needle = f.q?.trim().toLowerCase() ?? ""
  const rows = assets.filter(
    (a) =>
      (!needle || [a.ref, a.description, a.loanRef, a.borrower, a.owner.kind === "third_party" ? a.owner.name : ""].some((v) => v.toLowerCase().includes(needle))) &&
      (!f.type || a.type === f.type) &&
      (!f.status || a.status === f.status) &&
      (!f.exception || a.exceptions.includes(f.exception as ExceptionId)),
  )
  return { rows, total: rows.length, registerTotal: assets.length, exceptions: exceptionCounts(), coverage: coverage(assets) }
}

export async function fetchAssets(f: CollateralFilters, sim: "none" | "slow" | "error" = "none") {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 150))
  if (sim === "error") throw new Error("The collateral register couldn't be loaded. Nothing has changed; try again.")
  return queryAssets(f)
}

// ── Mocked forms: checks only, nothing saved ─────────────────────────────

export const UPLOAD = { types: ["image/jpeg", "image/png", "application/pdf"], label: "JPG, PNG or PDF", maxMb: 5 }

export type ValuationDraft = { basis: string; valuer: string; marketValue: string; forcedSaleValue: string; on: string; report: string }
export type LienDraft = { state: string; registry: string; reference: string; on: string; evidence: string }
export type Errors<T> = Partial<Record<keyof T, string>>

const AMOUNT = /^\d+(\.\d{1,2})?$/
const clean = (v: string) => v.trim().replace(/,/g, "")

export function validateValuation(d: ValuationDraft, today = DEMO_TODAY): Errors<ValuationDraft> {
  const e: Errors<ValuationDraft> = {}
  if (!d.basis) e.basis = "Choose whether this is an independent or internal valuation."
  if (!d.valuer.trim()) e.valuer = d.basis === "Independent valuation" ? "Enter the valuer or firm named on the report." : "Enter who did the valuation."
  if (!clean(d.marketValue)) e.marketValue = "Enter the market value from the valuation."
  else if (!AMOUNT.test(clean(d.marketValue)) || Number(clean(d.marketValue)) <= 0) e.marketValue = "Enter an amount above zero, for example 3500."
  if (clean(d.forcedSaleValue) && !AMOUNT.test(clean(d.forcedSaleValue))) e.forcedSaleValue = "Enter an amount, or leave it blank if the valuer didn't give one."
  else if (clean(d.forcedSaleValue) && clean(d.marketValue) && Number(clean(d.forcedSaleValue)) > Number(clean(d.marketValue)))
    e.forcedSaleValue = "A forced-sale value is normally below market value. Check the report."
  if (!d.on) e.on = "Enter the valuation date."
  else if (d.on > today) e.on = "The valuation date can't be in the future."
  if (d.basis === "Independent valuation" && !d.report) e.report = "Attach the valuer's report. An independent valuation needs it."
  return e
}

export function validateLien(d: LienDraft, today = DEMO_TODAY): Errors<LienDraft> {
  const e: Errors<LienDraft> = {}
  if (!d.state) e.state = "Choose whether a lien has been registered."
  if (d.state === "registered") {
    if (!d.registry) e.registry = "Choose the registry it was recorded with."
    if (!d.reference.trim()) e.reference = "Enter the registry's reference exactly as issued."
    if (!d.on) e.on = "Enter the registration date."
    else if (d.on > today) e.on = "The registration date can't be in the future."
    if (!d.evidence) e.evidence = "Attach the registry's confirmation."
  }
  return e
}

export const REGISTRIES = ["Vehicle registry", "Lands registry", "Collateral registry", "Other registry"]

export type RegistrationDraft = {
  loanRef: string
  type: AssetType | ""
  description: string
  regNumber: string
  makeModel: string
  location: string
  titleRef: string
  serial: string
  owner: "borrower" | "third_party" | ""
  ownerName: string
  ownerPhone: string
  ownerRelationship: string
  estimate: string
}

/** Assets can be registered against a loan that hasn't been disbursed. Adding collateral later is policy to confirm. */
export const REGISTRABLE_LOANS = demoLoans.filter((l) => NOT_YET_DISBURSED.has(l.status))

export function validateRegistration(d: RegistrationDraft): Errors<RegistrationDraft> {
  const e: Errors<RegistrationDraft> = {}
  if (!d.loanRef) e.loanRef = "Choose the loan this asset secures."
  if (!d.type) e.type = "Choose the type of asset."
  if (!d.description.trim()) e.description = "Describe the asset so it can be identified."
  if (d.type === "vehicle") {
    if (!d.regNumber.trim()) e.regNumber = "Enter the vehicle's registration number."
    if (!d.makeModel.trim()) e.makeModel = "Enter the make and model."
  }
  if (d.type === "property") {
    if (!d.location.trim()) e.location = "Enter where the property is."
    if (!d.titleRef.trim()) e.titleRef = "Enter the title document's reference."
  }
  if (!d.owner) e.owner = "Choose who owns the asset."
  if (d.owner === "third_party") {
    if (!d.ownerName.trim()) e.ownerName = "Enter the owner's full name."
    if (!d.ownerPhone.trim()) e.ownerPhone = "Enter the owner's phone number."
    else if (!/^0\d{2} ?\d{3} ?\d{4}$/.test(d.ownerPhone.trim())) e.ownerPhone = "Use a 10-digit number starting with 0."
    if (!d.ownerRelationship.trim()) e.ownerRelationship = "Enter how the owner is related to the borrower."
  }
  if (!clean(d.estimate)) e.estimate = "Enter your estimate of the asset's value."
  else if (!AMOUNT.test(clean(d.estimate)) || Number(clean(d.estimate)) <= 0) e.estimate = "Enter an amount above zero."
  return e
}

export async function checkForm<T>(errors: Errors<T>) {
  await new Promise((r) => setTimeout(r, 300))
  return Object.keys(errors).length === 0
}

export { ASSET_TYPES, COLLATERAL_STATUS, type AssetType, type CollateralStatus }

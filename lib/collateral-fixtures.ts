/**
 * FICTIONAL collateral register (B2-07, F60–F63). Every asset, owner, registry reference and valuer
 * here is invented. The loan record's Collateral tab reads from this register, so there is one
 * source. Values are integer minor units with their currency; a missing valuation or forced-sale
 * value is null, never zero.
 */
import type { Money } from "@/lib/types"

export const ASSET_TYPES = {
  vehicle: "Vehicle",
  property: "Land or property",
  equipment: "Business equipment",
  household: "Household goods",
} as const
export type AssetType = keyof typeof ASSET_TYPES

export const COLLATERAL_STATUS = {
  awaiting_verification: { label: "Awaiting verification", tone: "warning" },
  pledged: { label: "Pledged", tone: "info" },
  released: { label: "Released", tone: "neutral" },
} as const
export type CollateralStatus = keyof typeof COLLATERAL_STATUS

export type Valuation = {
  basis: "Independent valuation" | "Internal valuation"
  marketValue: Money
  /** Null = the valuer didn't give one. Never treated as zero. */
  forcedSaleValue: Money | null
  on: string
  by: string
}

export type DemoAsset = {
  ref: string
  type: AssetType
  description: string
  /** Type-specific identifiers, as captured. */
  details: { label: string; value: string }[]
  loanRef: string
  owner: { kind: "borrower" } | { kind: "third_party"; name: string; relationship: string; consentSignedOn: string | null }
  /** What the officer estimated at registration. Replaced as the value used once a valuation is recorded. */
  estimate: { value: Money; on: string; by: string }
  valuations: Valuation[]
  lien: { registry: string; reference: string; on: string } | null
  status: CollateralStatus
  history: { on: string; event: string; by: string }[]
}

const ghs = (cedis: number): Money => ({ minor: cedis * 100, currency: "GHS" })
const usd = (dollars: number): Money => ({ minor: dollars * 100, currency: "USD" })

export const demoAssets: DemoAsset[] = [
  {
    ref: "DEMO-COL-01",
    type: "vehicle",
    description: "Saloon car, 2014 (fictional)",
    details: [
      { label: "Registration number", value: "DEMO-GR-0001-14" },
      { label: "Make and model", value: "Sample Saloon" },
    ],
    loanRef: "DEMO-LN-002",
    owner: { kind: "borrower" },
    estimate: { value: ghs(3000), on: "2026-04-03", by: "Yaw Officer" },
    valuations: [],
    lien: null,
    status: "pledged",
    history: [
      { on: "2026-04-03", event: "Registered with an estimate of GH₵3,000.00", by: "Yaw Officer" },
      { on: "2026-04-14", event: "Verified and pledged to DEMO-LN-002", by: "Abena Demo" },
    ],
  },
  {
    ref: "DEMO-COL-02",
    type: "equipment",
    description: "Sewing machines, set of three (fictional)",
    details: [{ label: "Serial numbers", value: "DEMO-SM-01 to DEMO-SM-03" }],
    loanRef: "DEMO-LN-004",
    owner: { kind: "borrower" },
    estimate: { value: ghs(3000), on: "2026-10-28", by: "Yaw Officer" },
    valuations: [],
    lien: null,
    status: "awaiting_verification",
    history: [{ on: "2026-10-28", event: "Registered with an estimate of GH₵3,000.00", by: "Yaw Officer" }],
  },
  {
    ref: "DEMO-COL-03",
    type: "property",
    description: "Residential plot, Osu outskirts (fictional)",
    details: [
      { label: "Location", value: "Plot 0, Demo Road (fictional)" },
      { label: "Title document reference", value: "DEMO-TITLE-0003" },
    ],
    loanRef: "DEMO-LN-006",
    owner: { kind: "third_party", name: "Kwesi Fixture", relationship: "Brother", consentSignedOn: "2026-04-22" },
    estimate: { value: ghs(25000), on: "2026-04-15", by: "Yaw Officer" },
    valuations: [{ basis: "Independent valuation", marketValue: ghs(22000), forcedSaleValue: ghs(15000), on: "2026-04-20", by: "Demo Valuers Ltd (fictional)" }],
    lien: { registry: "Lands registry", reference: "DEMO-LR-0003", on: "2026-04-24" },
    status: "pledged",
    history: [
      { on: "2026-04-15", event: "Registered with an estimate of GH₵25,000.00", by: "Yaw Officer" },
      { on: "2026-04-20", event: "Independent valuation recorded: GH₵22,000.00 market, GH₵15,000.00 forced sale", by: "Yaw Officer" },
      { on: "2026-04-22", event: "Third-party owner's consent signed", by: "Yaw Officer" },
      { on: "2026-04-24", event: "Lien recorded with the lands registry", by: "Abena Demo" },
      { on: "2026-08-02", event: "Linked loan written off", by: "Abena Demo" },
    ],
  },
  {
    ref: "DEMO-COL-04",
    type: "vehicle",
    description: "Motorbike, 2021 (fictional)",
    details: [
      { label: "Registration number", value: "DEMO-M-0004-21" },
      { label: "Make and model", value: "Sample Rider 125" },
    ],
    loanRef: "DEMO-LN-008",
    owner: { kind: "borrower" },
    estimate: { value: ghs(4000), on: "2026-09-29", by: "Kofi Officer" },
    valuations: [{ basis: "Internal valuation", marketValue: ghs(3500), forcedSaleValue: null, on: "2026-10-03", by: "Kofi Officer" }],
    lien: { registry: "Vehicle registry", reference: "DEMO-VR-0004", on: "2026-10-04" },
    status: "pledged",
    history: [
      { on: "2026-09-29", event: "Registered with an estimate of GH₵4,000.00", by: "Kofi Officer" },
      { on: "2026-10-03", event: "Internal valuation recorded: GH₵3,500.00 market, no forced-sale value", by: "Kofi Officer" },
      { on: "2026-10-04", event: "Lien recorded with the vehicle registry", by: "Abena Demo" },
    ],
  },
  {
    ref: "DEMO-COL-05",
    type: "household",
    description: "Chest freezer (fictional)",
    details: [{ label: "Serial number", value: "DEMO-FZ-0005" }],
    loanRef: "DEMO-LN-003",
    owner: { kind: "borrower" },
    estimate: { value: ghs(1200), on: "2026-07-30", by: "Yaw Officer" },
    valuations: [],
    lien: null,
    status: "released",
    history: [
      { on: "2026-07-30", event: "Registered with an estimate of GH₵1,200.00", by: "Yaw Officer" },
      { on: "2026-08-03", event: "Verified and pledged to DEMO-LN-003", by: "Abena Demo" },
      { on: "2026-09-16", event: "Released after the loan was repaid", by: "Abena Demo" },
    ],
  },
  {
    ref: "DEMO-COL-06",
    type: "equipment",
    description: "Large-format printer (fictional)",
    details: [{ label: "Serial number", value: "DEMO-PR-0006" }],
    loanRef: "DEMO-LN-005",
    owner: { kind: "borrower" },
    estimate: { value: usd(2000), on: "2026-06-28", by: "Kofi Officer" },
    valuations: [],
    lien: null,
    status: "pledged",
    history: [
      { on: "2026-06-28", event: "Registered with an estimate of USD 2,000.00", by: "Kofi Officer" },
      { on: "2026-07-01", event: "Verified and pledged to DEMO-LN-005", by: "Abena Demo" },
    ],
  },
]

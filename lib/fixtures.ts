/**
 * FICTIONAL demo data. Every name, reference and amount here is invented for the prototype.
 * Do not replace with real borrower details; the real app loads these from its own services.
 *
 * Values marked "source" stand in for what the backend would supply (balances, principal
 * outstanding). The prototype's service layer (lib/api) derives only what the brief asks the
 * dashboard to derive: sums, arrears from the schedule, and period activity from events.
 */
import { unavailable, type CreditScore, type LoanStatus, type Money, type MoneyValue, type RepaymentHealth } from "@/lib/types"

/** Fixed as-of instant for every snapshot in the prototype. Ghana is GMT, so this is 09:00 local. */
export const DEMO_AS_OF = "2026-11-02T09:00:00Z"
export const DEMO_TODAY = "2026-11-02"

export const demoContext = {
  business: "Sample Microfinance Ltd",
  branch: "Osu branch",
  user: { id: "DEMO-USR-01", name: "Abena Demo", role: "Branch manager", email: "abena.demo@example.com" },
}

export const ghs = (cedis: number): Money => ({ minor: Math.round(cedis * 100), currency: "GHS" })
export const usd = (dollars: number): Money => ({ minor: Math.round(dollars * 100), currency: "USD" })

const currentModel = { id: "ld-2026", label: "Current model", legacy: false }
const legacyModel = { id: "ld-legacy", label: "Legacy model", legacy: true }

export type DemoLoan = {
  reference: string
  borrower: { id: string; name: string }
  product: string
  status: LoanStatus | (string & {})
  health: RepaymentHealth | null
  /** Approved principal. */
  principal: MoneyValue
  /** Source: principal still owed. Excludes interest, fees and penalties. */
  principalOutstanding: MoneyValue
  /** Source: everything still owed, including interest. */
  balanceInclInterest: MoneyValue
  updatedOn: string
  score: CreditScore | null
}

export const demoLoans: DemoLoan[] = [
  {
    // Matches the coherent fixture in the competitor pack: 4 × GH₵300, GH₵200 paid toward #1.
    reference: "DEMO-LN-001",
    borrower: { id: "DEMO-CL-01", name: "Ama Sample" },
    product: "Weekly trader loan",
    status: "active",
    health: "in_arrears",
    principal: ghs(1000),
    principalOutstanding: ghs(833.33),
    balanceInclInterest: ghs(1000),
    updatedOn: "2026-10-24",
    score: { value: 712, scaleMax: 900, model: currentModel },
  },
  {
    reference: "DEMO-LN-002",
    borrower: { id: "DEMO-CL-02", name: "Kojo Example" },
    product: "Monthly SME loan",
    status: "defaulted",
    health: "in_arrears",
    principal: ghs(8000),
    principalOutstanding: ghs(4000),
    balanceInclInterest: ghs(4800),
    updatedOn: "2026-10-30",
    score: { value: 54, scaleMax: 100, model: legacyModel },
  },
  {
    reference: "DEMO-LN-003",
    borrower: { id: "DEMO-CL-02", name: "Kojo Example" },
    product: "Weekly trader loan",
    status: "completed",
    health: "settled",
    principal: ghs(2000),
    principalOutstanding: ghs(0),
    balanceInclInterest: ghs(0),
    updatedOn: "2026-09-14",
    score: null,
  },
  {
    reference: "DEMO-LN-004",
    borrower: { id: "DEMO-CL-03", name: "Esi Placeholder" },
    product: "Monthly SME loan",
    status: "captured",
    health: "not_started",
    principal: ghs(10000),
    principalOutstanding: unavailable("Not disbursed yet, so there is no balance."),
    balanceInclInterest: unavailable("Not disbursed yet, so there is no balance."),
    updatedOn: "2026-11-01",
    score: null,
  },
  {
    reference: "DEMO-LN-005",
    borrower: { id: "DEMO-CL-04", name: "Yaw Testcase" },
    product: "Equipment loan (USD)",
    status: "active",
    health: "on_track",
    principal: usd(1500),
    principalOutstanding: usd(980),
    balanceInclInterest: usd(1080),
    updatedOn: "2026-10-01",
    score: { value: 640, scaleMax: 900, model: currentModel },
  },
  {
    reference: "DEMO-LN-006",
    borrower: { id: "DEMO-CL-05", name: "Akos Fixture" },
    product: "Weekly trader loan",
    status: "written_off",
    health: null,
    principal: ghs(1800),
    principalOutstanding: ghs(0),
    balanceInclInterest: ghs(0),
    updatedOn: "2026-08-02",
    score: null,
  },
  {
    reference: "DEMO-LN-007",
    borrower: { id: "DEMO-CL-06", name: "Kwame Mock" },
    product: "Weekly trader loan",
    // A legacy value with no mapping: shown as unrecognised, never as "Pending".
    status: "MIGRATED_CLOSED",
    health: null,
    principal: ghs(500),
    principalOutstanding: unavailable("The source record has no balance for this legacy status."),
    balanceInclInterest: unavailable("The source record has no balance for this legacy status."),
    updatedOn: "2025-12-19",
    score: null,
  },
  {
    reference: "DEMO-LN-008",
    borrower: { id: "DEMO-CL-07", name: "Efua Demo" },
    product: "Monthly SME loan",
    status: "active",
    health: "not_started",
    principal: ghs(3000),
    principalOutstanding: ghs(3000),
    balanceInclInterest: ghs(3300),
    updatedOn: "2026-10-05",
    score: { value: 688, scaleMax: 900, model: currentModel },
  },
  {
    reference: "DEMO-LN-009",
    borrower: { id: "DEMO-CL-08", name: "Kofi Sample" },
    product: "Weekly trader loan",
    status: "active",
    health: "due_today",
    principal: ghs(1500),
    principalOutstanding: ghs(750),
    balanceInclInterest: ghs(800),
    updatedOn: "2026-10-27",
    score: { value: 701, scaleMax: 900, model: currentModel },
  },
  {
    reference: "DEMO-LN-010",
    borrower: { id: "DEMO-CL-09", name: "Nana Fictional" },
    product: "Monthly SME loan",
    status: "rejected",
    health: null,
    principal: ghs(6000),
    principalOutstanding: unavailable("Rejected: never disbursed."),
    balanceInclInterest: unavailable("Rejected: never disbursed."),
    updatedOn: "2026-10-22",
    score: { value: 512, scaleMax: 900, model: currentModel },
  },
  {
    reference: "DEMO-LN-011",
    borrower: { id: "DEMO-CL-10", name: "Abla Mock" },
    product: "Weekly trader loan",
    status: "approved",
    health: "not_started",
    principal: ghs(2500),
    principalOutstanding: unavailable("Approved but not disbursed yet."),
    balanceInclInterest: unavailable("Approved but not disbursed yet."),
    updatedOn: "2026-10-31",
    score: { value: 690, scaleMax: 900, model: currentModel },
  },
  {
    // A third loan for the same borrower, so record identity matters (F22, F45).
    reference: "DEMO-LN-012",
    borrower: { id: "DEMO-CL-02", name: "Kojo Example" },
    product: "Weekly trader loan",
    status: "registered",
    health: "not_started",
    principal: ghs(3000),
    principalOutstanding: unavailable("Registered only: terms not captured."),
    balanceInclInterest: unavailable("Registered only: terms not captured."),
    updatedOn: "2026-11-02",
    score: null,
  },
]

/** Repayment schedule lines. `paid` is what has been allocated to the line as of DEMO_AS_OF. */
export type DemoInstallment = { loanRef: string; number: number; dueDate: string; due: Money; paid: Money }

const inst = (loanRef: string, rows: [number, string, number, number][], money = ghs): DemoInstallment[] =>
  rows.map(([number, dueDate, due, paid]) => ({ loanRef, number, dueDate, due: money(due), paid: money(paid) }))

export const demoInstallments: DemoInstallment[] = [
  ...inst("DEMO-LN-001", [
    [1, "2026-10-26", 300, 200],
    [2, "2026-11-02", 300, 0],
    [3, "2026-11-09", 300, 0],
    [4, "2026-11-16", 300, 0],
  ]),
  ...inst("DEMO-LN-002", [
    [1, "2026-05-15", 1600, 1600],
    [2, "2026-06-15", 1600, 1600],
    [3, "2026-07-15", 1600, 1600],
    [4, "2026-08-15", 1600, 0],
    [5, "2026-09-15", 1600, 0],
    [6, "2026-10-15", 1600, 0],
  ]),
  ...inst("DEMO-LN-003", [
    [1, "2026-08-10", 515, 515],
    [2, "2026-08-24", 515, 515],
    [3, "2026-09-07", 515, 515],
    [4, "2026-09-14", 515, 515],
  ]),
  ...inst(
    "DEMO-LN-005",
    [
      [1, "2026-08-01", 300, 300],
      [2, "2026-09-01", 300, 300],
      [3, "2026-10-01", 300, 300],
      [4, "2026-11-01", 300, 300],
      [5, "2026-12-01", 300, 0],
    ],
    usd,
  ),
  ...inst("DEMO-LN-006", [
    [1, "2026-05-04", 500, 200],
    [2, "2026-05-11", 500, 0],
    [3, "2026-05-18", 500, 0],
    [4, "2026-05-25", 500, 0],
  ]),
  ...inst("DEMO-LN-008", [
    [1, "2026-11-05", 1100, 0],
    [2, "2026-12-05", 1100, 0],
    [3, "2027-01-05", 1100, 0],
  ]),
  ...inst("DEMO-LN-009", [
    [1, "2026-10-19", 400, 400],
    [2, "2026-10-26", 400, 400],
    [3, "2026-11-02", 400, 0],
    [4, "2026-11-09", 400, 0],
  ]),
]

export type DemoEventKind = "disbursement" | "repayment" | "fee_charged"

/** Ledger events. `on` is the effective calendar date in branch time. */
export type DemoEvent = { id: string; kind: DemoEventKind; loanRef: string; on: string; amount: Money }

let n = 0
const ev = (kind: DemoEventKind, loanRef: string, on: string, amount: Money): DemoEvent => ({
  id: `DEMO-TX-${String(++n).padStart(3, "0")}`,
  kind,
  loanRef,
  on,
  amount,
})

export const demoEvents: DemoEvent[] = [
  ev("disbursement", "DEMO-LN-002", "2026-04-15", ghs(8000)),
  ev("disbursement", "DEMO-LN-006", "2026-04-27", ghs(1800)),
  ev("repayment", "DEMO-LN-006", "2026-05-04", ghs(200)),
  ev("repayment", "DEMO-LN-002", "2026-05-15", ghs(1600)),
  ev("repayment", "DEMO-LN-002", "2026-06-15", ghs(1600)),
  ev("disbursement", "DEMO-LN-005", "2026-07-01", usd(1500)),
  // Two cheques of GH₵800 on the same day for the same loan: similar, but two real payments.
  ev("repayment", "DEMO-LN-002", "2026-07-15", ghs(800)),
  ev("repayment", "DEMO-LN-002", "2026-07-15", ghs(800)),
  ev("repayment", "DEMO-LN-005", "2026-08-01", usd(300)),
  ev("disbursement", "DEMO-LN-003", "2026-08-03", ghs(2000)),
  ev("repayment", "DEMO-LN-003", "2026-08-10", ghs(515)),
  ev("repayment", "DEMO-LN-003", "2026-08-24", ghs(515)),
  ev("repayment", "DEMO-LN-005", "2026-09-01", usd(300)),
  ev("repayment", "DEMO-LN-003", "2026-09-07", ghs(515)),
  ev("repayment", "DEMO-LN-003", "2026-09-14", ghs(515)),
  ev("repayment", "DEMO-LN-005", "2026-10-01", usd(300)),
  ev("disbursement", "DEMO-LN-008", "2026-10-05", ghs(3000)),
  ev("fee_charged", "DEMO-LN-008", "2026-10-05", ghs(60)),
  ev("disbursement", "DEMO-LN-009", "2026-10-12", ghs(1500)),
  ev("fee_charged", "DEMO-LN-009", "2026-10-12", ghs(30)),
  ev("disbursement", "DEMO-LN-001", "2026-10-19", ghs(1000)),
  ev("fee_charged", "DEMO-LN-001", "2026-10-19", ghs(20)),
  ev("repayment", "DEMO-LN-009", "2026-10-19", ghs(400)),
  ev("repayment", "DEMO-LN-001", "2026-10-24", ghs(200)),
  ev("repayment", "DEMO-LN-009", "2026-10-27", ghs(400)),
  ev("repayment", "DEMO-LN-005", "2026-11-01", usd(300)),
]

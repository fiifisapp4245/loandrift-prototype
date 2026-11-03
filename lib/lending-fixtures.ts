/**
 * FICTIONAL clients and loan-record details (terms, signatures, documents). Collateral is in
 * lib/collateral-fixtures.ts, the one register the loan record also reads.
 * Phone numbers and ID numbers are deliberately invalid placeholders. Never replace with real data.
 */
import { ghs } from "@/lib/fixtures"
import { usd } from "@/lib/fixtures"
import type { Money } from "@/lib/types"

export type DemoClient = {
  id: string
  name: string
  /** Primary contact: used for repayment reminders. Null = not provided. */
  phone: string | null
  email: string | null
  idDocument: { type: "Ghana Card" | "Passport" | "Voter ID"; number: string } | null
  business: { name: string; type: string } | null
  monthlyIncome: Money | null
  town: string | null
  registeredOn: string
  officerId: string
}

export const demoClients: DemoClient[] = [
  { id: "DEMO-CL-01", name: "Ama Sample", phone: "020 000 0001", email: null, idDocument: { type: "Ghana Card", number: "GHA-000000001-0" }, business: { name: "Ama's Provisions", type: "Retail" }, monthlyIncome: ghs(1800), town: "Osu", registeredOn: "2026-10-10", officerId: "DEMO-USR-02" },
  { id: "DEMO-CL-02", name: "Kojo Example", phone: "020 000 0002", email: "kojo@example.com", idDocument: { type: "Ghana Card", number: "GHA-000000002-0" }, business: { name: "Example Hardware", type: "Wholesale" }, monthlyIncome: ghs(5200), town: "Labadi", registeredOn: "2026-03-28", officerId: "DEMO-USR-02" },
  { id: "DEMO-CL-03", name: "Esi Placeholder", phone: "020 000 0003", email: null, idDocument: { type: "Ghana Card", number: "GHA-000000003-0" }, business: { name: "Placeholder Fabrics", type: "Retail" }, monthlyIncome: ghs(2500), town: "Osu", registeredOn: "2026-10-28", officerId: "DEMO-USR-02" },
  { id: "DEMO-CL-04", name: "Yaw Testcase", phone: "020 000 0004", email: "yaw@example.com", idDocument: { type: "Passport", number: "P0000004" }, business: { name: "Testcase Print Shop", type: "Services" }, monthlyIncome: null, town: "Cantonments", registeredOn: "2026-06-20", officerId: "DEMO-USR-03" },
  { id: "DEMO-CL-05", name: "Akos Fixture", phone: null, email: null, idDocument: { type: "Voter ID", number: "V0000005" }, business: null, monthlyIncome: null, town: null, registeredOn: "2026-02-11", officerId: "DEMO-USR-02" },
  { id: "DEMO-CL-06", name: "Kwame Mock", phone: "020 000 0006", email: null, idDocument: null, business: { name: "Mock Motors", type: "Services" }, monthlyIncome: ghs(3000), town: "Osu", registeredOn: "2025-11-30", officerId: "DEMO-USR-02" },
  { id: "DEMO-CL-07", name: "Efua Demo", phone: "020 000 0007", email: "efua@example.com", idDocument: { type: "Ghana Card", number: "GHA-000000007-0" }, business: { name: "Demo Catering", type: "Food" }, monthlyIncome: ghs(4100), town: "Ridge", registeredOn: "2026-09-29", officerId: "DEMO-USR-03" },
  { id: "DEMO-CL-08", name: "Kofi Sample", phone: "020 000 0008", email: null, idDocument: { type: "Ghana Card", number: "GHA-000000008-0" }, business: { name: "Sample Phones", type: "Retail" }, monthlyIncome: ghs(2200), town: "Osu", registeredOn: "2026-10-05", officerId: "DEMO-USR-02" },
  { id: "DEMO-CL-09", name: "Nana Fictional", phone: "020 000 0009", email: null, idDocument: { type: "Ghana Card", number: "GHA-000000009-0" }, business: { name: "Fictional Foods", type: "Food" }, monthlyIncome: ghs(2900), town: "Labadi", registeredOn: "2026-10-15", officerId: "DEMO-USR-02" },
  { id: "DEMO-CL-10", name: "Abla Mock", phone: "020 000 0010", email: null, idDocument: { type: "Ghana Card", number: "GHA-000000010-0" }, business: { name: "Abla Beauty", type: "Services" }, monthlyIncome: ghs(1600), town: "Osu", registeredOn: "2026-10-27", officerId: "DEMO-USR-02" },
  { id: "DEMO-CL-11", name: "Selorm Stub", phone: "020 000 0011", email: null, idDocument: { type: "Ghana Card", number: "GHA-000000011-0" }, business: null, monthlyIncome: null, town: "Ridge", registeredOn: "2026-11-01", officerId: "DEMO-USR-02" },
]

export type DemoLoanRecord = {
  /** Flat interest per repayment period, as captured. Null = not captured yet. */
  interestRate: number | null
  frequency: "Weekly" | "Monthly" | null
  installments: number | null
  disbursedOn: string | null
  officerId: string
  signatures: { party: string; signedOn: string | null }[]
  documents: { title: string; kind: string; sizeKb: number; addedOn: string }[]
}

const SIGNED = (party: string, on: string) => ({ party, signedOn: on })

export const demoLoanRecords: Record<string, DemoLoanRecord> = {
  "DEMO-LN-001": {
    interestRate: 5, frequency: "Weekly", installments: 4, disbursedOn: "2026-10-19", officerId: "DEMO-USR-02",
    signatures: [SIGNED("Borrower", "2026-10-18"), SIGNED("Loan officer", "2026-10-18")],
    documents: [
      { title: "Ghana Card, front and back", kind: "ID", sizeKb: 412, addedOn: "2026-10-10" },
      { title: "Signed loan agreement", kind: "Agreement", sizeKb: 1260, addedOn: "2026-10-18" },
    ],
  },
  "DEMO-LN-002": {
    interestRate: 3.33, frequency: "Monthly", installments: 6, disbursedOn: "2026-04-15", officerId: "DEMO-USR-02",
    signatures: [SIGNED("Borrower", "2026-04-14"), SIGNED("Guarantor", "2026-04-14"), SIGNED("Branch manager", "2026-04-15")],
    documents: [
      { title: "Business records, 6 months", kind: "Financials", sizeKb: 2380, addedOn: "2026-04-02" },
      { title: "Vehicle registration certificate", kind: "Collateral", sizeKb: 640, addedOn: "2026-04-03" },
      { title: "Signed loan agreement", kind: "Agreement", sizeKb: 1310, addedOn: "2026-04-15" },
    ],
  },
  "DEMO-LN-003": {
    interestRate: 1.5, frequency: "Weekly", installments: 4, disbursedOn: "2026-08-03", officerId: "DEMO-USR-02",
    signatures: [SIGNED("Borrower", "2026-08-02")],
    documents: [{ title: "Signed loan agreement", kind: "Agreement", sizeKb: 1180, addedOn: "2026-08-02" }],
  },
  "DEMO-LN-004": {
    interestRate: null, frequency: null, installments: null, disbursedOn: null, officerId: "DEMO-USR-02",
    signatures: [],
    documents: [
      { title: "Ghana Card, front and back", kind: "ID", sizeKb: 398, addedOn: "2026-10-28" },
      { title: "Business records, 6 months", kind: "Financials", sizeKb: 1950, addedOn: "2026-10-31" },
    ],
  },
  "DEMO-LN-005": {
    interestRate: 2, frequency: "Monthly", installments: 5, disbursedOn: "2026-07-01", officerId: "DEMO-USR-03",
    signatures: [SIGNED("Borrower", "2026-06-30"), SIGNED("Branch manager", "2026-07-01")],
    documents: [{ title: "Passport, photo page", kind: "ID", sizeKb: 520, addedOn: "2026-06-20" }],
  },
  "DEMO-LN-006": {
    interestRate: 2.75, frequency: "Weekly", installments: 4, disbursedOn: "2026-04-27", officerId: "DEMO-USR-02",
    signatures: [SIGNED("Borrower", "2026-04-26")],
    documents: [{ title: "Write-off approval memo", kind: "Approval", sizeKb: 210, addedOn: "2026-08-02" }],
  },
  "DEMO-LN-007": { interestRate: null, frequency: null, installments: null, disbursedOn: null, officerId: "DEMO-USR-02", signatures: [], documents: [] },
  "DEMO-LN-008": {
    interestRate: 3.33, frequency: "Monthly", installments: 3, disbursedOn: "2026-10-05", officerId: "DEMO-USR-03",
    signatures: [SIGNED("Borrower", "2026-10-04"), SIGNED("Branch manager", "2026-10-05")],
    documents: [{ title: "Signed loan agreement", kind: "Agreement", sizeKb: 1240, addedOn: "2026-10-04" }],
  },
  "DEMO-LN-009": {
    interestRate: 1.67, frequency: "Weekly", installments: 4, disbursedOn: "2026-10-12", officerId: "DEMO-USR-02",
    // Disbursed with the guarantor's signature still outstanding. The product rule that would allow
    // this isn't established, so the UI shows the gap without explaining it away (Prompt 5).
    signatures: [SIGNED("Borrower", "2026-10-11"), { party: "Guarantor", signedOn: null }],
    documents: [
      { title: "Ghana Card, front and back", kind: "ID", sizeKb: 405, addedOn: "2026-10-05" },
      { title: "Market stall permit", kind: "Business", sizeKb: 300, addedOn: "2026-10-06" },
    ],
  },
  "DEMO-LN-010": {
    interestRate: 3.33, frequency: "Monthly", installments: 6, disbursedOn: null, officerId: "DEMO-USR-02",
    signatures: [],
    documents: [{ title: "Credit bureau report", kind: "Credit check", sizeKb: 180, addedOn: "2026-10-20" }],
  },
  "DEMO-LN-011": {
    interestRate: 1.67, frequency: "Weekly", installments: 6, disbursedOn: null, officerId: "DEMO-USR-02",
    signatures: [SIGNED("Borrower", "2026-10-31"), { party: "Branch manager", signedOn: null }],
    documents: [],
  },
  "DEMO-LN-012": { interestRate: null, frequency: null, installments: null, disbursedOn: null, officerId: "DEMO-USR-02", signatures: [], documents: [] },
}

/**
 * Receipts as recorded at the time. `balanceAfter` is a HISTORICAL SNAPSHOT: what the system said
 * the balance was right after that receipt. It is never today's balance and is labelled as such.
 */
export type DemoReceipt = {
  receiptNo: string
  loanRef: string
  receivedOn: string
  amount: Money
  method: "Cash" | "Mobile money" | "Bank transfer" | "Cheque"
  balanceAfter: Money
}

const rc = (receiptNo: string, loanRef: string, receivedOn: string, amount: Money, method: DemoReceipt["method"], balanceAfter: Money): DemoReceipt => ({
  receiptNo,
  loanRef,
  receivedOn,
  amount,
  method,
  balanceAfter,
})

export const demoReceipts: DemoReceipt[] = [
  rc("DEMO-RC-0011", "DEMO-LN-002", "2026-05-15", ghs(1600), "Bank transfer", ghs(8000)),
  rc("DEMO-RC-0014", "DEMO-LN-002", "2026-06-15", ghs(1600), "Bank transfer", ghs(6400)),
  rc("DEMO-RC-0017", "DEMO-LN-002", "2026-07-15", ghs(800), "Cheque", ghs(5600)),
  rc("DEMO-RC-0018", "DEMO-LN-002", "2026-07-15", ghs(800), "Cheque", ghs(4800)),
  rc("DEMO-RC-0009", "DEMO-LN-006", "2026-05-04", ghs(200), "Cash", ghs(1800)),
  rc("DEMO-RC-0021", "DEMO-LN-003", "2026-08-10", ghs(515), "Mobile money", ghs(1545)),
  rc("DEMO-RC-0024", "DEMO-LN-003", "2026-08-24", ghs(515), "Mobile money", ghs(1030)),
  rc("DEMO-RC-0027", "DEMO-LN-003", "2026-09-07", ghs(515), "Mobile money", ghs(515)),
  rc("DEMO-RC-0029", "DEMO-LN-003", "2026-09-14", ghs(515), "Mobile money", ghs(0)),
  rc("DEMO-RC-0019", "DEMO-LN-005", "2026-08-01", usd(300), "Bank transfer", usd(1200)),
  rc("DEMO-RC-0025", "DEMO-LN-005", "2026-09-01", usd(300), "Bank transfer", usd(900)),
  rc("DEMO-RC-0031", "DEMO-LN-005", "2026-10-01", usd(300), "Bank transfer", usd(600)),
  rc("DEMO-RC-0044", "DEMO-LN-005", "2026-11-01", usd(300), "Bank transfer", usd(300)),
  rc("DEMO-RC-0036", "DEMO-LN-009", "2026-10-19", ghs(400), "Mobile money", ghs(1200)),
  rc("DEMO-RC-0039", "DEMO-LN-001", "2026-10-24", ghs(200), "Cash", ghs(1000)),
  rc("DEMO-RC-0042", "DEMO-LN-009", "2026-10-27", ghs(400), "Mobile money", ghs(800)),
]

/** Automatic repayment (online collection) needs a signed mobile money mandate. None exist yet. */
export const AUTO_REPAY = {
  enabled: false,
  reason: "Automatic repayment needs a mobile money mandate signed by the borrower. None is on file.",
  prerequisite: "Set up a mandate from the client profile",
}

/** Write-offs, as approved. `recovered` is what came back afterwards. */
export const demoWriteOffs: Record<string, { writtenOff: Money; recovered: Money; on: string; approvedBy: string }> = {
  "DEMO-LN-006": { writtenOff: ghs(1800), recovered: ghs(100), on: "2026-08-02", approvedBy: "DEMO-USR-01" },
}

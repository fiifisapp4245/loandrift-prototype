# LoanDrift: status map and next prompts (after the 3 November consolidated handoff)

Source: `LoanDrift_Consolidated_Audit_and_Claude_Handoff_2026-11-03.md`, which adds F69–F75 and prompts R1–R7. This file adapts those prompts to what **this prototype** has actually built, so nothing is redone or claimed twice.

## Current branch status map (3 November 2026)

- **Repository:** `loandrift`, branch `master`. **No commits yet**: everything is uncommitted work in the tree.
- **Stack:** Next.js 16 with shadcn/ui and Tailwind v4.
- **Data:** fictional fixtures behind `lib/api/*`. The fixed business date is **2 November 2026** (`DEMO_TODAY`).

| Area | Route | State | Notes |
|---|---|---|---|
| Shell, foundations, purple theme | all | Built | Collapsible sidebar, phone drawer, axe-clean |
| Dashboard | `/dashboard` | Built | F73 fixed (R1): Apply reads the inputs' own values |
| Workspace: approvals, notifications | `/workspace/*` | Built | Decisions mocked; never live |
| Activities | `/activities` | Built | API assumptions listed in CHANGES.md |
| Clients, client profile, Add client | `/clients`, `/clients/[id]`, `/clients/new` | Built | Add client is mocked; nothing saved |
| All Loans (Loan Features merged in) | `/loans` | Built | Old queue paths redirect. *New application* opens the mocked application at `/loans/new` (R2) |
| Loan record, repayment overview, record payment | `/loans/[ref]`, `/loans/[ref]/repayment` | Built | Allocation rule and mandate prerequisite are **assumptions** (F74) |
| Transactions | `/transactions` | Built | B2-04 |
| Repayments index | `/repayments` | Built | B2-05: received today, payment history, receipt preview |
| Collections | `/collections` | Built | B2-06: arrears worklist, contact log, promises worked out from receipts |
| Collateral, Groups | `/collateral`, `/groups` | Placeholder | B2-07, B2-08 |
| Credit Score, Calendar | `/credit-score`, `/calendar` | Built | R3, from fictional assessments and the canonical schedule |
| Savings | `/savings` | Placeholder | Only the live listing has been observed (F72). R4 is **blocked** on source inspection |
| Investments, Accounting, Reports, Bulk Upload | `/investments`, `/accounting`, `/reports`, `/bulk-upload` | Placeholder | R4–R6 **blocked** until the live site's sign-in is restored and the source is inspected |
| Expenses | `/expenses` | Placeholder | Added for F75. R5, blocked |
| Product page, Book a demo | `/products/loandrift`, `/contact` | Built | Commercial facts held for owner review |

## Prompt sequence

The handoff's master instructions apply to every prompt. In short:
- preserve uncommitted work, routes and permission boundaries
- use fictional fixtures only, with no live submissions
- unavailable is never shown as zero
- record each finding as Already resolved, Resolved, Partial, Needs validation, Not implemented or Blocked

### R1: Dashboard range regression (F73, F07). **Done**

The handoff's automated run set both dates and pressed Apply, and the old range stayed. Cause in this prototype: the picker's draft only updated on React `onChange`, so a value set programmatically (by automation, autofill or some assistive tech) never reached it, and Apply committed the stale draft.

Fix: one canonical controller that reads the **inputs' actual values at Apply time**, keeps draft and applied state separate, and still validates, cancels and keeps dates timezone-safe.

Verify:
- the custom October range and a one-day range
- missing or invalid dates, end before start
- presets, Cancel, Back/Forward and reload
- typed keypresses **and** programmatically set values (jsdom test plus browser automation)

### R2: Loan application path (F47, F48, F75). **Done** (mock)

Replace the disabled *New application* with a working **mock** path: choose a client, enter terms, record evidence, review. Keep the nine capture responsibilities from Phase 2:

1. Client details
2. Loan details
3. Penalty
4. Guarantors
5. Businesses
6. Client worth
7. Comments
8. Documents
9. Review and save

Show every requirement up front, explain why each later step is locked, and show *Calculation incomplete* until the terms are valid. Say plainly what is local and unsaved versus persisted (nothing persists). Never invent a rate, formula or approval.

Then retest the loan list, detail, schedule, repayment and dashboard fixture agreement. DEMO-LN-001 on 2 November should show 100 past due, 300 due today and 400 to bring current.

### R3: Credit Score and Calendar (F69–F71, F06). **Done**

- **Credit Score:** human loan reference, borrower, latest versus historical, model/version/scale, assessment time and incomplete state; scales never averaged.
- **Calendar:** scheduled obligations kept separate from receipts, from the same schedule as the dashboard. A day with no receipts can still have amounts due.

### R4–R6: Savings, Investments, Expenses, Accounting, Reports, Bulk Upload. **Blocked**

These need the live modules' real fields, rules and permissions first (handoff "Remaining live audit checklist"). Until then they stay placeholders that say so. Building them from guesses would fabricate behaviour the handoff explicitly forbids.

### Phase 2 leftovers. **Next**

~~B2-05 Repayments index~~ (done), ~~B2-06 Collections~~ (done), B2-07 Collateral, B2-08 Groups.

### R7: Final release-readiness report. **Last**

Reconcile F01–F75 against the branch at 390, 768, 1024 and 1440 px, with a Pass/Fail/Blocked matrix.

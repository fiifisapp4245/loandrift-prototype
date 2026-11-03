# LoanDrift prototype

A front-end prototype of the LoanDrift redesign (TroveSuite's lender operations app), built from:

- `LoanDrift_Competitors_and_Claude_Prompts.md` (Prompts 0–8, findings F01–F40)
- `LoanDrift_UX_Audit_Phase_2_and_Claude_Prompts.md` (B2-01 to B2-08, findings F41–F68)

**This is not the LoanDrift codebase.** The real repo wasn't available on this machine, so this
is a standalone Next.js + shadcn/ui prototype with fictional fixtures. It can't trace values to
real data sources, so any finding that depends on that (F01–F03, F42, F43, F54, F55) can only
be designed here, not resolved.

## Run

```bash
npm install
npm run dev
```

Then open <http://localhost:3000> (or run `npm run dev -- --port 3217` and open <http://localhost:3217>). Checks: `npm run typecheck`, `npm run lint`, `npm test`.

## Where this stands

| Increment | Status |
|---|---|
| Prompt 1: shell and UI foundations | **Done.** See [CHANGES.md](CHANGES.md) |
| Prompt 2: Dashboard | **Done.** See [CHANGES.md](CHANGES.md) |
| Prompt 3: Workspace (My Approvals, Notifications) | **Done.** See [CHANGES.md](CHANGES.md) |
| Prompt 4: Activities | **Done.** See [CHANGES.md](CHANGES.md) |
| Prompt 5: Clients, Loans and loan record | **Done.** See [CHANGES.md](CHANGES.md) |
| Prompt 6: Financial contract and repayment workflow | **Done.** See [CHANGES.md](CHANGES.md) and [FINANCIAL-CONTRACT.md](FINANCIAL-CONTRACT.md) |
| Prompt 7: LoanDrift product page and demo handoff | **Done.** See [CHANGES.md](CHANGES.md) |
| Phase 2 B2-03 + B2-04: Loan Features merged into All Loans; Transactions | **Done.** See [CHANGES.md](CHANGES.md) |
| Prompt 8: final verification | **Done.** See [VERIFICATION.md](VERIFICATION.md): checks, axe results, flow evidence and the F01–F68 status matrix |

Screens not built yet (the Repayments index, Collections, Collateral, Groups) resolve to a page that names the prompt that will build them.

### Dashboard demo states

Add `?demo=` to `/dashboard` to see the states the dashboard handles:

| URL | Shows |
|---|---|
| `/dashboard?from=2026-10-01&to=2026-10-31` | The audit's October custom range, applied |
| `/dashboard?demo=slow` | Loading skeletons (2.5s) |
| `/dashboard?demo=error` | Failed requests with Retry |
| `/dashboard?demo=refresh-error` | Loads, then Refresh fails: stale-data warning |
| `/dashboard?from=2026-10-31&to=2026-10-01` | Invalid range in a link, explained |
| `/workspace/approvals?scope=branch&id=DEMO-AP-03` | Review panel with maker-checker |
| `/workspace/approvals?scope=branch&as=officer` | Permission-limited view |
| `/workspace/notifications?demo=error` | Failed request (also works on approvals) |
| `/activities?page=2` | Date heading "(continued)" at a page boundary |
| `/activities?event=DEMO-EV-0110` | Before/after values, translated from raw |
| `/activities?event=DEMO-EV-0104` | A save whose diff wasn't recorded |
| `/activities?from=2026-07-01&to=2026-11-02` | Range beyond the 90-day retention, disclosed |
| `/loans/DEMO-LN-009?tab=agreement` | Disbursed with a signature outstanding, flagged |
| `/loans/DEMO-LN-001?tab=client&as=officer` | ID number masked for a loan officer |
| `/clients/DEMO-CL-02` | Client history with three loans for one borrower |
| `/clients?q=ZZZ-no-match` | Search-empty state that doesn't push "Add client" |
| `/loans/DEMO-LN-001/repayment?record=1` | Record-payment flow with suggested amounts and review |
| `/loans/DEMO-LN-005/repayment` | Balance sources disagree: shown, not resolved |
| `/transactions?q=DEMO-RC-0017&tx=TXN-1006` | Two similar same-day cheques, listed not merged |
| `/capture` | Old queue link, redirected to All Loans filtered to Captured |
| `/loans/new?client=DEMO-CL-03` | Loan application (mock): nine sections, Calculation incomplete, nothing saved |
| `/loans/new?client=DEMO-CL-06` | Client with no ID on file: flagged before any terms |
| `/credit-score?view=all&q=DEMO-LN-001` | Three assessments for one loan, two of them on the same day; Latest vs Historical |
| `/credit-score?state=incomplete` | Incomplete assessment on a 300–850 model: no score, never zero |
| `/calendar` | 2 November: two installments due, no receipts, shown separately |
| `/repayments` | Received today: nothing yet, with the 2 due installments linked to the Calendar |
| `/repayments?tab=history&from=2026-10-01&to=2026-10-31` | Payment history filtered to October, the range shown as a chip |
| `/repayments?tab=history&receipt=DEMO-RC-0029&demo=receipt-error` | Receipt preview failure, with Retry and a fallback |
| `/collections?age=31-60` | Empty age band named precisely; branch totals unchanged; Reset |
| `/collections?account=DEMO-LN-002` | Contact history with kept, broken and open promises worked out from receipts |
| `/collections?account=DEMO-LN-001` | No prior contact; log one (saved in memory only) |
| `/expenses` | Placeholder that says it's on hold until the live module is inspected |
| `/products/loandrift` | Product page, draft view with owner-review tags |
| `/products/loandrift?mode=release` | Release preview: everything under review hidden |
| `/contact?product=loandrift&intent=demo&plan=advance` | Book a demo, keeping product, intent and plan |

Start at **/foundations** to see every shared component with fictional data.

## Layout

```
app/(app)/layout.tsx          Shell: sidebar, top bar, skip link
app/(app)/dashboard/          Dashboard (Prompt 2)
app/(app)/workspace/          My Approvals and Notifications (Prompt 3)
app/(app)/activities/         Activities feed and event drawer (Prompt 4)
app/(app)/loans/              All Loans, the loan record with seven tabs (Prompt 5), and
                              loans/[ref]/repayment: overview and record-payment flow (Prompt 6), and
                              loans/new: the mocked nine-section application (R2)
app/(app)/clients/            Clients, client profile, Add client form (Prompt 5)
app/(app)/transactions/       Branch ledger with transaction drawer (B2-04)
app/(app)/repayments/         Receipts: received today, payment history, receipt preview (B2-05)
app/(app)/collections/        Arrears worklist and follow-up drawer with contact logging (B2-06)
app/(app)/credit-score/       Assessment history with drawer (R3)
app/(app)/calendar/           Month and week calendar: scheduled vs received (R3)
app/(marketing)/              Public pages: /products/loandrift and /contact (Prompt 7)
app/(app)/foundations/        Component gallery
app/(app)/[...slug]/          Honest placeholder for every unbuilt destination
components/shell/             Sidebar, top bar, brand mark
components/patterns/          Page header, KPI card, scoped count, status badges,
                              amount, entity reference, filter toolbar, row actions, view states
lib/format.ts                 Money, dates, percentages, counts, statuses, scores. Formatting only
lib/types.ts                  Money in minor units, Unavailable, lifecycle and health enums
lib/nav.ts                    Sidebar structure and route paths
lib/fixtures.ts               FICTIONAL demo data: loans, schedules, ledger events, approvals
lib/api/dashboard.ts          Dashboard service contract (computed from fixtures; integer money)
lib/date-range.ts             Period presets, validation, URL parsing
lib/use-query.ts              Request states: loading, refreshing, error, stale
lib/use-url-state.ts          List state (scope, tab, filters, open record) in the URL
lib/api/workspace.ts          Approvals scoping and blockers; notification read state (in-memory mock)
lib/workspace-fixtures.ts     FICTIONAL staff, approval requests and notifications
lib/activity-fixtures.ts      FICTIONAL raw audit events (snake_case, "None", six decimals, correlation IDs)
lib/api/activities.ts         Translation to sentences, filters, correlation grouping, pagination, retention
lib/lending-fixtures.ts       FICTIONAL clients and loan records (terms, signatures, collateral, documents)
lib/api/lending.ts            Permitted actions, list queries, client history, form checks
lib/domain/loan-position.ts   THE financial contract: every loan figure, plus payment allocation preview
lib/api/transactions.ts       Ledger built from events and receipts; cash vs adjustment; stable order
lib/api/applications.ts       Application sections, requirements, locked steps; no interest formula
lib/credit-fixtures.ts        FICTIONAL credit assessments and score models (no scoring engine)
lib/api/credit.ts             Latest vs history, filters, per-model counts; never averaged
lib/api/calendar.ts           Scheduled installments vs receipts per day, from the canonical schedule
lib/api/repayments.ts         Receipts from the ledger, per-currency totals, no balance-snapshot sums
lib/api/collections.ts        Arrears from the contract; channel, outcome and promise rules; promise status from receipts
lib/roadmap.ts                Which prompt builds each placeholder, and which are on hold
lib/legacy-routes.ts          Old Loan Features paths and their All Loans redirects
lib/marketing-content.ts      Product page content with review status; one plan entitlement dataset
design-reference/tokens.md    Colours, contrast ratios, type
```

# LoanDrift prototype: release-readiness report (R7)

Verified 5 November 2026 against the current branch (`main`, uncommitted work on top of `bdb15b8`). Business date fixed at **2 November 2026** (`DEMO_TODAY`), fixtures in GHS with USD kept separate.

> **What this report is.** A reconciliation of F01–F75 against the prototype as built, with the checks run today. It is **not** a verification of the real LoanDrift app, its backend, its ledger or its permissions. The real codebase and the original F01–F40 audit text were never available. A passing preview is not a posted payment, and a mocked test is not a production ledger verification.

## 1. Prototype scope vs live integration

| | Prototype (verified here) | Live integration (not verified) |
|---|---|---|
| Data | Fictional fixtures, fixed clock | Real loans, receipts, balances, scores |
| Financial figures | One shared contract (`lib/domain/loan-position.ts`); mixed currencies never summed; unavailable never zero | Which backend field is authoritative; fee, penalty and allocation rules; interest basis |
| Writes | Every form only checks. Nothing is saved, sent, uploaded or posted | Posting, persistence, audit trail, maker-checker enforcement |
| Permissions | `?as=` changes what the UI shows | Server-side enforcement |
| Calculations | No verified interest/fee/schedule service, so totals to repay are *Unavailable* | The real calculation service |

### Disabled actions, and why

| Where | Action | State |
|---|---|---|
| All Loans | New application | **Enabled** here and opens the mocked nine-section form (`/loans/new`); it never submits. (The 3 November test found it disabled; R2 replaced that.) |
| Repayment | Record payment | Reviews and checks only; "Checked, not recorded" |
| Repayments | Receipt print and download | Disabled with a reason |
| Credit Score | Adjust score | Disabled with a reason |
| Collateral | Remove, release, start recovery | Disabled even when the lifecycle allows them: "the server still checks permission" |
| Groups | Edit details | Disabled; member and role changes and applications only check |

### Placeholders still standing

| Route | Waiting on |
|---|---|
| Savings, Investments (R4) | Live module inspection (only the Savings listing has been seen) |
| Expenses, Accounting (R5) | Live module inspection |
| Reports, Bulk Upload (R6) | Live module inspection |
| Settings | Not in any prompt; outside the audited batch |

All say so on the page. None is built from guesses.

## 2. Checks run today

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint` | Pass |
| `npm test` | **326 passed**, 34 files (one regression test added in this pass) |
| `next build` (Turbopack) | Pass; 30 pages generated |
| Route sweep | **35 routes and states at 390, 768, 1024 and 1440 px** in a real browser: one H1 each, no page-level horizontal overflow, axe at every width |
| Loading and error states | Dashboard, Activities, Transactions, Repayments, Collections, Collateral, Groups, Credit Score: `?demo=error` shows an alert with Retry; `?demo=slow` shows placeholders. No business zeros while loading |
| Keyboard | Skip link, focus ring (2 px brand outline, `:focus-visible`), dialogs and drawers return focus to their opener, error summaries take focus, and the new scroll regions are reachable by Tab |

### Defects this pass found and fixed

The four-width sweep found two real problems the earlier narrower scans had missed:

| Defect | Where | Fix |
|---|---|---|
| **Page scrolled sideways at every width** (up to 927 px wide) | `/loans/new`: the section nav's visually hidden text sat outside its scroller | The list is now the containing block (`relative`) |
| **Table scrollers unreachable by keyboard** (axe `scrollable-region-focusable`, serious) | Loan schedule, repayment schedule and receipts, record-payment allocation, activity field changes, the dashboard's "Show as a table", the product page's plan comparison | Each is a labelled, focusable region ("Repayment schedule for DEMO-LN-001, scrolls sideways") |

After the fixes: 36 page-and-width checks, 0 overflow, 0 axe violations.

### Limits of these checks

- **No screen-reader pass** (VoiceOver, NVDA). axe finds rule failures, not usability.
- **Loans, Clients and Calendar have no loading or error states**: they read fixtures synchronously. A live integration will need them.
- The pane was throttled while hidden, so timing was not measured; the sweep waited for each page to settle.
- Not exercised: print or PDF output, real browsers other than the in-app one, real touch devices, any backend.

## 3. Pass / Fail / Blocked matrix

**Key.**
- **Pass:** fixed in the prototype and verified as described.
- **Pass, validation open:** passes in the prototype, but the underlying rule, source or policy needs the business or backend to confirm.
- **Partial:** part of the finding is addressed.
- **Blocked:** can't be done or checked without access that is missing.
- **Fail:** none open.

"Pass" never means a financial figure is proven correct in the real system. F01–F40 are matched by how the prompt packs refer to them, not by their original wording.

### F01–F40 (original audit)

| Finding | Status | Evidence and what's open |
|---|---|---|
| F01, F02 installment, arrears, balance conflicts | **Pass, validation open** | One contract on every screen; agreement test; DEMO-LN-005 conflict shown, not chosen. Which real source is authoritative isn't established |
| F03 collected GH₵940 vs 800 | **Pass, validation open** | Two named measures. The GH₵140 fee explanation is a hypothesis, not a verified rule |
| F04, F05 personal vs branch; alerts vs tasks | **Pass** | Scope tests; unread badge changes while the task stays open |
| F06 collection rate definitions | **Partial** | No denominator is Unavailable (tested). The due-today cut-off is assumed |
| F07 date inputs vs applied range | **Pass** | The handoff ties F07 to F55 and F73: dashboard and Repayments share one picker, fixed in R1; dates set without React events apply |
| F08, F09 shell and navigation | **Pass** | Shell tests; axe at four widths; phone drawer and collapsed sidebar |
| F10, F11 dashboard | **Partial** | Wording of the originals unknown; see CHANGES.md Prompt 2 |
| F12 raw amounts and statuses | **Pass** | Formatting tests |
| F13–F15 approvals and notifications | **Pass** | Workspace tests |
| F16–F20 activities | **Pass for the UI; needs API support** | The six API assumptions are in CHANGES.md |
| F21–F24 lists, loan identity, actions | **Pass** | Clients and All Loans |
| F25, F26 form semantics | **Pass** | Add client, record payment, and every Phase 2 form; axe with errors showing |
| F27 backdating wording | **Pass** | Repayment form test |
| F28, F29 loan detail, agreements | **Pass, validation open** | Whether a loan can be disbursed with a signature outstanding is the business's call |
| F30–F32 financial workflow, dates, receipts | **Partial** | Historical receipt labels; allocation and over-payment rules are open |
| F33 collections amounts | **Pass** | Past due and total balance in separate columns |
| F34–F40 product page and demo | **Pass as a draft; commercial facts open** | Release view hides everything under owner review |

### F41–F68 (Phase 2)

| Finding | Status | Evidence and what's open |
|---|---|---|
| F41 | **Pass** | Search-empty echoes the query; Clear search first |
| F42, F43 client history | **Pass** | Shared status mapping; principal, total payable, paid and outstanding shown separately |
| F44 Loan Features | **Pass** | Merged into All Loans; nine old paths redirect |
| F45 record identity | **Pass** | Reference, borrower, currency and *View loan* on every row, Completed and Written off included |
| F46 queue readiness | **Partial** | Blockers and evidence shown; redecision and reopening **need business policy** |
| F47, F48 capture calculation and gating | **Pass (mock)** | *Calculation incomplete*, then *Unavailable*. No verified calculation service |
| F49 write-off navigation and empty copy | **Pass** | |
| F50–F52 transactions | **Pass** | Pinned View column; own reference per row; effective date plus recorded time |
| F53–F58 repayments and collections aging | **Pass (mock)** | F57's live cause still needs checking in a normal browser |
| F59 contact logging | **Pass (mock)** | Saved in memory only |
| F60–F63 collateral | **Pass**; the lien rule is **policy to confirm** | Server permission isn't modelled |
| F64, F65, F67, F68 groups, loading scope | **Pass (mock)** | Reviewed membership changes; no zero-member application; meeting overview; branch totals unaffected by search |
| F66 joint liability | **Partial** | No preselection and a review of principals; interest, fees and schedule are Unavailable. **Liability policy needs the business** |

### F69–F75 (3 November handoff)

| Finding | Status | Evidence and what's open |
|---|---|---|
| F69, F70 credit score identity and filters | **Pass (fixtures)** | Model, version and scale on every row; incomplete never zero; scales never averaged |
| F71 calendar vs dashboard | **Pass in the prototype; live cause not established** | Same schedule; 2 November shows two due and no receipts, separately |
| F72 Savings | **Blocked** | The live module hasn't been inspected |
| F73 custom range | **Pass** | Browser: October applies, reload keeps it, invalid range blocked, Cancel restores |
| F74 allocation and mandate assumptions | **Pass, validation open** | Disclosed as assumptions; must not ship as policy |
| F75 scope labels | **Pass** | Each placeholder names its prompt and says when it's on hold |

### Summary

| | Count (approx.) |
|---|---|
| Pass | most of F01–F75 as listed above |
| Pass, validation open | F01–F03, F28, F29, F57, F60–F63 (lien rule), F71, F74 |
| Partial | F06, F10, F11, F30–F32, F46, F66 |
| Blocked | F72 and the R4–R6 modules |
| Fail | none |

## 4. Remaining questions

**Policy** (the business decides): allocation order and over-payments; fees, penalties and early settlement; the due-today cut-off; liability options per product; leaving a group with an outstanding loan; whether an inactive group can borrow; which assets need a lien; redecision and reopening; the signing rule.

**Source** (the backend answers): the authoritative balance field; the real calculation service; the cause of the GH₵100 vs GH₵300 installment difference and of F71; the real role list for groups; the receipt-preview failure cause.

**Next source-access requirement.** Restore sign-in to the original development site, so R4–R6 (Savings, Investments, Expenses, Accounting, Reports, Bulk Upload) can be inspected read-only first. Until then they stay placeholders. After that, repeat this sweep against the real services before claiming the full application or any live lending workflow is complete.

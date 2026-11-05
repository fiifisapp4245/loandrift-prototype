# LoanDrift prototype: final verification (Prompt 8)

> **Newer:** the 5 November release-readiness report is [RELEASE-READINESS.md](RELEASE-READINESS.md), with the four-width sweep and a Pass/Fail/Blocked matrix. This file keeps the per-finding detail.

Verified 3 November 2026. Scope: the redesign as built in this prototype (Prompts 1–7, plus the dashboard changes requested along the way).

> **Read this first.**
> - **Not the real app.** This is a standalone front-end prototype with fictional fixtures. The real LoanDrift codebase was never available, so nothing here verifies the real app's data, permissions or financial calculations.
> - **F01–F40 status is approximate.** The original audit (`LoanDrift_UX_Audit_2026-11-02.md`, F01–F40) wasn't available either. Those findings are matched by how the prompt pack refers to them, not by their original wording. F41–F68 come from the Phase 2 audit, which *was* available.

## Run it locally

```bash
npm install
```

```bash
npm run dev -- --port 3217
```

Open <http://localhost:3217>; it redirects to `/dashboard`. The product page is at <http://localhost:3217/products/loandrift>. The README lists more URLs for specific states.

## Checks run

| Check | Result |
|---|---|
| `npm test` (Vitest) | **326 passed**, 34 files |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, no warnings |
| `next build` | Pass (re-run 5 November, 30 pages) |
| axe-core 4.14, in the browser | **0 violations** on every route and state below, after the fixes in this step |

**Routes and states scanned with axe** (1440 px unless noted):

- **Dashboard:** October range, with data loaded
- **Activities:** page 2, and the event drawer open on DEMO-EV-0110
- **My Approvals:** Branch scope, the Completed tab, and the review drawer open on DEMO-AP-01
- **Notifications**
- **All Loans**
- **Loan record:** the Schedule tab (DEMO-LN-001) and the Agreement tab (DEMO-LN-009)
- **Repayment:** the overview, the record-payment form, and the source-conflict state (DEMO-LN-005)
- **Clients:** the list, a client profile, and the Add client form with errors showing
- **UI foundations**
- **Public pages:** the product page (draft and release views) and Book a demo
- **Placeholder routes:** `/expenses`
- **Groups:** the list (1440 and 375 px), a group page with Add member open and its errors showing, the removal dialog, the group loan application with errors (1440 and 375 px), and Form a group with errors
- **Collateral:** the register (1440 and 375 px), the asset drawer, the lien form with errors, Register an asset with errors, and the loan record's Collateral tab
- **Collections:** the list, the follow-up drawer, the contact form with errors, and the empty 31–60 band (375 px)
- **Loan application:** Loan details, Penalty, Guarantors and Review with errors
- **Credit Score:** All assessments, and the incomplete assessment's drawer
- **Calendar:** month and week views
- **Repayments:** Received today (375 px too), Payment history unfiltered and filtered to October, the receipt drawer, and the preview error
- **Navigation:** the phone drawer open at 375 px, and the collapsed icon sidebar

### Accessibility fixes made in this step

| axe rule | Where | Fix |
|---|---|---|
| `label-content-name-mismatch` (serious) | The sidebar logo link was named "LoanDrift home" but reads "LoanDrift by TroveSuite"; the same on the public header | The visible text is the name. In the collapsed sidebar the text is visually hidden, not removed, so the link keeps its name |
| `label-content-name-mismatch` (serious) | Notifications: "Mark read" buttons were named "Mark {title} for {borrower} as read" | Renamed "Mark read: {title}, {borrower}", so the visible words come first and voice control works |
| `label-content-name-mismatch` (serious) | Activities: each row link had a rewritten sentence as its name | The visible sentence is the name, plus the full date for screen readers |
| `region` (moderate) | Sidebar header sat outside any landmark | Brand link and menu share the "Main" navigation landmark |
| `heading-order` (moderate) | Notifications: the summary cards' H3s came straight after the H1 | Wrapped in a section with a visually hidden H2 |
| `color-contrast` (serious) | Dimmed decimals on the 20px stat cards measured 4.0:1. The earlier assumption that they counted as large text (3:1) was wrong: 20px semibold isn't large text | Dimmed decimals are now 70% opacity (≥ 4.5:1 on white and on the muted fill). Purple decimals use brand `#7C3AED` (5.4:1 or better) |

During scanning, the hidden Browser pane delayed Next.js's streaming swap, so pages briefly appeared to have no H1. That came from the test setup, not the app. Every scan waited until the H1 was visible and any skeletons had cleared.

## Flow walkthroughs (fictional fixtures; nothing sent or recorded)

| Flow | Evidence |
|---|---|
| **Dashboard period change** | Custom 1–31 Oct typed into the native date fields with real keypresses. The URL, label, cards and chart buckets agree; the range stays applied after the picker closes and survives Back. Cancel and Escape keep the previous range. An end date before the start date gets a field-level error. Browser (Prompt 2) plus 5 picker tests and the dashboard view tests |
| **Approval scope** | The Mine queue is empty, with "3 waiting on others", then *View branch queue*, then Review on DEMO-AP-03 (maker-checker reason shown). Escape returns focus to *Review DEMO-AP-03* and clears `id` from the URL. A loan officer viewing Branch scope sees an explanation of the limit, not an empty list. Browser (Prompt 3) plus 9 tests |
| **Notification filtering** | Filters and chips; the filtered-empty message doesn't claim anything is settled. *Mark read* changes the top-bar badge from 3 to 2 while the task stays open. Browser plus 5 tests |
| **Activities pagination and detail** | Page 2 opens with "(continued)". The grouped repayment shows "2 accounting entries", while the legacy repayment and journal stay separate. Escape returns focus to the row and keeps `?page=2`. Browser (Prompt 4) plus 12 tests |
| **List to record** | Loans list, then *View loan DEMO-LN-001*: a fixed header, seven tabs, each in `?tab=`. The client profile links to each loan. Browser (Prompt 5) plus 16 tests |
| **Repayment preview** | DEMO-LN-001: the *To bring current* suggestion, Cash, then review: GH₵100 to installment 1 and GH₵300 to installment 2; balance GH₵1,000 → GH₵600; "Checked, not recorded". DEMO-LN-005 shows the source conflict and blocks recording. Browser (Prompt 6) plus 9 component tests and the cross-screen agreement test |
| **Keyboard basics** | Tab lands first on *Skip to content*, which moves focus to `main`. Every focus ring is a 2px brand outline. The phone drawer starts on the current page's link, closes with Escape and returns focus to the menu button |
| **Narrow and wide layouts** | No page-level horizontal scroll at 375, 768, 1024 and 1440 px on the Dashboard; at 375 and 1440 px on the other built pages. Wide tables scroll inside their own card |

## Finding status

**Key:**
- **Resolved:** fixed in the prototype and verified as described.
- **Partial:** part of the finding is addressed, or only on some screens.
- **Not in this increment:** the screen isn't built yet; its route shows a placeholder naming the prompt that would build it.
- **Needs business validation:** the UI is honest about the gap, but a product or data owner has to decide or confirm something.

"Resolved" here never means a financial figure is proven correct in the real system.

### F01–F40 (original audit: matched by the prompt pack's references)

| Finding | What the pack says it covers | Status | Where | Evidence |
|---|---|---|---|---|
| F01, F02 | Contradictory installment, arrears and balance figures | **Needs business validation** | `lib/domain/loan-position.ts`; loan record header; repayment overview | One contract on every screen; agreement test; the DEMO-LN-005 conflict is shown, not chosen. The real sources still need tracing |
| F03 | Collected amounts (GH₵940 vs GH₵800) | **Needs business validation** | Dashboard | Two defined measures (Repayments received; Collection rate). The real cause can't be traced without the backend |
| F04, F05 | Personal vs branch work; alerts vs tasks | Resolved | Dashboard *Needs attention*; My Approvals; Notifications | Scope tests; the unread badge changes while the task stays open |
| F06 | Collection-rate and financial definitions | Partial | Dashboard ring; FINANCIAL-CONTRACT.md | No denominator means Unavailable (tested). The due-today cut-off is an assumed rule |
| F07 | Date inputs and applied range disagree (the handoff ties it to F55 and F73) | **Resolved** | Dashboard and Repayments | Shared picker fixed in R1; see F73 |
| F08, F09 | Shell and navigation (Prompt 1) | Resolved, if the mapping is right | `components/shell/*` | Shell tests; axe; phone drawer and collapsed sidebar checks |
| F10, F11 | Dashboard (Prompt 2 range F03–F11) | Partial, wording unknown | Dashboard | See Prompt 2 in CHANGES.md |
| F12 | Raw amounts and status formatting | Resolved | `lib/format.ts`, status badges | Formatting tests; Activities "no raw values" test |
| F13–F15 | Workspace approvals and notifications | Resolved | `/workspace/*` | Workspace tests |
| F16–F20 | Activities feed | Resolved for the UI; **needs API support** | `/activities` | 26 tests. The six API assumptions are listed in CHANGES.md (Prompt 4) |
| F21–F24 | Lists, loan identity, progress, contextual actions | Resolved for Clients and All Loans | `/clients`, `/loans` | Lending tests; axe |
| F25, F26 | Form semantics; long forms | Resolved for Add client and record payment | `/clients/new`, repayment form | Form tests; axe with errors showing |
| F27 | Backdating wording | Resolved for record payment | Repayment form | Backdating test |
| F28, F29 | Loan detail; agreements | Resolved, with the signing rule **needing validation** | `/loans/[ref]` | Agreement-flag test |
| F30–F32 | Financial workflow, dates, receipts | Partial | Repayment overview | Historical receipt labels; next scheduled vs due today. Allocation and over-payment rules are open |
| F33 | Collections amount definitions | **Resolved** | `/collections` | Past due and total balance in separate columns, both from the contract. Tests |
| F34–F40 | Product page and demo handoff | Resolved as a draft; **commercial facts need validation** | `/products/loandrift`, `/contact` | 8 marketing tests; release view hides everything under review |

### F41–F68 (Phase 2 audit)

| ID | Finding | Status | Where / evidence |
|---|---|---|---|
| F41 | Search-empty suggests a duplicate client | **Resolved** | `/clients?q=…` echoes the query and offers Clear search first; branch totals stay labelled. Test |
| F42 | Client history status conflicts | **Resolved** (prototype) | Shared status mapping; completion uses closed loans as its base, and with none it's Unavailable. Tests |
| F43 | History "Approved" includes interest | **Resolved** (prototype) | Principal, total payable, paid and principal outstanding shown separately. Test |
| F44 | Lifecycle navigation duplicates All Loans | **Resolved** | Loan Features removed by user decision; all nine old paths redirect to `/loans?status=…`, and the status filter shows counts. Redirect tests |
| F45 | Lists lack record identity and detail access | **Resolved** | Every stage is viewed through All Loans: linked reference, borrower, currency and *View loan* on every row, Completed and Written off included |
| F46 | Queues don't surface readiness | Partial | Stage columns show blockers, evidence, approver and level (Captured), signatures (Approved), and reason and decision date (Rejected). Explaining redecision or reopening **needs the business's policy** |
| F47, F48 | Capture calculation and step gating | **Resolved** (mock) | `/loans/new`: nine sections, requirements preview, locked-step reasons, *Calculation incomplete* until terms are valid, then *Unavailable* (no verified calculation service). Nothing is saved. Tests |
| F49 | Write-off back navigation and empty copy | **Resolved** | Write-offs are All Loans filtered to Written off, inside the normal page, so there's no stray "Back to Reports". A filter with no matches says "No loans match these filters" and never suggests writing a loan off |
| F50 | Wide transaction table hides actions | **Resolved** | Primary columns only; the View column is pinned with an edge shadow; detail in a drawer. axe clean; checked at 375 and 1440 px |
| F51 | Similar rows lack a transaction identity | **Resolved** | Every row has its own human reference; two same-day GH₵800 cheques stay separate, each listing the other as "similar, not merged". Tests |
| F52 | Chronology too coarse | **Resolved** | Effective date plus recorded time on every row, with the meaning of each in the drawer; stable tie order. Adjustments are never totalled as cash. Tests |
| F53 | "Current Repayments" wording | **Resolved** | `/repayments`: *Received today* and *Payment history*. Due work is linked to the Calendar, never listed as receipts. Tests |
| F54 | Receipt KPI aggregation basis | **Resolved** | Totals are received (per currency), receipt count and loans, over the matching receipts. No balance total, because summing post-receipt snapshots double-counts. Tests |
| F55 | Date fields and validation disagree | **Resolved** | The same picker (fixed in R1) on Repayments. Browser: dates set without input events apply; the range shows as a chip with Clear all |
| F56 | Repayment rows lack receipt context | **Resolved** | Received date, receipt reference and linked loan lead each row; *Balance after this receipt* is labelled Historical |
| F57 | Receipt preview | **Resolved** (mock) | A drawer with loading, the receipt, or an error with Retry and a fallback route. Print and download are disabled. The live cause still needs checking in a normal browser |
| F58 | Aging-filter empty heading | **Resolved** | "No accounts 31–60 days overdue" with Reset; Branch totals labelled as unaffected by filters. Tests |
| F59 | Contact logging classifications and time | **Resolved** (mock) | Channel, outcome and promise defined separately; outcomes limited per channel; every promise path needs an amount and date; *Says they've already paid* records no payment; labelled contact time in GMT. Saving is in memory only. Tests |
| F60 | Collateral currency and valuation basis | **Resolved** | `/collateral`: currency on every amount; value used labelled with its basis and date; forced sale *Not recorded*, never zero; coverage totalled per basis and currency. Tests |
| F61 | Missing-lien exception hard to work | **Resolved** | Separate counts for verification, missing lien and estimate-only, each linking to just those assets. The lien rule is flagged as policy to confirm |
| F62 | Remove from loan on a written-off loan | **Resolved** (UI) | Removal only before disbursement, with the reason otherwise; recovery and release are separate. All disabled in the prototype; server permission isn't modelled |
| F63 | Collateral form labels and defaults | **Resolved** (mock) | No preselected basis, lien status or registry; independent valuations need a report; type-specific and third-party fields; upload limits stated. Tests and axe |
| F64 | Membership changes need a commitment model | **Resolved** (mock) | Search, then select one client, then choose a role (none preselected), then a review line, then an explicit *Add member*. Role changes and removals are dialogs with their own check; removal lists what the member still owes. Clients in another active group can't be selected, with the reason. Success and failure both say nothing was changed. Whether an outstanding loan blocks removal **needs policy**. Tests |
| F65 | "Apply for 0 members" | **Resolved** (mock) | Nobody is included by default. *Apply* is disabled at zero with the reason, and counts only members with a valid amount; partly filled rows are named. Errors name the member. Members missing an ID or phone can't be included, the same rule as an individual application. Tests |
| F66 | Joint liability preselected without an obligation summary | Partial | No liability preselected; each option explained without contract wording. Review shows each member's principal and the total in the product's currency, with the terms. Interest, fees, schedule and total to repay are *Unavailable*, from the same calculation state as an individual application: there's no verified calculation service. **Liability policy needs the business** |
| F67 | Group page omits meeting details | **Resolved** | Overview with code, status, formed date, meeting day, frequency and place, and notes; *Not recorded* where missing. Viewing is separate from the disabled *Edit details*. Form a group captures the same fields. Tests |
| F68 | Loading or filtered metrics look like facts | **Resolved** | Skeletons, never zeros; result counts hidden while loading; labelled scopes. Groups keeps branch totals during search and counts "matching groups" separately. Tests |

### F69–F75 (3 November consolidated handoff)

| ID | Finding | Status | Where / evidence |
|---|---|---|---|
| F69 | Credit-score history lacks identity and model context | **Resolved** (fixtures) | `/credit-score`: linked loan reference and borrower; model, version and scale on every row; Latest vs Historical; exact time and trigger; same-day re-runs kept apart; incomplete never zero. Tests |
| F70 | Credit filters expose IDs and unnamed controls | **Resolved** | Search by loan or borrower; labelled Model, State and Trigger filters with meaningful chips; system IDs only under Technical details; *Adjust score* disabled with a reason. axe clean |
| F71 | Calendar empty where the dashboard shows due work | **Resolved** in the prototype; live cause **not established** | Calendar and dashboard read the same schedule. 2 November shows two due and no receipts, separately. Test |
| F72 | Savings has only a listing | **Blocked** | The live module's fields and rules need inspecting first; the placeholder says so |
| F73 | Custom range doesn't apply | **Resolved** | Apply reads the inputs' own values. A jsdom test sets values without React events. Browser: October applies, reload keeps it, an invalid range is blocked, Cancel restores |
| F74 | Allocation and mandate assumptions | Needs validation | Still labelled as assumptions in FINANCIAL-CONTRACT.md |
| F75 | Placeholder scope labels and the missing Expenses | **Resolved** | Each placeholder names its prompt (R3 to R6) and says when it's on hold for evidence. Expenses has a destination. Tests |

## Residual risks

1. **Fixtures, not data.** Every figure is fictional. The real backend may disagree with the contract's definitions; FINANCIAL-CONTRACT.md lists the rules to confirm.
2. **Permissions are simulated.** `?as=officer` only changes what the UI shows. Server-side enforcement isn't modelled.
3. **No screen-reader pass.** axe catches rule failures, not usability with VoiceOver or NVDA.
4. **Dirty-form navigation.** The Add client form and the loan application warn on reload, tab close, Cancel and its back link, but not on sidebar navigation.
5. **Phone tables** scroll inside their card. Transactions pins its View column; the other tables (My Approvals, All Loans, Clients) don't yet.
6. **No dark mode.** The brief asked for a light interface.
7. **Slow first load in the browser pane** came from background-tab throttling in testing, not the app. It should still be checked on a normal device.

## Decisions waiting on the business

- **Financial rules:** allocation order, over-payments, fees and penalties, early settlement, the due-today cut-off, backdating effects, which balance is authoritative, legacy scores, and the interest basis (FINANCIAL-CONTRACT.md).
- **Signing rule:** whether a loan can be disbursed with a signature outstanding (DEMO-LN-009).
- **Groups:** which liability options a product allows, whether a member with an outstanding loan can leave, whether an inactive group can borrow, and the real role list.
- **Commercial:** prices, billing currency and basis, plan limits, which plan includes online repayments, collections, collateral and groups, approved proof, integrations, and the reply time after a demo request.
- **Platform:** the real TroveSuite site navigation, the LoanDrift logo, and the paths for the Money and System sections.

## What to build next

R7, the final release-readiness report. R4–R6 wait for the live modules to be inspected. See `docs/NEXT-PROMPTS.md`.

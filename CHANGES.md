# Changes

Newest increment first.

---

# Collections (B2-06)

3 November 2026. Route: `/collections`. Data: `lib/api/collections.ts`. Arrears come from the shared financial contract (`loanPosition`), so they match the dashboard and each loan record.

| Requirement | Implementation |
|---|---|
| Separate overdue from total exposure (F33) | Every row shows **Past due** (unpaid on installments already due, with the installment count) beside **Total balance**. DEMO-LN-001: GH₵100 past due of a GH₵1,000 balance |
| Branch scope made explicit (F58) | A **Branch totals** section (accounts in arrears, past due, open promises) says it doesn't change with search or filters. The list has its own "N matching accounts of 2" count |
| Precise filtered-empty (F58) | "No accounts 31–60 days overdue", then "The branch still has 2 accounts in arrears; they aren't in this view", with **Reset days overdue**. Other combinations read "No accounts match these filters" with Clear filters |
| Age filter, contact history, promise tracking | Days overdue (1–30, 31–60, 60+, by the oldest past-due installment) and Promise (open, broken, kept, none) filters. *Follow up* opens a drawer with the full contact history |
| Promise status from evidence | A promise is **Kept** once receipts in the ledger, from the day it was made to its date, cover the amount. Otherwise it's **Open** until its date and **Broken** after. Nobody types a status in. DEMO-LN-002 has one of each: July (kept: the two GH₵800 cheques), August and September (broken), and 6 November (open) |
| Channel, outcome and promise defined separately (F59) | **How you contacted them** (call, SMS, email, WhatsApp, in person). **What happened** only offers outcomes that channel can produce (no "No answer" for email), and changing the channel drops a contradictory outcome. The service rejects contradictions too |
| Every promise path collects its details | Any channel with *Promised to pay* opens **The promise**, with a required amount and pay-by date. The date can't be before the contact, and the amount can't exceed the total balance |
| "Paid" never creates a payment | The outcome is worded *Says they've already paid*. The form and history both say it records what the borrower said, not a payment, and link to Repayments to check for a receipt. A test confirms past due is unchanged |
| Clear contact time (F59) | **When the contact happened (required)**, Accra time (GMT). It defaults to the current business time and explains you can change it for an earlier contact. Future times are refused |
| Labels, requiredness, help, errors (F25) | Every control has a visible label, (required) or (optional), help text and an associated error. Errors are summarised, and focus moves to the summary |
| Manageable dialogs and focus | The form opens inside the drawer, not as a nested dialog. Cancel returns focus to *Log a contact*, Save moves it to the confirmation, and closing the drawer returns it to the row's *Follow up* |
| Mocked persistence | Saved contacts live in memory for this session and say so ("saved in this demo only"). Nothing is called, texted, emailed or messaged |

DEMO-LN-001 has **no prior contact**, so its history reads "No contact recorded yet". The kept and broken promises are fictional states, not inspected live, as the brief asked.

**Checks:**
- `npm test`: **278 pass** (14 new, including agreement with the dashboard's overdue count)
- Typecheck and lint pass
- axe: 0 violations on the list, the follow-up drawer, the contact form with errors, and the empty 31–60 band at 375 px
- No page-level horizontal scroll at 375 px

---

# Repayments index (B2-05)

3 November 2026. Route: `/repayments`. Data: `lib/api/repayments.ts`, built from the same ledger rows as Transactions, so receipt references and recorded times agree across the two screens.

| Requirement | Implementation |
|---|---|
| Recorded receipts, clearly named (F53) | Two tabs: **Received today** (the business date) and **Payment history** (every receipt, today included). The page is headed "Money received" |
| Due work kept separate | Today shows no receipts. A banner says "2 installments are due today" and links to the Calendar, and the empty state says it "means nothing has been received yet, not that nothing is due" |
| A verified aggregation basis (F54) | The totals are **Received** (each currency on its own), **Receipts** and **Loans paid toward**, for the matching receipts across all pages. **There is no "Total balance"**: each receipt stores the loan's balance after that payment, and adding those snapshots counts the same loan several times. An InfoTip says so and points to the loan record and dashboard. "Total amount given" is gone too, because disbursements aren't receipts |
| Date filter that applies (F55) | Reuses the picker fixed in R1. Draft and applied state are separate, errors appear on the field, and the applied range shows outside the picker as a chip, with *Clear all* to reset |
| Receipt context in the row (F56) | The columns are Received (with recorded time), Receipt reference, linked Loan (to its repayment overview) and Amount (with method). **Balance after this receipt** is labelled *Historical*. No "next payment date" is shown, because the fixtures don't hold the date recorded at each receipt, and inventing one would mislead |
| Reliable receipt preview (F57) | *View receipt* opens a drawer that always shows something: a loading message, then the receipt, or an error with Retry and a fallback link to Transactions (`?demo=receipt-error`). It includes the loan's status now, so a settled loan reads Completed. Print and download are disabled with the reason. Focus returns to the row on close |

**Fixtures exercised:** four receipts on DEMO-LN-002, two of them same-day cheques told apart by reference and balance after. DEMO-LN-003 is settled: its last receipt shows GH₵0 after. DEMO-LN-005 is in USD and totalled separately.

**Checks:**
- `npm test`: **264 pass** (13 new)
- Typecheck and lint pass
- Browser: the F55 reproduction (both dates set without input events, then Apply) filters to the 4 October receipts, and the range shows as a chip
- axe: 0 violations on Received today, Payment history, the filtered view, the receipt drawer and the preview error
- At 375 px there's no page-level horizontal scroll

---

# Credit Score and Calendar (R3)

3 November 2026. Routes: `/credit-score` and `/calendar`. Built from the live audit's observations (F69–F71) and the original F06. There is no scoring engine: every assessment is a fictional record (`lib/credit-fixtures.ts`).

### Credit Score

| Requirement | Implementation |
|---|---|
| Human loan reference and linked borrower | Every row leads with the linked loan reference, with the borrower underneath. The system assessment ID (`sc_…`) appears only under *Technical details* in the drawer |
| Latest vs history | *Latest per loan* (the default, one row per loan) or *All assessments*, where each row is marked **Latest** or **Historical**. The count names its scope: "8 loans" vs "12 assessments" |
| Model, version and scale | Each row names its model and version, and shows the score with its own range, e.g. "712 on 0–900". Three fictional models, shaped by the audit: Current (0–900), Legacy (0–100), and Financial (300–850, seen on an incomplete assessment) |
| Never averaged or combined | No average anywhere. The summary line gives **counts** per model only. A loan with two models (DEMO-LN-005) shows both, and the legacy score is labelled as not comparable |
| Exact time and trigger | Assessed date and time, plus the trigger (Loan application, Manual re-run, Scheduled review). Two re-runs 12 minutes apart on DEMO-LN-001 stay as separate records |
| Incomplete, never zero | DEMO-LN-004's assessment reads **Incomplete**, and its drawer names the missing categories. The loan record still says "No score" |
| Named filters and human search | Search by loan reference or borrower name. Model, State and Trigger each have a visible label, and active filters show as chips with their meaning. The filtered-empty view explains that *Latest* searches only each loan's latest assessment |
| No decision or override | *Adjust score* is disabled, and the drawer says why. Browsing never calculates or changes a score |

**Agreement:** every loan's latest assessment is the score its loan record already shows. A test enforces this.

### Calendar

| Requirement | Implementation |
|---|---|
| Scheduled kept apart from received | Each day lists **Scheduled** installments (from the loan schedule) and **Received** receipts (from the ledger) separately, each with its own count. Totals are per currency, never mixed |
| Same basis as the dashboard | Installments come from `scheduleFor` and the same outstanding-loan rule the dashboard uses, judged at the business date. That rule now lives in the financial contract (`lib/domain/loan-position.ts`) |
| A day with no receipts can still have amounts due | 2 November: **Scheduled (2)**: DEMO-LN-001 #2 GH₵300 and DEMO-LN-009 #3 GH₵400, both *Due today*. **Received (0)**: "2 installments are still due, so this isn't a quiet day". This matches the dashboard's two due-today accounts |
| Installment states | Paid, Due today, Upcoming, Missed, Part paid past due. A written-off loan's unpaid rows read *Not collected* rather than missed |
| Useful default, remembered choice | Opens on the current month with the business date selected. Month or Week is in the URL, and the last explicit choice is remembered on this device (read without a hydration mismatch, and ignored if storage is blocked) |
| Accessible agenda and day detail | The month grid is a table of links. Each day's link names the full date and what's on it. Week view is an agenda list. Selecting a day keeps focus on it; Previous, Next and Today move focus to the period heading |
| Phones | Day chips show an icon and a count (Clock = due, warning = missed, arrow = receipt), and the key matches |

**F71 traced, not papered over:** the live calendar showed nothing on 2 November while the dashboard showed two due. Here both read the same schedule, so they agree, and a test enforces it. The live defect's cause can't be proven from UI evidence alone; the handoff says not to claim it.

**Bug found and fixed:** the Calendar first imported the outstanding-loan rule from the dashboard service. During server rendering that value was undefined, so the page fell back to client rendering. Moving the rule into the financial contract fixed it, and both screens now share one definition.

**Checks:**
- `npm test`: **251 pass** (22 new, including the credit-to-loan and calendar-to-dashboard agreement tests)
- Typecheck and lint pass
- axe: 0 violations on Credit Score (All view and the incomplete assessment's drawer) and on Calendar (month and week views)
- Browser: the remembered week view applies on return, and switching back stores Month. At 375 px there's no page-level horizontal scroll

---

# Handoff fixes: range regression, scope labels and loan application (R1, F75, R2)

3 November 2026. From `LoanDrift_Consolidated_Audit_and_Claude_Handoff_2026-11-03.md`. The adapted prompt sequence is in `docs/NEXT-PROMPTS.md`.

**R1: the period picker kept the old range (F73).** The handoff's automated run set both dates, pressed Apply, and nothing changed. Cause: the draft only updated on React's change event, so a value set any other way (automation, autofill, some assistive tech) never reached it, and Apply committed the stale draft. Fix: Apply now reads the inputs' own values, validates those, and commits both dates together. A new test sets the values directly, with no React event, and expects October.

Checked in the browser by setting values programmatically:

| Check | Result |
|---|---|
| Custom October range | URL `?from=2026-10-01&to=2026-10-31`, label "Last month · 1 Oct 2026 – 31 Oct 2026" |
| Reload | The range is kept |
| End date before start | Blocked: "The end date must be on or after the start date.", and the URL is unchanged |
| Cancel | The applied range is restored |
| One-day range | Applies (test) |

Back/Forward: filters use `router.replace`, so changing a range adds no history entry. Back leaves the page rather than stepping through ranges. This was a deliberate choice, now written down.

**F75: placeholder scope labels.**
- Credit Score and Calendar now say *planned in R3*; they used to read "outside the audited scope".
- Savings, Investments, Expenses, Accounting, Reports and Bulk Upload say which prompt builds them, and that they're **on hold** until the live module has been inspected. Nothing on them is guessed.
- **Expenses** now has its own destination under Money.
- Settings is the only route with no planned increment, and it says so.

**R2: loan application path (F47, F48).** *New application* on All Loans, and a new button on each client profile, open `/loans/new`. It's a mock: nothing is saved or sent.

| Requirement | Implementation |
|---|---|
| Nine capture sections | Client details, Loan details, Penalty, Guarantors, Businesses, Client worth, Comments, Documents, Review and save. A step list (a scrolling strip on phones) shows each section's state: Complete, To do, Optional, Needs attention or Locked |
| Requirements up front | The first section lists everything required, and Review repeats the list with "Go to" links for anything unmet |
| Locked steps explained | Sections 2–9 are locked until a client is chosen, and the form says why. Choosing a client fills Businesses and Client worth from the profile, as editable copies |
| Required evidence | Only what the prototype already requires: the client must have an ID and a primary phone on file. A client with an active loan gets a note, not a block, because the concurrent-loan policy isn't established |
| Calculation incomplete | The registration principal is shown on its own. Interest, total payable and the installment amount read **Calculation incomplete** with a list of what's missing. Once the terms are valid they read **Unavailable**, because no verified calculation service exists (the interest basis is unconfirmed, FINANCIAL-CONTRACT.md §9). No formula is invented |
| Interest vs repayment units | A warning appears when the rate period (per week or month) differs from the repayment frequency |
| Local vs persisted | A banner says everything stays in this tab and there are no saved drafts. Reload and close warn; Cancel and the back link ask before discarding |
| Maker-checker | Submitting runs a mocked check only: "All checks passed. Nothing was saved." It explains that a different user approves. The form has no approve action |
| Not invented | Rates are typed from the product sheet, never suggested. The guarantor count, penalty amounts and affordability aren't decided. Documents are listed, not uploaded |

**Checks:**
- `npm test`: **229 pass** (18 new: picker automation and one-day range, scope labels, application service and form)
- Typecheck and lint pass
- axe: 0 violations on the application's Loan details, Penalty, Guarantors (one added) and Review (with errors) steps, and on the Expenses placeholder
- Browser: a full valid application reaches the mocked success at 1440 px. At 375 px there's no page-level horizontal scroll
- DEMO-LN-001 still shows 100 past due, 300 due today and 400 to bring current; the financial contract tests pass unchanged

---

# Transactions (B2-04)

3 November 2026. Route: `/transactions`. Data: `lib/api/transactions.ts`, built from the same fictional events and receipts the dashboard and repayment screens use. In the fixtures, one July receipt was split into two GH₵800 cheques on the same day, and a penalty charge and its waiver were added.

| Requirement | Implementation |
|---|---|
| Keep type, date and search filtering, reset and pagination | Type and Money filters, an optional period ("Any time" until one is chosen), and search across reference, loan, borrower, payer reference and ID. Chips with *Clear all*; 10 per page; everything in the URL, and filter changes return to page 1 |
| Keep the non-cash explanation, using verified semantics | Each type has a fixed direction. Repayment = **Cash in**, Disbursement = **Cash out**, and Fee charged, Penalty charged and Penalty waived = **Adjustment (not cash)**. The direction is written in words with an icon, never as +/− |
| Primary columns at the audited width | Date (with recorded time), Type (with direction), Loan (reference and borrower), Amount (with method), Reference, Status, View. Payer references and IDs live in the drawer |
| Overflow cue and sticky action | The View column is pinned to the right with an edge shadow, so it stays reachable on phones while the rest scrolls (F50) |
| A stable human reference; the unique ID kept | Every row has its own reference (receipt `DEMO-RC-…`, disbursement `DEMO-DB-…`, fee, penalty and waiver numbers). The system `TXN-…` ID is under *Technical details* |
| Received, recorded and effective times, with meanings | Rows show the effective date and "Recorded HH:MM GMT". A later day is shown in full and highlighted (DEMO-RC-0039: effective 24 Oct, recorded 25 Oct 08:20). The drawer explains *Effective: when money moved* (or *when it applies*) and *Recorded: when it was entered* |
| Never merge similar same-day payments | DEMO-RC-0017 and DEMO-RC-0018 (two GH₵800 cheques, same loan and day) are separate rows. Each drawer lists the other under "Similar on the same day: listed, not merged" (F51) |
| Link the precise record, not only the loan | The drawer links the loan record, the receipt in the repayment overview, and the Activities event (with its accounting entries) where one exists |
| Applied filters and row-count scope | "N matching transactions of 28". Totals cover **all** matching rows, not one page, in cedis: Cash in, Cash out, Charged (not cash), Waived (not cash). Charges and waivers are never netted, and other currencies are named, not added |
| Stable order and accurate server-side filtering | Sorted by effective date, then recorded time, then ID, so ties never swap pages. The service filters and pages the whole ledger. A test checks that page 1 and page 2 don't overlap |
| States | Loading skeletons; failed request (`?demo=error`); filtered-empty ("No penalty waived transactions match", covering the whole ledger); true-empty. No export (not supported) |
| No posting or reversing | Read-only |

**One ledger across screens:** October in Transactions matches the dashboard exactly (cash in GH₵1,000, cash out GH₵5,500, charged GH₵110). Recorded times come from the Activities feed where it has the event, so DEMO-RC-0042 reads 15:31 in both places. A test checks this.

**Also changed:** the date picker gained an optional "Any time" state. The dashboard's "View disbursements" links (`/transactions?type=disbursement&from=…`) now open a filtered ledger instead of a placeholder.

**Bug found and fixed:** after `next.config.ts` changed, the dev server kept serving an old picker that crashed during server rendering with no period applied. A clean restart fixed it, and the page now renders on the server without errors.

**Checks:**
- `npm test`: **211 pass** (15 new)
- Typecheck, lint and `next build` pass
- axe: 0 violations on the ledger and the transaction drawer
- Browser: View visible without scrolling at 1440 px, pinned at 375 px, and no page-level horizontal scroll

---

# Loan Features merged into All Loans (B2-03)

3 November 2026. **Decision (user):** the nine Loan Features queues (Registered, Captured, Approved, Rejected, Disbursed, Active, Defaulted, Completed, Written off) were the same lists as All Loans filtered by status. Reaching either took the same clicks, so keeping both was redundancy. All Loans stays and Loan Features goes. This is the consolidation the Phase 2 audit recommends as its first option for F44.

| Change | Detail |
|---|---|
| Sidebar | The Loan Features group is removed. Lending now reads Clients, All Loans, Transactions, Repayments… |
| Old links keep working | `/registration`, `/capture`, `/approval/approved`, `/approval/rejected`, `/disbursement`, `/active`, `/defaulted`, `/completed` and `/write-offs` redirect (307) to `/loans?status=…` (`lib/legacy-routes.ts`, `next.config.ts`). Bookmarks and shared links land on the same loans |
| Counts in the filter | The Status dropdown shows how many loans are at each stage ("Captured (1)"), so the queue counts aren't lost |
| What the queues were *for* is now in All Loans | Filtering by a stage shows its one-line meaning ("Captured: terms captured; awaiting a decision") and adds a stage column built from recorded data (`stageDetail()`). Missing data says so and is never shown as "ready" |
| Width | When a stage column shows, *Updated* is hidden; the stage detail carries the relevant date |

**Stage columns:**

| Stage | Column | Shows |
|---|---|---|
| Registered | Next step | "Capture terms", with the registration date |
| Captured | Decision readiness | Blockers first ("1 blocker: Guarantor form missing"), else evidence count; level, approver and time waiting |
| Approved | Agreement | "1 of 2 signed · Waiting on: Branch manager", or "All signed" |
| Rejected | Decision | The recorded reason, who decided and when; "Reason not recorded" if absent |
| Defaulted | Arrears | Past due and days overdue, from the financial contract |
| Completed | Closed | Repaid date and last receipt |
| Written off | Write-off | Written off, recovered and the date (fictional: GH₵1,800 and GH₵100) |
| Active, Disbursed | — | Not needed: repayment progress and health already cover them |

**Checks:** `npm test` **196 pass** (10 new: redirects for all nine paths, none left in the sidebar, stage counts, every stage detail, the stage column and description in the view, and the chip label without its count). Typecheck and lint pass. Browser: `/capture` lands on *Captured* with Decision readiness; Approved, Rejected and Written off checked at 1440 px.

---

# Prompt 8: Final verification

3 November 2026. Full report: **[VERIFICATION.md](VERIFICATION.md)**.

- **axe-core 4.14** run in the browser across every built route and state. Six rule failures fixed: three accessible-name mismatches, a landmark gap, heading order on Notifications, and dimmed-decimal contrast (4.0:1 → ≥ 4.5:1). Now **0 violations**.
- **Flows walked through:** Dashboard period, approval scope, notification filtering, Activities pagination and detail, list to record, repayment preview, keyboard and skip link, and narrow and wide layouts.
- **Finding-status table** for F01–F68, with route and evidence for each.
- `npm test` (186), `typecheck`, `lint` and `next build` all pass.

---

# Prompt 7: LoanDrift product page and demo handoff

Built 2–3 November 2026. Routes: `/products/loandrift` (product page) and `/contact` (Book a demo). They sit in their own `(marketing)` layout, with a site header and footer and no app sidebar. Content: `lib/marketing-content.ts`.

> Same source caveat: the mapping to F34–F40 follows Prompt 7's wording. No commercial source of truth (prices, plan contents, approved proof) was available, so **nothing on the page is a verified commercial fact**. Everything is either draft copy or held for review.

## Draft versus verified

Every commercial statement in `marketing-content.ts` carries a status:

- **Draft:** plausible copy written from what the product actually does, awaiting owner sign-off.
- **Review:** a known contradiction or an unsubstantiated claim.

The page has two views:

| View | What it shows |
|---|---|
| **Draft** (default) | A banner explains that the copy is a draft. Every unconfirmed item carries a *To confirm* or *Held* tag, and each contradiction has a note for the owner |
| **Release preview** (`?mode=release`) | Everything still under review is hidden: the *Online repayments* row, the proof section, the held claims, the integrations note and every *To confirm* tag. "To confirm" cells read "Ask us" and prices read "Contact us for pricing" |

## Requirements → implementation

| Requirement | Implementation |
|---|---|
| A specific hero that doesn't imply LoanDrift lends | "Run your lending business, from application to collection", then "LoanDrift is software for lenders. It doesn't provide loans." |
| Product imagery from the real redesigned interface | The hero preview renders the app's own components (principal card, approvals and due-today tiles, collection ring) with fictional fixtures. It's inert, with a text alternative. No competitor screenshots |
| Three lifecycle benefits, capabilities, proof, plans, comparison and FAQs, with jump links | All present, with a sticky "On this page" bar. Proof appears in the draft view only |
| One H1; accessible accordions, tables and CTAs | One H1. FAQs use native `<details>`. The comparison table has a caption, column headers and row headers. Every *Book a demo* link names its plan for screen readers |
| Resolve the Basic-card versus Advance-comparison contradiction | Plan cards and the comparison table are built from **one entitlement dataset**, so they can't disagree. The online-repayments contradiction is marked *review*, with a note naming both conflicting statements, until the owner decides |
| Billing currency, per-location basis and limits only once confirmed | No price, currency, basis or limit is stated. Each is a *To confirm* card in the draft view |
| No unsupported AI or POS scoring claims | "Real-time AI credit scoring" and "Scoring from POS data" are listed under *Held*, with the reason, and appear nowhere else |
| No invented testimonials, logos or statistics | None. The proof section says it waits for approved, real examples. A test checks the page has no price-per-period or statistic patterns |
| Integrations only where verified | None listed. The draft view explains why |
| Book a demo keeps LoanDrift and the demo intent | Every demo link carries `?product=loandrift&intent=demo`, plus `&plan=` from plan cards. The form shows "You're asking about LoanDrift · Book a demo · Advance plan" and pre-fills both choices, which stay editable |
| Clear next steps; nothing sent | "What happens next: the team reads your request, emails you to agree a time, nothing is booked until you confirm." Submitting is mocked ("Request checked, not sent"). No scheduler is connected |
| Existing navigation preserved | The real TroveSuite site navigation wasn't available. The header (Product, Plans, FAQs, Contact, Sign in, Book a demo) stands in for it, and phones get the same links in a *Menu* |

## Bugs found and fixed while checking

| Problem | Fix |
|---|---|
| The product page returned a 500: the preview pulled a client-only React hook into a server render | The preview is a client component |
| Browser tab titles repeated "LoanDrift" | Absolute titles for the public pages |
| On phones the site links were hidden with no menu | A *Menu* disclosure in the header |

## Checks

- `npm test`: **186 pass** (8 new). They cover one H1, the "doesn't lend" line, demo links carrying intent, the plan cards and table agreeing for every feature, the contradiction note being shown, no prices or statistics, held claims, the release view hiding everything under review, the FAQ disclosures, the contact form keeping product, intent and plan, field-level errors, and nothing being sent
- `npm run typecheck`, `npm run lint` and `next build` pass
- Browser: hero, plans and comparison at 1440 px; the release view; the contact form from a plan link; and the phone menu with no horizontal scroll at 375 px

**For the owner to decide before release:** prices, billing currency and basis, plan limits, which plan includes online repayments, collections, the collateral register and group lending, the branch limit per plan, approved proof, which integrations to list, the expected reply time after a demo request, and the real site navigation.

---

# Prompt 6: Financial contract and repayment workflow

Built 2 November 2026. New: `lib/domain/loan-position.ts` (the contract), `/loans/[ref]/repayment` (repayment overview and the record-payment flow), and **[FINANCIAL-CONTRACT.md](FINANCIAL-CONTRACT.md)**, which has every definition, its kind (live, source field, historical snapshot, not established) and the open product decisions.

> Traced through the prototype's data model, not the real backend. The mapping to F01–F06 and F30–F33 follows Prompt 6's wording; the original audit text wasn't available to confirm it.

## What changed

| Requirement | Implementation |
|---|---|
| Document the source and definition of each figure | FINANCIAL-CONTRACT.md covers principal outstanding, total balance, regular installment, past due, due today, amount to bring current, next scheduled date, oldest unpaid date, fees and penalties, settlement, score model, and historical receipt balances |
| One shared contract across screens | `loanPosition()` feeds the Dashboard (arrears, due-today and overdue counts now come from it), All Loans, the loan record header, the repayment overview and the payment preview. Calculations stay in the domain layer, in whole pesewas |
| Unresolved rules marked, not guessed | Fees and penalties, and the settlement amount, are **Unavailable** with reasons. Allocation order is shown as an *assumed* rule. Over-payments are refused |
| Conflicting values traced, not chosen | The loan record's balance field is cross-checked against the schedule. DEMO-LN-005 disagrees (USD 300.00 vs USD 1,080.00), so its total balance is Unavailable, a warning names both values, and recording is blocked |
| Repayment overview | Total balance (live), to bring current (with its breakdown), oldest unpaid date with days overdue, next scheduled (after today), regular installment, principal outstanding, fees and penalties, settlement; then the schedule and receipts. The receipts' "Balance after (at the time)" is labelled historical |
| Automatic repayment disabled, with the reason and prerequisite | "Collect automatically · Off: needs a mobile money mandate signed by the borrower", linking to the client profile |
| Recording a payment separate from collecting online | Two separate cards. *Record external payment* states that it doesn't collect anything |
| Suggested amounts with breakdowns | To bring current ("GH₵100.00 past due + GH₵300.00 due today"), Regular installment, Total balance ("Not a settlement quote") |
| Date editing explains its effect | The hint and the review explain backdating, and say penalties aren't recalculated. Future dates and dates before disbursement are refused |
| Review stage | Borrower, loan, currency, amount, method, date, reference; the allocation to each installment (past due / due today / upcoming); and before → after for total balance, amount to bring current and next scheduled. Unchanged figures say "(unchanged)" instead of being struck through |
| No mutations | The final *Record GH₵…* step is mocked and reports "Checked, not recorded" |

## Loan record header

The six figures are now: Principal, Principal outstanding, **Total balance**, Paid, **To bring current** (its tip shows past due + due today), and **Next scheduled**. Next scheduled is the first installment *after* today; before, it could show today's installment. A **Repayment** button opens the overview. In All Loans, *Record external payment* is now a link to the flow; the flow's own review step makes that safe.

## Fixture additions

- A receipts table with historical "balance after" snapshots.
- An automatic-repayment status.
- Disbursement and repayment events for the written-off loan DEMO-LN-006.

## Checks

- `npm test`: **178 pass** (22 new). The suite includes an **agreement test**: for every loan, the loan list, loan record, contract and payment preview give identical figures, and the dashboard's arrears and due-today counts equal the sum of loan positions. The suite also covers:
  - a partial payment (GH₵250: GH₵100 to installment 1, GH₵150 to installment 2)
  - a full payment
  - due today versus past due (DEMO-LN-009 isn't in arrears)
  - a zero or absent denominator
  - unavailable data (DEMO-LN-012)
  - the source conflict (DEMO-LN-005)
  - legacy and current score labels
  - the latest historical receipt matching today's live balance
  - the preview leaving the real schedule untouched
- `npm run typecheck`, `npm run lint` and `next build` pass
- Browser:
  - DEMO-LN-001: overview, then *Record external payment*, then the *To bring current* suggestion, Cash, then review (GH₵400: installments 1 and 2 cleared; balance GH₵1,000 → GH₵600; to bring current GH₵400 → GH₵0)
  - DEMO-LN-005: conflict warning, with no horizontal scroll at 375 px

**Open product decisions** (details in FINANCIAL-CONTRACT.md): allocation order, over-payments, fees and penalties, early settlement, the due-today cut-off, backdating effects, which balance is authoritative, legacy scores, and interest-rate basis.

---

# Prompt 5: Clients, Loans and the loan record

Built 2 November 2026. Routes: `/loans`, `/loans/[ref]`, `/clients`, `/clients/[id]`, `/clients/new`. Data: `lib/lending-fixtures.ts` (fictional clients and loan records) and `lib/api/lending.ts`. The fixtures gained three loans (DEMO-LN-010 rejected, DEMO-LN-011 approved, DEMO-LN-012 registered, which gives Kojo Example a third loan) and a schedule for the written-off loan.

> Same source caveat: the mapping to F21–F29 follows Prompt 5's wording. The original audit text wasn't available to confirm it. This increment also covers the Phase 2 Client History findings F41–F43, because the client profile shows loan history.

## All Loans (`/loans`)

| Requirement | Implementation |
|---|---|
| Loan reference as the primary link, borrower as context | The reference links to the loan record; the borrower name sits underneath |
| Requested or approved amount | The Principal column labels each amount "Requested" (registered, captured, rejected) or "Approved" |
| Labelled balance or payment progress | "GH₵200.00 of GH₵1,200.00 paid", with a bar that has an accessible value ("16.7% repaid"). With no schedule it reads "No schedule", with the reason in a tip; never 0% |
| Workflow status *and* repayment health | Two separate badges |
| Written off in the status filter | All nine stages, plus "Unrecognised status" for legacy values |
| Every status keeps View loan | Always-visible *View loan*, named for its reference, on every row |
| Next actions from permitted transitions, not badge colour | `allowedActions()` gives each stage its next steps (for example Registered: Capture terms; Approved: Agreement and signing, Disburse; Written off: Record recovery). In the real app these come from the API. Consequential actions are disabled with a reason |
| Routes and pagination kept | `/loans`, 8 per page, everything in the URL |

## Loan record (`/loans/[ref]`)

- **Fixed identity:** the reference (H1), borrower link, product, status and health stay at the top whatever tab is open.
- **Financial summary:** principal (or amount requested), principal outstanding (in purple), total payable, paid, past due, and the next installment. Each has a definition in a tip. Missing values say why.
- **Seven tabs, kept in `?tab=`:**
  - **Overview:** terms (interest rate "as captured", frequency, installments, disbursement date, officer, score with its model) and the borrower's other loans.
  - **Schedule & payments:** each installment's state is worded precisely ("Overdue, part paid", "Due today", "Upcoming"), with totals and the payments received.
  - **Client & affordability:** client details with the ID masked for roles that can't see it. Affordability reads "Not recorded in the source"; nothing is calculated from income alone.
  - **Agreement:** each signature as signed (with date) or *Outstanding*. When a disbursed loan has an outstanding signature, it's flagged ("Check this against the product's signing rule") **without** explaining why it might be allowed, because that rule isn't established.
  - **Collateral:** estimate, basis and lien status.
  - **Documents:** readable titles, type, size ("1.3 MB") and date. No stray zeros.
  - **History:** this loan's events, linked to the Activities drawer.
- An unknown reference shows "This loan isn't in this branch's records".

## Clients (`/clients`, `/clients/[id]`)

- **List:** one H1 with an *Add client* action. Compact branch-wide counts (11 clients · 5 with an active loan · 1 new this month) that stay fixed while searching, and say so. Search by name, client ID, phone or business, plus a filter for active loans. Missing data reads **Not provided**. Each row has *View profile* plus a menu (*View loans*; *Start loan application* is disabled).
- **Search with no matches (F41):** "No clients match “…”", with the branch total, **Clear search** first and *Add a new client* second.
- **Profile:** details with the ID masked for loan officers (try `?as=officer`).
- **Loan history (F42, F43):**
  - Statuses come from the shared mapping, never defaulted to Pending.
  - Each loan shows **approved principal**, **total payable**, **paid** and **principal outstanding** as separate figures. For the completed loan: principal GH₵2,000.00, total payable GH₵2,060.00, paid GH₵2,060.00.
  - Completion is "Repaid in full: 1 of 1 closed loans" (completed ÷ completed or written off). With no closed loans it says so instead of showing 0%.

## Add client (`/clients/new`)

- **Fieldsets:** Personal details, Contact, Identification, Business. Every field is marked "(required)" or "(optional)".
- **Contact rules:** the primary phone is explained (it receives reminders; only one number can be primary). An alternative phone that matches the primary is flagged.
- **Identification:** ID type and number are required. The upload states "JPG, PNG or PDF, up to 5 MB" and rejects other types or sizes. Nothing is uploaded.
- **Errors:** each sits under its field via `aria-describedby`, with `aria-invalid` set. A summary at the top takes focus and links to each field.
- **The server is authoritative:** the mocked submit catches a duplicate ID number the browser can't know about ("already registered to client DEMO-CL-03"). Nothing is ever saved.
- **No save-draft** (not supported). Instead, the browser warns before a reload or tab close, and *Cancel* or the back link ask "Discard this client's details?" when anything has been entered.

## Also changed

- Loan references across the dashboard, approvals, notifications and the Activities drawer now link to the loan record. Notifications' *Open record* goes to the specific loan.
- Filter dropdowns now show their selected label on first paint. Before, they could render blank until opened.

## Checks

- `npm test`: **156 pass** (30 new)
- `npm run typecheck`, `npm run lint` and `next build` pass
- Browser:
  - Loans list, loan schedule and agreement tabs, clients list and filter, client profile, and form validation all checked
  - No page-level horizontal scroll at 375 and 1440 px

**Limitations.**
- In-app navigation away from a dirty form (the sidebar) isn't intercepted; only reloads, tab closes, *Cancel* and the back link are.
- *Edit details*, *New application* and document *View* are disabled.
- No axe or screen-reader pass.
- The interest-rate wording ("per week, as captured") is display-only; no rate is calculated.

---

# Prompt 4: Activities

Built 2 November 2026. Route: `/activities`. Data: `lib/activity-fixtures.ts` (fictional, deliberately shaped like a raw audit feed) and `lib/api/activities.ts`.

> Same source caveat: the mapping to F16–F20 follows Prompt 4's wording. The original audit text wasn't available to confirm it.

## What the feed does

| Requirement | Implementation |
|---|---|
| Search, date range, actor, module and action filters | Search covers person, record reference, label and module. *Who* includes "System". The period uses the same picker as the dashboard. Filters show as chips with *Clear all*. Everything is in the URL, and changing a filter returns to page 1 |
| No simulated global search | Filtering runs over the whole history in the service, never over the visible page. A test finds an event that sits on page 3 when unfiltered. The filtered-empty message says "The search covers every page" |
| Human-readable events | One sentence per event: **actor**, verb, reference, amount (for example, "**Kwesi Officer** recorded a repayment on `DEMO-LN-009` **GH₵400.00**"), then context, a module tag and the time in GMT. A test checks the feed never shows raw "None", snake_case or six-decimal amounts |
| Raw values translated, not lost | Six-decimal strings are parsed into whole pesewas with integer rounding (no floats). "None" or null reads "Not set"; enum values like `MONTHLY` read "Monthly"; field names like `requested_amount` read "Requested amount". The raw record is kept under *Technical details* in the drawer |
| Detail drawer | Event ID; who; record (full reference plus label); amount; when it happened and, if different, when it was recorded; any note; a before/after table; linked events; *Technical details* (event ID, correlation ID, source time, raw JSON). Opens from `?event=`; Escape closes it and focus returns to the row |
| Group side effects only with a correlation ID | A repayment and its two journals that share `COR-7f3a` show as one row with "2 accounting entries", listed in the drawer. A legacy repayment and journal at the same moment *without* a correlation ID stay separate, and the drawer says "None recorded. Events are only linked when the source gives them a shared correlation ID". Searching for the loan keeps its linked journals with it |
| Truthful "no changes" | Three different messages: *Saved with no field changes* (empty diff), *The source didn't record which fields changed* (missing diff), and *Not applicable to this event* (events that aren't edits) |
| Date headings repeat at page boundaries | Every page starts with a date heading. When a day carries over from the previous page, it reads "Friday, 30 October 2026 (continued)" |
| Full references kept | Long references are visually truncated in the feed, but the full reference is in the hover title, the row's accessible name and the drawer |
| Older history | The feed keeps 90 days (from 5 Aug 2026). A range starting earlier shows "This feed starts on 5 Aug 2026" with a link to the audit report, instead of implying nothing happened |
| States | Loading skeletons (no count until data arrives); failed request with Retry (`?demo=error`); filtered-empty; true-empty for the period; and an unavailable event in the drawer |
| No mutations | Activity history is read-only |

## What needs real API support (F16–F20)

This prototype's service *assumes* the backend provides each of these. Confirm them before building against the real API:

1. **Server-side search and filters** (actor, module, action, date) over the full history, with a total count. If the API only returns recent windows, the UI must say so and route to the audit report; it must not filter only the visible page.
2. **Stable ordering** (time, then event ID), so same-second events don't swap between pages.
3. **Correlation IDs** on side effects. Without them, grouping is impossible, and the UI correctly shows events separately.
4. **Structured diffs**: an empty list for "no changes" and null for "not recorded". The two must be distinguishable at the source.
5. **Both timestamps**: when it happened and when it was recorded.
6. **The retention window**, as a value the API reports rather than one hard-coded in the UI.

## Bugs found and fixed while testing

| Problem | Fix |
|---|---|
| Searching for a loan found its repayment but dropped the linked journals, because journals don't mention the loan | A matching business event brings its correlated accounting entries with it |
| "Branch settings" was styled as a record reference | Sentences mark when the object is a plain label |
| The disabled *Newer* button stacked its icon above its text | Separate enabled and disabled buttons |

## Checks

- `npm test`: **126 pass** (26 new for Activities)
- `npm run typecheck` and `npm run lint` pass
- Browser:
  - Page 2 shows "(continued)"
  - The repayment row shows "2 accounting entries", while the legacy repayment and its journal stay separate
  - The drawer shows the linked journals; Escape returns focus to the same row and keeps `?page=2`
  - No horizontal scroll at 375 and 1440 px

**Limitations.** There's no sort control: the feed is newest first only. The Record link in the drawer goes to the Loans placeholder for every record type. No axe or screen-reader pass.

---

# Principal card and collection card (requested before Prompt 4)

- **Principal outstanding** on the hero is now a **white card** with the figure in purple `#6D28D9` (7.1:1 on white) and lighter-purple decimals (later raised to brand `#7C3AED` in Prompt 8 after axe found 20px figures don't count as large text). The glassy variant is gone.
- **Dimmed decimals everywhere** moved from 45% to 55% opacity: 4.1:1 instead of the borderline 3.0:1.
- **Collection rate** now says what was paid, not only what's unpaid. The ring's purple arc is *Paid* and the lavender track is *Unpaid*; a legend lists Paid GH₵1,000.00, Unpaid GH₵1,700.00, and *Due, 4 installments* GH₵2,700.00. The centre reads "37% collected".
- **Equal heights:** the Collection rate card grows so that it and the Fees charged card together match the *Activity in selected period* card. Checked in the browser: both start at 798 px and end at 1351 px.

---

# Purple brand and dashboard redesign (requested before Prompt 4)

Inspired by two reference shots the user shared: a rich gradient hero with a greeting, glass headline card and white rounded cards overlapping it; and a soft canvas with one filled accent card, a ring, progress bars and an icon list. Their layouts and visual language were adapted, not copied; the content is LoanDrift's own.

## Brand

- **Purple replaces blue app-wide** (`#7C3AED`, 5.7:1 with white). Every token and its contrast is in `design-reference/tokens.md`.
- The **review** status colour moved from purple to cyan, so a status can't be mistaken for the brand.
- Neutrals are slightly lavender to sit with the purple, and corners are larger: cards are rounded-2xl and dashboard panels rounded-3xl.

## Dashboard, top to bottom

| Element | From the references | What it shows | Rules kept |
|---|---|---|---|
| **Purple hero** | Gradient hero with greeting | "Good morning, Abena", business and branch, and white pill buttons (Refresh, Approvals) | One H1 (greeting, with "Dashboard" for screen readers); white text only on the dark part (≥ 7:1) |
| **Glass headline card** | Glass card on the hero | Principal outstanding with dimmed decimals, plus the interest-inclusive balance | Definition and as-of time in its info tip; skeleton while loading |
| **Portfolio today** | Overlapping white card | Arrears, PAR 30, Active borrowers, and a new **Principal by days overdue** bar (current / 1–30 / 30+) | The bar's parts add up exactly to principal outstanding, and its 30+ segment equals PAR 30's "at risk" figure (both tested). Each segment is named with its amount, so colour is never the only key |
| **Needs attention** | Filled accent card (the reference's green rewards card) | Four count tiles with scope tags, the "nothing is waiting on you" line, and unread alerts | Personal, branch and alert scopes unchanged |
| **Activity in selected period** | Large overview card with the bar chart | Disbursed and Received headline figures, period picker (now a pill), chart with a dark pill tooltip and rounded bars | Same reconciliation: bars add up to the cards |
| **Collection rate ring** | Spending ring | The rate in a ring, with *Unpaid* underneath | No denominator: an empty track and "Unavailable", never 0% (tested) |
| **Fees charged** | Small stat card | Fees charged and count | Labelled as owed, not cash |
| **Latest in this period** | Transaction list with round icons | The 5 newest events, each with borrower, loan reference, date and amount in its own currency | Direction is written ("Received", "Paid out", "Fee charged"), never a +/− or red/green, so a fee never reads as cash (tested) |
| **Other modules** | Icon list | Savings, Investments, Accounting, Reports | No invented figures |

## Responsive behaviour

- Cards sit side by side from 1280 px; below that they stack.
- Stat columns and number sizes respond to **their card's width** (container queries). At 1024 px with the sidebar open, three Portfolio stats fit without overlapping.
- Checked with no page-level horizontal scroll at 375, 768, 1024 and 1440 px.

## Bugs found and fixed while checking

| Problem | Fix |
|---|---|
| At 1024 px, "GH₵4,900.00" overlapped "46.6%" | Container-query columns and sizes, described above |
| The Portfolio card had dead space beside the taller Needs attention card | Added the principal-by-days-overdue bar, which also reconciles with the headline |

## Checks

- `npm test`: **100 pass** (7 new: dimmed decimals, the ring's rate and unavailable states, latest-activity order, wording and currencies, and the principal split reconciling with the headline and PAR 30)
- `npm run typecheck` and `npm run lint` pass

---

# Prompt 3: Workspace (My Approvals and Notifications)

Built 2 November 2026. Routes: `/workspace/approvals` and `/workspace/notifications`. Data: `lib/workspace-fixtures.ts` (fictional) and `lib/api/workspace.ts`.

> Same source caveat: the mapping to F04, F05 and F13–F15 follows Prompt 3's wording. The original audit text wasn't available to confirm it.

## My Approvals

| Requirement | Implementation |
|---|---|
| Personal versus branch scope | A **Mine / Branch** switch. *Mine* means: Waiting = assigned to you; In progress and Completed = requests you raised or acted on. The dashboard uses the same rule, and a test checks its counts match this page |
| Tabs: Waiting on me / In progress / Completed | Tab counts come from the same scoped list as the rows. *In progress* means sent back to the requester, so nobody can decide until they resubmit |
| Search; type, requester, date and age filters; chips; reset | Search covers borrower, loan reference and request ID. Each applied filter is a removable chip, with *Clear all*. The age filter is hidden on Completed. Everything is in the URL |
| Empty personal queue next to a busy branch queue | "Nothing is waiting on you · 3 waiting on others in the branch", with a *View branch queue* button |
| Permission-limited | Branch scope for a role without access says who can see it and offers *Show my approvals*, instead of an empty list. Try `?scope=branch&as=officer` |
| Maker-checker | The review panel says "You raised this request, so someone else must decide it (maker-checker)", or names who must act, or explains why a sent-back or completed request can't be decided |
| 30-day completed history | "Last 30 days only · 1 older", with a link to the approval history report. The rule is documented in `COMPLETED_HISTORY_DAYS` |
| Review panel | A drawer with borrower, loan reference, amount, requester, submission time and age, approval level, next approver, an evidence checklist (provided or missing), eligibility blockers ("None recorded" rather than implying eligible) and decision history. It opens from `?id=`, so it can be linked; closing restores focus to that row's *Review* link |
| No live decisions | Approve and Reject are always disabled. The footer says why (the blocker, or "Decisions aren't connected in this prototype") |

## Notifications

| Requirement | Implementation |
|---|---|
| Type, urgency and date filters; borrower or loan search | Three labelled filters, search, and chips. All in the URL |
| Unread versus unresolved | Each row has an unread dot (labelled for screen readers) and, separately, a task badge from the task's own record: *Task open*, *Task done* or *No task*. Marking an alert read never changes the task |
| Mark read and Open record are separate | Two buttons, each named for its notification. Read state is an in-memory mock for this session only; the top-bar badge and dashboard count update with it |
| Empty states that don't over-claim | Filters matching nothing say so, and that this "says nothing about whether payments or approvals are settled". An empty Unread view says how many tasks are still open behind the alerts |
| Summary cards say what they count | *Unread alerts* (unread events), *Open tasks behind alerts* (from task records), *Alerts, last 7 days* (events, not accounts). Definitions are in the info tips |

Both pages handle loading (skeletons; no result count until data arrives), failed requests (`?demo=error`), and filtered-empty and true-empty states.

## Checks

- `npm test`: **93 pass** (23 new for the Workspace: scope rules, counts agreeing with the dashboard, the permission limit, maker-checker and blocker wording, the 30-day window, read state, and the page behaviours above)
- `npm run typecheck` and `npm run lint` pass
- Browser:
  - Approvals: the empty personal queue, then *View branch queue*, then *Review* on DEMO-AP-03 (maker-checker shown), then Escape returns focus to *Review DEMO-AP-03* and removes `id` from the URL
  - Notifications: *Mark read* updated the top-bar badge from 3 to 2 while the task stayed *Task open*
  - No page-level horizontal scroll at 375 or 1440 px

**Limitations.**
- On phones the approvals table scrolls sideways inside its card, and *Review* starts off-screen. A sticky action column, as Phase 2 asks for Transactions (F50), would fix it.
- Scroll position on return isn't restored beyond what the browser does itself. Filters and the open record are restored from the URL.
- No axe or screen-reader pass.

---

# Dashboard copy trim (requested before Prompt 3)

The dashboard was too wordy. Changes:

- **New `InfoTip` pattern** (`components/patterns/info-tip.tsx`): an info button that opens on hover, keyboard focus **and tap or click** (touch screens never hover), and closes on Escape. It has a 24px hit target. It's for explanations only; anything needed to act stays visible.
- **KPI cards** now show only the label, value, one related figure and a link. Definitions moved into an info tip, and the repeated "as of" line on every card is gone (each section states it once). Unavailable values still show their reason on the card.
- **Scoped counts** show a short scope tag (*Waiting on you*, *Branch-wide*), with the full explanation in an info tip. The whole card is still the link.
- **Shorter labels**: *PAR 30* (spelled out in its tip), *Active borrowers*, *Due today*, *Overdue*, *With interest*, *Unpaid*.
- **Page and section copy trimmed**: no header description; the section explanations are tips; unread alerts are a single line with a tip; the other-currency note is one line with a tip; the chart footer moved into the chart's tip; the picker's "inclusive, GMT" note moved into the section tip.

---

# Prompt 2: Dashboard

Built 2 November 2026. Route: `/dashboard`. Data: `lib/api/dashboard.ts`, computed from fictional fixtures in `lib/fixtures.ts`.

> **Same source caveat as Prompt 1.** Prompt 2 lists F03–F11, but the original audit wasn't available. The table below maps by what Prompt 2 asks for. Which finding ID covers which requirement still needs checking against the audit.

## What the page does, top to bottom

| Section | Contents | Basis |
|---|---|---|
| Header | One H1, a one-line purpose, and Refresh (which shows *Refreshing…* while it runs) | — |
| **Needs attention** | Approvals waiting on you; approvals branch-wide; accounts due today; accounts overdue. Unread alerts sit in their own strip below, saying reading one doesn't resolve the task | Snapshot, as of 09:00 GMT |
| **Portfolio today** | Principal outstanding (with the interest-inclusive balance labelled underneath), Arrears, Portfolio at risk 30+ days (with the principal at risk), Borrowers with outstanding loans. Each card defines what it includes and links to a scoped destination | Snapshot. Says it doesn't change with the period |
| **Activity in selected period** | The period picker; Disbursed, Repayments received, Collection rate (with due-but-unpaid), Fees charged (labelled as amounts owed, not cash); a chart with a table view | The selected inclusive date range |
| **Other summaries** | Links to Savings, Investments, Accounting and Reports. No numbers invented for them | — |

Loans in other currencies are never added to cedi figures. The USD loan and its receipts are reported in a separate line under each section.

## Requirements → implementation

| Prompt 2 requirement | Implementation | Verified by |
|---|---|---|
| Separate personal from branch approvals, due accounts and unread notifications | `ScopedCount` with a stated scope on each card. With nothing assigned to you and 3 branch-wide, the page says so in a sentence. Alerts are in their own strip | Test; browser |
| Keep the current snapshot apart from period measures | Separate sections with separate bases. The snapshot is fetched once and isn't keyed on the range | Test: changing the period leaves principal outstanding unchanged |
| Four primary portfolio cards, explicit about principal and interest | Principal-only headline, interest-inclusive balance labelled as secondary | Test; browser |
| Scoped destination for each meaningful KPI | Links carry the scope (for example `/transactions?type=disbursement&from=…&to=…`). The destinations are still placeholders | Browser |
| Controlled preset or custom range; draft values; commit on Apply; Cancel keeps the prior range | `DateRangePicker` edits a draft. Apply validates and commits both dates. Cancel, Escape and clicking away discard the draft. Reopening starts from the applied range | 5 component tests; browser |
| Reject end-before-start | Field-level message tied to *To* with `aria-describedby`; focus moves to the field; the draft is kept | Test; browser |
| Applied filters in the URL; kept on return | `?from=&to=` via `router.replace`, other parameters kept. Back from a KPI destination restores the range. An invalid range in a link is explained, not silently swapped | Tests; browser (Back from *View receipts*) |
| **Regression: 1–31 Oct stays applied after closing the picker, and the query matches the visible range** | URL, trigger label, all four cards and the chart buckets agree on 1–31 Oct | Tests, plus a browser run typing the dates with real keypresses into the native date fields |
| Chart reconciles with its labelled source values | Chart buckets come from the same service call as the cards, and the footer restates the totals. Bucket sums equal the card totals for daily, weekly and monthly ranges | 3 reconciliation tests |
| No-denominator collection rate is unavailable, not zero | `ratio()` returns Unavailable with a reason | Test |
| Due-but-unpaid shown separately from no activity | The collection card shows *Due but unpaid*. Periods with no events say *No disbursements, repayments or fees*, and say whether installments still fell due | Test (15 Aug: no events, GH₵1,600 due unpaid) |
| Stale-data and error behaviour | Loading shows skeletons, never zeros. A failed load shows an error with Retry. A failed refresh keeps the last figures with a warning naming their time | Tests; browser (`?demo=`) |

## GH₵940 versus GH₵800 collected: not traceable here

Prompt 2 asks to trace the audit's two "collected" figures to their data definitions before rendering collected amounts. **That needs the real data contracts, which this prototype doesn't have.** Instead, the dashboard shows two clearly different measures, each with a written definition:

- **Repayments received**: cash receipts recorded in the period, by payment date, including late payments on older installments.
- **Collection rate**: the amount paid toward installments that *fell due* in the period, divided by the amount due.

These two can legitimately differ. One plausible cause of the 940/800 gap is that each figure was one of these measures under the same label. That is a hypothesis, not a finding.

## Product rules to confirm

| Rule assumed in the prototype | Why it matters |
|---|---|
| Collection rate counts installments due **up to yesterday**. Today's installments are excluded until the day ends | Otherwise every morning shows today's dues as missed. Due-today work is shown under *Needs attention* instead |
| Arrears = unpaid amounts on installments due **before today** | Matches the competitor pack's fixture: GH₵100 arrears and GH₵400 to bring current can both be true |
| PAR 30 = principal outstanding on loans with any installment **more than 30 days** overdue ÷ all principal outstanding | Standard definition; the threshold and basis need confirming |
| Fees charged are shown as amounts owed, not cash, and aren't charted | Keeps the chart to cash movement only |
| The default period is the last 30 days | Not specified anywhere |

## Bugs found in the browser and fixed

| Problem | Fix |
|---|---|
| Chart labels read "4–4 Oct" (a date compared as an instant) and "26–1 Nov" | Labels compare calendar dates and name both months: "4 Oct", "26 Oct–1 Nov" |
| The period button's accessible name was "Period:Last 30 days…" | Added the missing space |
| Collection rate counted today's unpaid installments as missed | The day-end rule above |

## Checks

- `npm test`: **68 pass** (38 new: date presets and validation, the service's snapshot and period figures, chart reconciliation, the picker's commit and cancel behaviour, and the dashboard's URL, loading, error and stale states)
- `npm run typecheck`, `npm run lint` and `next build` all pass
- Browser: no horizontal scroll at 375, 768, 1024 and 1440 px; one H1. The full October flow was run by keyboard: open, type dates, Apply, then check the URL, label, cards and chart, then Back. Cancel, end-before-start, invalid link, refresh failure, slow loading and failed load were all checked too

**Limitations.** No axe or screen-reader pass. On phones the weekly chart labels are shortened with "…" (the table view has the full labels). All figures come from fictional fixtures, so no financial reconciliation against real data has been done.

---

# Prompt 1: application shell and UI foundations

Built 2 November 2026. Scope: the shell and the shared building blocks only. No module has been redesigned yet.

> **Source caveat.** The original audit file (`LoanDrift_UX_Audit_2026-11-02.md`, F01–F40) was not available. Prompt 1 names F08, F09, F12, F21 and F25. Their descriptions below come from how the companion files refer to them, not from the audit's own wording. Check them against the original before treating any as resolved.

## Audit mapping

| Finding | What the companion files say it covers | What this increment provides | Status |
|---|---|---|---|
| F08, F09 | Named in Prompt 1; content unknown here | Collapsible sidebar with Dashboard, Activities, Workspace (My Approvals, Notifications) and the Lending / Money / System groups; active-route indication; business and branch always visible in the header | Partial, needs checking against the audit |
| F12 | Raw amounts and status formatting in queues and KPIs | `lib/format.ts`: GH₵ amounts from integer minor units; other currencies led by their ISO code; one lifecycle-status mapping; `humanize` for raw enums; dates and times in branch time with "GMT" named | Foundation done; screens still to adopt it |
| F21 | Lists: one H1, task-oriented headers, consistent row actions | `PageHeader` (the only H1), `FilterToolbar`, `RowActions` (an always-visible *View loan* plus a grouped menu), `EntityRef` | Foundation done |
| F25 | Form semantics and label associations | Labelled search, filter labels tied to their controls, named icon buttons, one 2px focus style. **No form fields were built in this increment** | Partial |

### Also laid down for later findings (patterns only; the screens aren't built)

| Finding | Pattern |
|---|---|
| F04, F05 | `ScopedCount` says whose items it counts: *Waiting on you*, *Branch-wide* or *Unread alerts*. An unread alert is never presented as an unresolved task |
| F22, F45 | `EntityRef`: the loan reference is the link, with the borrower underneath, so two loans for one borrower stay distinguishable |
| F24, F46 | `RowActions`: consequential actions are grouped apart from routine ones and are disabled with a stated reason rather than silently hidden |
| F41, F49, F58 | `StateMessage` has distinct *empty*, *filtered-empty*, *unavailable*, *permission*, *error* and *loading* states. Filtered-empty offers Clear, never Create |
| F42 | `loanStatus()` shows unknown or legacy values as "Unrecognised status (…)" and never defaults them to Pending |
| F44 | The sidebar and badges say *Active*, not *Activated*. The stored enum `active` is unchanged |
| F68 | `KpiCard` and `ScopedCount` show skeletons while loading, never a premature zero |
| Brief | `sumMoney` refuses to add unlike currencies or unavailable parts. `ratio` with a zero denominator is unavailable, not 0%. Scores always name their model (legacy or current) |

## Shell behaviour (checked in a browser)

| Check | Result |
|---|---|
| No horizontal page scroll at 375, 768, 1024 and 1440 px | Pass. Tested at 375 rather than 390 because that's the browser's mobile preset |
| One H1 per page | Pass on /foundations and the placeholder routes |
| Phone drawer: opens from the menu button, focus starts on the current page's link, Escape closes it, focus returns to the button | Pass, **after two fixes** (below) |
| Phone drawer closes after choosing a destination | Pass |
| Icon-only sidebar: Loan Features queues reachable from a side menu by mouse and keyboard | Pass |
| The menu button's name follows its state (Collapse / Expand / Open navigation) with `aria-expanded` | Pass, and covered by a test |

### Bugs found and fixed during verification

| Problem | Fix |
|---|---|
| In the phone drawer, the first Escape press did nothing. A hidden-but-open sidebar tooltip swallowed it | Tooltips are only attached when the sidebar is icon-only (`useCollapsedTooltip`) |
| Closing the drawer dropped focus onto `<body>` | `onCloseAutoFocus` returns focus to the menu button |
| Opening the drawer focused "Loan Features" halfway down (Radix skips links) | `onOpenAutoFocus` focuses the current page's link |
| The branch name was truncated away at tablet width | Business and branch are now on two lines |

## Automated checks

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test`: 30 tests pass, covering formatting rules (minor units, unlike currencies, zero versus unavailable, zero denominators, timezone, statuses, scores), sidebar destinations and state, KPI loading and unavailable states, and the filtered-empty recovery in the list pattern

These aren't a full accessibility audit. No axe or screen-reader pass has been run yet.

## Assumptions to check

1. **Brand.** Colours and type come from the TroveSuite core platform prototype (blue `#2563EB`, navy `#0B4C8C`, Inter). The real LoanDrift colours and fonts weren't available. The logo is a placeholder.
2. **Navigation.** The Lending items and the nine Loan Features paths match the Phase 2 audit. The children of Money and System (Savings, Investments, Accounting, Reports, Settings, Bulk Upload) and all their paths are guesses from mentions in the audits.
3. **Light only.** The brief asks for a light interface, so there's no dark mode.
4. **Branch time** is Africa/Accra (GMT, no daylight saving).
5. **Permissions** aren't modelled yet. The shell shows every destination to everyone.

## Not done in this increment

All module screens (Dashboard onwards), URL-synced filter state (Prompt 2 needs it), a date-range picker, form-field components, the permission model, and an axe accessibility pass.

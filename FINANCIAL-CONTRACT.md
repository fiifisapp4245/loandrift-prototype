# LoanDrift financial presentation contract

Prompt 6 asks for one definition of each loan figure, used by every screen. This is that definition for the prototype.

- **Code:** `lib/domain/loan-position.ts` (`loanPosition`, `positionFromSchedule`, `previewPayment`).
- **Screens that use it:** the Dashboard (arrears, due-today and overdue counts), All Loans (progress), the loan record header, the repayment overview and the payment preview.
- **Agreement test:** `lib/__tests__/financial-contract.test.ts` checks that every screen shows the same figures for the same loan on the same as-of date.

> **Caveat.** This was traced through the **prototype's** data model, not the real LoanDrift backend, which wasn't available. The audit's contradictory values (F01–F03, F06, F31) can't be traced to their real sources here. Each definition below is the rule the prototype applies; confirm it against the real data before relying on it.

## Kinds of figure

- **Live:** calculated now from the repayment schedule, in whole pesewas (no floating point).
- **Source field:** a value the loan record states. It isn't calculated.
- **Historical snapshot:** what the system recorded at the time of an event. Never shown as a current figure.
- **Not established:** no verified rule exists, so the figure is shown as *Unavailable* with the reason. It is never estimated.

## Definitions

| Figure | Kind | Definition | Shown on |
|---|---|---|---|
| Total payable | Live | Sum of every scheduled installment (principal + interest) | Loan record, repayment overview |
| Paid | Live | Amount allocated to installments so far | Loans list, loan record, repayment overview |
| **Total balance** | Live, cross-checked | Total payable − paid. Compared with the loan record's own balance field; **if they differ, the figure is Unavailable** and the disagreement is shown | Loan record, repayment overview, payment preview |
| Principal outstanding | Source field | Principal still owed, as the loan record states it. Excludes interest, fees and penalties | Dashboard, loan record, repayment overview |
| Regular installment | Live | The installment amount when all are equal; otherwise "Installments vary" | Repayment overview, suggested amounts |
| **Past due before today** | Live | Unpaid amounts on installments due before the as-of date | Dashboard (as Arrears), loan record, repayment overview |
| **Due today** | Live | Unpaid amounts on installments due on the as-of date. Not arrears yet | Loan record, repayment overview |
| **Amount to bring current** | Live | Past due + due today | Loan record, repayment overview, suggested amounts |
| **Next scheduled date** | Live | The first unpaid installment due **after** the as-of date. Today's installment counts as "due today", not "next" | Loan record, repayment overview |
| **Oldest unpaid date** | Live | The earliest installment due on or before the as-of date that isn't fully paid, with days overdue | Repayment overview |
| Fees and penalties | Not established | Not in the source, and their treatment isn't defined | Repayment overview (Unavailable) |
| Settlement amount | Not established | The early-settlement rule (interest rebate, fees) isn't defined | Repayment overview (Unavailable) |
| Balance after a receipt | Historical snapshot | What the system recorded right after a receipt. Labelled "Balance after (at the time)" | Repayment overview, receipts table |
| Credit score | Source field | Always shown with its model ("Legacy model" or "Current model"). Scores from different scales are never compared | Loans list, loan record |
| Collection rate | Live | Paid ÷ due on installments that fell due in a period, up to yesterday. No installments due means Unavailable, not 0% | Dashboard |

## Worked example: DEMO-LN-001 as of 2 November 2026

This is the competitor pack's coherent fixture. Four weekly installments of GH₵300 make GH₵1,200 in total, and GH₵200 has been paid toward the first.

| Figure | Value |
|---|---|
| Total balance | GH₵1,000.00 |
| Regular installment | GH₵300.00 |
| Past due before today | GH₵100.00 (left on installment 1, due 26 Oct) |
| Due today | GH₵300.00 (installment 2) |
| Amount to bring current | GH₵400.00 |
| Next scheduled | GH₵300.00 on 9 Nov (installment 3) |
| Oldest unpaid | 26 Oct, 7 days overdue |

GH₵100 in arrears and GH₵400 to bring current are both correct because they are labelled differently. The audit's "GH₵100 regular installment" can't happen under this contract: the regular installment is a scheduled amount, not an unpaid remainder.

## A source disagreement, shown rather than resolved

DEMO-LN-005 (USD) has a schedule balance of USD 300.00, but its loan record says USD 1,080.00. The contract doesn't pick one:
- Total balance is **Unavailable** with both values named.
- The repayment overview shows a warning.
- Recording a payment is blocked until the disagreement is resolved.

This is how a real F01-style contradiction should appear.

## Payment preview

- **Recording only.** *Record external payment* records money already received; it never collects any. *Collect automatically* is a separate option, off because no mobile money mandate exists, and it links to the prerequisite.
- **Suggested amounts show their breakdown:**
  - To bring current: "GH₵100.00 past due + GH₵300.00 due today"
  - Regular installment
  - Total balance: "Clears the schedule. Not a settlement quote."
- **Review step:** borrower, loan, currency, amount, method, date, reference, the allocation to each installment, and the resulting total balance, amount to bring current and next scheduled date.
- **Backdating:** explained on the date field and again in the review. The payment counts from that date, so it can change which installments were late. Penalties aren't recalculated.
- **Refused:** over-payments, future dates and dates before disbursement.
- **Nothing is saved.** The final step reports "Checked, not recorded".

## Open product decisions

These need an owner's decision before the real build. The prototype either assumes the rule (marked *assumed*) or refuses to show a figure (*unavailable*).

1. **Allocation order** *(assumed)*: oldest unpaid installment first. Also undecided: the split between penalty, fee, interest and principal within an installment.
2. **Over-payments** *(refused)*: whether extra money goes to future installments, a credit balance or a refund.
3. **Fees and penalties** *(unavailable)*: whether they're part of the balance, and how they're charged and waived.
4. **Early settlement** *(unavailable)*: whether an interest rebate applies and which fees remain.
5. **Due-today cut-off** *(assumed)*: an installment is "due today", not arrears, until the day ends in branch time (GMT). The collection rate excludes today for the same reason.
6. **Backdated payments** *(explained, not recalculated)*: whether backdating reverses penalties or changes days-past-due history.
7. **Which balance is authoritative** *(unavailable when they differ)*: the schedule-derived balance or the loan record's balance field.
8. **Credit score models** *(labelled)*: whether legacy scores are converted or retired.
9. **Interest-rate wording** *(display only)*: "x% per period, as captured" is shown, but whether rates are flat or reducing-balance isn't confirmed, and no rate is calculated.

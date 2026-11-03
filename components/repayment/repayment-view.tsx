"use client"

import Link from "next/link"
import { AlertTriangle, ArrowLeft, Banknote, Smartphone } from "lucide-react"
import { Figure } from "@/components/patterns/figure"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { HealthBadge, LoanStatusBadge, StatusBadge } from "@/components/patterns/status-badge"
import { RecordPayment } from "@/components/repayment/record-payment"
import { Button } from "@/components/ui/button"
import { installmentState } from "@/lib/api/lending"
import { loanPosition, scheduleFor } from "@/lib/domain/loan-position"
import { demoLoans } from "@/lib/fixtures"
import { formatDate, formatMoney, formatMoneyValue, plural } from "@/lib/format"
import { AUTO_REPAY, demoLoanRecords, demoReceipts } from "@/lib/lending-fixtures"
import { isUnavailable, type MoneyValue } from "@/lib/types"
import { useUrlState } from "@/lib/use-url-state"

function Fact({ label, info, value, sub, emphasis }: { label: string; info: string; value: MoneyValue | string; sub?: React.ReactNode; emphasis?: boolean }) {
  const reason = typeof value !== "string" && isUnavailable(value) ? value.reason : null
  const text = typeof value === "string" ? value : formatMoneyValue(value)
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-muted/50 p-4">
      <dt className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        <InfoTip label={label}>{info}</InfoTip>
      </dt>
      <dd className={`text-xl font-semibold ${emphasis ? "text-[#6d28d9]" : ""} ${reason ? "text-base text-muted-foreground" : ""}`}>
        <Figure text={text} decimalsClassName={emphasis ? "text-[#7c3aed] opacity-100" : undefined} />
        {reason && <span className="mt-0.5 block text-xs font-normal">{reason}</span>}
        {sub && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  )
}

/**
 * Repayment overview for one loan: the canonical position, how money can be taken, the schedule
 * and the receipt history (historical snapshots clearly labelled).
 */
export function RepaymentView({ reference }: { reference: string }) {
  const url = useUrlState()
  const loan = demoLoans.find((l) => l.reference === reference)
  const position = loan && loanPosition(loan)
  const recording = url.get("record") === "1"

  if (!loan || !position) {
    return (
      <PageBody>
        <h1 className="text-2xl font-semibold">Repayment for {reference}</h1>
        <StateMessage state="unavailable" title="This loan isn't in this branch's records" />
      </PageBody>
    )
  }

  const schedule = scheduleFor(reference)
  const receipts = demoReceipts.filter((r) => r.loanRef === reference).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn) || b.receiptNo.localeCompare(a.receiptNo))
  const record = demoLoanRecords[reference]
  const canRecord = schedule.length > 0 && !isUnavailable(position.totalBalance) && position.totalBalance.minor > 0

  return (
    <PageBody>
      <header className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <Link href={`/loans/${reference}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {reference}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Repayment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{reference}</span> · {loan.borrower.name} · as of {formatDate(position.asOf)}, in {position.currency}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LoanStatusBadge status={loan.status} />
            <HealthBadge health={loan.health} />
          </div>
        </div>

        {position.conflicts.length > 0 && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-warning-subtle px-3 py-2 text-sm text-warning">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {position.conflicts.join(" ")}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
          <Fact label="Total balance" value={position.totalBalance} emphasis info="Total payable minus paid, from the live schedule. Excludes fees and penalties." />
          <Fact
            label="To bring current"
            value={position.toBringCurrent}
            info="Past due before today plus due today."
            sub={
              !isUnavailable(position.pastDue) && !isUnavailable(position.dueToday)
                ? `${formatMoney(position.pastDue)} past due + ${formatMoney(position.dueToday)} due today`
                : undefined
            }
          />
          <Fact
            label="Oldest unpaid"
            value={position.oldestUnpaid ? formatDate(position.oldestUnpaid.dueDate) : "None"}
            info="The earliest installment, due today or before, that isn't fully paid."
            sub={
              position.oldestUnpaid
                ? position.oldestUnpaid.daysOverdue === 0
                  ? "Due today"
                  : `${plural(position.oldestUnpaid.daysOverdue, "day")} overdue`
                : undefined
            }
          />
          <Fact
            label="Next scheduled"
            value={position.nextScheduled ? formatMoney(position.nextScheduled.amount) : "None"}
            info="The first installment due after today. Today's installment is counted in To bring current."
            sub={position.nextScheduled ? `Due ${formatDate(position.nextScheduled.dueDate)}` : undefined}
          />
          <Fact label="Regular installment" value={position.regularInstallment} info="The scheduled amount per installment." />
          <Fact label="Principal outstanding" value={position.principalOutstanding} info="As the loan record states it. Excludes interest, fees and penalties." />
          <Fact label="Fees and penalties" value={position.feesAndPenalties} info="Not part of the schedule." />
          <Fact label="Settlement amount" value={position.settlement} info="What it would cost to close the loan early." />
        </dl>
      </header>

      {recording ? (
        <RecordPayment position={position} borrower={loan.borrower.name} disbursedOn={record?.disbursedOn ?? null} onClose={() => url.set({ record: null })} />
      ) : (
        <section aria-labelledby="take" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h2 id="take" className="sr-only">
            Taking a payment
          </h2>
          <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6">
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-brand-subtle text-brand-subtle-foreground">
              <Banknote className="size-5" />
            </span>
            <h3 className="font-semibold">Record an external payment</h3>
            <p className="text-sm text-muted-foreground">Money already received in cash, by bank transfer, mobile money or cheque. Recording it doesn&rsquo;t collect anything.</p>
            {canRecord ? (
              <Button className="mt-auto w-fit rounded-full" onClick={() => url.set({ record: "1" })}>
                Record external payment
              </Button>
            ) : (
              <p className="mt-auto text-sm text-muted-foreground">
                {isUnavailable(position.totalBalance) ? position.totalBalance.reason : "Nothing is owed on this loan."}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6">
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Smartphone className="size-5" />
            </span>
            <h3 className="flex items-center gap-2 font-semibold">
              Collect automatically
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">Off</span>
            </h3>
            <p className="text-sm text-muted-foreground">{AUTO_REPAY.reason}</p>
            <Link href={`/clients/${loan.borrower.id}`} className="mt-auto w-fit text-sm font-medium text-primary underline-offset-4 hover:underline">
              {AUTO_REPAY.prerequisite}
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="schedule" className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="schedule" className="text-base font-semibold">
          Schedule
        </h2>
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isUnavailable(position.totalPayable) ? position.totalPayable.reason : "No schedule."}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Repayment schedule for {reference}</caption>
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">#</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Due date</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Due</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Paid</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((i) => (
                  <tr key={i.number} className="border-t">
                    <th scope="row" className="px-4 py-2.5 font-normal">{i.number}</th>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(i.dueDate)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{formatMoney(i.due)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{formatMoney(i.paid)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={installmentState(i)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="receipts" className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="receipts" className="text-base font-semibold">
          Receipts
        </h2>
        {receipts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Receipts for {reference}, newest first</caption>
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Received on</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Receipt</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Method</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      Balance after (at the time)
                      <InfoTip label="historical balance">
                        Historical: what the system recorded right after that receipt. It isn&rsquo;t today&rsquo;s balance, which is shown above.
                      </InfoTip>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.receiptNo} className="border-t">
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.receivedOn)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.receiptNo}</td>
                    <td className="px-4 py-2.5">{r.method}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium">{formatMoney(r.amount)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatMoney(r.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        <Button variant="link" asChild className="h-auto p-0 text-xs">
          <Link href={`/loans/${reference}`}>Back to the loan record</Link>
        </Button>
      </p>
    </PageBody>
  )
}

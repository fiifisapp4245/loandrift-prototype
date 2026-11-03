"use client"

import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDashed, FileText } from "lucide-react"
import { Figure } from "@/components/patterns/figure"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { HealthBadge, LoanStatusBadge, StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { describe as describeEvent, formatTime, sentenceText } from "@/lib/api/activities"
import { canSeeIdNumbers, getLoan, installmentState, maskId } from "@/lib/api/lending"
import { currentUser } from "@/lib/api/workspace"
import { COLLATERAL_STATUS, collateralForLoan } from "@/lib/api/collateral"
import { formatCount, formatDate, formatMoney, formatMoneyValue, formatScore, loanStatus } from "@/lib/format"
import { isUnavailable, type MoneyValue } from "@/lib/types"
import { useUrlState } from "@/lib/use-url-state"
import { userName } from "@/lib/workspace-fixtures"

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule & payments" },
  { id: "client", label: "Client & affordability" },
  { id: "agreement", label: "Agreement" },
  { id: "collateral", label: "Collateral" },
  { id: "documents", label: "Documents" },
  { id: "history", label: "History" },
] as const

const DISBURSED = new Set(["disbursed", "active", "defaulted", "completed", "written_off"])

function Stat({ label, value, info, emphasis }: { label: string; value: MoneyValue | string; info: string; emphasis?: boolean }) {
  const text = typeof value === "string" ? value : formatMoneyValue(value)
  const reason = typeof value !== "string" && isUnavailable(value) ? value.reason : null
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-muted/50 p-4">
      <dt className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        <InfoTip label={label}>{info}</InfoTip>
      </dt>
      <dd className={`text-xl font-semibold ${emphasis ? "text-[#6d28d9]" : ""} ${reason ? "text-muted-foreground" : ""}`}>
        <Figure text={text} decimalsClassName={emphasis ? "text-[#7c3aed] opacity-100" : undefined} />
        {reason && <span className="mt-0.5 block text-xs font-normal">{reason}</span>}
      </dd>
    </div>
  )
}

function Terms({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 divide-y rounded-2xl border sm:grid-cols-2 sm:divide-y-0">
      {rows.map(([term, value], i) => (
        <div key={term} className={`flex flex-col gap-0.5 px-4 py-3 ${i >= 2 ? "sm:border-t" : ""}`}>
          <dt className="text-xs text-muted-foreground">{term}</dt>
          <dd className="text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const NOT_CAPTURED = <span className="font-normal text-muted-foreground">Not captured yet</span>

function fileSize(kb: number) {
  return kb >= 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`
}

export function LoanDetailView({ reference }: { reference: string }) {
  const url = useUrlState()
  const data = getLoan(reference)
  const tab = TABS.some((t) => t.id === url.get("tab")) ? url.get("tab") : "overview"
  const viewer = currentUser(url.get("as") || null)

  if (!data) {
    return (
      <PageBody>
        <h1 className="text-2xl font-semibold">Loan {reference}</h1>
        <StateMessage
          state="unavailable"
          title="This loan isn't in this branch's records"
          description="Check the reference, or search All Loans."
          action={
            <Button size="sm" asChild>
              <Link href="/loans">Go to All Loans</Link>
            </Button>
          }
        />
      </PageBody>
    )
  }

  const { loan, record, financials, schedule, payments, client, otherLoans, history } = data
  const status = loanStatus(loan.status)
  const outstandingSignature = record?.signatures.some((s) => !s.signedOn)
  const preApproval = ["registered", "captured", "rejected"].includes(loan.status)

  return (
    <PageBody>
      {/* Identity stays at the top whatever tab is open. */}
      <header className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <Link href="/loans" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          All Loans
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{loan.reference}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link href={`/clients/${loan.borrower.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {loan.borrower.name}
              </Link>{" "}
              · {loan.product}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LoanStatusBadge status={loan.status} />
            <HealthBadge health={loan.health} />
            {schedule.length > 0 && (
              <Button asChild className="rounded-full">
                <Link href={`/loans/${loan.reference}/repayment`}>Repayment</Link>
              </Button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
          <Stat label={preApproval ? "Requested" : "Principal"} value={loan.principal} info={preApproval ? "Amount requested; not yet approved." : "Approved principal."} />
          <Stat label="Principal outstanding" value={loan.principalOutstanding} info="Principal still owed. Excludes interest, fees and penalties." emphasis />
          <Stat label="Total balance" value={financials.totalBalance} info="Everything still owed on the schedule: total payable minus paid. Fees and penalties aren't included." />
          <Stat label="Paid" value={financials.paid} info="Allocated to installments so far." />
          <Stat
            label="To bring current"
            value={financials.toBringCurrent}
            info={
              isUnavailable(financials.pastDue) || isUnavailable(financials.dueToday)
                ? "Past due before today plus due today."
                : `${formatMoney(financials.pastDue)} past due before today + ${formatMoney(financials.dueToday)} due today.`
            }
          />
          <Stat
            label="Next scheduled"
            value={financials.nextScheduled ? formatMoney(financials.nextScheduled.amount) : DISBURSED.has(loan.status) ? "None" : "Not scheduled"}
            info={
              financials.nextScheduled
                ? `Due ${formatDate(financials.nextScheduled.dueDate)}. The first installment due after today; today's is counted in "To bring current".`
                : "No unpaid installment is due after today."
            }
          />
        </dl>
      </header>

      <Tabs value={tab} onValueChange={(t) => url.set({ tab: t === "overview" ? null : t })}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList aria-label="Loan record sections" className="w-max">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4 rounded-3xl border bg-card p-5 sm:p-6">
          <TabsContent value="overview" className="flex flex-col gap-5">
            <h2 className="text-base font-semibold">Terms</h2>
            <Terms
              rows={[
                ["Product", loan.product],
                ["Lifecycle stage", status.label],
                [
                  "Interest rate",
                  record?.interestRate != null ? `${record.interestRate}% per ${record.frequency === "Weekly" ? "week" : "month"}, as captured` : NOT_CAPTURED,
                ],
                ["Repayment frequency", record?.frequency ?? NOT_CAPTURED],
                ["Installments", record?.installments != null ? formatCount(record.installments) : NOT_CAPTURED],
                ["Disbursed on", record?.disbursedOn ? formatDate(record.disbursedOn) : <span className="font-normal text-muted-foreground">Not disbursed</span>],
                ["Loan officer", userName(record?.officerId ?? null)],
                ["Credit score", formatScore(loan.score)],
              ]}
            />
            <div>
              <h2 className="mb-2 text-base font-semibold">Other loans for {loan.borrower.name}</h2>
              {otherLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground">None.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {otherLoans.map((o) => (
                    <li key={o.reference} className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                      <Link href={`/loans/${o.reference}`} className="font-mono font-medium text-primary underline-offset-4 hover:underline">
                        {o.reference}
                      </Link>
                      <span className="text-muted-foreground">{o.product}</span>
                      <span className="ml-auto">
                        <LoanStatusBadge status={o.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="flex flex-col gap-5">
            <h2 className="text-base font-semibold">Repayment schedule</h2>
            {schedule.length === 0 ? (
              <StateMessage state="empty" title="No schedule yet" description={isUnavailable(financials.totalPayable) ? financials.totalPayable.reason : undefined} />
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Repayment schedule for {loan.reference}</caption>
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-medium">#</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Due date</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Due</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Paid</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Left</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((i) => (
                      <tr key={i.number} className="border-t">
                        <th scope="row" className="px-4 py-2.5 font-normal tabular">{i.number}</th>
                        <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(i.dueDate)}</td>
                        <td className="px-4 py-2.5 text-right tabular">{formatMoney(i.due)}</td>
                        <td className="px-4 py-2.5 text-right tabular">{formatMoney(i.paid)}</td>
                        <td className="px-4 py-2.5 text-right tabular">{formatMoney({ minor: i.due.minor - i.paid.minor, currency: i.due.currency })}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={installmentState(i)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t font-medium">
                    <tr>
                      <th scope="row" colSpan={2} className="px-4 py-2.5 text-left">Total</th>
                      <td className="px-4 py-2.5 text-right tabular">{formatMoneyValue(financials.totalPayable)}</td>
                      <td className="px-4 py-2.5 text-right tabular">{formatMoneyValue(financials.paid)}</td>
                      <td className="px-4 py-2.5 text-right tabular">
                        {!isUnavailable(financials.totalPayable) && !isUnavailable(financials.paid)
                          ? formatMoney({ minor: financials.totalPayable.minor - financials.paid.minor, currency: financials.totalPayable.currency })
                          : "Unavailable"}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <div>
              <h2 className="mb-2 text-base font-semibold">Payments received</h2>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                      <span>{formatDate(p.on)}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.id}</span>
                      <span className="ml-auto tabular font-medium">{formatMoney(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="client" className="flex flex-col gap-5">
            <h2 className="text-base font-semibold">Client</h2>
            {client ? (
              <Terms
                rows={[
                  [
                    "Name",
                    <Link key="n" href={`/clients/${client.id}`} className="text-primary underline-offset-4 hover:underline">
                      {client.name}
                    </Link>,
                  ],
                  ["Client ID", <span key="i" className="font-mono">{client.id}</span>],
                  [
                    "Identification",
                    client.idDocument ? (
                      `${client.idDocument.type} · ${canSeeIdNumbers(viewer) ? client.idDocument.number : maskId(client.idDocument.number)}`
                    ) : (
                      <span className="font-normal text-muted-foreground">Not provided</span>
                    ),
                  ],
                  ["Primary phone", client.phone ?? <span className="font-normal text-muted-foreground">Not provided</span>],
                  ["Business", client.business ? `${client.business.name} (${client.business.type})` : <span className="font-normal text-muted-foreground">Not provided</span>],
                  ["Monthly income", client.monthlyIncome ? formatMoney(client.monthlyIncome) : <span className="font-normal text-muted-foreground">Not provided</span>],
                ]}
              />
            ) : (
              <StateMessage state="unavailable" title="Client record not found" />
            )}
            <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
              <p className="font-medium">Affordability assessment</p>
              <p className="text-muted-foreground">Not recorded in the source. This page doesn&rsquo;t calculate one from income alone.</p>
            </div>
          </TabsContent>

          <TabsContent value="agreement" className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Signatures</h2>
            {!record || record.signatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agreement has been generated yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {record.signatures.map((s) => (
                  <li key={s.party} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm">
                    {s.signedOn ? <CheckCircle2 aria-hidden className="size-4 text-success" /> : <CircleDashed aria-hidden className="size-4 text-warning" />}
                    <span className="font-medium">{s.party}</span>
                    <span className="ml-auto text-muted-foreground">{s.signedOn ? `Signed ${formatDate(s.signedOn)}` : "Outstanding"}</span>
                  </li>
                ))}
              </ul>
            )}
            {outstandingSignature && DISBURSED.has(loan.status) && (
              <p className="flex items-start gap-2 rounded-xl bg-warning-subtle px-3 py-2 text-sm text-warning">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                Recorded as disbursed while a signature is outstanding. Check this against the product&rsquo;s signing rule.
              </p>
            )}
          </TabsContent>

          <TabsContent value="collateral" className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Collateral</h2>
            {collateralForLoan(loan.reference).length === 0 ? (
              <p className="text-sm text-muted-foreground">No collateral recorded for this loan.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {collateralForLoan(loan.reference).map((c) => (
                  <li key={c.ref} className="flex flex-col gap-1 rounded-2xl border p-4 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{c.ref}</span>
                    <span className="font-medium">{c.description}</span>
                    <span>
                      <span className="font-semibold tabular">{formatMoney(c.valueUsed.value)}</span>{" "}
                      <span className="text-muted-foreground">
                        · {c.valueUsed.basis}, {formatDate(c.valueUsed.on)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {COLLATERAL_STATUS[c.status].label} · {c.lien ? `Lien recorded (${c.lien.registry})` : "No lien recorded"}
                    </span>
                    <Link href={`/collateral?asset=${c.ref}`} className="w-fit text-primary underline underline-offset-2">
                      Open in the collateral register
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="documents" className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Documents</h2>
            {!record || record.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {record.documents.map((d) => (
                  <li key={d.title} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <FileText className="size-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.kind} · {fileSize(d.sizeKb)} · added {formatDate(d.addedOn)}
                      </span>
                    </span>
                    <Button variant="outline" size="sm" disabled title="Not in this prototype">
                      View
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded for this loan in the last 90 days.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {history.map((e) => {
                  const s = describeEvent(e)
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/activities?event=${e.id}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl border px-3 py-2.5 text-sm hover:bg-muted/60"
                        aria-label={`${sentenceText(s)}, ${formatDate(e.occurred_at)}`}
                      >
                        <span>
                          <span className="font-medium">{s.actor}</span> {s.verb} {s.amount && <span className="font-medium tabular">{s.amount}</span>}
                          {s.context && <span className="text-muted-foreground"> · {s.context}</span>}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDate(e.occurred_at)}, {formatTime(e.occurred_at)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </PageBody>
  )
}

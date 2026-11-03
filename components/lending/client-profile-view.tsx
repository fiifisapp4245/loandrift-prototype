"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { canSeeIdNumbers, clientHistory, clientStatusFor, getClient, maskId } from "@/lib/api/lending"
import { currentUser } from "@/lib/api/workspace"
import { formatDate, formatMoney, formatMoneyValue } from "@/lib/format"
import { isUnavailable, type MoneyValue } from "@/lib/types"
import { useUrlState } from "@/lib/use-url-state"
import { userName } from "@/lib/workspace-fixtures"

const NOT_PROVIDED = <span className="font-normal text-muted-foreground">Not provided</span>
const PRE_APPROVAL = new Set(["registered", "captured", "rejected"])

function Money({ value }: { value: MoneyValue }) {
  return isUnavailable(value) ? (
    <span className="font-normal text-muted-foreground" title={value.reason}>
      Unavailable
    </span>
  ) : (
    <span className="tabular">{formatMoneyValue(value)}</span>
  )
}

export function ClientProfileView({ id }: { id: string }) {
  const url = useUrlState()
  const client = getClient(id)
  const viewer = currentUser(url.get("as") || null)

  if (!client) {
    return (
      <PageBody>
        <h1 className="text-2xl font-semibold">Client {id}</h1>
        <StateMessage
          state="unavailable"
          title="This client isn't in this branch's records"
          action={
            <Button size="sm" asChild>
              <Link href="/clients">Go to Clients</Link>
            </Button>
          }
        />
      </PageBody>
    )
  }

  const history = clientHistory(id)
  const fullId = canSeeIdNumbers(viewer)

  return (
    <PageBody>
      <header className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6">
        <Link href="/clients" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Clients
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{client.id}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{clientStatusFor(client)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled title="Not in this prototype" className="rounded-full">
              Edit details
            </Button>
            <Button asChild className="rounded-full">
              <Link href={`/loans/new?client=${client.id}`}>New application</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section aria-labelledby="details" className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6 xl:col-span-5">
          <h2 id="details" className="text-base font-semibold">
            Details
          </h2>
          <dl className="divide-y text-sm">
            {(
              [
                ["Primary phone", client.phone ?? NOT_PROVIDED],
                ["Email", client.email ?? NOT_PROVIDED],
                [
                  "Identification",
                  client.idDocument ? (
                    <span className="flex items-center gap-1">
                      {client.idDocument.type} · <span className="font-mono">{fullId ? client.idDocument.number : maskId(client.idDocument.number)}</span>
                      {!fullId && <InfoTip label="masked ID">Shown in full to branch managers, supervisors and analysts.</InfoTip>}
                    </span>
                  ) : (
                    NOT_PROVIDED
                  ),
                ],
                ["Business", client.business ? `${client.business.name} (${client.business.type})` : NOT_PROVIDED],
                ["Monthly income", client.monthlyIncome ? formatMoney(client.monthlyIncome) : NOT_PROVIDED],
                ["Town", client.town ?? NOT_PROVIDED],
                ["Registered", formatDate(client.registeredOn)],
                ["Loan officer", userName(client.officerId)],
              ] as [string, React.ReactNode][]
            ).map(([term, value]) => (
              <div key={term} className="grid grid-cols-[8rem_1fr] gap-3 py-2">
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="min-w-0 font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="loans" className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="loans" className="text-base font-semibold">
              Loan history
            </h2>
            {history.loans.length > 0 && (
              <p className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">Repaid in full:</span>
                <span className="font-medium">
                  {isUnavailable(history.completion) ? "No closed loans yet" : `${history.repaidCount} of ${history.closedCount} closed loans`}
                </span>
                <InfoTip label="repaid in full">
                  Completed loans ÷ closed loans (completed or written off). Loans still running aren&rsquo;t counted either way.
                </InfoTip>
              </p>
            )}
          </div>

          {history.loans.length === 0 ? (
            <StateMessage state="empty" title="No loans yet" description="This client hasn't applied for a loan." />
          ) : (
            <ul className="flex flex-col gap-3">
              {history.loans.map(({ loan, status, financials }) => (
                <li key={loan.reference} className="flex flex-col gap-3 rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/loans/${loan.reference}`} className="font-mono font-medium text-primary underline-offset-4 hover:underline">
                      {loan.reference}
                    </Link>
                    <span className="text-sm text-muted-foreground">{loan.product}</span>
                    <span className="ml-auto">
                      <StatusBadge status={status} />
                    </span>
                  </div>
                  {/* Principal, total payable and paid are separate figures, never one "Approved" amount (F43). */}
                  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">{PRE_APPROVAL.has(loan.status) ? "Requested" : "Approved principal"}</dt>
                      <dd className="font-medium">
                        <Money value={loan.principal} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Total payable</dt>
                      <dd className="font-medium">
                        <Money value={financials.totalPayable} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Paid</dt>
                      <dd className="font-medium">
                        <Money value={financials.paid} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Principal outstanding</dt>
                      <dd className="font-medium">
                        <Money value={loan.principalOutstanding} />
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageBody>
  )
}

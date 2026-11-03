"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { AccountDrawer } from "@/components/collections/account-drawer"
import { EntityRef } from "@/components/patterns/entity-ref"
import { FilterSelect, optionLabel } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AGES, CHANNELS, OUTCOMES, PROMISE_STATUS, contactsVersion, fetchAccounts, promiseStatus, subscribeContacts } from "@/lib/api/collections"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatCount, formatDate, formatMoney, formatMoneyValue } from "@/lib/format"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"

const AGE_OPTIONS = AGES.map((a) => ({ value: a.value, label: a.label }))
const PROMISE_OPTIONS = [
  { value: "open", label: "Open promise" },
  { value: "broken", label: "Broken promise" },
  { value: "kept", label: "Kept promise" },
  { value: "none", label: "No promise yet" },
]

/**
 * Collections (B2-06, F58, F59). Accounts with something past due, oldest first. The branch totals
 * describe every account in arrears and never change with the filters; the result count does.
 */
export function CollectionsView() {
  const url = useUrlState()
  const q = url.get("q")
  const age = url.get("age")
  const promise = url.get("promise")
  const openRef = url.get("account")
  const demo = url.get("demo")
  const sim = demo === "slow" || demo === "error" ? demo : "none"
  // Re-query after a contact is logged (mocked, in memory).
  const version = useSyncExternalStore(subscribeContacts, contactsVersion, () => 0)

  const filters = { q, age, promise }
  const list = useQuery(`collections:${JSON.stringify(filters)}:${sim}:${version}`, () => fetchAccounts(filters, sim))
  const data = list.data

  const ageLabel = age ? optionLabel(AGE_OPTIONS, age) : ""
  const active: ActiveFilter[] = [
    age && { id: "age", label: "Overdue", value: ageLabel },
    promise && { id: "promise", label: "Promise", value: optionLabel(PROMISE_OPTIONS, promise) },
  ].filter(Boolean) as ActiveFilter[]
  const setFilter = (patch: Record<string, string | null>) => url.set(patch)
  const clearAll = () => setFilter({ q: null, age: null, promise: null })
  const filtered = active.length > 0 || q.trim().length > 0
  const onlyAge = !!age && !promise && !q.trim()

  return (
    <PageBody>
      <PageHeader eyebrow="Lending" title="Collections" />

      {!data && !list.error && (
        <div aria-hidden className="grid grid-cols-1 gap-2.5 rounded-3xl border bg-card p-5 sm:grid-cols-3 sm:p-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}
      {data && (
        <section aria-labelledby="branch-totals" className="rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-1">
            <h2 id="branch-totals" className="text-base font-semibold">
              Branch totals
            </h2>
            <InfoTip label="branch totals">
              Every account in this branch with something past due, as of {formatDate(DEMO_TODAY)}. These don&rsquo;t change when you search or
              filter the list below.
            </InfoTip>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/50 px-4 py-3">
              <dt className="text-xs text-muted-foreground">Accounts in arrears</dt>
              <dd className="font-semibold tabular">{formatCount(data.branch.accounts)}</dd>
            </div>
            <div className="rounded-2xl bg-muted/50 px-4 py-3">
              <dt className="text-xs text-muted-foreground">Past due</dt>
              <dd className="font-semibold tabular">
                {data.branch.pastDue.length ? data.branch.pastDue.map((m) => formatMoney(m)).join(" and ") : formatMoney({ minor: 0, currency: "GHS" })}
              </dd>
              <dd className="text-xs text-muted-foreground">Unpaid on installments already due. Not the total balance.</dd>
            </div>
            <div className="rounded-2xl bg-muted/50 px-4 py-3">
              <dt className="text-xs text-muted-foreground">Open promises</dt>
              <dd className="font-semibold tabular">{formatCount(data.branch.openPromises)}</dd>
            </div>
          </dl>
        </section>
      )}

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Accounts to follow up</h2>
        <FilterToolbar
          searchLabel="Search accounts"
          searchPlaceholder="Loan reference or borrower"
          search={q}
          onSearchChange={(v) => setFilter({ q: v })}
          active={active}
          onRemove={(id) => setFilter({ [id]: null })}
          onClearAll={clearAll}
          resultCount={data ? data.total : null}
          totalCount={data?.branch.accounts}
          noun={data?.total === 1 ? "account" : "accounts"}
          filters={
            <>
              <FilterSelect label="Days overdue" value={age} onChange={(v) => setFilter({ age: v })} options={AGE_OPTIONS} className="w-40" />
              <FilterSelect label="Promise" value={promise} onChange={(v) => setFilter({ promise: v })} options={PROMISE_OPTIONS} className="w-44" />
            </>
          }
        />

        {list.error ? (
          <StateMessage state="error" title="Couldn't load collections" description={list.error.message} onRetry={list.refetch} />
        ) : !data ? (
          <div className="flex flex-col gap-2" aria-busy>
            <span className="sr-only">Loading accounts</span>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : data.total === 0 ? (
          filtered ? (
            <StateMessage
              state="filtered-empty"
              title={onlyAge ? `No accounts ${ageLabel} overdue` : "No accounts match these filters"}
              description={`The branch still has ${data.branch.accounts} ${data.branch.accounts === 1 ? "account" : "accounts"} in arrears; ${data.branch.accounts === 1 ? "it isn't" : "they aren't"} in this view.`}
              action={
                <Button size="sm" onClick={() => (onlyAge ? setFilter({ age: null }) : clearAll())}>
                  {onlyAge ? "Reset days overdue" : "Clear filters"}
                </Button>
              }
            />
          ) : (
            <StateMessage state="empty" title="No accounts in arrears" description={`Nothing is past due as of ${formatDate(DEMO_TODAY)}.`} />
          )
        ) : (
          <div className="relative rounded-2xl border">
            <Table>
              <TableCaption className="sr-only">Accounts with something past due, most overdue first</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Loan</TableHead>
                  <TableHead scope="col">Overdue</TableHead>
                  <TableHead scope="col" className="text-right">
                    Past due
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Total balance
                  </TableHead>
                  <TableHead scope="col">Last contact</TableHead>
                  <TableHead scope="col">Promise</TableHead>
                  <TableHead scope="col" className="sticky right-0 bg-card shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                    <span className="sr-only">Follow up</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((a) => {
                  const ps = a.openPromise ? promiseStatus(a.openPromise) : null
                  return (
                    <TableRow key={a.ref}>
                      <TableCell>
                        <EntityRef reference={a.ref} href={`/loans/${a.ref}/repayment`} context={a.borrower} />
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <span className="block font-medium">{a.daysOverdue} days</span>
                        <span className="block text-xs text-muted-foreground">since {formatDate(a.oldestDue)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="block font-semibold whitespace-nowrap tabular">{formatMoneyValue(a.position.pastDue)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {a.pastDueInstallments} {a.pastDueInstallments === 1 ? "installment" : "installments"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm whitespace-nowrap tabular">{formatMoneyValue(a.position.totalBalance)}</TableCell>
                      <TableCell className="text-sm">
                        {a.lastContact ? (
                          <>
                            <span className="block whitespace-nowrap">{formatDate(a.lastContact.at.slice(0, 10))}</span>
                            <span className="block text-xs text-muted-foreground">
                              {CHANNELS[a.lastContact.channel]}: {OUTCOMES[a.lastContact.outcome].label}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No contact yet</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.openPromise?.promise && ps ? (
                          <>
                            <StatusBadge status={{ label: PROMISE_STATUS.open.label, tone: "info", description: "" }} />
                            <span className="mt-1 block text-xs whitespace-nowrap text-muted-foreground">
                              {formatMoney(a.openPromise.promise.amount)} by {formatDate(a.openPromise.promise.by)}
                            </span>
                          </>
                        ) : a.promiseState === "broken" ? (
                          <StatusBadge status={{ label: "Last one broken", tone: "danger", description: "" }} />
                        ) : (
                          <span className="text-muted-foreground">None open</span>
                        )}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-card text-right shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={url.href({ account: a.ref })} scroll={false} data-account-ref={a.ref} aria-label={`Follow up ${a.ref}`}>
                            Follow up
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {openRef && <AccountDrawer key={openRef} loanRef={openRef} onClose={() => url.set({ account: null })} />}
    </PageBody>
  )
}

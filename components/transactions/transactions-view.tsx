"use client"

import Link from "next/link"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { EntityRef } from "@/components/patterns/entity-ref"
import { FilterSelect, optionLabel } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { Pager } from "@/components/patterns/pager"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { DirectionTag } from "@/components/transactions/direction-tag"
import { TransactionDrawer } from "@/components/transactions/transaction-drawer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DIRECTIONS, TX_TYPES, fetchTransactions, type Simulation, type Transaction } from "@/lib/api/transactions"
import { parseRangeParams, rangeLabel } from "@/lib/date-range"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatCount, formatDate, formatDateTime, formatMoney } from "@/lib/format"
import { formatTime } from "@/lib/api/activities"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"

const TYPE_OPTIONS = Object.entries(TX_TYPES).map(([value, t]) => ({ value, label: t.label }))
const DIRECTION_OPTIONS = Object.entries(DIRECTIONS).map(([value, label]) => ({ value, label }))

/** Effective date, with the recorded time underneath: the full timestamp when it's a different day. */
function When({ t }: { t: Transaction }) {
  const sameDay = new Date(t.recordedAt).toISOString().slice(0, 10) === t.effectiveOn
  return (
    <>
      <span className="block whitespace-nowrap">{formatDate(t.effectiveOn)}</span>
      <span className={sameDay ? "block text-xs text-muted-foreground" : "block text-xs text-warning"}>
        Recorded {sameDay ? formatTime(t.recordedAt) : formatDateTime(t.recordedAt)}
      </span>
    </>
  )
}

export function TransactionsView() {
  const url = useUrlState()
  const q = url.get("q")
  const type = url.get("type")
  const direction = url.get("money")
  const hasRange = !!(url.get("from") || url.get("to"))
  const parsed = parseRangeParams({ from: url.get("from") || undefined, to: url.get("to") || undefined }, DEMO_TODAY)
  const range = hasRange && !parsed.invalidUrl ? parsed.range : null
  const page = Math.max(1, Number(url.get("page")) || 1)
  const openId = url.get("tx")
  const demo = url.get("demo")
  const sim: Simulation = demo === "slow" || demo === "error" ? demo : "none"

  const filters = { q, type, direction, range, page }
  const list = useQuery(`tx:${JSON.stringify(filters)}:${sim}`, () => fetchTransactions(filters, sim))
  const data = list.data

  const active: ActiveFilter[] = [
    type && { id: "type", label: "Type", value: optionLabel(TYPE_OPTIONS, type) },
    direction && { id: "money", label: "Money", value: optionLabel(DIRECTION_OPTIONS, direction) },
    range && { id: "period", label: "Period", value: rangeLabel(range, DEMO_TODAY) },
  ].filter(Boolean) as ActiveFilter[]
  const setFilter = (patch: Record<string, string | null>) => url.set({ ...patch, page: null })
  const clearAll = () => setFilter({ q: null, type: null, money: null, from: null, to: null })
  const filtered = active.length > 0 || q.trim().length > 0

  return (
    <PageBody>
      <PageHeader eyebrow="Lending" title="Transactions" />

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <h2 className="text-base font-semibold">Branch ledger</h2>
            <InfoTip label="the ledger">
              Every disbursement, repayment, charge and waiver, newest first. Charges and waivers are adjustments: they change what a borrower owes,
              but no cash moves.
            </InfoTip>
          </div>
          <DateRangePicker
            value={range}
            today={DEMO_TODAY}
            onApply={(r) => setFilter({ from: r.from, to: r.to })}
            onClear={() => setFilter({ from: null, to: null })}
          />
        </div>

        <FilterToolbar
          searchLabel="Search transactions"
          searchPlaceholder="Reference, loan or borrower"
          search={q}
          onSearchChange={(v) => setFilter({ q: v })}
          active={active}
          onRemove={(id) => (id === "period" ? setFilter({ from: null, to: null }) : setFilter({ [id]: null }))}
          onClearAll={clearAll}
          resultCount={data ? data.total : null}
          totalCount={data?.ledgerTotal}
          noun={data?.total === 1 ? "transaction" : "transactions"}
          filters={
            <>
              <FilterSelect label="Type" value={type} onChange={(v) => setFilter({ type: v })} options={TYPE_OPTIONS} className="w-44" />
              <FilterSelect label="Money" value={direction} onChange={(v) => setFilter({ money: v })} options={DIRECTION_OPTIONS} className="w-52" />
            </>
          }
        />

        {/* Totals cover every matching row, not this page; cash and adjustments are never added together. */}
        {data && data.total > 0 && (
          <section aria-label="Totals for matching transactions">
          <dl className="grid grid-cols-2 gap-2.5 text-sm md:grid-cols-4">
            {(
              [
                ["Cash in", data.totals.cashIn],
                ["Cash out", data.totals.cashOut],
                ["Charged (not cash)", data.totals.charged],
                ["Waived (not cash)", data.totals.waived],
              ] as const
            ).map(([label, m]) => (
              <div key={label} className="rounded-2xl bg-muted/50 px-4 py-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="tabular font-semibold">{formatMoney(m)}</dd>
              </div>
            ))}
          </dl>
            <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              Totals for all {formatCount(data.total)} matching transactions, in cedis.
              {data.totals.otherCurrencies.length > 0 && <> {data.totals.otherCurrencies.join(", ")} transactions are listed but not added.</>}
            </p>
          </section>
        )}

        {list.error ? (
          <StateMessage state="error" title="Couldn't load transactions" description={list.error.message} onRetry={list.refetch} />
        ) : !data ? (
          <div className="flex flex-col gap-2" aria-busy>
            <span className="sr-only">Loading transactions</span>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : data.total === 0 ? (
          filtered ? (
            <StateMessage
              state="filtered-empty"
              title={type ? `No ${optionLabel(TYPE_OPTIONS, type).toLowerCase()} transactions match` : "No transactions match these filters"}
              description="The search and filters cover the whole ledger, not just one page."
              action={
                <Button size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <StateMessage state="empty" title="No transactions yet" />
          )
        ) : (
          <>
            <div className="relative rounded-2xl border">
              <Table>
                <TableCaption className="sr-only">
                  Transactions, newest first, page {data.page} of {data.pageCount}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Type</TableHead>
                    <TableHead scope="col">Loan</TableHead>
                    <TableHead scope="col" className="text-right">Amount</TableHead>
                    <TableHead scope="col">Reference</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    {/* Pinned, so identity and the detail action stay visible however wide the table gets (F50). */}
                    <TableHead scope="col" className="sticky right-0 bg-card shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                      <span className="sr-only">Details</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">
                        <When t={t} />
                      </TableCell>
                      <TableCell>
                        <span className="block text-sm font-medium">{TX_TYPES[t.type].label}</span>
                        <DirectionTag direction={t.direction} className="mt-1" />
                      </TableCell>
                      <TableCell>
                        <EntityRef reference={t.loanRef} href={`/loans/${t.loanRef}`} context={t.borrower} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular font-medium whitespace-nowrap">{formatMoney(t.amount)}</span>
                        {t.method && <span className="block text-xs text-muted-foreground">{t.method}</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{t.ref}</TableCell>
                      <TableCell>
                        <StatusBadge status={{ label: t.status, tone: "success", description: "" }} />
                      </TableCell>
                      <TableCell className="sticky right-0 bg-card text-right shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={url.href({ tx: t.id })} scroll={false} data-tx-id={t.id} aria-label={`View ${t.ref}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pager page={data.page} pageCount={data.pageCount} href={(p) => url.href({ page: p === 1 ? null : String(p) })} prevLabel="Newer" nextLabel="Older" />
          </>
        )}
      </div>

      {openId && <TransactionDrawer id={openId} txHref={(id) => url.href({ tx: id })} onClose={() => url.set({ tx: null })} />}
    </PageBody>
  )
}

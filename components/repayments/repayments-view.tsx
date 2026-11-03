"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { ReceiptDrawer } from "@/components/repayments/receipt-drawer"
import { EntityRef } from "@/components/patterns/entity-ref"
import { FilterSelect } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { Pager } from "@/components/patterns/pager"
import { StateMessage } from "@/components/patterns/state-message"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calendarDays } from "@/lib/api/calendar"
import { METHODS, fetchReceipts, type ReceiptSummary, type Simulation } from "@/lib/api/repayments"
import { parseRangeParams, rangeLabel } from "@/lib/date-range"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatCount, formatDate, formatDateTime, formatMoney } from "@/lib/format"
import { formatTime } from "@/lib/api/activities"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"

const METHOD_OPTIONS = METHODS.map((m) => ({ value: m, label: m }))

function Summary({ s, scope }: { s: ReceiptSummary; scope: string }) {
  const received = s.received.length ? s.received.map((x) => formatMoney(x)).join(" and ") : formatMoney({ minor: 0, currency: "GHS" })
  return (
    <section aria-label={`Totals for ${scope}`}>
      <dl className="grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <dt className="text-xs text-muted-foreground">Received</dt>
          <dd className="font-semibold tabular">{received}</dd>
        </div>
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <dt className="text-xs text-muted-foreground">Receipts</dt>
          <dd className="font-semibold tabular">{formatCount(s.count)}</dd>
        </div>
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <dt className="text-xs text-muted-foreground">Loans paid toward</dt>
          <dd className="font-semibold tabular">{formatCount(s.loans)}</dd>
        </div>
      </dl>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        Totals for {scope}, all pages.{s.received.length > 1 && " Each currency is totalled on its own."} No balance is totalled here.
        <InfoTip label="why there's no balance total">
          Each receipt records the loan&rsquo;s balance just after it was paid. Adding those snapshots up would count the same loan several
          times, so it isn&rsquo;t anyone&rsquo;s current balance. Current balances are on each loan record and the dashboard.
        </InfoTip>
      </p>
    </section>
  )
}

/**
 * Repayments (B2-05, F53–F57): money received, nothing else. *Received today* is the business
 * date; *Payment history* is every receipt, today included. Installments that are due belong to the
 * schedule, so this page links to the Calendar for them instead of listing them.
 */
export function RepaymentsView() {
  const url = useUrlState()
  const tab = url.get("tab") === "history" ? "history" : "today"
  const q = url.get("q")
  const method = url.get("method")
  const hasRange = !!(url.get("from") || url.get("to"))
  const parsed = parseRangeParams({ from: url.get("from") || undefined, to: url.get("to") || undefined }, DEMO_TODAY)
  const range = tab === "history" && hasRange && !parsed.invalidUrl ? parsed.range : null
  const page = Math.max(1, Number(url.get("page")) || 1)
  const openReceipt = url.get("receipt")
  const demo = url.get("demo")
  const sim: Simulation = demo === "slow" || demo === "error" ? demo : "none"

  const filters = { tab, q, method, range, page }
  const list = useQuery(`receipts:${JSON.stringify(filters)}:${sim}`, () => fetchReceipts(filters, sim))
  const data = list.data

  const active: ActiveFilter[] = [
    method && { id: "method", label: "Method", value: method },
    range && { id: "period", label: "Received", value: rangeLabel(range, DEMO_TODAY) },
  ].filter(Boolean) as ActiveFilter[]
  const setFilter = (patch: Record<string, string | null>) => url.set({ ...patch, page: null })
  const clearAll = () => setFilter({ q: null, method: null, from: null, to: null })
  const filtered = active.length > 0 || q.trim().length > 0

  const today = calendarDays([DEMO_TODAY])[0]
  const dueToday = today.scheduled.filter((x) => x.state === "due_today")
  const todayLabel = formatDate(DEMO_TODAY)
  const scope = filtered ? "the matching receipts" : tab === "today" ? `receipts received today (${todayLabel})` : "every receipt on record"

  const panel = (
    <div className="flex flex-col gap-4">
      {tab === "today" && dueToday.length > 0 && (
        <Link href="/calendar" className="flex flex-col gap-2 rounded-2xl border bg-warning-subtle px-4 py-3 text-sm hover:bg-warning-subtle/70 sm:flex-row sm:items-center">
          <span className="flex-1">
            <span className="font-medium">
              {dueToday.length} {dueToday.length === 1 ? "installment is" : "installments are"} due today.
            </span>{" "}
            That&rsquo;s what&rsquo;s expected; this page shows only what&rsquo;s been received.
          </span>
          <span className="flex items-center gap-1 font-medium whitespace-nowrap text-primary">
            See due today in Calendar <ArrowRight aria-hidden className="size-4" />
          </span>
        </Link>
      )}

      <FilterToolbar
        searchLabel="Search receipts"
        searchPlaceholder="Receipt, loan, borrower or payer reference"
        search={q}
        onSearchChange={(v) => setFilter({ q: v })}
        active={active}
        onRemove={(id) => (id === "period" ? setFilter({ from: null, to: null }) : setFilter({ [id]: null }))}
        onClearAll={clearAll}
        resultCount={data ? data.total : null}
        totalCount={data?.tabTotal}
        noun={data?.total === 1 ? "receipt" : "receipts"}
        filters={
          <>
            <FilterSelect label="Method" value={method} onChange={(v) => setFilter({ method: v })} options={METHOD_OPTIONS} className="w-44" />
            {tab === "history" && (
              <DateRangePicker
                label="Received"
                value={range}
                today={DEMO_TODAY}
                onApply={(r) => setFilter({ from: r.from, to: r.to })}
                onClear={() => setFilter({ from: null, to: null })}
              />
            )}
          </>
        }
      />

      {data && <Summary s={data.summary} scope={scope} />}

      {list.error ? (
        <StateMessage state="error" title="Couldn't load receipts" description={list.error.message} onRetry={list.refetch} />
      ) : !data ? (
        <div className="flex flex-col gap-2" aria-busy>
          <span className="sr-only">Loading receipts</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : data.total === 0 ? (
        filtered ? (
          <StateMessage
            state="filtered-empty"
            title="No receipts match these filters"
            description={tab === "today" ? "Only today's receipts are searched here. Payment history covers every receipt." : "The search covers every receipt, not just one page."}
            action={
              <Button size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : tab === "today" ? (
          <StateMessage
            state="empty"
            title={`No receipts recorded today (${todayLabel})`}
            description="That means nothing has been received yet, not that nothing is due."
            action={
              <Button size="sm" variant="outline" asChild>
                <Link href={url.href({ tab: "history" })}>See payment history</Link>
              </Button>
            }
          />
        ) : (
          <StateMessage state="empty" title="No receipts on record" />
        )
      ) : (
        <>
          <div className="relative rounded-2xl border">
            <Table>
              <TableCaption className="sr-only">
                {tab === "today" ? "Receipts received today" : "Payment history"}, newest first, page {data.page} of {data.pageCount}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Received</TableHead>
                  <TableHead scope="col">Receipt</TableHead>
                  <TableHead scope="col">Loan</TableHead>
                  <TableHead scope="col" className="text-right">
                    Amount
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Balance after this receipt
                    <span className="block text-xs font-normal text-muted-foreground">Historical</span>
                  </TableHead>
                  <TableHead scope="col" className="sticky right-0 bg-card shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                    <span className="sr-only">Receipt preview</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.receiptNo}>
                    <TableCell className="text-sm">
                      <span className="block whitespace-nowrap">{formatDate(r.receivedOn)}</span>
                      <span className="block text-xs text-muted-foreground">
                        Recorded {r.recordedAt.slice(0, 10) === r.receivedOn ? formatTime(r.recordedAt) : formatDateTime(r.recordedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{r.receiptNo}</TableCell>
                    <TableCell>
                      <EntityRef reference={r.loanRef} href={`/loans/${r.loanRef}/repayment`} context={r.borrower} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="block font-medium whitespace-nowrap tabular">{formatMoney(r.amount)}</span>
                      {r.method && <span className="block text-xs text-muted-foreground">{r.method}</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap tabular">
                      {r.balanceAfter ? formatMoney(r.balanceAfter) : <span className="text-muted-foreground">Not recorded</span>}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-card text-right shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={url.href({ receipt: r.receiptNo })} scroll={false} data-receipt-no={r.receiptNo} aria-label={`View receipt ${r.receiptNo}`}>
                          View receipt
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
  )

  return (
    <PageBody>
      <PageHeader eyebrow="Lending" title="Repayments" />

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-1">
          <h2 className="text-base font-semibold">Money received</h2>
          <InfoTip label="repayments">
            Recorded receipts only. What&rsquo;s due is in each loan&rsquo;s schedule and the Calendar. Payment history includes today.
          </InfoTip>
        </div>
        <Tabs value={tab} onValueChange={(t) => url.set({ tab: t === "today" ? null : t, page: null, from: null, to: null, receipt: null })}>
          <TabsList aria-label="Which receipts">
            <TabsTrigger value="today">Received today</TabsTrigger>
            <TabsTrigger value="history">Payment history</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-4">
            {tab === "today" && panel}
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            {tab === "history" && panel}
          </TabsContent>
        </Tabs>
      </div>

      {openReceipt && (
        <ReceiptDrawer receiptNo={openReceipt} fail={demo === "receipt-error"} onClose={() => url.set({ receipt: null })} />
      )}
    </PageBody>
  )
}

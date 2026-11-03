"use client"

import Link from "next/link"
import { AssetDrawer } from "@/components/collateral/asset-drawer"
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
import { ASSET_TYPES, COLLATERAL_STATUS, EXCEPTIONS, fetchAssets, type coverage } from "@/lib/api/collateral"
import { formatCount, formatDate, formatMoney } from "@/lib/format"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"
import { cn } from "@/lib/utils"

const TYPE_OPTIONS = Object.entries(ASSET_TYPES).map(([value, label]) => ({ value, label }))
const STATUS_OPTIONS = Object.entries(COLLATERAL_STATUS).map(([value, s]) => ({ value, label: s.label }))
const EXCEPTION_OPTIONS = Object.entries(EXCEPTIONS).map(([value, x]) => ({ value, label: x.label }))

function Totals({ part }: { part: ReturnType<typeof coverage>["valued"] }) {
  if (part.counted === 0) return <span className="text-muted-foreground">None recorded</span>
  return <>{part.totals.map((m) => formatMoney(m)).join(" and ")}</>
}

/**
 * Collateral register (B2-07, F60–F62). Every value names its currency and basis. Exceptions are
 * their own labelled queues, each a filter that opens just the affected assets.
 */
export function CollateralView() {
  const url = useUrlState()
  const q = url.get("q")
  const type = url.get("type")
  const status = url.get("status")
  const exception = url.get("exception")
  const openRef = url.get("asset")
  const demo = url.get("demo")
  const sim = demo === "slow" || demo === "error" ? demo : "none"

  const filters = { q, type, status, exception }
  const list = useQuery(`collateral:${JSON.stringify(filters)}:${sim}`, () => fetchAssets(filters, sim))
  const data = list.data

  const active: ActiveFilter[] = [
    exception && { id: "exception", label: "Exception", value: optionLabel(EXCEPTION_OPTIONS, exception) },
    type && { id: "type", label: "Type", value: optionLabel(TYPE_OPTIONS, type) },
    status && { id: "status", label: "Status", value: optionLabel(STATUS_OPTIONS, status) },
  ].filter(Boolean) as ActiveFilter[]
  const setFilter = (patch: Record<string, string | null>) => url.set(patch)
  const clearAll = () => setFilter({ q: null, type: null, status: null, exception: null })
  const filtered = active.length > 0 || q.trim().length > 0

  return (
    <PageBody>
      <PageHeader
        eyebrow="Lending"
        title="Collateral"
        actions={
          <Button asChild className="rounded-full">
            <Link href="/collateral/new">Register an asset</Link>
          </Button>
        }
      />

      {data ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section aria-labelledby="exceptions" className="rounded-3xl border bg-card p-5 sm:p-6">
            <h2 id="exceptions" className="text-base font-semibold">
              Needs attention
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {data.exceptions.map((x) => (
                <li key={x.id}>
                  <Link
                    href={url.href({ exception: x.id, type: null, status: null, q: null })}
                    scroll={false}
                    aria-current={exception === x.id ? "true" : undefined}
                    className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm hover:bg-muted/60", exception === x.id && "border-primary bg-brand-subtle")}
                  >
                    <span className="min-w-6 text-lg leading-tight font-semibold tabular">{formatCount(x.count)}</span>
                    <span>
                      <span className="block font-medium">{x.label}</span>
                      <span className="block text-xs text-muted-foreground">{x.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="coverage" className="rounded-3xl border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-1">
              <h2 id="coverage" className="text-base font-semibold">
                Pledged value, by basis
              </h2>
              <InfoTip label="pledged value">
                The {data.coverage.pledged} pledged assets, whatever the filters. Each basis is totalled on its own and per currency: estimates
                are never added to valuations. Once a valuation is recorded it replaces the asset&rsquo;s estimate as the value used.
              </InfoTip>
            </div>
            <dl className="mt-3 flex flex-col divide-y text-sm">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2">
                <dt className="text-muted-foreground">
                  Recorded market valuations{" "}
                  <span className="text-xs">
                    ({data.coverage.valued.counted} of {data.coverage.pledged})
                  </span>
                </dt>
                <dd className="font-semibold tabular">
                  <Totals part={data.coverage.valued} />
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2">
                <dt className="text-muted-foreground">
                  Estimates only, not yet valued{" "}
                  <span className="text-xs">
                    ({data.coverage.estimateOnly.counted} of {data.coverage.pledged})
                  </span>
                </dt>
                <dd className="font-semibold tabular">
                  <Totals part={data.coverage.estimateOnly} />
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2">
                <dt className="text-muted-foreground">
                  Forced-sale values{" "}
                  <span className="text-xs">
                    ({data.coverage.forcedSale.counted} of {data.coverage.pledged} have one)
                  </span>
                </dt>
                <dd className="font-semibold tabular">
                  <Totals part={data.coverage.forcedSale} />
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : (
        !list.error && (
          <div aria-hidden className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-3xl" />
            <Skeleton className="h-56 rounded-3xl" />
          </div>
        )
      )}

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Register</h2>
        <FilterToolbar
          searchLabel="Search collateral"
          searchPlaceholder="Asset, loan, borrower or owner"
          search={q}
          onSearchChange={(v) => setFilter({ q: v })}
          active={active}
          onRemove={(id) => setFilter({ [id]: null })}
          onClearAll={clearAll}
          resultCount={data ? data.total : null}
          totalCount={data?.registerTotal}
          noun={data?.total === 1 ? "asset" : "assets"}
          filters={
            <>
              <FilterSelect label="Needs attention" value={exception} onChange={(v) => setFilter({ exception: v })} options={EXCEPTION_OPTIONS} className="w-60" />
              <FilterSelect label="Type" value={type} onChange={(v) => setFilter({ type: v })} options={TYPE_OPTIONS} className="w-48" />
              <FilterSelect label="Status" value={status} onChange={(v) => setFilter({ status: v })} options={STATUS_OPTIONS} className="w-48" />
            </>
          }
        />

        {list.error ? (
          <StateMessage state="error" title="Couldn't load the register" description={list.error.message} onRetry={list.refetch} />
        ) : !data ? (
          <div className="flex flex-col gap-2" aria-busy>
            <span className="sr-only">Loading the register</span>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : data.total === 0 ? (
          filtered ? (
            <StateMessage
              state="filtered-empty"
              title={exception && active.length === 1 && !q ? `No assets: ${optionLabel(EXCEPTION_OPTIONS, exception).toLowerCase()}` : "No assets match these filters"}
              description={`The register holds ${data.registerTotal} assets; none are in this view.`}
              action={
                <Button size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <StateMessage state="empty" title="No collateral registered yet" />
          )
        ) : (
          <div className="relative rounded-2xl border">
            <Table>
              <TableCaption className="sr-only">Collateral register</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Asset</TableHead>
                  <TableHead scope="col">Loan</TableHead>
                  <TableHead scope="col">Owner</TableHead>
                  <TableHead scope="col" className="text-right">
                    Value used
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Forced sale
                  </TableHead>
                  <TableHead scope="col">Lien</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="sticky right-0 bg-card shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                    <span className="sr-only">Details</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((a) => (
                  <TableRow key={a.ref}>
                    <TableCell>
                      <span className="block font-mono text-xs text-muted-foreground">{a.ref}</span>
                      <span className="block text-sm font-medium">{a.description}</span>
                      <span className="block text-xs text-muted-foreground">{ASSET_TYPES[a.type]}</span>
                    </TableCell>
                    <TableCell>
                      <EntityRef reference={a.loanRef} href={`/loans/${a.loanRef}?tab=collateral`} context={`${a.borrower} · ${a.loanStatusLabel}`} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.owner.kind === "borrower" ? "Borrower" : <>
                          <span className="block">{a.owner.name}</span>
                          <span className="block text-xs text-muted-foreground">Third party ({a.owner.relationship.toLowerCase()})</span>
                        </>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="block font-semibold whitespace-nowrap tabular">{formatMoney(a.valueUsed.value)}</span>
                      <span className="block text-xs whitespace-nowrap text-muted-foreground">
                        {a.valueUsed.basis}, {formatDate(a.valueUsed.on)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap tabular">
                      {a.valuation?.forcedSaleValue ? formatMoney(a.valuation.forcedSaleValue) : <span className="text-muted-foreground">Not recorded</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.lien ? (
                        <>
                          <span className="block whitespace-nowrap">Recorded</span>
                          <span className="block text-xs whitespace-nowrap text-muted-foreground">{a.lien.registry}</span>
                        </>
                      ) : (
                        <span className={a.exceptions.includes("no_lien") ? "font-medium text-warning" : "text-muted-foreground"}>None recorded</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={{ label: COLLATERAL_STATUS[a.status].label, tone: COLLATERAL_STATUS[a.status].tone, description: "" }} />
                    </TableCell>
                    <TableCell className="sticky right-0 bg-card text-right shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={url.href({ asset: a.ref })} scroll={false} data-asset-ref={a.ref} aria-label={`View ${a.ref}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {openRef && <AssetDrawer key={openRef} assetRef={openRef} onClose={() => url.set({ asset: null })} />}
    </PageBody>
  )
}

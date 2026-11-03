"use client"

import Link from "next/link"
import { UserPlus } from "lucide-react"
import { FilterSelect, optionLabel } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { Pager } from "@/components/patterns/pager"
import { RowActions } from "@/components/patterns/row-actions"
import { StateMessage } from "@/components/patterns/state-message"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { clientSummary, hasActiveLoan, listClients, loansOf } from "@/lib/api/lending"
import { formatCount, formatDate, plural } from "@/lib/format"
import { useUrlState } from "@/lib/use-url-state"
import { userName } from "@/lib/workspace-fixtures"

const LOAN_OPTIONS = [
  { value: "active", label: "Has an active loan" },
  { value: "none", label: "No active loan" },
]

const NOT_PROVIDED = <span className="text-muted-foreground">Not provided</span>

export function ClientsView() {
  const url = useUrlState()
  const q = url.get("q")
  const loans = url.get("loans")
  const page = Math.max(1, Number(url.get("page")) || 1)
  const data = listClients({ q, loans, page })
  const summary = clientSummary()

  const active: ActiveFilter[] = loans ? [{ id: "loans", label: "Loans", value: optionLabel(LOAN_OPTIONS, loans) }] : []
  const setFilter = (patch: Record<string, string | null>) => url.set({ ...patch, page: null })
  const clearAll = () => setFilter({ q: null, loans: null })

  return (
    <PageBody>
      <PageHeader
        eyebrow="Lending"
        title="Clients"
        actions={
          <Button className="rounded-full" asChild>
            <Link href="/clients/new">
              <UserPlus aria-hidden />
              Add client
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        {/* Compact branch-wide counts. They stay put while searching, and say so (F41). */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1">
            <span className="font-semibold tabular">{formatCount(summary.total)}</span> clients
          </span>
          <span className="rounded-full bg-muted px-3 py-1">
            <span className="font-semibold tabular">{formatCount(summary.withActiveLoan)}</span> with an active loan
          </span>
          <span className="rounded-full bg-muted px-3 py-1">
            <span className="font-semibold tabular">{formatCount(summary.newThisMonth)}</span> new this month
          </span>
          <InfoTip label="client counts">Branch-wide totals. They don&rsquo;t change with search or filters.</InfoTip>
        </div>

        <FilterToolbar
          searchLabel="Search clients"
          searchPlaceholder="Name, client ID, phone or business"
          search={q}
          onSearchChange={(v) => setFilter({ q: v })}
          active={active}
          onRemove={(id) => setFilter({ [id]: null })}
          onClearAll={clearAll}
          resultCount={data.total}
          totalCount={summary.total}
          noun={data.total === 1 ? "client" : "clients"}
          filters={<FilterSelect label="Loans" value={loans} onChange={(v) => setFilter({ loans: v })} options={LOAN_OPTIONS} className="w-48" />}
        />

        {data.total === 0 ? (
          <StateMessage
            state="filtered-empty"
            title={q.trim() ? `No clients match “${q.trim()}”` : "No clients match these filters"}
            description={`The branch has ${plural(summary.total, "client")}. Check the spelling, or search by client ID or phone.`}
            action={
              <>
                <Button size="sm" onClick={clearAll}>
                  Clear search
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/clients/new">Add a new client</Link>
                </Button>
              </>
            }
          />
        ) : (
          <>
            <div className="rounded-2xl border">
              <Table>
                <TableCaption className="sr-only">Clients, page {data.page} of {data.pageCount}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Client</TableHead>
                    <TableHead scope="col">Primary phone</TableHead>
                    <TableHead scope="col">Business</TableHead>
                    <TableHead scope="col">Loans</TableHead>
                    <TableHead scope="col">Registered</TableHead>
                    <TableHead scope="col">Officer</TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((c) => {
                    const all = loansOf(c.id)
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link href={`/clients/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                            {c.name}
                          </Link>
                          <span className="block font-mono text-xs text-muted-foreground">{c.id}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{c.phone ?? NOT_PROVIDED}</TableCell>
                        <TableCell>{c.business ? c.business.name : NOT_PROVIDED}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {all.length === 0 ? (
                            <span className="text-muted-foreground">None yet</span>
                          ) : (
                            <>
                              {plural(all.length, "loan")}
                              {hasActiveLoan(c.id) && <span className="ml-1.5 rounded-full bg-brand-subtle px-2 py-0.5 text-xs text-brand-subtle-foreground">active</span>}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(c.registeredOn)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{userName(c.officerId)}</TableCell>
                        <TableCell>
                          <RowActions
                            primary={{ label: "View profile", href: `/clients/${c.id}` }}
                            recordLabel={c.name}
                            actions={[
                              { label: "View loans", href: `/loans?q=${encodeURIComponent(c.name)}` },
                              { label: "Start loan application", kind: "consequential", disabledReason: "Prototype: no live actions." },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <Pager page={data.page} pageCount={data.pageCount} href={(p) => url.href({ page: p === 1 ? null : String(p) })} />
          </>
        )}
      </div>
    </PageBody>
  )
}

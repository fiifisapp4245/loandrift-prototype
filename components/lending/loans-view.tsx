"use client"

import Link from "next/link"

import { AlertTriangle } from "lucide-react"
import { Amount } from "@/components/patterns/amount"
import { EntityRef } from "@/components/patterns/entity-ref"
import { FilterSelect, optionLabel } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { Pager } from "@/components/patterns/pager"
import { RowActions } from "@/components/patterns/row-actions"
import { StateMessage } from "@/components/patterns/state-message"
import { HealthBadge, LoanStatusBadge } from "@/components/patterns/status-badge"
import { RepaymentProgress } from "@/components/lending/repayment-progress"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { STAGE_COLUMN, allowedActions, listLoans, stageDetail, statusCounts } from "@/lib/api/lending"
import { LOAN_STATUS, REPAYMENT_HEALTH, formatDate, loanStatus } from "@/lib/format"
import { useUrlState } from "@/lib/use-url-state"

// Every lifecycle stage, Written off included (F44), plus legacy values the source doesn't map.
// This filter replaces the old Loan Features queues: same lists, one place, with counts.
const COUNTS = statusCounts()
const STATUS_OPTIONS = [
  ...Object.entries(LOAN_STATUS).map(([value, s]) => ({ value, label: `${s.label} (${COUNTS[value] ?? 0})` })),
  { value: "unrecognised", label: `Unrecognised status (${COUNTS.unrecognised})` },
]
const HEALTH_OPTIONS = Object.entries(REPAYMENT_HEALTH).map(([value, s]) => ({ value, label: s.label }))
const PRE_APPROVAL = new Set(["registered", "captured", "rejected"])

/** The facts the old queue for this stage was meant to show (readiness, signatures, reason …). */
function StageCell({ loan }: { loan: Parameters<typeof stageDetail>[0] }) {
  const d = stageDetail(loan)
  return (
    <TableCell className="min-w-48 text-sm">
      {d ? (
        <>
          <span className={d.warn ? "flex items-start gap-1 font-medium text-warning" : "font-medium"}>
            {d.warn && <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />}
            {d.primary}
          </span>
          {d.secondary && <span className="block text-xs text-muted-foreground">{d.secondary}</span>}
        </>
      ) : (
        <span className="text-muted-foreground">Not recorded</span>
      )}
    </TableCell>
  )
}

export function LoansView() {
  const url = useUrlState()
  const q = url.get("q")
  const status = url.get("status")
  const health = url.get("health")
  const page = Math.max(1, Number(url.get("page")) || 1)
  const data = listLoans({ q, status, health, page })
  const stageHeader = status ? STAGE_COLUMN[status] : undefined

  const active: ActiveFilter[] = [
    status && { id: "status", label: "Status", value: loanStatus(status).label.replace(/^Unrecognised status.*/, "Unrecognised status") },
    health && { id: "health", label: "Repayment", value: optionLabel(HEALTH_OPTIONS, health) },
  ].filter(Boolean) as ActiveFilter[]
  const setFilter = (patch: Record<string, string | null>) => url.set({ ...patch, page: null })
  const clearAll = () => setFilter({ q: null, status: null, health: null })

  return (
    <PageBody>
      <PageHeader
        eyebrow="Lending"
        title="All Loans"
        actions={
          <Button asChild className="rounded-full">
            <Link href="/loans/new">New application</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <FilterToolbar
          searchLabel="Search loans"
          searchPlaceholder="Loan reference or borrower"
          search={q}
          onSearchChange={(v) => setFilter({ q: v })}
          active={active}
          onRemove={(id) => setFilter({ [id]: null })}
          onClearAll={clearAll}
          resultCount={data.total}
          totalCount={data.branchTotal}
          noun={data.total === 1 ? "loan" : "loans"}
          filters={
            <>
              <FilterSelect label="Status" value={status} onChange={(v) => setFilter({ status: v })} options={STATUS_OPTIONS} anyLabel="Any status" className="w-44" />
              <FilterSelect label="Repayment" value={health} onChange={(v) => setFilter({ health: v })} options={HEALTH_OPTIONS} className="w-40" />
            </>
          }
        />

        {status && status in LOAN_STATUS && (
          <p className="-mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{LOAN_STATUS[status as keyof typeof LOAN_STATUS].label}:</span>{" "}
            {LOAN_STATUS[status as keyof typeof LOAN_STATUS].description}
          </p>
        )}

        {data.total === 0 ? (
          <StateMessage
            state="filtered-empty"
            title="No loans match these filters"
            description={`The branch has ${data.branchTotal} loans; none match.`}
            action={
              <Button size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="rounded-2xl border">
              <Table>
                <TableCaption className="sr-only">Loans, page {data.page} of {data.pageCount}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Loan</TableHead>
                    <TableHead scope="col">Product</TableHead>
                    <TableHead scope="col" className="text-right">Principal</TableHead>
                    <TableHead scope="col">Repayment</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Health</TableHead>
                    {stageHeader && <TableHead scope="col">{stageHeader}</TableHead>}
                    {/* With a stage column, Updated gives way: the stage detail carries the date that matters. */}
                    {!stageHeader && <TableHead scope="col">Updated</TableHead>}
                    <TableHead scope="col">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((l) => (
                    <TableRow key={l.reference}>
                      <TableCell>
                        <EntityRef reference={l.reference} href={`/loans/${l.reference}`} context={l.borrower.name} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.product}</TableCell>
                      <TableCell className="text-right">
                        <Amount value={l.principal} />
                        <span className="block text-xs text-muted-foreground">{PRE_APPROVAL.has(l.status) ? "Requested" : "Approved"}</span>
                      </TableCell>
                      <TableCell>
                        <RepaymentProgress financials={l.financials} compact />
                      </TableCell>
                      <TableCell>
                        <LoanStatusBadge status={l.status} />
                      </TableCell>
                      <TableCell>
                        <HealthBadge health={l.health} />
                      </TableCell>
                      {stageHeader && <StageCell loan={l} />}
                      {!stageHeader && <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(l.updatedOn)}</TableCell>}
                      <TableCell>
                        <RowActions primary={{ label: "View loan", href: `/loans/${l.reference}` }} actions={allowedActions(l)} recordLabel={l.reference} />
                      </TableCell>
                    </TableRow>
                  ))}
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

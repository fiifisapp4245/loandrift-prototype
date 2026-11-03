"use client"

import { useId, useMemo, useState } from "react"
import { Amount } from "@/components/patterns/amount"
import { EntityRef } from "@/components/patterns/entity-ref"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { RowActions, type RowAction } from "@/components/patterns/row-actions"
import { StateMessage } from "@/components/patterns/state-message"
import { HealthBadge, LoanStatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { demoLoans, type DemoLoan } from "@/lib/fixtures"
import { LOAN_STATUS, formatDate, formatScore, loanStatus } from "@/lib/format"

const ALL = "all"

/**
 * Contextual actions per lifecycle stage. In the real app these come from the server's permitted
 * transitions; here they only show the pattern, and every consequential action is disabled.
 */
function actionsFor(loan: DemoLoan): RowAction[] {
  const prototype = "Prototype only: no live actions."
  const routine: RowAction[] = [{ label: "View borrower", href: `/clients/${loan.borrower.id}` }]
  switch (loan.status) {
    case "captured":
      return [...routine, { label: "Approve or reject", kind: "consequential", disabledReason: prototype }]
    case "active":
    case "defaulted":
      return [...routine, { label: "Record external payment", kind: "consequential", disabledReason: prototype }]
    case "approved":
      return [...routine, { label: "Disburse", kind: "consequential", disabledReason: prototype }]
    default:
      return routine
  }
}

export function LoanTableDemo() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const statusId = useId()

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return demoLoans.filter(
      (l) =>
        (status === ALL || l.status === status) &&
        (!q || l.reference.toLowerCase().includes(q) || l.borrower.name.toLowerCase().includes(q)),
    )
  }, [search, status])

  const active: ActiveFilter[] = status === ALL ? [] : [{ id: "status", label: "Status", value: loanStatus(status).label }]
  const clearAll = () => {
    setSearch("")
    setStatus(ALL)
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterToolbar
        searchLabel="Search loans"
        searchPlaceholder="Reference or borrower"
        search={search}
        onSearchChange={setSearch}
        active={active}
        onRemove={() => setStatus(ALL)}
        onClearAll={clearAll}
        resultCount={rows.length}
        totalCount={demoLoans.length}
        noun="loans"
        filters={
          <div className="flex flex-col gap-1.5">
            <span id={statusId} className="text-xs font-medium text-muted-foreground">
              Status
            </span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-labelledby={statusId} className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any status</SelectItem>
                {Object.entries(LOAN_STATUS).map(([value, s]) => (
                  <SelectItem key={value} value={value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {rows.length === 0 ? (
        <StateMessage
          state="filtered-empty"
          title={search ? `No loans match “${search.trim()}”` : `No ${loanStatus(status).label.toLowerCase()} loans`}
          description="The branch still has loans; nothing matches these filters."
          action={
            <Button size="sm" onClick={clearAll}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableCaption className="sr-only">Fictional loans, {rows.length} shown</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="min-w-40">Loan</TableHead>
                <TableHead scope="col">Product</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Repayment health</TableHead>
                <TableHead scope="col" className="text-right">Principal</TableHead>
                <TableHead scope="col" className="text-right">Principal outstanding</TableHead>
                <TableHead scope="col">Score</TableHead>
                <TableHead scope="col">Updated</TableHead>
                <TableHead scope="col" className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.reference}>
                  <TableCell>
                    <EntityRef reference={l.reference} href={`/loans/${l.reference}`} context={l.borrower.name} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.product}</TableCell>
                  <TableCell>
                    <LoanStatusBadge status={l.status} />
                  </TableCell>
                  <TableCell>
                    <HealthBadge health={l.health} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Amount value={l.principal} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Amount value={l.principalOutstanding} />
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatScore(l.score)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(l.updatedOn)}</TableCell>
                  <TableCell>
                    <RowActions primary={{ label: "View loan", href: `/loans/${l.reference}` }} actions={actionsFor(l)} recordLabel={l.reference} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

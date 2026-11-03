import type { Metadata } from "next"
import { LoanTableDemo } from "@/components/foundations/loan-table-demo"
import { Amount } from "@/components/patterns/amount"
import { KpiCard } from "@/components/patterns/kpi-card"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { ScopedCount } from "@/components/patterns/scoped-count"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DEMO_AS_OF, demoLoans, ghs } from "@/lib/fixtures"
import {
  LOAN_STATUS,
  REPAYMENT_HEALTH,
  formatAsOf,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatMoneyValue,
  formatScore,
  loanStatus,
  ratio,
  sumMoney,
  type Ratio,
} from "@/lib/format"
import { isUnavailable, unavailable } from "@/lib/types"

export const metadata: Metadata = { title: "UI foundations" }

function rateLabel(r: Ratio) {
  return isUnavailable(r) ? "Unavailable" : r.label
}

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

const tokens = [
  ["Brand", "bg-brand", "#7C3AED · buttons, links, focus, selection"],
  ["Brand subtle", "bg-brand-subtle", "#F3EEFF · active nav item"],
  ["Canvas", "bg-canvas", "#F6F5FA · page background"],
  ["Success", "bg-success", "#0F766E · on track, completed"],
  ["Warning", "bg-warning", "#B45309 · unrecognised, needs checking"],
  ["Danger", "bg-danger", "#B91C1C · arrears, rejected, failure"],
] as const

export default function FoundationsPage() {
  const asOf = formatAsOf(DEMO_AS_OF)
  const ghsBook = demoLoans.filter((l) => l.status === "active" || l.status === "defaulted").map((l) => l.principalOutstanding)
  const ghsOnly = sumMoney(ghsBook.filter((v) => !isUnavailable(v) && v.currency === "GHS"))
  const mixed = sumMoney(ghsBook)
  const collectionRate = ratio(0, 0, "No installments fell due in this period, so there is no collection rate.")

  const formatting = [
    ["Cedi amount", formatMoneyValue(ghs(1200)), "One symbol, GH₵, everywhere."],
    ["Zero", formatMoneyValue(ghs(0)), "A real, known zero."],
    ["Unavailable", formatMoneyValue(unavailable("No source value")), "Missing is a word, never 0.00."],
    ["Other currency", formatMoneyValue({ minor: 150000, currency: "USD" }), "Leads with its ISO code."],
    ["Negative", formatMoneyValue(ghs(-45.5)), "True minus sign."],
    ["Rate, no denominator", rateLabel(collectionRate), "Not 0%."],
    ["Rate", rateLabel(ratio(7, 8, "")), "One decimal only when needed."],
    ["Date", formatDate("2026-10-26"), "Calendar dates never shift by timezone."],
    ["Date and time", formatDateTime("2026-11-02T09:41:00Z"), "Branch time, with the zone named."],
    ["Period", formatDateRange("2026-10-01", "2026-10-31"), "Inclusive range."],
    ["Score (current)", formatScore(demoLoans[0]!.score), "Model always named."],
    ["Score (legacy)", formatScore(demoLoans[1]!.score), "Different scale; never compared."],
    ["Unknown status", loanStatus("MIGRATED_CLOSED").label, "Never defaulted to Pending."],
  ] as const

  return (
    <PageBody>
      <PageHeader
        eyebrow="Prototype"
        title="UI foundations"
        description="The shared building blocks every LoanDrift screen uses. All records here are fictional demo data."
        basis={asOf}
      />

      <Section id="tokens" title="Colour" description="One brand accent from TroveSuite. Status colours always travel with a label and an icon.">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map(([name, cls, note]) => (
            <li key={name} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <span aria-hidden className={`size-9 shrink-0 rounded-md border ${cls}`} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{name}</span>
                <span className="block text-xs text-muted-foreground">{note}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="kpis"
        title="Financial figures"
        description="Every headline figure states what it includes and its basis. Unlike currencies are never added together; missing values say why."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Outstanding, cedi loans"
            value={ghsOnly}
            definition="Sum of the outstanding balances supplied for active and defaulted GHS loans."
            basis={asOf}
            secondary={{ label: "Including interest", value: unavailable("Not in demo data") }}
            href="/loans"
            hrefLabel="View loans"
          />
          <KpiCard
            label="Outstanding, all loans"
            value={mixed}
            definition="Active and defaulted loans in every currency."
            basis={asOf}
          />
          <KpiCard
            label="Collection rate"
            value={isUnavailable(collectionRate) ? collectionRate : unavailable("Shown as a rate elsewhere")}
            definition="Collected ÷ due, for installments due in the period."
            basis={formatDateRange("2026-10-01", "2026-10-31")}
          />
          <KpiCard label="Arrears" value={null} loading definition="Overdue installment amounts only." basis={asOf} />
        </div>
      </Section>

      <Section
        id="counts"
        title="Scoped counts"
        description="Counts name their population, so personal work, branch work and unread alerts can't be confused."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ScopedCount label="Approvals" count={2} scope="personal" href="/workspace/approvals" />
          <ScopedCount label="Approvals" count={5} scope="branch" href="/workspace/approvals" />
          <ScopedCount label="Notifications" count={3} scope="unread" href="/workspace/notifications" />
          <ScopedCount label="Approvals" count={0} scope="personal" loading />
        </div>
      </Section>

      <Section
        id="statuses"
        title="Statuses"
        description="Lifecycle stage and repayment health are separate badges with one mapping each. Unknown values are flagged, not guessed."
      >
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Lifecycle</p>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(LOAN_STATUS).map(([k, s]) => (
              <li key={k}>
                <StatusBadge status={s} />
              </li>
            ))}
            <li>
              <StatusBadge status={loanStatus("MIGRATED_CLOSED")} />
            </li>
          </ul>
          <p className="mt-2 text-xs font-medium text-muted-foreground">Repayment health</p>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(REPAYMENT_HEALTH).map(([k, s]) => (
              <li key={k}>
                <StatusBadge status={s} />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="formatting" title="Formatting" description="Formatting never changes a calculation. These are the outputs of lib/format.ts.">
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Case</TableHead>
                <TableHead scope="col">Shown as</TableHead>
                <TableHead scope="col">Rule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formatting.map(([name, shown, rule]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="tabular">{shown}</TableCell>
                  <TableCell className="text-muted-foreground">{rule}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Unavailable in a table</TableCell>
                <TableCell>
                  <Amount value={unavailable("Not disbursed yet, so there is no balance.")} />
                </TableCell>
                <TableCell className="text-muted-foreground">Reason on hover and keyboard focus.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section
        id="table"
        title="List pattern"
        description="Search, labelled filters, removable chips, a scoped result count, a linked reference with context, and one View action on every row."
      >
        <LoanTableDemo />
      </Section>

      <Section id="states" title="View states" description="Six states, each with its own wording. A filtered result never says the data doesn't exist.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StateMessage state="loading" title="Loading loans…" />
          <StateMessage
            state="empty"
            title="No clients in this branch yet"
            description="Add the branch's first client to start an application."
            action={<Button size="sm" disabled>Add client</Button>}
          />
          <StateMessage
            state="filtered-empty"
            title="No accounts 60+ days overdue"
            description="2 accounts are in arrears branch-wide; none match this aging filter."
            action={<Button size="sm" variant="outline">Reset aging filter</Button>}
          />
          <StateMessage
            state="unavailable"
            title="Older activity isn't available here"
            description="This feed covers the last 30 days. Use the audit report for earlier events."
          />
          <StateMessage
            state="permission"
            title="Branch approvals are limited to managers"
            description="You can see approvals assigned to you. Ask a branch manager for the full queue."
          />
          <StateMessage
            state="error"
            title="Couldn't load repayments"
            description="Nothing has changed. The request failed before any data arrived. Retry appears here when the page can repeat the request."
          />
        </div>
      </Section>
    </PageBody>
  )
}

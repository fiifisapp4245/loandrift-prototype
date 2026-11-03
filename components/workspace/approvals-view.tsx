"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CircleAlert } from "lucide-react"
import { Amount } from "@/components/patterns/amount"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApprovalPanel } from "@/components/workspace/approval-panel"
import { approvalStatus } from "@/components/workspace/approval-status"
import {
  COMPLETED_HISTORY_DAYS,
  PermissionError,
  approvalCounts,
  currentUser,
  fetchApprovals,
  type ApprovalScope,
  type Simulation,
} from "@/lib/api/workspace"
import { DEMO_AS_OF } from "@/lib/fixtures"
import { ageInDays, formatAge, formatCount, formatDate } from "@/lib/format"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"
import { cn } from "@/lib/utils"
import { demoApprovals, demoUsers, userName, type ApprovalState, type DemoApprovalRequest } from "@/lib/workspace-fixtures"

const TABS: ApprovalState[] = ["waiting", "in_progress", "completed"]

const KIND_OPTIONS = [...new Set(demoApprovals.map((a) => a.kind))].sort().map((k) => ({ value: k, label: k }))
const REQUESTER_OPTIONS = demoUsers.map((u) => ({ value: u.id, label: u.name }))
const SUBMITTED_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
]
const AGE_OPTIONS = [
  { value: "1", label: "Over 1 day" },
  { value: "3", label: "Over 3 days" },
  { value: "7", label: "Over 7 days" },
]

function tabLabel(tab: ApprovalState, scope: ApprovalScope) {
  if (tab === "waiting") return scope === "mine" ? "Waiting on me" : "Waiting"
  return tab === "in_progress" ? "In progress" : "Completed"
}

function ScopeSwitch({ scope, onChange }: { scope: ApprovalScope; onChange: (s: ApprovalScope) => void }) {
  return (
    <div role="group" aria-label="Whose requests" className="inline-flex rounded-lg border bg-card p-0.5">
      {(["mine", "branch"] as const).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={scope === s}
          onClick={() => onChange(s)}
          className={cn(
            "h-8 rounded-md px-3 text-sm font-medium text-muted-foreground",
            scope === s && "bg-brand-subtle text-brand-subtle-foreground",
          )}
        >
          {s === "mine" ? "Mine" : "Branch"}
        </button>
      ))}
    </div>
  )
}

export function ApprovalsView() {
  const params = useSearchParams()
  const url = useUrlState()
  const user = currentUser(params.get("as"))
  const scope: ApprovalScope = url.get("scope") === "branch" ? "branch" : "mine"
  const tab = (TABS as string[]).includes(url.get("tab")) ? (url.get("tab") as ApprovalState) : "waiting"
  const q = url.get("q")
  const kind = url.get("kind")
  const requester = url.get("requester")
  const submitted = url.get("submitted")
  const age = tab === "completed" ? "" : url.get("age")
  const openId = url.get("id")
  const demo = url.get("demo")
  const sim: Simulation = demo === "slow" || demo === "error" ? demo : "none"

  const list = useQuery(`approvals:${scope}:${user.id}:${sim}`, () => fetchApprovals(scope, user, sim))

  const tabRows = (list.data?.rows ?? []).filter((a) => a.state === tab)
  const needle = q.trim().toLowerCase()
  const rows = tabRows.filter(
    (a) =>
      (!needle || [a.borrower, a.loanRef, a.id].some((v) => v.toLowerCase().includes(needle))) &&
      (!kind || a.kind === kind) &&
      (!requester || a.requesterId === requester) &&
      (!submitted || ageInDays(a.submittedAt, DEMO_AS_OF) <= Number(submitted)) &&
      (!age || ageInDays(a.submittedAt, DEMO_AS_OF) > Number(age)),
  )

  const active: ActiveFilter[] = [
    kind && { id: "kind", label: "Type", value: kind },
    requester && { id: "requester", label: "Requested by", value: optionLabel(REQUESTER_OPTIONS, requester) },
    submitted && { id: "submitted", label: "Submitted", value: optionLabel(SUBMITTED_OPTIONS, submitted) },
    age && { id: "age", label: "Waiting", value: optionLabel(AGE_OPTIONS, age) },
  ].filter(Boolean) as ActiveFilter[]
  const clearAll = () => url.set({ q: null, kind: null, requester: null, submitted: null, age: null })
  const filtered = active.length > 0 || needle.length > 0

  const permissionDenied = list.error instanceof PermissionError
  const branchWaiting = approvalCounts(user.id).branch

  return (
    <PageBody>
      <PageHeader
        eyebrow="Workspace"
        title="My Approvals"
        actions={<ScopeSwitch scope={scope} onChange={(s) => url.set({ scope: s === "mine" ? null : s, id: null })} />}
      />

      {permissionDenied ? (
        <StateMessage
          state="permission"
          title="Branch approvals are limited to managers, supervisors and analysts"
          description={`You're signed in as a ${user.role.toLowerCase()}. You can still see requests assigned to you or that you raised.`}
          action={
            <Button size="sm" onClick={() => url.set({ scope: null })}>
              Show my approvals
            </Button>
          }
        />
      ) : list.error ? (
        <StateMessage state="error" title="Couldn't load approvals" description={list.error.message} onRetry={list.refetch} />
      ) : (
        <Tabs value={tab} onValueChange={(t) => url.set({ tab: t === "waiting" ? null : t, age: t === "completed" ? null : age, id: null })}>
          <TabsList aria-label="Request state">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="gap-1.5">
                {tabLabel(t, scope)}
                {list.data && (
                  <span className="tabular rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{formatCount(list.data.counts[t])}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-4 flex flex-col gap-4">
            <FilterToolbar
              searchLabel="Search requests"
              searchPlaceholder="Borrower, loan or request ID"
              search={q}
              onSearchChange={(v) => url.set({ q: v })}
              active={active}
              onRemove={(id) => url.set({ [id]: null })}
              onClearAll={clearAll}
              resultCount={list.data ? rows.length : null}
              totalCount={list.data ? tabRows.length : undefined}
              noun="requests"
              filters={
                <>
                  <FilterSelect label="Type" value={kind} onChange={(v) => url.set({ kind: v })} options={KIND_OPTIONS} />
                  <FilterSelect label="Requested by" value={requester} onChange={(v) => url.set({ requester: v })} options={REQUESTER_OPTIONS} anyLabel="Anyone" />
                  <FilterSelect label="Submitted" value={submitted} onChange={(v) => url.set({ submitted: v })} options={SUBMITTED_OPTIONS} anyLabel="Any time" />
                  {tab !== "completed" && (
                    <FilterSelect label="Waiting" value={age} onChange={(v) => url.set({ age: v })} options={AGE_OPTIONS} anyLabel="Any age" />
                  )}
                </>
              }
            />

            {list.loading ? (
              <div className="flex flex-col gap-2" aria-busy>
                <span className="sr-only">Loading approvals</span>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              filtered ? (
                <StateMessage
                  state="filtered-empty"
                  title="No requests match these filters"
                  description={`${formatCount(tabRows.length)} ${tabLabel(tab, scope).toLowerCase()} request${tabRows.length === 1 ? "" : "s"} in this view.`}
                  action={
                    <Button size="sm" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyTab tab={tab} scope={scope} branchWaiting={branchWaiting} canSeeBranch={user.canSeeBranchApprovals} onBranch={() => url.set({ scope: "branch" })} />
              )
            ) : (
              <ApprovalsTable rows={rows} scope={scope} tab={tab} reviewHref={(id) => url.href({ id })} />
            )}

            {tab === "completed" && list.data && (
              <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                Last {COMPLETED_HISTORY_DAYS} days only
                {list.data.olderCompleted > 0 && <> · {formatCount(list.data.olderCompleted)} older</>}
                <InfoTip label="completed history">
                  Completed requests stay here for {COMPLETED_HISTORY_DAYS} days. Older decisions are kept in the approval history report.
                </InfoTip>
                <Link href="/reports?report=approval-history" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">
                  Approval history
                </Link>
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {openId && list.data && (
        <ApprovalPanel
          requestedId={openId}
          request={list.data.rows.find((a) => a.id === openId)}
          userId={user.id}
          onClose={() => url.set({ id: null })}
        />
      )}
    </PageBody>
  )
}

function EmptyTab({
  tab,
  scope,
  branchWaiting,
  canSeeBranch,
  onBranch,
}: {
  tab: ApprovalState
  scope: ApprovalScope
  branchWaiting: number
  canSeeBranch: boolean
  onBranch: () => void
}) {
  if (tab === "waiting" && scope === "mine") {
    return (
      <StateMessage
        state="empty"
        title="Nothing is waiting on you"
        description={branchWaiting > 0 ? `${formatCount(branchWaiting)} waiting on others in the branch.` : "The branch queue is empty too."}
        action={
          branchWaiting > 0 && canSeeBranch ? (
            <Button size="sm" variant="outline" onClick={onBranch}>
              View branch queue
            </Button>
          ) : undefined
        }
      />
    )
  }
  const title = { waiting: "No requests waiting", in_progress: "No requests sent back", completed: `No decisions in the last ${COMPLETED_HISTORY_DAYS} days` }[tab]
  return <StateMessage state="empty" title={title} />
}

function ApprovalsTable({
  rows,
  scope,
  tab,
  reviewHref,
}: {
  rows: DemoApprovalRequest[]
  scope: ApprovalScope
  tab: ApprovalState
  reviewHref: (id: string) => string
}) {
  const open = tab !== "completed"
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableCaption className="sr-only">{tabLabel(tab, scope)} approval requests</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Request</TableHead>
            <TableHead scope="col">Loan</TableHead>
            <TableHead scope="col" className="text-right">Amount</TableHead>
            <TableHead scope="col">Requested by</TableHead>
            <TableHead scope="col">{open ? "Stage" : "Outcome"}</TableHead>
            <TableHead scope="col">{open ? "Waiting" : "Decided"}</TableHead>
            {scope === "branch" && open && <TableHead scope="col">Next action</TableHead>}
            <TableHead scope="col">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <span className="block font-medium">{a.kind}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono">{a.id}</span>
                  {a.blockers.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-danger">
                      <CircleAlert aria-hidden className="size-3" />
                      {a.blockers.length} blocker{a.blockers.length === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell>
                <EntityRef reference={a.loanRef} href={`/loans/${a.loanRef}`} context={a.borrower} />
              </TableCell>
              <TableCell className="text-right">
                <Amount value={a.amount} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{userName(a.requesterId)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {a.state === "waiting" ? (
                  <span className="text-sm">
                    Level {a.level.current} of {a.level.total}
                  </span>
                ) : (
                  <StatusBadge status={approvalStatus(a)} />
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {open ? formatAge(a.submittedAt, DEMO_AS_OF) : formatDate(a.completedAt)}
              </TableCell>
              {scope === "branch" && open && <TableCell className="whitespace-nowrap">{userName(a.assigneeId)}</TableCell>}
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link href={reviewHref(a.id)} scroll={false} data-review-id={a.id} aria-label={`Review ${a.id}`}>
                    Review
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

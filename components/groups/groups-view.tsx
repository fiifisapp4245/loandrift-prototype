"use client"

import Link from "next/link"
import { FilterSelect, optionLabel } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GROUP_STATUS, fetchGroups } from "@/lib/api/groups"
import { formatCount, formatDate, plural } from "@/lib/format"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"

const STATUS_OPTIONS = Object.entries(GROUP_STATUS).map(([value, s]) => ({ value, label: s.label }))

const NOT_RECORDED = <span className="text-muted-foreground">Not recorded</span>

/**
 * Groups (B2-08, F67, F68). Branch totals stay put while searching; the list has its own
 * "matching" count. Loading shows placeholders, never zeros.
 */
export function GroupsView() {
  const url = useUrlState()
  const q = url.get("q")
  const status = url.get("status")
  const demo = url.get("demo")
  const sim = demo === "slow" || demo === "error" ? demo : "none"

  const filters = { q, status }
  const list = useQuery(`groups:${JSON.stringify(filters)}:${sim}`, () => fetchGroups(filters, sim))
  const data = list.data

  const active: ActiveFilter[] = status ? [{ id: "status", label: "Status", value: optionLabel(STATUS_OPTIONS, status) }] : []
  const clearAll = () => url.set({ q: null, status: null })
  const searchOnly = q.trim().length > 0 && !status

  return (
    <PageBody>
      <PageHeader
        eyebrow="Lending"
        title="Groups"
        actions={
          <Button asChild className="rounded-full">
            <Link href="/groups/new">Form a group</Link>
          </Button>
        }
      />

      <section aria-labelledby="branch-groups" className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-1">
          <h2 id="branch-groups" className="text-base font-semibold">
            Branch totals
          </h2>
          <InfoTip label="branch totals">Every group in this branch. These don&rsquo;t change when you search or filter the list below.</InfoTip>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-3" aria-busy={!data || undefined}>
          {[
            ["Active groups", data?.branch.activeGroups],
            ["Members in active groups", data?.branch.activeMembers],
            ["Group loans awaiting approval", data?.branch.awaitingApproval],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-muted/50 px-4 py-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular">
                {data ? formatCount(value as number) : list.error ? <span className="font-normal text-muted-foreground">Unavailable</span> : <Skeleton className="mt-1 h-5 w-8" />}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">All groups</h2>
        <FilterToolbar
          searchLabel="Search groups"
          searchPlaceholder="Group name, code or member"
          search={q}
          onSearchChange={(v) => url.set({ q: v })}
          active={active}
          onRemove={(id) => url.set({ [id]: null })}
          onClearAll={clearAll}
          resultCount={data ? data.total : null}
          totalCount={data?.registerTotal}
          noun={data?.total === 1 ? "group" : "groups"}
          filters={<FilterSelect label="Status" value={status} onChange={(v) => url.set({ status: v })} options={STATUS_OPTIONS} className="w-44" />}
        />

        {list.error ? (
          <StateMessage state="error" title="Couldn't load groups" description={list.error.message} onRetry={list.refetch} />
        ) : !data ? (
          <div className="flex flex-col gap-2" aria-busy>
            <span className="sr-only">Loading groups</span>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : data.total === 0 ? (
          data.registerTotal === 0 ? (
            <StateMessage state="empty" title="No groups yet" description="Form a group to lend to its members together." />
          ) : (
            <StateMessage
              state="filtered-empty"
              title={searchOnly ? "No group matches" : "No groups match these filters"}
              description={searchOnly ? `Nothing matches “${q.trim()}”. Try another name or code.` : `The branch has ${data.registerTotal} groups; none are in this view.`}
              action={
                <Button size="sm" onClick={clearAll}>
                  {searchOnly ? "Clear search" : "Clear filters"}
                </Button>
              }
            />
          )
        ) : (
          <div className="relative rounded-2xl border">
            <Table>
              <TableCaption className="sr-only">Groups</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Group</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Members</TableHead>
                  <TableHead scope="col">Meets</TableHead>
                  <TableHead scope="col">Group loans</TableHead>
                  <TableHead scope="col" className="sticky right-0 bg-card shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                    <span className="sr-only">Details</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <span className="block font-mono text-xs text-muted-foreground">{g.code}</span>
                      <span className="block text-sm font-medium">{g.name}</span>
                      <span className="block text-xs text-muted-foreground">Formed {formatDate(g.formedOn)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={GROUP_STATUS[g.status]} />
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="block tabular">{plural(g.members.length, "member")}</span>
                      <span className="block max-w-56 truncate text-xs text-muted-foreground">{g.members.map((m) => m.name).join(", ")}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {g.meetingDay || g.meetingFrequency ? (
                        <>
                          <span className="block">{g.meetingDay ?? "Day not recorded"}</span>
                          <span className="block text-xs text-muted-foreground">{g.meetingFrequency ?? "Frequency not recorded"}</span>
                        </>
                      ) : (
                        NOT_RECORDED
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {g.loans.length ? (
                        <>
                          <span className="block">{plural(g.loans.length, "application")}</span>
                          <span className="block text-xs text-muted-foreground">Awaiting approval</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">None yet</span>
                      )}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-card text-right shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/groups/${g.id}`} aria-label={`View ${g.name}`}>
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
    </PageBody>
  )
}

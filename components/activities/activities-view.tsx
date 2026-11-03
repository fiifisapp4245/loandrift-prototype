"use client"

import Link from "next/link"
import { AlertTriangle, Bot, ChevronLeft, ChevronRight, Link2 } from "lucide-react"
import { ActivityDrawer } from "@/components/activities/activity-drawer"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { FilterSelect, optionLabel } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ACTION_LABELS,
  MODULE_LABELS,
  RETENTION_DAYS,
  branchDay,
  describe,
  fetchActivities,
  formatDayHeading,
  formatTime,
  type ActivityItem,
  type Simulation,
} from "@/lib/api/activities"
import { parseRangeParams, rangeLabel, type DateRange } from "@/lib/date-range"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatDate, formatDateTime, formatDateRange, plural } from "@/lib/format"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"
import { demoUsers } from "@/lib/workspace-fixtures"

const ACTOR_OPTIONS = [...demoUsers.map((u) => ({ value: u.id, label: u.name })), { value: "system", label: "System" }]
const MODULE_OPTIONS = Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label }))
const ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

function EventRow({ item, href }: { item: ActivityItem; href: string }) {
  const e = item.event
  const s = describe(e)
  const system = !e.actor_id
  const accounting = item.related.filter((r) => r.module === "accounting").length
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        data-event-id={e.id}
        className="flex items-start gap-3 rounded-2xl px-3 py-3 hover:bg-muted/60 sm:items-center"
      >
        <span
          aria-hidden
          className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${system ? "bg-muted text-muted-foreground" : "bg-brand-subtle text-brand-subtle-foreground"}`}
        >
          {system ? <Bot className="size-4" /> : initials(s.actor)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-snug">
            <span className="font-semibold">{s.actor}</span> {s.verb}{" "}
            {s.isRef ? (
              <span className="inline-block max-w-[16rem] truncate align-bottom font-mono text-[13px] font-medium text-primary" title={s.object}>
                {s.object}
              </span>
            ) : (
              <span className="font-medium">{s.object}</span>
            )}
            {s.amount && (
              <>
                {" "}
                <span className="tabular font-semibold">{s.amount}</span>
              </>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {s.context && <span>{s.context}</span>}
            <span className="rounded-full bg-muted px-2 py-0.5">{MODULE_LABELS[e.module]}</span>
            {accounting > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2 py-0.5 text-brand-subtle-foreground">
                <Link2 className="size-3" />
                {plural(accounting, "accounting entry", "accounting entries")}
              </span>
            )}
          </span>
        </span>
        {/* The visible text is the link's name (so voice control matches); the full date is added for screen readers. */}
        <time dateTime={e.occurred_at} className="shrink-0 text-xs text-muted-foreground tabular">
          <span className="sr-only">{formatDateTime(e.occurred_at)}</span>
          <span aria-hidden>{formatTime(e.occurred_at)}</span>
        </time>
      </Link>
    </li>
  )
}

export function ActivitiesView() {
  const url = useUrlState()
  const { range, invalidUrl } = parseRangeParams({ from: url.get("from") || undefined, to: url.get("to") || undefined }, DEMO_TODAY)
  const q = url.get("q")
  const actor = url.get("actor")
  const moduleFilter = url.get("module")
  const action = url.get("action")
  const page = Math.max(1, Number(url.get("page")) || 1)
  const openId = url.get("event")
  const demo = url.get("demo")
  const sim: Simulation = demo === "slow" || demo === "error" ? demo : "none"

  const filters = { q, range, actor, module: moduleFilter, action, page }
  const list = useQuery(`activities:${JSON.stringify(filters)}:${sim}`, () => fetchActivities(filters, sim))
  const data = list.data

  const active: ActiveFilter[] = [
    actor && { id: "actor", label: "Who", value: optionLabel(ACTOR_OPTIONS, actor) },
    moduleFilter && { id: "module", label: "Module", value: optionLabel(MODULE_OPTIONS, moduleFilter) },
    action && { id: "action", label: "Action", value: optionLabel(ACTION_OPTIONS, action) },
  ].filter(Boolean) as ActiveFilter[]
  const filtered = active.length > 0 || q.trim().length > 0
  // Any filter change goes back to page 1, so a result never hides on a page that no longer exists.
  const setFilter = (patch: Record<string, string | null>) => url.set({ ...patch, page: null })
  const clearAll = () => setFilter({ q: null, actor: null, module: null, action: null })

  return (
    <PageBody>
      <PageHeader title="Activities" />

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <h2 className="text-base font-semibold">Branch activity</h2>
            <InfoTip label="this feed">
              Who did what, newest first, in branch time (GMT). This feed keeps {RETENTION_DAYS} days; older activity is in the audit report.
            </InfoTip>
          </div>
          <DateRangePicker value={range} today={DEMO_TODAY} onApply={(r: DateRange) => url.set({ from: r.from, to: r.to, page: null })} />
        </div>

        <FilterToolbar
          searchLabel="Search activity"
          searchPlaceholder="Person, record or reference"
          search={q}
          onSearchChange={(v) => setFilter({ q: v })}
          active={active}
          onRemove={(id) => setFilter({ [id]: null })}
          onClearAll={clearAll}
          resultCount={data ? data.total : null}
          noun={data?.total === 1 ? "event" : "events"}
          filters={
            <>
              <FilterSelect label="Who" value={actor} onChange={(v) => setFilter({ actor: v })} options={ACTOR_OPTIONS} anyLabel="Anyone" />
              <FilterSelect label="Module" value={moduleFilter} onChange={(v) => setFilter({ module: v })} options={MODULE_OPTIONS} />
              <FilterSelect label="Action" value={action} onChange={(v) => setFilter({ action: v })} options={ACTION_OPTIONS} className="w-48" />
            </>
          }
        />

        {invalidUrl && (
          <Alert className="rounded-2xl">
            <AlertTriangle aria-hidden />
            <AlertTitle>The link&rsquo;s date range wasn&rsquo;t valid</AlertTitle>
            <AlertDescription>Showing {rangeLabel(range, DEMO_TODAY)} instead.</AlertDescription>
          </Alert>
        )}
        {data?.clippedFrom && (
          <Alert className="rounded-2xl">
            <AlertTriangle aria-hidden />
            <AlertTitle>This feed starts on {formatDate(data.clippedFrom)}</AlertTitle>
            <AlertDescription>
              <p>
                It keeps {RETENTION_DAYS} days. For earlier activity,{" "}
                <Link href="/reports?report=audit-history" className="font-medium text-primary underline underline-offset-4">
                  open the audit report
                </Link>
                .
              </p>
            </AlertDescription>
          </Alert>
        )}

        {list.error ? (
          <StateMessage state="error" title="Couldn't load activity" description={list.error.message} onRetry={list.refetch} />
        ) : list.loading || !data ? (
          <div className="flex flex-col gap-2" aria-busy>
            <span className="sr-only">Loading activity</span>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : data.total === 0 ? (
          filtered ? (
            <StateMessage
              state="filtered-empty"
              title="No activity matches these filters"
              description={`In ${formatDateRange(range.from, range.to)}. The search covers every page, not just this one.`}
              action={
                <Button size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <StateMessage state="empty" title="No activity recorded in this period" description={formatDateRange(range.from, range.to)} />
          )
        ) : (
          <>
            <ol className="flex flex-col" aria-label="Activity, newest first">
              {data.items.map((item, i) => {
                const day = branchDay(item.event.occurred_at)
                const heading = i === 0 || day !== branchDay(data.items[i - 1]!.event.occurred_at)
                return (
                  <li key={item.event.id} className="flex flex-col">
                    {heading && (
                      // The date repeats at the top of every page, so no page starts without one.
                      <h3 className="sticky top-14 z-[1] bg-card/95 px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground backdrop-blur">
                        {formatDayHeading(day)}
                        {i === 0 && data.continuesDay && <span className="font-normal"> (continued)</span>}
                      </h3>
                    )}
                    <ul>
                      <EventRow item={item} href={url.href({ event: item.event.id })} />
                    </ul>
                  </li>
                )
              })}
            </ol>

            <nav aria-label="Pagination" className="flex items-center justify-between gap-2 border-t pt-4">
              {data.page > 1 ? (
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link href={url.href({ page: data.page - 1 === 1 ? null : String(data.page - 1) })} scroll={false}>
                    <ChevronLeft aria-hidden />
                    Newer
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full" disabled>
                  <ChevronLeft aria-hidden />
                  Newer
                </Button>
              )}
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Page {data.page} of {data.pageCount}
              </p>
              {data.page < data.pageCount ? (
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link href={url.href({ page: String(data.page + 1) })} scroll={false}>
                    Older
                    <ChevronRight aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full" disabled>
                  Older
                  <ChevronRight aria-hidden />
                </Button>
              )}
            </nav>
          </>
        )}
      </div>

      {openId && <ActivityDrawer id={openId} eventHref={(id) => url.href({ event: id })} onClose={() => url.set({ event: null })} />}
    </PageBody>
  )
}

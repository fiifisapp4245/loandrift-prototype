"use client"

import Link from "next/link"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, CircleDot } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { FilterSelect, optionLabel } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { KpiCard } from "@/components/patterns/kpi-card"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchNotifications, isRead, setNotificationRead, useReadStateVersion, type Simulation } from "@/lib/api/workspace"
import { DEMO_AS_OF } from "@/lib/fixtures"
import { ageInDays, formatCount, formatDateTime } from "@/lib/format"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"
import { cn } from "@/lib/utils"
import { NOTIFICATION_TYPES, type DemoNotification, type NotificationType, type Urgency } from "@/lib/workspace-fixtures"

const TYPE_OPTIONS = Object.entries(NOTIFICATION_TYPES).map(([value, label]) => ({ value, label }))
const URGENCY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
]
const WHEN_OPTIONS = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
]

/** Whether the work behind the alert is done, from its own record. Never derived from read state. */
function TaskBadge({ task }: { task: DemoNotification["task"] }) {
  if (!task) return <span className="text-xs text-muted-foreground">No task</span>
  return task.resolved ? (
    <StatusBadge status={{ label: "Task done", tone: "success", description: task.label }} />
  ) : (
    <StatusBadge status={{ label: "Task open", tone: "warning", description: task.label }} />
  )
}

export function NotificationsView() {
  const params = useSearchParams()
  const url = useUrlState()
  useReadStateVersion()
  const [announcement, setAnnouncement] = useState("")

  const unreadOnly = url.get("show") === "unread"
  const q = url.get("q")
  const type = url.get("type")
  const urgency = url.get("urgency")
  const when = url.get("when")
  const demo = params.get("demo")
  const sim: Simulation = demo === "slow" || demo === "error" ? demo : "none"

  const list = useQuery(`notifications:${sim}`, () => fetchNotifications(sim))
  const all = list.data ?? []
  const needle = q.trim().toLowerCase()
  const matching = all.filter(
    (n) =>
      (!needle || [n.borrower, n.loanRef, n.title].some((v) => v?.toLowerCase().includes(needle))) &&
      (!type || n.type === (type as NotificationType)) &&
      (!urgency || n.urgency === (urgency as Urgency)) &&
      (!when || ageInDays(n.at, DEMO_AS_OF) <= Number(when)),
  )
  const rows = unreadOnly ? matching.filter((n) => !isRead(n)) : matching

  const unread = all.filter((n) => !isRead(n)).length
  const openTasks = all.filter((n) => n.task && !n.task.resolved).length
  const lastWeek = all.filter((n) => ageInDays(n.at, DEMO_AS_OF) <= 7).length

  const active: ActiveFilter[] = [
    type && { id: "type", label: "Type", value: optionLabel(TYPE_OPTIONS, type) },
    urgency && { id: "urgency", label: "Urgency", value: optionLabel(URGENCY_OPTIONS, urgency) },
    when && { id: "when", label: "Received", value: optionLabel(WHEN_OPTIONS, when) },
  ].filter(Boolean) as ActiveFilter[]
  const clearAll = () => url.set({ q: null, type: null, urgency: null, when: null })
  const filtered = active.length > 0 || needle.length > 0

  async function toggleRead(n: DemoNotification) {
    const next = !isRead(n)
    await setNotificationRead([n.id], next)
    setAnnouncement(`${n.title} marked as ${next ? "read" : "unread"}.`)
  }

  return (
    <PageBody>
      <PageHeader eyebrow="Workspace" title="Notifications" />

      <section aria-labelledby="notif-summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <h2 id="notif-summary" className="sr-only">
          Summary
        </h2>
        <KpiCard
          label="Unread alerts"
          value={list.data ? { text: formatCount(unread) } : null}
          loading={list.loading}
          definition="Alerts you haven't marked as read. Reading an alert doesn't resolve the work behind it."
        />
        <KpiCard
          label="Open tasks behind alerts"
          value={list.data ? { text: formatCount(openTasks) } : null}
          loading={list.loading}
          definition="Accounts or decisions still outstanding according to their own records, whether or not you've read the alert."
          href="/collections"
          hrefLabel="View collections"
        />
        <KpiCard
          label="Alerts, last 7 days"
          value={list.data ? { text: formatCount(lastWeek) } : null}
          loading={list.loading}
          definition="Every alert event received in the last 7 days, read or unread. A count of events, not of accounts."
        />
      </section>

      <div role="group" aria-label="Show" className="inline-flex w-fit rounded-lg border bg-card p-0.5">
        {[
          { value: "all", label: "All", count: matching.length },
          { value: "unread", label: "Unread", count: matching.filter((n) => !isRead(n)).length },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={(o.value === "unread") === unreadOnly}
            onClick={() => url.set({ show: o.value === "unread" ? "unread" : null })}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground",
              (o.value === "unread") === unreadOnly && "bg-brand-subtle text-brand-subtle-foreground",
            )}
          >
            {o.label}
            {list.data && <span className="tabular rounded-full bg-muted px-1.5 text-xs">{formatCount(o.count)}</span>}
          </button>
        ))}
      </div>

      <FilterToolbar
        searchLabel="Search notifications"
        searchPlaceholder="Borrower or loan reference"
        search={q}
        onSearchChange={(v) => url.set({ q: v })}
        active={active}
        onRemove={(id) => url.set({ [id]: null })}
        onClearAll={clearAll}
        resultCount={list.data ? rows.length : null}
        totalCount={list.data ? all.length : undefined}
        noun={unreadOnly ? "unread notifications" : "notifications"}
        filters={
          <>
            <FilterSelect label="Type" value={type} onChange={(v) => url.set({ type: v })} options={TYPE_OPTIONS} />
            <FilterSelect label="Urgency" value={urgency} onChange={(v) => url.set({ urgency: v })} options={URGENCY_OPTIONS} />
            <FilterSelect label="Received" value={when} onChange={(v) => url.set({ when: v })} options={WHEN_OPTIONS} anyLabel="Any time" />
          </>
        }
      />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {list.error ? (
        <StateMessage state="error" title="Couldn't load notifications" description={list.error.message} onRetry={list.refetch} />
      ) : list.loading ? (
        <div className="flex flex-col gap-2" aria-busy>
          <span className="sr-only">Loading notifications</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <StateMessage state="empty" title="No notifications yet" description="Alerts about due payments, arrears and approvals appear here." />
      ) : rows.length === 0 ? (
        filtered ? (
          <StateMessage
            state="filtered-empty"
            title="No notifications match these filters"
            description="This says nothing about whether payments or approvals are settled."
            action={
              <Button size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <StateMessage
            state="empty"
            title="No unread notifications"
            description={
              openTasks > 0
                ? `${formatCount(openTasks)} task${openTasks === 1 ? " is" : "s are"} still open behind your alerts.`
                : "All tasks behind your alerts are done."
            }
            action={
              <Button size="sm" variant="outline" onClick={() => url.set({ show: null })}>
                Show all
              </Button>
            }
          />
        )
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card" aria-label="Notifications">
          {rows.map((n) => {
            const read = isRead(n)
            return (
              <li key={n.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <span className="mt-1.5 flex w-3 shrink-0 justify-center">
                  {read ? (
                    <span className="sr-only">Read</span>
                  ) : (
                    <span role="img" aria-label="Unread" className="size-2 rounded-full bg-primary" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("text-sm", read ? "font-normal" : "font-semibold")}>{n.title}</span>
                    {n.urgency === "high" && <StatusBadge status={{ label: "High urgency", tone: "danger", description: "" }} />}
                  </p>
                  <p className="text-sm text-muted-foreground">{n.detail}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {n.loanRef && <EntityRef reference={n.loanRef} href={`/loans/${n.loanRef}`} className="inline-flex" />}
                    {n.borrower && <span>{n.borrower}</span>}
                    <span>{NOTIFICATION_TYPES[n.type]}</span>
                    <time dateTime={n.at}>{formatDateTime(n.at)}</time>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <TaskBadge task={n.task} />
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => toggleRead(n)} aria-label={`${read ? "Mark unread" : "Mark read"}: ${n.title}, ${n.borrower ?? n.id}`}>
                      {read ? <CircleDot aria-hidden /> : <CheckCircle2 aria-hidden />}
                      {read ? "Mark unread" : "Mark read"}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={n.href} aria-label={`Open record for ${n.title}, ${n.borrower ?? n.id}`}>
                        Open record
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </PageBody>
  )
}

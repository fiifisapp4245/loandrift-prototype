"use client"

import Link from "next/link"
import { useEffect, useRef, useSyncExternalStore } from "react"
import { format, parseISO } from "date-fns"
import { AlertTriangle, ArrowDownLeft, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  INSTALLMENT_STATE,
  calendarDays,
  isValidDate,
  shiftAnchor,
  visibleRange,
  type CalendarView as View,
  type DaySummary,
  type ScheduledItem,
} from "@/lib/api/calendar"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatMoney } from "@/lib/format"
import type { Money } from "@/lib/types"
import { useUrlState } from "@/lib/use-url-state"
import { cn } from "@/lib/utils"

const VIEW_KEY = "loandrift.calendar.view"
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// The remembered view: an explicit choice on this device. Null on the server and when unset or
// unreadable (private mode, blocked storage), so the page always renders without it.
const viewListeners = new Set<() => void>()
function readStoredView(): View | null {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === "week" || v === "month" ? v : null
  } catch {
    return null
  }
}
function storeView(v: View) {
  try {
    localStorage.setItem(VIEW_KEY, v)
  } catch {}
  viewListeners.forEach((l) => l())
}
function subscribeView(l: () => void) {
  viewListeners.add(l)
  window.addEventListener("storage", l)
  return () => {
    viewListeners.delete(l)
    window.removeEventListener("storage", l)
  }
}

const longDate = (d: string) => format(parseISO(d), "EEEE d MMMM yyyy")

/** Sums per currency; different currencies are listed side by side, never added. */
function totals(items: { amount: Money }[]) {
  const by = new Map<string, number>()
  for (const { amount } of items) by.set(amount.currency, (by.get(amount.currency) ?? 0) + amount.minor)
  return [...by].map(([currency, minor]) => formatMoney({ minor, currency })).join(" + ")
}

const CHIP = {
  due: { icon: Clock, className: "bg-warning-subtle text-foreground" },
  missed: { icon: AlertTriangle, className: "bg-danger-subtle text-danger" },
  receipt: { icon: ArrowDownLeft, className: "bg-success-subtle text-success" },
} as const

/** Icon and count on phones, with the word from sm up. The icon, not the colour, tells them apart. */
function Chip({ tone, count, word }: { tone: keyof typeof CHIP; count: number; word: string }) {
  const { icon: Icon, className } = CHIP[tone]
  return (
    <span className={cn("flex w-fit max-w-full items-center gap-0.5 rounded-md px-1 py-0.5 text-[11px] leading-tight font-medium sm:px-1.5", className)}>
      <Icon aria-hidden className="size-3 shrink-0" />
      <span className="truncate">
        {count}
        <span className="sr-only sm:not-sr-only"> {word}</span>
      </span>
    </span>
  )
}

function KeySwatch({ tone }: { tone: keyof typeof CHIP }) {
  const { icon: Icon, className } = CHIP[tone]
  return (
    <span aria-hidden className={cn("flex size-4 items-center justify-center rounded", className)}>
      <Icon className="size-3" />
    </span>
  )
}

function DayChips({ day }: { day: DaySummary }) {
  return (
    <>
      {day.dueCount > 0 && <Chip tone="due" count={day.dueCount} word="due" />}
      {day.missedCount > 0 && <Chip tone="missed" count={day.missedCount} word="missed" />}
      {day.receipts.length > 0 && <Chip tone="receipt" count={day.receipts.length} word={day.receipts.length === 1 ? "receipt" : "receipts"} />}
    </>
  )
}

function ScheduledRow({ x }: { x: ScheduledItem }) {
  const s = INSTALLMENT_STATE[x.state]
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-sm">
      <EntityRef reference={x.loanRef} href={`/loans/${x.loanRef}?tab=schedule`} context={x.borrower} className="min-w-0 flex-1" />
      <span className="text-xs text-muted-foreground">
        Installment {x.number} of {x.of}
      </span>
      <span className="text-right">
        <span className="block font-medium tabular">{formatMoney(x.state === "paid" ? x.due : x.remaining)}</span>
        <span className="block text-xs text-muted-foreground">
          {x.state === "paid" ? "scheduled, paid" : x.paid.minor > 0 ? `still owed of ${formatMoney(x.due)}` : "scheduled"}
        </span>
      </span>
      <StatusBadge status={{ label: s.label, tone: s.tone, description: "" }} />
    </li>
  )
}

function DayDetail({ day, headingLevel = "h3" }: { day: DaySummary; headingLevel?: "h3" | "h4" }) {
  const H = headingLevel
  const owed = day.scheduled.filter((x) => x.state !== "paid" && x.state !== "not_collected")
  return (
    <div className="flex flex-col gap-3">
      <div>
        <H className="text-sm font-semibold">
          Scheduled <span className="font-normal text-muted-foreground">({day.scheduled.length})</span>
        </H>
        {day.scheduled.length ? (
          <>
            <ul className="mt-2 flex flex-col gap-1.5">
              {day.scheduled.map((x) => (
                <ScheduledRow key={`${x.loanRef}-${x.number}`} x={x} />
              ))}
            </ul>
            {owed.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">Still owed for this day: {totals(owed.map((x) => ({ amount: x.remaining })))}</p>}
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No installments scheduled.</p>
        )}
      </div>
      <div>
        <H className="text-sm font-semibold">
          Received <span className="font-normal text-muted-foreground">({day.receipts.length})</span>
        </H>
        {day.receipts.length ? (
          <>
            <ul className="mt-2 flex flex-col gap-1.5">
              {day.receipts.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-sm">
                  <EntityRef reference={r.loanRef} href={`/loans/${r.loanRef}`} context={r.borrower} className="min-w-0 flex-1" />
                  <Link href={`/transactions?tx=${r.id}`} className="font-mono text-xs text-primary underline underline-offset-2">
                    {r.ref}
                  </Link>
                  <span className="text-right">
                    <span className="block font-medium tabular">{formatMoney(r.amount)}</span>
                    {r.method && <span className="block text-xs text-muted-foreground">{r.method}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-muted-foreground">Received this day: {totals(day.receipts)}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No receipts recorded.
            {owed.length > 0 && ` ${owed.length} ${owed.length === 1 ? "installment is" : "installments are"} still due, so this isn't a quiet day.`}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Calendar (R3, F71). Opens on the current month at the business date. The view (month or week)
 * is in the URL and remembered on this device; the selected day is in the URL too, so Back,
 * reload and shared links return to it.
 */
export function CalendarView() {
  const url = useUrlState()
  const rawDate = url.get("date")
  const date = isValidDate(rawDate) ? rawDate : DEMO_TODAY
  const viewParam = url.get("view")
  // The URL wins; otherwise an explicit choice from an earlier visit on this device, read after mount.
  const stored = useSyncExternalStore(subscribeView, readStoredView, () => null)
  const view: View = viewParam === "week" || viewParam === "month" ? viewParam : (stored ?? "month")
  const headingRef = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)

  useEffect(() => {
    if (moved.current) headingRef.current?.focus()
    moved.current = false
  }, [date, view])

  const days = calendarDays(visibleRange(view, date))
  const selected = days.find((d) => d.date === date) ?? calendarDays([date])[0]
  const month = format(parseISO(date), "MMMM yyyy")
  const title = view === "month" ? month : `Week of ${format(parseISO(days[0].date), "d MMMM yyyy")}`
  const inMonth = (d: string) => d.slice(0, 7) === date.slice(0, 7)
  const periodDays = view === "month" ? days.filter((d) => inMonth(d.date)) : days

  function go(patch: { date?: string; view?: View }) {
    moved.current = true
    const next = patch.date ?? date
    const nextView = patch.view ?? view
    // Month is the default, so it only needs naming when a stored Week choice would otherwise win.
    url.set({ date: next === DEMO_TODAY ? null : next, view: nextView === "week" ? "week" : stored === "week" ? "month" : null })
  }

  function chooseView(v: View) {
    storeView(v)
    moved.current = true
    url.set({ date: date === DEMO_TODAY ? null : date, view: v === "week" ? "week" : null })
  }

  const dueTotal = periodDays.reduce((t, d) => t + d.dueCount, 0)
  const missedTotal = periodDays.reduce((t, d) => t + d.missedCount, 0)
  const receiptTotal = periodDays.reduce((t, d) => t + d.receipts.length, 0)

  return (
    <PageBody>
      <PageHeader eyebrow="Lending" title="Calendar" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_24rem]">
        <section aria-labelledby="cal-period" className="flex min-w-0 flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <h2 id="cal-period" ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
                {title}
              </h2>
              <InfoTip label="the calendar">
                Scheduled installments come from each loan&rsquo;s schedule, the same one the dashboard uses for due work. Receipts come from the
                ledger. They&rsquo;re shown separately: a day with no receipts can still have amounts due.
              </InfoTip>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => go({ date: shiftAnchor(view, date, -1) })}>
                  <ChevronLeft aria-hidden />
                  <span>Previous {view}</span>
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => go({ date: DEMO_TODAY })} disabled={date === DEMO_TODAY}>
                  Today
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => go({ date: shiftAnchor(view, date, 1) })}>
                  <span>Next {view}</span>
                  <ChevronRight aria-hidden />
                </Button>
              </div>
              <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && chooseView(v as View)} aria-label="Calendar view">
                <ToggleGroupItem value="month" className="px-3">
                  Month
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="px-3">
                  Week
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {view === "month" ? `In ${month}` : "This week"}: {dueTotal} due or upcoming, {missedTotal} missed, {receiptTotal}{" "}
            {receiptTotal === 1 ? "receipt" : "receipts"}. Business date {format(parseISO(DEMO_TODAY), "d MMMM yyyy")}.
          </p>

          {view === "month" ? (
            <table className="w-full table-fixed border-separate border-spacing-1">
              <caption className="sr-only">{month}. Choose a day to see its installments and receipts.</caption>
              <thead>
                <tr>
                  {WEEKDAYS.map((d) => (
                    <th key={d} scope="col" className="pb-1 text-xs font-medium text-muted-foreground">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: days.length / 7 }, (_, w) => (
                  <tr key={w}>
                    {days.slice(w * 7, w * 7 + 7).map((d) => {
                      const isSel = d.date === date
                      const isToday = d.date === DEMO_TODAY
                      return (
                        <td key={d.date} className="h-20 p-0 align-top sm:h-24">
                          <Link
                            href={url.href({ date: d.date === DEMO_TODAY ? null : d.date })}
                            scroll={false}
                            aria-current={isSel ? "date" : undefined}
                            className={cn(
                              "flex h-full flex-col gap-0.5 overflow-hidden rounded-xl border p-1 text-left hover:bg-muted/60 sm:p-1.5",
                              !inMonth(d.date) && "bg-muted/30 text-muted-foreground",
                              isSel && "border-primary ring-2 ring-primary/30",
                            )}
                          >
                            <span className={cn("text-xs font-medium tabular", isToday && "w-fit rounded-full bg-primary px-1.5 text-primary-foreground")}>
                              <span className="sr-only">{longDate(d.date)}{isToday && ", today"}</span>
                              <span aria-hidden>{Number(d.date.slice(8))}</span>
                            </span>
                            <DayChips day={d} />
                            {d.dueCount + d.missedCount + d.receipts.length === 0 && <span className="sr-only">Nothing scheduled or received</span>}
                          </Link>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ol className="flex flex-col gap-3">
              {days.map((d) => (
                <li key={d.date} className={cn("rounded-2xl border p-4", d.date === date && "border-primary")}>
                  <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <Link href={url.href({ view: "week", date: d.date === DEMO_TODAY ? null : d.date })} scroll={false} aria-current={d.date === date ? "date" : undefined} className="hover:underline">
                      {longDate(d.date)}
                    </Link>
                    {d.date === DEMO_TODAY && <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">Today</span>}
                  </h3>
                  {d.scheduled.length + d.receipts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing scheduled or received.</p>
                  ) : (
                    <DayDetail day={d} headingLevel="h4" />
                  )}
                </li>
              ))}
            </ol>
          )}

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Key">
            <li className="flex items-center gap-1.5">
              <KeySwatch tone="due" /> Due: today or upcoming, still owed
            </li>
            <li className="flex items-center gap-1.5">
              <KeySwatch tone="missed" /> Missed: past due and not fully paid
            </li>
            <li className="flex items-center gap-1.5">
              <KeySwatch tone="receipt" /> Receipt: money received
            </li>
          </ul>
        </section>

        {view === "month" && (
          <section aria-labelledby="cal-day" className="flex flex-col gap-3 self-start rounded-3xl border bg-card p-5 sm:p-6 xl:sticky xl:top-20">
            <h2 id="cal-day" className="text-base font-semibold">
              {longDate(selected.date)}
              {selected.date === DEMO_TODAY && <span className="ml-2 rounded-full bg-primary px-2 text-xs text-primary-foreground">Today</span>}
            </h2>
            <DayDetail day={selected} />
          </section>
        )}
      </div>
    </PageBody>
  )
}

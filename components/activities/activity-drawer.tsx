"use client"

import Link from "next/link"
import { Link2 } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { StateMessage } from "@/components/patterns/state-message"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  ACTION_LABELS,
  MODULE_LABELS,
  describe,
  eventAmount,
  fieldLabel,
  formatFieldValue,
  getActivity,
  sentenceText,
} from "@/lib/api/activities"
import { formatDateTime, formatMoney } from "@/lib/format"

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/**
 * Read-only detail for one event: identity, before/after values, source timestamps, linked
 * events and the raw record. Opened from ?event=; closing restores focus to the row that opened it.
 */
export function ActivityDrawer({ id, eventHref, onClose }: { id: string; eventHref: (id: string) => string; onClose: () => void }) {
  const item = getActivity(id)
  const e = item?.event
  const s = e && describe(e)
  const money = e && eventAmount(e)
  const currency = e?.amount?.currency ?? "GHS"

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-lg"
        onCloseAutoFocus={(ev) => {
          const origin = document.querySelector<HTMLElement>(`[data-event-id="${id}"]`)
          if (origin) {
            ev.preventDefault()
            origin.focus()
          }
        }}
      >
        {!e || !s || !item ? (
          <>
            <SheetHeader>
              <SheetTitle>Event {id}</SheetTitle>
              <SheetDescription className="sr-only">Event not found</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <StateMessage
                state="unavailable"
                title="This event isn't available"
                description="It may be older than the feed keeps. Earlier activity is in the audit report."
              />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="border-b">
              <p className="font-mono text-xs text-muted-foreground">{e.id}</p>
              <SheetTitle className="text-base leading-snug">
                {s.actor} {s.verb} <span className="font-mono text-[0.95em]">{s.object}</span>
              </SheetTitle>
              <SheetDescription>{ACTION_LABELS[e.action]} · {MODULE_LABELS[e.module]}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <dl className="divide-y">
                <Row term="Who">{s.actor}</Row>
                <Row term="Record">
                  {e.entity.type === "loan" || e.entity.type === "client" ? (
                    <EntityRef reference={e.entity.ref} href={`/${e.entity.type}s/${e.entity.ref}`} context={e.entity.label} />
                  ) : (
                    <span className="flex flex-col">
                      <span className="font-mono text-[13px] font-medium break-all">{e.entity.ref}</span>
                      {e.entity.label && <span className="text-xs text-muted-foreground">{e.entity.label}</span>}
                    </span>
                  )}
                </Row>
                {money && <Row term="Amount">{formatMoney(money)}</Row>}
                <Row term="Happened">{formatDateTime(e.occurred_at)}</Row>
                {e.recorded_at && e.recorded_at !== e.occurred_at && <Row term="Recorded">{formatDateTime(e.recorded_at)}</Row>}
                {e.note && <Row term="Note">“{e.note}”</Row>}
              </dl>

              <h3 className="mt-5 mb-2 text-sm font-semibold">Changes</h3>
              {e.changes === undefined ? (
                e.action === "updated" ? (
                  <p className="rounded-xl bg-warning-subtle px-3 py-2 text-sm text-warning">
                    The source didn&rsquo;t record which fields changed.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not applicable to this event.</p>
                )
              ) : e.changes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Saved with no field changes.</p>
              ) : (
                <div tabIndex={0} role="region" aria-label="Field changes, scrolls sideways" className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Field changes</caption>
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">Field</th>
                        <th scope="col" className="px-3 py-2 font-medium">Before</th>
                        <th scope="col" className="px-3 py-2 font-medium">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.changes.map((c) => (
                        <tr key={c.field} className="border-t">
                          <th scope="row" className="px-3 py-2 font-medium">{fieldLabel(c.field)}</th>
                          <td className="px-3 py-2 text-muted-foreground">{formatFieldValue(c.field, c.before, currency)}</td>
                          <td className="px-3 py-2">{formatFieldValue(c.field, c.after, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="mt-5 mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Link2 aria-hidden className="size-4 text-muted-foreground" />
                Linked events
              </h3>
              {item.related.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {e.correlation_id ? "No other events share this correlation ID." : "None recorded. Events are only linked when the source gives them a shared correlation ID."}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {item.related.map((r) => {
                    const rs = describe(r)
                    const rm = eventAmount(r)
                    return (
                      <li key={r.id}>
                        <Link
                          href={eventHref(r.id)}
                          scroll={false}
                          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-muted/60"
                          aria-label={`${sentenceText(rs)}, ${formatDateTime(r.occurred_at)}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-xs" title={rs.object}>{rs.object}</span>
                            <span className="text-xs text-muted-foreground">{ACTION_LABELS[r.action]}</span>
                          </span>
                          {rm && <span className="tabular shrink-0 font-medium">{formatMoney(rm)}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}

              <details className="mt-5 rounded-xl border px-3 py-2 text-sm">
                <summary className="cursor-pointer font-medium">Technical details</summary>
                <dl className="mt-2 divide-y">
                  <Row term="Event ID"><span className="font-mono text-xs">{e.id}</span></Row>
                  <Row term="Correlation ID"><span className="font-mono text-xs">{e.correlation_id ?? "None recorded"}</span></Row>
                  <Row term="Source time"><span className="font-mono text-xs">{e.occurred_at}</span></Row>
                </dl>
                <p className="mt-2 mb-1 text-xs text-muted-foreground">Raw record, as received</p>
                <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-2 font-mono text-[11px] leading-relaxed">{JSON.stringify(e, null, 2)}</pre>
              </details>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

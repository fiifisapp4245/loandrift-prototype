"use client"

import Link from "next/link"
import { useId, useRef, useState, useSyncExternalStore } from "react"
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  CHANNELS,
  DEFAULT_CONTACT_AT,
  OUTCOMES,
  PROMISE_STATUS,
  accounts,
  contactsFor,
  contactsVersion,
  logContact,
  outcomesFor,
  promiseStatus,
  subscribeContacts,
  validateContact,
  type Account,
  type Channel,
  type ContactDraft,
  type ContactErrors,
  type Outcome,
} from "@/lib/api/collections"
import { formatDate, formatDateTime, formatMoney, formatMoneyValue } from "@/lib/format"
import { cn } from "@/lib/utils"

const selectClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm aria-invalid:border-destructive"
const EMPTY: ContactDraft = { channel: "", outcome: "", at: DEFAULT_CONTACT_AT, amount: "", by: "", note: "" }

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: React.ReactNode
  error?: string
  children: (p: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; "aria-required"?: boolean }) => React.ReactNode
}) {
  const base = useId()
  const hintId = hint ? `${base}-h` : undefined
  const errId = error ? `${base}-e` : undefined
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-muted-foreground"> (required)</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      {children({ id, "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined, "aria-invalid": error ? true : undefined, "aria-required": required || undefined })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function ContactForm({ account, onDone, onCancel }: { account: Account; onDone: () => void; onCancel: () => void }) {
  const [d, setD] = useState<ContactDraft>(EMPTY)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [saving, setSaving] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const set = (k: keyof ContactDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: e.target.value }))
  const outcomes = outcomesFor(d.channel)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const found = validateContact(d, account)
    setErrors(found)
    if (Object.keys(found).length) return requestAnimationFrame(() => summaryRef.current?.focus())
    setSaving(true)
    const r = await logContact(account.ref, d, account)
    setSaving(false)
    if (!r.ok) {
      setErrors(r.errors)
      return requestAnimationFrame(() => summaryRef.current?.focus())
    }
    onDone()
  }

  const errorCount = Object.keys(errors).length
  return (
    <form noValidate onSubmit={submit} aria-labelledby="log-contact-heading" className="flex flex-col gap-4 rounded-2xl border p-4">
      <div>
        <h3 id="log-contact-heading" className="text-sm font-semibold">
          Log a contact
        </h3>
        <p className="text-xs text-muted-foreground">Records a contact that already happened. Nothing is called, texted or emailed from here.</p>
      </div>

      {errorCount > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl bg-danger-subtle p-3 text-sm text-danger outline-none">
          Check {errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`}.
        </div>
      )}

      <Field id="ct-channel" label="How you contacted them" required error={errors.channel}>
        {(p) => (
          <select
            {...p}
            className={cn(selectClass, !d.channel && "text-muted-foreground")}
            value={d.channel}
            onChange={(e) => {
              const channel = e.target.value as Channel | ""
              // Drop an outcome the new channel can't produce, rather than keep a contradiction.
              setD((x) => ({ ...x, channel, outcome: x.outcome && channel && outcomesFor(channel).includes(x.outcome) ? x.outcome : "" }))
            }}
          >
            <option value="">Choose…</option>
            {(Object.keys(CHANNELS) as Channel[]).map((ch) => (
              <option key={ch} value={ch}>
                {CHANNELS[ch]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field id="ct-outcome" label="What happened" required hint={!d.channel ? "Choose how you contacted them first; the options depend on it." : undefined} error={errors.outcome}>
        {(p) => (
          <select {...p} disabled={!d.channel} className={cn(selectClass, !d.outcome && "text-muted-foreground")} value={d.outcome} onChange={set("outcome")}>
            <option value="">Choose…</option>
            {outcomes.map((o) => (
              <option key={o} value={o}>
                {OUTCOMES[o].label}
              </option>
            ))}
          </select>
        )}
      </Field>

      {d.outcome === "says_paid" && (
        <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            This records what the borrower said. It doesn&rsquo;t record a payment or change what&rsquo;s owed. Check{" "}
            <Link href={`/repayments?tab=history&q=${account.ref}`} className="text-primary underline underline-offset-2">
              Repayments
            </Link>{" "}
            for a receipt.
          </span>
        </p>
      )}

      {d.outcome === "promised" && (
        <fieldset className="grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">The promise</legend>
          <Field id="ct-amount" label={`Amount promised (${account.position.currency === "GHS" ? "GH₵" : account.position.currency})`} required hint={`Past due: ${formatMoneyValue(account.position.pastDue)}`} error={errors.amount}>
            {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={d.amount} onChange={set("amount")} />}
          </Field>
          <Field id="ct-by" label="Promised to pay by" required error={errors.by}>
            {(p) => <Input {...p} type="date" value={d.by} onChange={set("by")} />}
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">Its status is worked out from receipts: kept once receipts by that date cover the amount.</p>
        </fieldset>
      )}

      <Field
        id="ct-at"
        label="When the contact happened"
        required
        hint="Accra time (GMT). Starts at the current business time; change it if you're logging an earlier contact."
        error={errors.at}
      >
        {(p) => <Input {...p} type="datetime-local" max={DEFAULT_CONTACT_AT} value={d.at} onChange={set("at")} />}
      </Field>

      <Field id="ct-note" label="Note" hint="What was said. Don't include ID or account numbers.">
        {(p) => <textarea {...p} rows={3} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm" value={d.note} onChange={set("note")} />}
      </Field>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 aria-hidden className="animate-spin" />}
          {saving ? "Saving…" : "Save contact"}
        </Button>
      </div>
    </form>
  )
}

/** One account: what's owed, the contact history with promise outcomes, and logging a contact. */
export function AccountDrawer({ loanRef, onClose }: { loanRef: string; onClose: () => void }) {
  useSyncExternalStore(subscribeContacts, contactsVersion, () => 0)
  const account = accounts().find((a) => a.ref === loanRef)
  const history = contactsFor(loanRef)
  const [logging, setLogging] = useState(false)
  const [saved, setSaved] = useState(false)
  const logButton = useRef<HTMLButtonElement>(null)
  const savedRef = useRef<HTMLParagraphElement>(null)

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-lg"
        onCloseAutoFocus={(e) => {
          const origin = document.querySelector<HTMLElement>(`[data-account-ref="${loanRef}"]`)
          if (origin) {
            e.preventDefault()
            origin.focus()
          }
        }}
      >
        {!account ? (
          <>
            <SheetHeader>
              <SheetTitle>{loanRef}</SheetTitle>
              <SheetDescription className="sr-only">Not in arrears</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <StateMessage state="unavailable" title="This loan has nothing past due" description="It isn't on the collections list today." />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="border-b">
              <p className="font-mono text-xs text-muted-foreground">{account.ref}</p>
              <SheetTitle className="text-lg">
                {formatMoneyValue(account.position.pastDue)} past due · {account.daysOverdue} days
              </SheetTitle>
              <SheetDescription>
                {account.borrower} · total balance {formatMoneyValue(account.position.totalBalance)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <EntityRef reference={account.ref} href={`/loans/${account.ref}/repayment`} context="Repayment overview" />
                <Link href={`/clients/${account.borrowerId}`} className="text-sm text-primary underline underline-offset-2">
                  {account.borrower}&rsquo;s profile
                </Link>
              </div>

              {saved && !logging && (
                <p ref={savedRef} tabIndex={-1} role="status" className="mb-3 flex items-center gap-2 rounded-xl bg-success-subtle px-3 py-2 text-sm outline-none">
                  <CheckCircle2 aria-hidden className="size-4 text-success" />
                  Contact saved in this demo only. It&rsquo;s gone after a reload.
                </p>
              )}

              {logging ? (
                <ContactForm
                  account={account}
                  onCancel={() => {
                    setLogging(false)
                    requestAnimationFrame(() => logButton.current?.focus())
                  }}
                  onDone={() => {
                    setLogging(false)
                    setSaved(true)
                    requestAnimationFrame(() => savedRef.current?.focus())
                  }}
                />
              ) : (
                <Button ref={logButton} onClick={() => (setSaved(false), setLogging(true))} className="rounded-full">
                  Log a contact
                </Button>
              )}

              <h3 className="mt-5 mb-2 text-sm font-semibold">Contact history ({history.length})</h3>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contact recorded yet.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {history.map((x) => {
                    const ps = promiseStatus(x)
                    return (
                      <li key={x.id} className="rounded-xl border px-3 py-2 text-sm">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium">{OUTCOMES[x.outcome as Outcome].label}</span>
                          <span className="text-xs text-muted-foreground">
                            {CHANNELS[x.channel]} · {formatDateTime(x.at)} · {x.by}
                          </span>
                        </p>
                        {x.promise && ps && (
                          <p className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusBadge status={{ label: `Promise ${PROMISE_STATUS[ps.status].label.toLowerCase()}`, tone: PROMISE_STATUS[ps.status].tone, description: "" }} />
                            <span className="text-xs text-muted-foreground">
                              {formatMoney(x.promise.amount)} by {formatDate(x.promise.by)}; {formatMoney(ps.received)} received in that time
                            </span>
                          </p>
                        )}
                        {x.outcome === "says_paid" && <p className="mt-1 text-xs text-muted-foreground">What the borrower said, not a recorded payment.</p>}
                        {x.note && <p className="mt-1 text-muted-foreground">{x.note}</p>}
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

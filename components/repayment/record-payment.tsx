"use client"

import { useId, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { previewPayment, type LoanPosition, type PaymentPreview } from "@/lib/domain/loan-position"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatDate, formatMoney, formatMoneyValue } from "@/lib/format"
import { isUnavailable, type Money } from "@/lib/types"
import { cn } from "@/lib/utils"

const METHODS = ["Cash", "Mobile money", "Bank transfer", "Cheque"]

/** "400" or "400.50" → minor units, string maths only. Null if not a valid amount. */
function parseAmount(raw: string): number | null {
  const v = raw.trim().replace(/,/g, "")
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null
  const [whole, frac = ""] = v.split(".")
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2))
}

function major(m: Money) {
  return (m.minor / 100).toFixed(2)
}

type Draft = { amount: string; method: string; reference: string; receivedOn: string }
type Errors = Partial<Record<keyof Draft, string>>

/**
 * Record a payment that was already received outside LoanDrift. It never collects money.
 * Suggested amounts show their breakdown; a review step shows exactly how the payment would be
 * allocated and the resulting position before anything is (mock) recorded.
 */
export function RecordPayment({
  position,
  borrower,
  disbursedOn,
  onClose,
}: {
  position: LoanPosition
  borrower: string
  disbursedOn: string | null
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Draft>({ amount: "", method: "", reference: "", receivedOn: DEMO_TODAY })
  const [errors, setErrors] = useState<Errors>({})
  const [preview, setPreview] = useState<PaymentPreview | null>(null)
  const [state, setState] = useState<"form" | "review" | "saving" | "done">("form")
  const headingRef = useRef<HTMLHeadingElement>(null)
  const ids = { amount: useId(), method: useId(), reference: useId(), receivedOn: useId() }
  const balance = position.totalBalance

  const suggestions: { label: string; amount: Money; breakdown: string }[] = []
  if (!isUnavailable(position.toBringCurrent) && position.toBringCurrent.minor > 0 && !isUnavailable(position.pastDue) && !isUnavailable(position.dueToday))
    suggestions.push({
      label: "To bring current",
      amount: position.toBringCurrent,
      breakdown: `${formatMoney(position.pastDue)} past due + ${formatMoney(position.dueToday)} due today`,
    })
  if (!isUnavailable(position.regularInstallment))
    suggestions.push({ label: "Regular installment", amount: position.regularInstallment, breakdown: "One scheduled installment" })
  if (!isUnavailable(balance) && balance.minor > 0)
    suggestions.push({ label: "Total balance", amount: balance, breakdown: "Clears the schedule. Not a settlement quote." })

  function focusTop() {
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function review(e: React.FormEvent) {
    e.preventDefault()
    const found: Errors = {}
    const minor = parseAmount(draft.amount)
    if (minor === null || minor === 0) found.amount = "Enter an amount in cedis, for example 400 or 400.50."
    else if (!isUnavailable(balance) && minor > balance.minor)
      found.amount = `More than the total balance (${formatMoney(balance)}). Over-payment handling isn't established, so it can't be recorded here.`
    if (!draft.method) found.method = "Choose how the money was received."
    if (!draft.receivedOn) found.receivedOn = "Enter the date the money was received."
    else if (draft.receivedOn > DEMO_TODAY) found.receivedOn = "The date can't be in the future."
    else if (disbursedOn && draft.receivedOn < disbursedOn) found.receivedOn = `The loan was disbursed on ${formatDate(disbursedOn)}. A payment can't be earlier.`
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setPreview(previewPayment(position.ref, minor!))
    setState("review")
    focusTop()
  }

  async function record() {
    setState("saving")
    // Mocked: no mutation endpoint exists in the prototype, and nothing is sent anywhere.
    await new Promise((r) => setTimeout(r, 400))
    setState("done")
    focusTop()
  }

  const describedBy = (k: keyof Draft, hint?: string) => [hint, errors[k] ? `${ids[k]}-error` : undefined].filter(Boolean).join(" ") || undefined
  const errorText = (k: keyof Draft) =>
    errors[k] && (
      <p id={`${ids[k]}-error`} className="flex items-start gap-1 text-xs text-destructive">
        <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
        {errors[k]}
      </p>
    )

  if (state === "done" && preview) {
    return (
      <section aria-labelledby="record-heading" className="flex flex-col items-start gap-3 rounded-3xl border bg-card p-5 sm:p-6" role="status">
        <CheckCircle2 aria-hidden className="size-6 text-success" />
        <h2 id="record-heading" ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
          Checked, not recorded
        </h2>
        <p className="text-sm text-muted-foreground">
          This prototype has no live payment service, so nothing was recorded. In the real app, {formatMoney(preview.amount)} from {borrower} would be
          recorded against {position.ref} and allocated as you reviewed.
        </p>
        <Button variant="outline" className="rounded-full" onClick={onClose}>
          Close
        </Button>
      </section>
    )
  }

  if ((state === "review" || state === "saving") && preview) {
    const before = preview.before
    const after = preview.after
    return (
      <section aria-labelledby="record-heading" className="flex flex-col gap-5 rounded-3xl border bg-card p-5 sm:p-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Step 2 of 2</p>
          <h2 id="record-heading" ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
            Review the payment
          </h2>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {(
            [
              ["Borrower", borrower],
              ["Loan", <span key="r" className="font-mono">{position.ref}</span>],
              ["Currency", position.currency === "GHS" ? "Ghana cedi (GHS)" : position.currency],
              ["Amount", <span key="a" className="font-semibold tabular">{formatMoney(preview.amount)}</span>],
              ["Received by", draft.method],
              ["Received on", formatDate(draft.receivedOn)],
              ["Reference", draft.reference.trim() || <span key="n" className="text-muted-foreground">None given</span>],
            ] as [string, React.ReactNode][]
          ).map(([t, v]) => (
            <div key={t} className="flex justify-between gap-3 border-b py-1.5">
              <dt className="text-muted-foreground">{t}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold">How it would be allocated</h3>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Allocation of {formatMoney(preview.amount)} to installments</caption>
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Installment</th>
                  <th scope="col" className="px-4 py-2 font-medium">Due</th>
                  <th scope="col" className="px-4 py-2 font-medium">State</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Applied</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Left on it</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((l) => (
                  <tr key={l.number} className="border-t">
                    <th scope="row" className="px-4 py-2 font-normal">#{l.number}</th>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(l.dueDate)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        status={
                          l.status === "past due"
                            ? { label: "Past due", tone: "danger", description: "" }
                            : l.status === "due today"
                              ? { label: "Due today", tone: "info", description: "" }
                              : { label: "Upcoming", tone: "neutral", description: "" }
                        }
                      />
                    </td>
                    <td className="px-4 py-2 text-right tabular font-medium">{formatMoney(l.applied)}</td>
                    <td className="px-4 py-2 text-right tabular">{formatMoney(l.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            Assumed rule: oldest unpaid installment first. How each installment splits between interest and principal isn&rsquo;t established,
            so it isn&rsquo;t shown.
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Result</h3>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            {(
              [
                ["Total balance", formatMoneyValue(before.totalBalance), formatMoneyValue(after.totalBalance)],
                ["To bring current", formatMoneyValue(before.toBringCurrent), formatMoneyValue(after.toBringCurrent)],
                [
                  "Next scheduled",
                  before.nextScheduled ? `${formatMoney(before.nextScheduled.amount)}, ${formatDate(before.nextScheduled.dueDate)}` : "None",
                  after.nextScheduled ? `${formatMoney(after.nextScheduled.amount)}, ${formatDate(after.nextScheduled.dueDate)}` : "None",
                ],
              ] as [string, string, string][]
            ).map(([t, b, a]) => (
              <div key={t} className="rounded-2xl bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">{t}</dt>
                <dd className="mt-1">
                  {b === a ? (
                    // Strike-through implies a change; an unchanged figure says so instead.
                    <>
                      <span className="font-semibold tabular">{a}</span> <span className="text-xs text-muted-foreground">(unchanged)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground line-through decoration-1">{b}</span>
                      <span className="sr-only"> becomes </span>
                      <span aria-hidden> → </span>
                      <span className="font-semibold tabular">{a}</span>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {draft.receivedOn < DEMO_TODAY && (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-warning-subtle px-3 py-2 text-xs text-warning">
              <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
              Backdated to {formatDate(draft.receivedOn)}. Installments that fell due after that date weren&rsquo;t late when it arrived. Penalties
              and overdue history aren&rsquo;t recalculated in this prototype.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={state === "saving"}
            onClick={() => {
              setState("form")
              focusTop()
            }}
          >
            Edit
          </Button>
          <Button className="rounded-full" onClick={record} disabled={state === "saving"}>
            {state === "saving" && <Loader2 aria-hidden className="animate-spin" />}
            {state === "saving" ? "Recording…" : `Record ${formatMoney(preview.amount)}`}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="record-heading" className="flex flex-col gap-5 rounded-3xl border bg-card p-5 sm:p-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Step 1 of 2</p>
        <h2 id="record-heading" ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
          Record an external payment
        </h2>
        <p className="text-sm text-muted-foreground">For money already received in cash, by bank transfer, mobile money or cheque. This doesn&rsquo;t collect anything.</p>
      </div>

      {isUnavailable(balance) ? (
        <p className="flex items-start gap-2 rounded-xl bg-warning-subtle px-3 py-2 text-sm text-warning">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          Payments can&rsquo;t be recorded while the balance is unavailable. {balance.reason}
        </p>
      ) : (
        <form noValidate onSubmit={review} className="flex flex-col gap-5">
          {suggestions.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Suggested amounts</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {suggestions.map((sg) => {
                  const selected = parseAmount(draft.amount) === sg.amount.minor
                  return (
                    <button
                      key={sg.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDraft((d) => ({ ...d, amount: major(sg.amount) }))}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-2xl border p-3 text-left text-sm hover:border-primary/40",
                        selected && "border-primary bg-brand-subtle",
                      )}
                    >
                      <span className="text-xs text-muted-foreground">{sg.label}</span>
                      <span className="font-semibold tabular">{formatMoney(sg.amount)}</span>
                      <span className="text-xs text-muted-foreground">{sg.breakdown}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.amount} className="text-sm font-medium">
                Amount received ({position.currency === "GHS" ? "GH₵" : position.currency}) <span className="text-muted-foreground">(required)</span>
              </label>
              <Input
                id={ids.amount}
                inputMode="decimal"
                autoComplete="off"
                value={draft.amount}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={describedBy("amount")}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              />
              {errorText("amount")}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.method} className="text-sm font-medium">
                Received by <span className="text-muted-foreground">(required)</span>
              </label>
              <select
                id={ids.method}
                value={draft.method}
                aria-invalid={errors.method ? true : undefined}
                aria-describedby={describedBy("method")}
                onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))}
                className={cn("h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm", !draft.method && "text-muted-foreground")}
              >
                <option value="">Choose…</option>
                {METHODS.map((mt) => (
                  <option key={mt}>{mt}</option>
                ))}
              </select>
              {errorText("method")}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.receivedOn} className="text-sm font-medium">
                Received on <span className="text-muted-foreground">(required)</span>
              </label>
              <Input
                id={ids.receivedOn}
                type="date"
                max={DEMO_TODAY}
                value={draft.receivedOn}
                aria-invalid={errors.receivedOn ? true : undefined}
                aria-describedby={describedBy("receivedOn", `${ids.receivedOn}-hint`)}
                onChange={(e) => setDraft((d) => ({ ...d, receivedOn: e.target.value }))}
              />
              <p id={`${ids.receivedOn}-hint`} className="text-xs text-muted-foreground">
                {draft.receivedOn && draft.receivedOn < DEMO_TODAY
                  ? `Backdated: the payment counts from ${formatDate(draft.receivedOn)}, which can change which installments were late.`
                  : "Today, unless the money arrived earlier."}
              </p>
              {errorText("receivedOn")}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.reference} className="text-sm font-medium">
                Reference <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id={ids.reference}
                autoComplete="off"
                value={draft.reference}
                aria-describedby={`${ids.reference}-hint`}
                onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))}
              />
              <p id={`${ids.reference}-hint`} className="text-xs text-muted-foreground">
                Mobile money or bank transaction ID, or cheque number.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" className="rounded-full" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full">
              Review payment
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

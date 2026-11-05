"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Loader2 } from "lucide-react"
import { FormField, RadioChoice, selectClass } from "@/components/patterns/form-field"
import { PageBody } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BASES, FREQUENCIES, PERIODS, clientFor, clientNotes, currencyFor, unitsDiffer } from "@/lib/api/applications"
import {
  LIABILITY,
  PRODUCTS,
  checkGroupLoan,
  durationText,
  emptyGroupLoan,
  getGroup,
  groupCalculation,
  groupLoanNotes,
  includedMembers,
  memberBlockers,
  readyCount,
  totalPrincipal,
  type Group,
  type GroupLoanDraft,
  type GroupLoanErrors,
} from "@/lib/api/groups"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatDate, formatMoney, plural } from "@/lib/format"
import { cn } from "@/lib/utils"

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const symbol = (c: string | null) => (c === "GHS" ? "GH₵" : c)

/**
 * Group loan application (B2-08, F65, F66). Nobody is included and no liability is chosen until
 * staff choose. The final action counts only members ready to apply for and is disabled at zero.
 * Terms and calculation reuse the individual application's checks: there's no group formula.
 */
export function GroupLoanForm({ id }: { id: string }) {
  const g = getGroup(id)
  if (!g) {
    return (
      <PageBody>
        <h1 className="text-2xl font-semibold">Apply for a group loan</h1>
        <StateMessage
          state="unavailable"
          title="This group isn't in the branch"
          action={
            <Button asChild size="sm">
              <Link href="/groups">All groups</Link>
            </Button>
          }
        />
      </PageBody>
    )
  }
  return <Form g={g} />
}

function Form({ g }: { g: Group }) {
  const [d, setD] = useState<GroupLoanDraft>(() => emptyGroupLoan(g))
  const [e, setE] = useState<GroupLoanErrors>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const set = (k: keyof GroupLoanDraft) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD((x) => ({ ...x, [k]: ev.target.value }))
  const setMember = (clientId: string, patch: Partial<{ included: boolean; amount: string }>) =>
    setD((x) => ({ ...x, members: { ...x.members, [clientId]: { ...x.members[clientId], ...patch } } }))

  const currency = currencyFor(d.product)
  const ready = readyCount(d, g)
  const total = totalPrincipal(d, g)
  const included = includedMembers(d, g)
  const calc = groupCalculation(d)
  const duration = durationText(d.installments, d.frequency)
  const notes = groupLoanNotes(g)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setBusy(true)
    const r = await checkGroupLoan(d, g)
    setBusy(false)
    if (r.ok) {
      setE({})
      setDone(r.note)
    } else {
      setE(r.errors)
      requestAnimationFrame(() => summaryRef.current?.focus())
    }
  }

  if (done) {
    return (
      <PageBody className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Apply for a group loan</h1>
        <div role="status" className="flex flex-col items-start gap-3 rounded-3xl border bg-card p-6">
          <CheckCircle2 aria-hidden className="size-6 text-success" />
          <p className="font-semibold">
            All checks passed for {plural(ready, "member")}
            {total && <>, {formatMoney(total)} in total</>}. Nothing was saved.
          </p>
          <p className="text-sm text-muted-foreground">{done}</p>
          <Button asChild className="rounded-full">
            <Link href={`/groups/${g.id}`}>Back to {g.name}</Link>
          </Button>
        </div>
      </PageBody>
    )
  }

  const errorList = Object.values(e)
  return (
    <PageBody className="max-w-3xl">
      <div className="flex flex-col gap-2">
        <Link href={`/groups/${g.id}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {g.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Apply for a group loan</h1>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          Each included member gets their own loan on the same terms. The group&rsquo;s loans are approved, disbursed and collected together. Nothing
          is saved in this prototype.
        </p>
      </div>

      {notes.map((n) => (
        <p key={n} className="flex items-start gap-2 rounded-2xl bg-warning-subtle px-4 py-3 text-sm">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {n}
        </p>
      ))}

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {errorList.length > 0 && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="flex flex-col gap-1 rounded-2xl border border-destructive/30 bg-danger-subtle p-4 text-sm text-danger outline-none">
            <p className="font-medium">
              {errorList.length === 1 ? "One thing needs attention" : `${errorList.length} things need attention`}. Nothing was saved.
            </p>
            <ul className="list-disc pl-5">
              {errorList.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <Section id="gl-members" title="Members" description="Include each member who is borrowing and enter their principal. Only included members with an amount above zero are applied for.">
          <fieldset aria-describedby={e.members ? "gl-members-error" : undefined} className="flex flex-col gap-2">
            <legend className="sr-only">Members to include</legend>
            {g.members.map((m) => {
              const row = d.members[m.clientId]
              const blockers = memberBlockers(m)
              const c = clientFor(m.clientId)
              const info = c ? clientNotes(c) : []
              const err = e[`member-${m.clientId}`]
              return (
                <div key={m.clientId} className={cn("flex flex-col gap-2 rounded-2xl border px-4 py-3", row.included && "border-primary/50 bg-brand-subtle/40")}>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <label className="flex min-w-0 flex-1 basis-56 items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={row.included}
                        disabled={blockers.length > 0}
                        onChange={(ev) => setMember(m.clientId, { included: ev.target.checked })}
                        aria-describedby={blockers.length ? `why-${m.clientId}` : undefined}
                        className="mt-0.5 size-4 accent-[var(--primary)]"
                      />
                      <span>
                        <span className="font-medium">Include {m.name}</span>
                        <span className="block text-xs text-muted-foreground">{m.roleLabel}</span>
                      </span>
                    </label>
                    {row.included && (
                      <FormField id={`gl-amount-${m.clientId}`} label={`Principal for ${m.name.split(" ")[0]}${currency ? ` (${symbol(currency)})` : ""}`} required error={err} className="w-full sm:w-56">
                        {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={row.amount} onChange={(ev) => setMember(m.clientId, { amount: ev.target.value })} />}
                      </FormField>
                    )}
                  </div>
                  {blockers.length > 0 && (
                    <p id={`why-${m.clientId}`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0 text-warning" />
                      Can&rsquo;t be included: {blockers.join(" ")}
                    </p>
                  )}
                  {info.map((n) => (
                    <p key={n} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info aria-hidden className="mt-px size-3.5 shrink-0" />
                      {n}
                    </p>
                  ))}
                </div>
              )
            })}
            {e.members && (
              <p id="gl-members-error" className="flex items-start gap-1 text-xs text-destructive">
                <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
                {e.members}
              </p>
            )}
          </fieldset>
        </Section>

        <Section id="gl-terms" title="Terms" description="Shared by every included member. The same checks as an individual application.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="gl-product" label="Product" required hint={currency ? `Amounts are in ${symbol(currency)}.` : "Sets the currency of every member's amount."} error={e.product}>
              {(p) => (
                <select {...p} className={cn(selectClass, !d.product && "text-muted-foreground")} value={d.product} onChange={set("product")}>
                  <option value="">Choose…</option>
                  {PRODUCTS.map((x) => (
                    <option key={x.name}>{x.name}</option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="gl-rate" label="Interest rate (%)" required hint="As on the product sheet. Not looked up or suggested." error={e.rate}>
              {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={d.rate} onChange={set("rate")} />}
            </FormField>
            <FormField id="gl-period" label="Interest charge period" required hint="The period the rate applies to." error={e.interestPeriod}>
              {(p) => (
                <select {...p} className={cn(selectClass, !d.interestPeriod && "text-muted-foreground")} value={d.interestPeriod} onChange={set("interestPeriod")}>
                  <option value="">Choose…</option>
                  {PERIODS.map((x) => (
                    <option key={x} value={x}>
                      Per {x.toLowerCase()}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="gl-basis" label="Interest basis" required hint="Flat charges on the original principal; reducing balance on what's still owed." error={e.basis}>
              {(p) => (
                <select {...p} className={cn(selectClass, !d.basis && "text-muted-foreground")} value={d.basis} onChange={set("basis")}>
                  <option value="">Choose…</option>
                  {BASES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="gl-frequency" label="Repayment frequency" required hint="How often each member repays." error={e.frequency}>
              {(p) => (
                <select {...p} className={cn(selectClass, !d.frequency && "text-muted-foreground")} value={d.frequency} onChange={set("frequency")}>
                  <option value="">Choose…</option>
                  {FREQUENCIES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="gl-installments" label="Number of installments" required hint={duration ? `Duration: ${duration}.` : "Duration is installments × frequency."} error={e.installments}>
              {(p) => <Input {...p} inputMode="numeric" autoComplete="off" value={d.installments} onChange={set("installments")} />}
            </FormField>
            <FormField id="gl-first" label="First repayment date" required error={e.firstRepaymentOn}>
              {(p) => <Input {...p} type="date" min={DEMO_TODAY} value={d.firstRepaymentOn} onChange={set("firstRepaymentOn")} />}
            </FormField>
          </div>
          {d.interestPeriod && d.frequency && unitsDiffer(d.interestPeriod, d.frequency) && (
            <p className="flex items-start gap-2 rounded-xl bg-warning-subtle px-3 py-2 text-sm">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              The rate is per {d.interestPeriod.toLowerCase()} but repayments are {d.frequency.toLowerCase()}. These are different periods; check them against the
              product sheet.
            </p>
          )}
        </Section>

        <Section id="gl-liability" title="Responsibility for repayment">
          <RadioChoice
            name="gl-liability"
            legend="Liability"
            hint="Which option your product allows is a policy decision. Neither is chosen for you."
            value={d.liability}
            onChange={(v) => setD((x) => ({ ...x, liability: v }))}
            error={e.liability}
            options={(Object.keys(LIABILITY) as (keyof typeof LIABILITY)[]).map((k) => ({ value: k, label: LIABILITY[k].label, description: LIABILITY[k].description }))}
          />
        </Section>

        <Section id="gl-review" title="Review" description="Everything the application would send, together.">
          {included.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members included yet.</p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Included members and their principal</caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-1 font-medium">
                    Member
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Principal
                  </th>
                </tr>
              </thead>
              <tbody>
                {included.map(({ member, valid, principal }) => (
                  <tr key={member.clientId} className="border-t">
                    <td className="py-1.5">{member.name}</td>
                    <td className="py-1.5 text-right tabular">
                      {principal ? formatMoney(principal) : <span className="text-muted-foreground">{valid ? "Choose a product for the currency" : "Amount needed"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <th scope="row" className="py-1.5 text-left">
                    Total principal
                  </th>
                  <td className="py-1.5 text-right tabular">{total ? formatMoney(total) : <span className="font-normal text-muted-foreground">Not yet known</span>}</td>
                </tr>
              </tfoot>
            </table>
          )}
          <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
            {(
              [
                ["Liability", d.liability ? LIABILITY[d.liability as keyof typeof LIABILITY].label : "Not chosen"],
                ["Interest", d.rate && d.interestPeriod ? `${d.rate}% per ${d.interestPeriod.toLowerCase()}${d.basis ? `, ${d.basis.toLowerCase()}` : ""}` : "Incomplete"],
                ["Repayments", d.installments && d.frequency ? `${d.installments} ${d.frequency.toLowerCase()} installments` : "Incomplete"],
                ["Duration", duration ?? "Incomplete"],
                ["First repayment", d.firstRepaymentOn ? formatDate(d.firstRepaymentOn) : "Not chosen"],
              ] as const
            ).map(([t, v]) => (
              <div key={t} className="flex justify-between gap-3 border-b py-1.5">
                <dt className="text-muted-foreground">{t}</dt>
                <dd className={cn("text-right", (v === "Incomplete" || v === "Not chosen") && "text-muted-foreground")}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
            <p className="font-medium">Interest, fees, schedule and total to repay</p>
            {calc.state === "incomplete" ? (
              <p className="text-muted-foreground">Calculation incomplete. Complete the terms first: {calc.missing.length === 1 ? "one is missing or invalid" : `${calc.missing.length} are missing or invalid`}.</p>
            ) : (
              <p className="text-muted-foreground">{calc.reason} The same applies to every member&rsquo;s loan and to the group total.</p>
            )}
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {ready === 0 ? (
            <p id="apply-why" className="text-sm text-muted-foreground">
              Include at least one member with an amount to apply.
            </p>
          ) : (
            included.length > ready && (
              <p className="text-sm text-muted-foreground">
                {included.length - ready} of {included.length} included members still {included.length - ready === 1 ? "needs" : "need"} a valid amount.
              </p>
            )
          )}
          <Button asChild variant="ghost" className="rounded-full">
            <Link href={`/groups/${g.id}`}>Cancel</Link>
          </Button>
          <Button type="submit" className="rounded-full" disabled={busy || ready === 0} aria-describedby={ready === 0 ? "apply-why" : undefined}>
            {busy && <Loader2 aria-hidden className="animate-spin" />}
            {busy ? "Checking…" : ready === 0 ? "Apply" : `Apply for ${plural(ready, "member")}`}
          </Button>
        </div>
      </form>
    </PageBody>
  )
}

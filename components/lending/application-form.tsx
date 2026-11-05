"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Circle, Info, Loader2, Lock, Plus, Trash2 } from "lucide-react"
import { PageBody } from "@/components/patterns/page-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  BASES,
  EMPTY_APPLICATION,
  FREQUENCIES,
  LOCKED_REASON,
  PENALTY_TYPES,
  PERIODS,
  PRODUCTS,
  SECTIONS,
  calculationState,
  checkApplication,
  clientBlockers,
  clientFor,
  clientNotes,
  currencyFor,
  requirements,
  sectionState,
  unitsDiffer,
  validateOptional,
  validatePenalty,
  validateTerms,
  type AppErrors,
  type ApplicationDraft,
  type SectionId,
  type SectionState,
} from "@/lib/api/applications"
import { demoClients } from "@/lib/lending-fixtures"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

const selectClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm aria-invalid:border-destructive"

const STATE_LABEL: Record<SectionState, string> = {
  complete: "Complete",
  attention: "Needs attention",
  optional: "Optional",
  locked: "Locked",
  todo: "To do",
}

function StateIcon({ state }: { state: SectionState }) {
  if (state === "complete") return <Check aria-hidden className="size-4 text-success" />
  if (state === "attention") return <AlertTriangle aria-hidden className="size-4 text-warning" />
  if (state === "locked") return <Lock aria-hidden className="size-4 text-muted-foreground" />
  return <Circle aria-hidden className="size-4 text-muted-foreground" />
}

/** Label, optional hint and an error tied to the control by aria-describedby. */
function Field({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; "aria-required"?: boolean }) => React.ReactNode
}) {
  const base = useId()
  const hintId = hint ? `${base}-hint` : undefined
  const errorId = error ? `${base}-error` : undefined
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-muted-foreground"> (required)</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      {children({
        id,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function Note({ tone = "info", children }: { tone?: "info" | "warn"; children: React.ReactNode }) {
  const Icon = tone === "warn" ? AlertTriangle : Info
  return (
    <p className={cn("flex items-start gap-2 rounded-2xl px-3 py-2 text-sm", tone === "warn" ? "bg-warning-subtle text-foreground" : "bg-muted/60 text-muted-foreground")}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", tone === "warn" && "text-warning")} />
      <span>{children}</span>
    </p>
  )
}

/**
 * New loan application (R2). Nine sections, each reachable from the step list, which shows what
 * every section needs and why a step is locked. Nothing is saved: the draft lives in this tab, a
 * reload or Cancel loses it (with a warning), and submitting only runs a mocked check.
 */
export function ApplicationForm({ initialClientId }: { initialClientId?: string }) {
  const router = useRouter()
  const [draft, setDraft] = useState<ApplicationDraft>(() =>
    initialClientId && clientFor(initialClientId) ? withClient(EMPTY_APPLICATION, initialClientId) : EMPTY_APPLICATION,
  )
  const [step, setStep] = useState<SectionId>(initialClientId && clientFor(initialClientId) ? "loan" : "client")
  const [shown, setShown] = useState<Partial<Record<SectionId, boolean>>>({})
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof checkApplication>> | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const ids = { stepHeading: useId() }

  const client = clientFor(draft.clientId)
  const currency = currencyFor(draft.product)
  const dirty = !result?.ok && JSON.stringify(draft) !== JSON.stringify(EMPTY_APPLICATION)

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  // Errors for a section appear once the user has tried to leave it or submit, not while typing.
  const errors: AppErrors = {
    ...(shown.loan ? validateTerms(draft) : {}),
    ...(shown.penalty ? validatePenalty(draft) : {}),
    ...(shown.guarantors || shown.businesses || shown.worth ? validateOptional(draft) : {}),
  }

  const set = (k: keyof ApplicationDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }))

  function goTo(next: SectionId) {
    setShown((s) => ({ ...s, [step]: true }))
    setStep(next)
    setResult(null)
    requestAnimationFrame(() => {
      headingRef.current?.focus()
      // On phones the step list is a scrolling strip; keep the current step visible in it.
      document.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "nearest" })
    })
  }

  const index = SECTIONS.findIndex((s) => s.id === step)
  const next = SECTIONS[index + 1]
  const prev = SECTIONS[index - 1]

  async function submit() {
    setShown({ loan: true, penalty: true, guarantors: true, businesses: true, worth: true })
    setChecking(true)
    setResult(await checkApplication(draft))
    setChecking(false)
  }

  function cancel() {
    if (dirty) setConfirmLeave(true)
    else router.push("/loans")
  }

  if (result?.ok) {
    return (
      <PageBody className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">New loan application</h1>
        <div role="status" className="flex flex-col items-start gap-3 rounded-3xl border bg-card p-6">
          <CheckCircle2 aria-hidden className="size-6 text-success" />
          <p className="font-semibold">All checks passed. Nothing was saved.</p>
          <p className="text-sm text-muted-foreground">{result.approvalNote}</p>
          <Button asChild className="rounded-full">
            <Link href="/loans">Back to All Loans</Link>
          </Button>
        </div>
      </PageBody>
    )
  }

  const reqs = requirements(draft)

  return (
    <PageBody className="max-w-6xl">
      <div className="flex flex-col gap-2">
        <Link
          href="/loans"
          onClick={(e) => (dirty ? (e.preventDefault(), setConfirmLeave(true)) : undefined)}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-4" />
          All Loans
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New loan application</h1>
        <Note>
          Nothing here is saved. What you enter stays in this browser tab only, and a reload or Cancel discards it. This prototype
          has no saved drafts.
        </Note>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[17rem_1fr]">
        <nav aria-label="Application sections" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <ol className="relative flex gap-1 overflow-x-auto rounded-3xl border bg-card p-2 lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s, i) => {
              const state = sectionState(s.id, draft)
              const locked = state === "locked"
              return (
                <li key={s.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    aria-current={step === s.id ? "step" : undefined}
                    aria-disabled={locked || undefined}
                    onClick={() => (locked ? setStep("client") : goTo(s.id))}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm hover:bg-muted/60",
                      step === s.id && "bg-brand-subtle text-brand-subtle-foreground hover:bg-brand-subtle",
                    )}
                  >
                    <span className="tabular w-4 text-xs text-muted-foreground">
                      {i + 1}
                      <span className="sr-only">.</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{s.title}</span>
                      <span className="sr-only">, </span>
                      <span className="block text-xs text-muted-foreground">{STATE_LABEL[state]}</span>
                    </span>
                    <StateIcon state={state} />
                  </button>
                </li>
              )
            })}
          </ol>
          {!client && <p className="mt-2 px-2 text-xs text-muted-foreground">Sections 2 to 9 are locked. {LOCKED_REASON}</p>}
        </nav>

        <section aria-labelledby={ids.stepHeading} className="flex min-w-0 flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
          <div>
            <p className="text-xs text-muted-foreground">
              Section {index + 1} of {SECTIONS.length}
            </p>
            <h2 id={ids.stepHeading} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
              {SECTIONS[index].title}
            </h2>
          </div>

          {step === "client" && (
            <>
              <div>
                <h3 className="mb-2 text-sm font-semibold">What this application needs</h3>
                <Checklist reqs={reqs} />
                <p className="mt-2 text-xs text-muted-foreground">Guarantors, businesses, client worth, comments and documents are optional here.</p>
              </div>
              <Field id="app-client" label="Client" required hint="Only registered clients can apply. Register a new client from Clients first.">
                {(p) => (
                  <select {...p} className={cn(selectClass, !draft.clientId && "text-muted-foreground")} value={draft.clientId} onChange={(e) => setDraft((d) => withClient(d, e.target.value))}>
                    <option value="">Choose a client…</option>
                    {demoClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.id}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              {client && (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-2xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Primary phone</dt>
                    <dd>{client.phone ?? "Not on file"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">ID</dt>
                    <dd>{client.idDocument ? `${client.idDocument.type} on file` : "Not on file"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Registered</dt>
                    <dd>{formatDate(client.registeredOn)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Profile</dt>
                    <dd>
                      <Link href={`/clients/${client.id}`} className="text-primary underline underline-offset-2">
                        Open {client.name}&rsquo;s profile
                      </Link>
                    </dd>
                  </div>
                </dl>
              )}
              {client && clientBlockers(client).map((b) => <Note key={b} tone="warn">{b}</Note>)}
              {client && clientNotes(client).map((n) => <Note key={n}>{n}</Note>)}
            </>
          )}

          {step === "loan" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="app-product" label="Product" required error={errors.product}>
                  {(p) => (
                    <select {...p} className={cn(selectClass, !draft.product && "text-muted-foreground")} value={draft.product} onChange={set("product")}>
                      <option value="">Choose…</option>
                      {PRODUCTS.map((x) => (
                        <option key={x.name}>{x.name}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field id="app-principal" label={`Principal to register${currency ? ` (${currency === "GHS" ? "GH₵" : currency})` : ""}`} required hint="The amount the client borrows, before interest or fees." error={errors.principal}>
                  {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={draft.principal} onChange={set("principal")} />}
                </Field>
                <Field id="app-rate" label="Interest rate (%)" required hint="As on the product sheet. Not looked up or suggested." error={errors.rate}>
                  {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={draft.rate} onChange={set("rate")} />}
                </Field>
                <Field id="app-period" label="The rate is per" required error={errors.interestPeriod}>
                  {(p) => (
                    <select {...p} className={cn(selectClass, !draft.interestPeriod && "text-muted-foreground")} value={draft.interestPeriod} onChange={set("interestPeriod")}>
                      <option value="">Choose…</option>
                      {PERIODS.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field id="app-basis" label="Interest basis" required hint="Flat charges on the original principal; reducing balance on what's still owed." error={errors.basis}>
                  {(p) => (
                    <select {...p} className={cn(selectClass, !draft.basis && "text-muted-foreground")} value={draft.basis} onChange={set("basis")}>
                      <option value="">Choose…</option>
                      {BASES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field id="app-frequency" label="Repayment frequency" required error={errors.frequency}>
                  {(p) => (
                    <select {...p} className={cn(selectClass, !draft.frequency && "text-muted-foreground")} value={draft.frequency} onChange={set("frequency")}>
                      <option value="">Choose…</option>
                      {FREQUENCIES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field id="app-installments" label="Number of installments" required error={errors.installments}>
                  {(p) => <Input {...p} inputMode="numeric" autoComplete="off" value={draft.installments} onChange={set("installments")} />}
                </Field>
                <Field id="app-first" label="First repayment date" required error={errors.firstRepaymentOn}>
                  {(p) => <Input {...p} type="date" min={DEMO_TODAY} value={draft.firstRepaymentOn} onChange={set("firstRepaymentOn")} />}
                </Field>
              </div>
              {draft.interestPeriod && draft.frequency && unitsDiffer(draft.interestPeriod, draft.frequency) && (
                <Note tone="warn">
                  The rate is per {draft.interestPeriod.toLowerCase()} but repayments are {draft.frequency.toLowerCase()}. These are different
                  units: check this matches the product. The server converts between them; this form doesn&rsquo;t.
                </Note>
              )}
              <Calculation draft={draft} />
            </>
          )}

          {step === "penalty" && (
            <>
              <Note>The penalty is captured as agreed. This form doesn&rsquo;t apply or calculate it.</Note>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="app-penalty" label="Penalty" required error={errors.penaltyType} className="sm:col-span-2">
                  {(p) => (
                    <select {...p} className={cn(selectClass, !draft.penaltyType && "text-muted-foreground")} value={draft.penaltyType} onChange={set("penaltyType")}>
                      <option value="">Choose…</option>
                      {PENALTY_TYPES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  )}
                </Field>
                {draft.penaltyType && draft.penaltyType !== "None" && (
                  <>
                    <Field
                      id="app-penalty-value"
                      label={draft.penaltyType.startsWith("Percentage") ? "Penalty (%)" : `Penalty amount${currency ? ` (${currency === "GHS" ? "GH₵" : currency})` : ""}`}
                      required
                      error={errors.penaltyValue}
                    >
                      {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={draft.penaltyValue} onChange={set("penaltyValue")} />}
                    </Field>
                    <Field id="app-grace" label="Grace period (days)" hint="Days after a due date before the penalty applies." error={errors.graceDays}>
                      {(p) => <Input {...p} inputMode="numeric" autoComplete="off" value={draft.graceDays} onChange={set("graceDays")} />}
                    </Field>
                  </>
                )}
              </div>
            </>
          )}

          {step === "guarantors" && (
            <Repeater
              noun="guarantor"
              note="Whether guarantors are required, and how many, depends on product policy that isn't established here. None are required by this form."
              items={draft.guarantors}
              blank={{ name: "", phone: "", relationship: "" }}
              onChange={(guarantors) => setDraft((d) => ({ ...d, guarantors }))}
              errorFor={(i) => errors[`guarantor-${i}`]}
              fields={[
                { key: "name", label: "Full name", required: true },
                { key: "phone", label: "Phone", hint: "10 digits, starting with 0." },
                { key: "relationship", label: "Relationship to client" },
              ]}
            />
          )}

          {step === "businesses" && (
            <Repeater
              noun="business"
              note={client?.business ? `Started from ${client.name}'s profile. Changes here don't update the profile.` : "The client's profile has no business on file."}
              items={draft.businesses}
              blank={{ name: "", type: "", years: "" }}
              onChange={(businesses) => setDraft((d) => ({ ...d, businesses }))}
              errorFor={(i) => errors[`business-${i}`]}
              fields={[
                { key: "name", label: "Business name", required: true },
                { key: "type", label: "Type" },
                { key: "years", label: "Years operating" },
              ]}
            />
          )}

          {step === "worth" && (
            <>
              <Note>As stated by the client, not verified. Nothing here is scored or used to decide affordability.</Note>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field id="app-income" label="Monthly income (GH₵)" error={errors.monthlyIncome}>
                  {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={draft.monthlyIncome} onChange={set("monthlyIncome")} />}
                </Field>
                <Field id="app-expenses" label="Monthly expenses (GH₵)" error={errors.monthlyExpenses}>
                  {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={draft.monthlyExpenses} onChange={set("monthlyExpenses")} />}
                </Field>
                <Field id="app-assets" label="Assets, estimated (GH₵)" error={errors.assets}>
                  {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={draft.assets} onChange={set("assets")} />}
                </Field>
              </div>
            </>
          )}

          {step === "comments" && (
            <Field id="app-comments" label="Comments for the approver" hint="Context the approver should know. Don't include ID or account numbers.">
              {(p) => <textarea {...p} rows={5} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm" value={draft.comments} onChange={set("comments")} />}
            </Field>
          )}

          {step === "documents" && (
            <>
              <Note>Files are listed here but not uploaded in this prototype. The client&rsquo;s ID is already on their profile, so it isn&rsquo;t asked for again.</Note>
              <Field id="app-docs" label="Add documents" hint="JPG, PNG or PDF. Not uploaded.">
                {(p) => (
                  <Input
                    {...p}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => {
                      const files = [...(e.target.files ?? [])].map((f) => ({ name: f.name, kind: f.type || "file" }))
                      setDraft((d) => ({ ...d, documents: [...d.documents, ...files] }))
                      e.target.value = ""
                    }}
                    className="h-auto py-1.5 file:mr-3 file:rounded-full file:bg-muted file:px-3 file:py-1"
                  />
                )}
              </Field>
              {draft.documents.length > 0 ? (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {draft.documents.map((doc, i) => (
                    <li key={`${doc.name}-${i}`} className="flex items-center gap-2 rounded-xl border px-3 py-2">
                      <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${doc.name}`}
                        onClick={() => setDraft((d) => ({ ...d, documents: d.documents.filter((_, j) => j !== i) }))}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No documents listed.</p>
              )}
            </>
          )}

          {step === "review" && (
            <>
              {result && !result.ok && (
                <div role="alert" className="rounded-2xl border border-destructive/30 bg-danger-subtle p-4 text-sm">
                  <p className="font-semibold text-danger">{result.message}</p>
                </div>
              )}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Requirements</h3>
                <Checklist reqs={reqs} onGo={goTo} />
              </div>
              <Review draft={draft} onEdit={goTo} />
              <Calculation draft={draft} />
              <Note>Submitting sends the application for approval by a different user. Nobody can approve their own application.</Note>
            </>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button type="button" variant="ghost" className="rounded-full" onClick={cancel}>
              Cancel
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">
              {prev && (
                <Button type="button" variant="outline" className="rounded-full" onClick={() => goTo(prev.id)}>
                  Back
                </Button>
              )}
              {next ? (
                client || step !== "client" ? (
                  <Button type="button" className="rounded-full" onClick={() => goTo(next.id)}>
                    Next: {next.title}
                  </Button>
                ) : (
                  <Button type="button" className="rounded-full" aria-disabled onClick={() => setShown((s) => ({ ...s, client: true }))}>
                    Next: {next.title}
                  </Button>
                )
              ) : (
                <Button type="button" className="rounded-full" disabled={checking} onClick={submit}>
                  {checking && <Loader2 aria-hidden className="animate-spin" />}
                  {checking ? "Checking…" : "Submit for approval"}
                </Button>
              )}
            </div>
            {step === "client" && !client && shown.client && <p role="alert" className="w-full text-right text-xs text-destructive">Choose a client to continue.</p>}
          </div>
        </section>
      </div>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard this application?</DialogTitle>
            <DialogDescription>Nothing has been saved. Everything entered in all nine sections will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => router.push("/loans")}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  )
}

/** Choosing a client starts Businesses and Client worth from their profile, as editable copies. */
function withClient(d: ApplicationDraft, clientId: string): ApplicationDraft {
  const c = clientFor(clientId)
  if (!c) return { ...d, clientId }
  return {
    ...d,
    clientId,
    businesses: c.business ? [{ name: c.business.name, type: c.business.type, years: "" }] : [],
    monthlyIncome: c.monthlyIncome ? String(c.monthlyIncome.minor / 100) : "",
  }
}

function Checklist({ reqs, onGo }: { reqs: ReturnType<typeof requirements>; onGo?: (id: SectionId) => void }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {reqs.map((r) => (
        <li key={r.label} className="flex items-start gap-2">
          {r.met ? <Check aria-hidden className="mt-0.5 size-4 text-success" /> : <Circle aria-hidden className="mt-0.5 size-4 text-muted-foreground" />}
          <span className="flex-1">
            {r.label}
            <span className="sr-only">{r.met ? ": done" : ": not done"}</span>
          </span>
          {onGo && !r.met && (
            <button type="button" onClick={() => onGo(r.section)} className="text-xs text-primary underline underline-offset-2">
              Go to {SECTIONS.find((s) => s.id === r.section)?.title}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function Calculation({ draft }: { draft: ApplicationDraft }) {
  const calc = calculationState(draft)
  const currency = currencyFor(draft.product)
  const principalMinor = /^\d+(\.\d{1,2})?$/.test(draft.principal.trim().replace(/,/g, "")) ? Math.round(Number(draft.principal.replace(/,/g, "")) * 100) : null
  return (
    <div className="rounded-2xl border p-4">
      <h3 className="text-sm font-semibold">Calculation</h3>
      <dl className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Registration principal (as entered)</dt>
          <dd className="font-semibold tabular">{principalMinor !== null && currency ? formatMoney({ minor: principalMinor, currency }) : "Not entered"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Interest, total payable, installment amount</dt>
          <dd className="font-semibold">{calc.state === "incomplete" ? "Calculation incomplete" : "Unavailable"}</dd>
        </div>
      </dl>
      {calc.state === "incomplete" ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>Derived totals need complete, valid terms. Still missing or invalid:</p>
          <ul className="mt-1 list-disc pl-5">
            {calc.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{calc.reason}</p>
      )}
    </div>
  )
}

function Review({ draft, onEdit }: { draft: ApplicationDraft; onEdit: (id: SectionId) => void }) {
  const client = clientFor(draft.clientId)
  const rows: [SectionId, string, string][] = [
    ["client", "Client", client ? `${client.name} · ${client.id}` : "Not chosen"],
    ["loan", "Product", draft.product || "Not chosen"],
    ["loan", "Terms", draft.rate && draft.interestPeriod ? `${draft.rate}% per ${draft.interestPeriod.toLowerCase()}, ${draft.basis || "basis not chosen"}` : "Incomplete"],
    ["loan", "Repayments", draft.installments && draft.frequency ? `${draft.installments} × ${draft.frequency.toLowerCase()}, first on ${draft.firstRepaymentOn ? formatDate(draft.firstRepaymentOn) : "a date not chosen"}` : "Incomplete"],
    ["penalty", "Penalty", draft.penaltyType ? (draft.penaltyType === "None" ? "None" : `${draft.penaltyType}: ${draft.penaltyValue || "value missing"}`) : "Not chosen"],
    ["guarantors", "Guarantors", draft.guarantors.length ? draft.guarantors.map((g) => g.name || "Unnamed").join(", ") : "None added"],
    ["businesses", "Businesses", draft.businesses.length ? draft.businesses.map((b) => b.name || "Unnamed").join(", ") : "None added"],
    ["worth", "Client worth", draft.monthlyIncome ? `Income GH₵${draft.monthlyIncome} a month, as stated` : "Not given"],
    ["comments", "Comments", draft.comments.trim() ? "Added" : "None"],
    ["documents", "Documents", draft.documents.length ? `${draft.documents.length} listed, not uploaded` : "None listed"],
  ]
  return (
    <dl className="divide-y rounded-2xl border text-sm">
      {rows.map(([id, term, value]) => (
        <div key={term} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
          <dt className="w-28 shrink-0 text-muted-foreground">{term}</dt>
          <dd className="min-w-0 flex-1 break-words">{value}</dd>
          <dd>
            <button type="button" onClick={() => onEdit(id)} className="text-xs text-primary underline underline-offset-2" aria-label={`Edit ${term}`}>
              Edit
            </button>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Repeater<T extends Record<string, string>>({
  noun,
  note,
  items,
  blank,
  onChange,
  errorFor,
  fields,
}: {
  noun: string
  note: string
  items: T[]
  blank: T
  onChange: (items: T[]) => void
  errorFor: (i: number) => string | undefined
  fields: { key: keyof T & string; label: string; required?: boolean; hint?: string }[]
}) {
  const plural = noun === "business" ? "businesses" : `${noun}s`
  return (
    <>
      <Note>{note}</Note>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No {plural} added.</p>}
      {items.map((item, i) => {
        const error = errorFor(i)
        return (
          <fieldset key={i} className="flex flex-col gap-3 rounded-2xl border p-4">
            <legend className="px-1 text-sm font-semibold capitalize">
              {noun} {i + 1}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {fields.map((f) => (
                <Field key={f.key} id={`app-${noun}-${i}-${f.key}`} label={f.label} required={f.required} hint={f.hint}>
                  {(p) => (
                    <Input
                      {...p}
                      aria-invalid={f.required && error ? true : undefined}
                      autoComplete="off"
                      value={item[f.key]}
                      onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))}
                    />
                  )}
                </Field>
              ))}
            </div>
            {error && (
              <p className="flex items-start gap-1 text-xs text-destructive">
                <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
                {error}
              </p>
            )}
            <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 aria-hidden />
              Remove {noun} {i + 1}
            </Button>
          </fieldset>
        )
      })}
      <Button type="button" variant="outline" size="sm" className="w-fit rounded-full" onClick={() => onChange([...items, { ...blank }])}>
        <Plus aria-hidden />
        Add {items.length ? "another" : "a"} {noun}
      </Button>
    </>
  )
}

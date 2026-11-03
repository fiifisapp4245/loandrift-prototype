"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Info, Loader2 } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { FormField, RadioChoice, selectClass } from "@/components/patterns/form-field"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  ASSET_TYPES,
  COLLATERAL_STATUS,
  EXCEPTIONS,
  REGISTRIES,
  UPLOAD,
  assetActions,
  checkForm,
  getAsset,
  validateLien,
  validateValuation,
  type Asset,
  type Errors,
  type LienDraft,
  type ValuationDraft,
} from "@/lib/api/collateral"
import { DEMO_TODAY } from "@/lib/fixtures"
import { formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

function Row({ term, hint, children }: { term: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">
        {term}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

const cur = (a: Asset) => (a.estimate.value.currency === "GHS" ? "GH₵" : a.estimate.value.currency)

function FileInput({ p, onPick }: { p: object; onPick: (name: string) => void }) {
  return (
    <Input
      {...p}
      type="file"
      accept=".jpg,.jpeg,.png,.pdf"
      onChange={(e) => onPick(e.target.files?.[0]?.name ?? "")}
      className="h-auto py-1.5 file:mr-3 file:rounded-full file:bg-muted file:px-3 file:py-1"
    />
  )
}

function FormShell({ title, intro, children, onSubmit, onCancel, busy, errorCount, summaryRef }: {
  title: string
  intro: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  busy: boolean
  errorCount: number
  summaryRef: React.RefObject<HTMLDivElement | null>
}) {
  const id = title.replace(/\s+/g, "-").toLowerCase()
  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border p-4">
      <div>
        <h3 id={id} className="text-sm font-semibold">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{intro}</p>
      </div>
      {errorCount > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl bg-danger-subtle p-3 text-sm text-danger outline-none">
          Check {errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`}. Nothing was saved.
        </div>
      )}
      {children}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 aria-hidden className="animate-spin" />}
          {busy ? "Checking…" : "Check details"}
        </Button>
      </div>
    </form>
  )
}

function ValuationForm({ a, onDone, onCancel }: { a: Asset; onDone: () => void; onCancel: () => void }) {
  // No basis is preselected: choosing "independent" must be deliberate and backed by a report (F63).
  const [d, setD] = useState<ValuationDraft>({ basis: "", valuer: "", marketValue: "", forcedSaleValue: "", on: "", report: "" })
  const [e, setE] = useState<Errors<ValuationDraft>>({})
  const [busy, setBusy] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const set = (k: keyof ValuationDraft) => (ev: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: ev.target.value }))
  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const found = validateValuation(d)
    setE(found)
    setBusy(true)
    const ok = await checkForm(found)
    setBusy(false)
    if (ok) onDone()
    else requestAnimationFrame(() => summaryRef.current?.focus())
  }
  return (
    <FormShell title="Record a valuation" intro="Checks the details only; nothing is saved. A recorded valuation replaces the estimate as the value used." onSubmit={submit} onCancel={onCancel} busy={busy} errorCount={Object.keys(e).length} summaryRef={summaryRef}>
      <RadioChoice
        name="val-basis"
        legend="Valuation basis"
        value={d.basis}
        onChange={(v) => setD((x) => ({ ...x, basis: v }))}
        error={e.basis}
        options={[
          { value: "Independent valuation", label: "Independent valuation", description: "By an outside valuer, with a written report." },
          { value: "Internal valuation", label: "Internal valuation", description: "By staff. Recorded as internal, never as independent." },
        ]}
      />
      <FormField id="val-valuer" label={d.basis === "Independent valuation" ? "Valuer or firm" : "Valued by"} required error={e.valuer}>
        {(p) => <Input {...p} autoComplete="off" value={d.valuer} onChange={set("valuer")} />}
      </FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField id="val-market" label={`Market value (${cur(a)})`} required error={e.marketValue}>
          {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={d.marketValue} onChange={set("marketValue")} />}
        </FormField>
        <FormField id="val-forced" label={`Forced-sale value (${cur(a)})`} hint="Leave blank if the valuer didn't give one. It stays Not recorded, never zero." error={e.forcedSaleValue}>
          {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={d.forcedSaleValue} onChange={set("forcedSaleValue")} />}
        </FormField>
      </div>
      <FormField id="val-on" label="Valuation date" required error={e.on}>
        {(p) => <Input {...p} type="date" max={DEMO_TODAY} value={d.on} onChange={set("on")} />}
      </FormField>
      <FormField
        id="val-report"
        label="Valuation report"
        required={d.basis === "Independent valuation"}
        hint={`${UPLOAD.label}, up to ${UPLOAD.maxMb} MB. Not uploaded in this prototype.`}
        error={e.report}
      >
        {(p) => <FileInput p={p} onPick={(name) => setD((x) => ({ ...x, report: name }))} />}
      </FormField>
    </FormShell>
  )
}

function LienForm({ a, onDone, onCancel }: { a: Asset; onDone: () => void; onCancel: () => void }) {
  // No status or registry is preselected, so a half-filled form never reads as registered (F63).
  const [d, setD] = useState<LienDraft>({ state: "", registry: "", reference: "", on: "", evidence: "" })
  const [e, setE] = useState<Errors<LienDraft>>({})
  const [busy, setBusy] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const set = (k: keyof LienDraft) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD((x) => ({ ...x, [k]: ev.target.value }))
  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const found = validateLien(d)
    setE(found)
    setBusy(true)
    const ok = await checkForm(found)
    setBusy(false)
    if (ok) onDone()
    else requestAnimationFrame(() => summaryRef.current?.focus())
  }
  return (
    <FormShell
      title={a.lien ? "Update the lien" : "Record a lien"}
      intro="Record only a registration you have the registry's confirmation for. Which assets need a lien is set by policy, not by this form. Nothing is saved."
      onSubmit={submit}
      onCancel={onCancel}
      busy={busy}
      errorCount={Object.keys(e).length}
      summaryRef={summaryRef}
    >
      <RadioChoice
        name="lien-state"
        legend="Lien status"
        value={d.state}
        onChange={(v) => setD((x) => ({ ...x, state: v }))}
        error={e.state}
        options={[
          { value: "registered", label: "Registered", description: "The registry has confirmed it." },
          { value: "not_registered", label: "Not registered yet", description: "Records that it's still outstanding." },
        ]}
      />
      {d.state === "registered" && (
        <>
          <FormField id="lien-registry" label="Registry" required error={e.registry}>
            {(p) => (
              <select {...p} className={cn(selectClass, !d.registry && "text-muted-foreground")} value={d.registry} onChange={set("registry")}>
                <option value="">Choose…</option>
                {REGISTRIES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            )}
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField id="lien-ref" label="Registry reference" required hint="Exactly as issued." error={e.reference}>
              {(p) => <Input {...p} autoComplete="off" value={d.reference} onChange={set("reference")} />}
            </FormField>
            <FormField id="lien-on" label="Registration date" required error={e.on}>
              {(p) => <Input {...p} type="date" max={DEMO_TODAY} value={d.on} onChange={set("on")} />}
            </FormField>
          </div>
          <FormField id="lien-evidence" label="Registry confirmation" required hint={`${UPLOAD.label}, up to ${UPLOAD.maxMb} MB. Not uploaded in this prototype.`} error={e.evidence}>
            {(p) => <FileInput p={p} onPick={(name) => setD((x) => ({ ...x, evidence: name }))} />}
          </FormField>
        </>
      )}
    </FormShell>
  )
}

/** One asset: values by basis, owner, lien, history, and the operations its state allows. */
export function AssetDrawer({ assetRef, onClose }: { assetRef: string; onClose: () => void }) {
  const a = getAsset(assetRef)
  const [form, setForm] = useState<"valuation" | "lien" | null>(null)
  const [checked, setChecked] = useState<string | null>(null)
  const openers = useRef<Record<string, HTMLButtonElement | null>>({})
  const checkedRef = useRef<HTMLParagraphElement>(null)

  function close(which: "valuation" | "lien", done: boolean) {
    setForm(null)
    if (done) {
      setChecked(which === "valuation" ? "Valuation details pass the checks. Nothing was saved." : "Lien details pass the checks. Nothing was saved.")
      requestAnimationFrame(() => checkedRef.current?.focus())
    } else {
      requestAnimationFrame(() => openers.current[which]?.focus())
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-lg"
        onCloseAutoFocus={(e) => {
          const origin = document.querySelector<HTMLElement>(`[data-asset-ref="${assetRef}"]`)
          if (origin) {
            e.preventDefault()
            origin.focus()
          }
        }}
      >
        {!a ? (
          <>
            <SheetHeader>
              <SheetTitle>{assetRef}</SheetTitle>
              <SheetDescription className="sr-only">Not found</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <StateMessage state="unavailable" title="This asset isn't in the register" description="Search the register by asset, loan or owner." />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="border-b">
              <p className="font-mono text-xs text-muted-foreground">{a.ref}</p>
              <SheetTitle className="text-lg">{a.description}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <StatusBadge status={{ label: COLLATERAL_STATUS[a.status].label, tone: COLLATERAL_STATUS[a.status].tone, description: "" }} />
                <span>{ASSET_TYPES[a.type]}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {a.exceptions.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1.5">
                  {a.exceptions.map((x) => (
                    <li key={x} className="rounded-xl bg-warning-subtle px-3 py-2 text-sm">
                      <span className="font-medium">{EXCEPTIONS[x].label}.</span> {EXCEPTIONS[x].description}
                    </li>
                  ))}
                </ul>
              )}

              {checked && (
                <p ref={checkedRef} tabIndex={-1} role="status" className="mb-3 flex items-center gap-2 rounded-xl bg-success-subtle px-3 py-2 text-sm outline-none">
                  <CheckCircle2 aria-hidden className="size-4 text-success" />
                  {checked}
                </p>
              )}

              <h3 className="mb-1 text-sm font-semibold">Value</h3>
              <dl className="divide-y">
                <Row term="Value used" hint={a.valuation ? "The latest valuation" : "Only the estimate exists"}>
                  <span className="font-semibold tabular">{formatMoney(a.valueUsed.value)}</span>
                </Row>
                <Row term="Registration estimate" hint={a.valuation ? "Replaced by the valuation" : undefined}>
                  {formatMoney(a.estimate.value)}, {formatDate(a.estimate.on)} by {a.estimate.by}
                </Row>
                <Row term="Market valuation">
                  {a.valuation ? (
                    <>
                      {formatMoney(a.valuation.marketValue)}
                      <span className="block text-xs text-muted-foreground">
                        {a.valuation.basis}, {formatDate(a.valuation.on)}, {a.valuation.by}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not recorded</span>
                  )}
                </Row>
                <Row term="Forced-sale value">
                  {a.valuation?.forcedSaleValue ? formatMoney(a.valuation.forcedSaleValue) : <span className="text-muted-foreground">Not recorded</span>}
                </Row>
              </dl>

              <h3 className="mt-4 mb-1 text-sm font-semibold">Asset and ownership</h3>
              <dl className="divide-y">
                {a.details.map((x) => (
                  <Row key={x.label} term={x.label}>
                    <span className="font-mono text-xs">{x.value}</span>
                  </Row>
                ))}
                <Row term="Owner">
                  {a.owner.kind === "borrower" ? (
                    `The borrower, ${a.borrower}`
                  ) : (
                    <>
                      {a.owner.name} ({a.owner.relationship.toLowerCase()} of the borrower)
                      <span className="block text-xs text-muted-foreground">
                        {a.owner.consentSignedOn ? `Owner's consent signed ${formatDate(a.owner.consentSignedOn)}.` : "The owner's signed consent isn't on file."}
                      </span>
                    </>
                  )}
                </Row>
                <Row term="Linked loan">
                  <EntityRef reference={a.loanRef} href={`/loans/${a.loanRef}?tab=collateral`} context={`${a.borrower} · ${a.loanStatusLabel}`} />
                </Row>
                <Row term="Lien">
                  {a.lien ? (
                    <>
                      Recorded with the {a.lien.registry.toLowerCase()}
                      <span className="block font-mono text-xs text-muted-foreground">
                        {a.lien.reference}, {formatDate(a.lien.on)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">None recorded</span>
                  )}
                </Row>
              </dl>

              <h3 className="mt-4 mb-2 text-sm font-semibold">Next steps</h3>
              {form === "valuation" ? (
                <ValuationForm a={a} onDone={() => close("valuation", true)} onCancel={() => close("valuation", false)} />
              ) : form === "lien" ? (
                <LienForm a={a} onDone={() => close("lien", true)} onCancel={() => close("lien", false)} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {assetActions(a).map((x) => {
                    const opensForm = x.id === "record_valuation" || x.id === "record_lien"
                    return (
                      <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{x.label}</span>
                          <span className="block text-xs text-muted-foreground">{x.available ? x.description : x.reason}</span>
                        </span>
                        {opensForm && x.available ? (
                          <Button
                            ref={(el) => {
                              openers.current[x.id === "record_valuation" ? "valuation" : "lien"] = el
                            }}
                            size="sm"
                            variant="outline"
                            onClick={() => (setChecked(null), setForm(x.id === "record_valuation" ? "valuation" : "lien"))}
                          >
                            {x.label}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled aria-describedby={`why-${x.id}`}>
                            {x.label}
                          </Button>
                        )}
                        {(!opensForm || !x.available) && (
                          <span id={`why-${x.id}`} className="w-full text-xs text-muted-foreground">
                            {x.available ? "Allowed for this state, but not available in this prototype. The server still checks permission." : "Not offered for this state."}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <h3 className="mt-5 mb-2 text-sm font-semibold">History</h3>
              <ol className="flex flex-col gap-1.5 text-sm">
                {[...a.history].reverse().map((h) => (
                  <li key={`${h.on}-${h.event}`} className="flex gap-3 rounded-xl border px-3 py-2">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{formatDate(h.on)}</span>
                    <span className="min-w-0">
                      {h.event}
                      <span className="block text-xs text-muted-foreground">{h.by}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Browsing never records, removes, releases or recovers anything.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

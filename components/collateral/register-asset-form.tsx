"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Info, Loader2 } from "lucide-react"
import { FormField, RadioChoice, selectClass } from "@/components/patterns/form-field"
import { PageBody } from "@/components/patterns/page-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ASSET_TYPES, REGISTRABLE_LOANS, UPLOAD, checkForm, validateRegistration, type AssetType, type Errors, type RegistrationDraft } from "@/lib/api/collateral"
import { loanStatus } from "@/lib/format"
import { cn } from "@/lib/utils"

const EMPTY: RegistrationDraft = {
  loanRef: "",
  type: "",
  description: "",
  regNumber: "",
  makeModel: "",
  location: "",
  titleRef: "",
  serial: "",
  owner: "",
  ownerName: "",
  ownerPhone: "",
  ownerRelationship: "",
  estimate: "",
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden>
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </fieldset>
  )
}

/**
 * Register an asset (B2-07, F63). Type-specific fields for vehicles and property, the same
 * identifier field for other types, and third-party ownership with the owner's consent explained.
 * Only an estimate is captured here: valuations and liens are recorded later, with evidence.
 * Mocked: the check passes or fails; nothing is saved or uploaded.
 */
export function RegisterAssetForm() {
  const router = useRouter()
  const [d, setD] = useState<RegistrationDraft>(EMPTY)
  const [e, setE] = useState<Errors<RegistrationDraft>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const dirty = !done && JSON.stringify(d) !== JSON.stringify(EMPTY)
  const set = (k: keyof RegistrationDraft) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: ev.target.value }))
  const loan = REGISTRABLE_LOANS.find((l) => l.reference === d.loanRef)
  const currency = loan && "currency" in loan.principal ? loan.principal.currency : "GHS"

  useEffect(() => {
    if (!dirty) return
    const warn = (ev: BeforeUnloadEvent) => ev.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const found = validateRegistration(d)
    setE(found)
    setBusy(true)
    const ok = await checkForm(found)
    setBusy(false)
    if (ok) setDone(true)
    else requestAnimationFrame(() => summaryRef.current?.focus())
  }

  if (done) {
    return (
      <PageBody className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Register an asset</h1>
        <div role="status" className="flex flex-col items-start gap-3 rounded-3xl border bg-card p-6">
          <CheckCircle2 aria-hidden className="size-6 text-success" />
          <p className="font-semibold">All checks passed. Nothing was saved.</p>
          <p className="text-sm text-muted-foreground">In the real app the asset would wait for verification before it secures the loan.</p>
          <Button asChild className="rounded-full">
            <Link href="/collateral">Back to Collateral</Link>
          </Button>
        </div>
      </PageBody>
    )
  }

  const errorCount = Object.keys(e).length
  return (
    <PageBody className="max-w-3xl">
      <div className="flex flex-col gap-2">
        <Link href="/collateral" onClick={(ev) => (dirty ? (ev.preventDefault(), setConfirmLeave(true)) : undefined)} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Collateral
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Register an asset</h1>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          Records the asset and your estimate. Valuations and liens are recorded separately, once there&rsquo;s evidence. Nothing is saved in
          this prototype.
        </p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {errorCount > 0 && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-2xl border border-destructive/30 bg-danger-subtle p-4 text-sm text-danger outline-none">
            Check {errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`}. Nothing was saved.
          </div>
        )}

        <Section title="Loan" description="Only loans not yet disbursed are listed. Adding collateral after disbursement is a policy decision this form doesn't make.">
          <FormField id="reg-loan" label="Loan this asset secures" required error={e.loanRef}>
            {(p) => (
              <select {...p} className={cn(selectClass, !d.loanRef && "text-muted-foreground")} value={d.loanRef} onChange={set("loanRef")}>
                <option value="">Choose…</option>
                {REGISTRABLE_LOANS.map((l) => (
                  <option key={l.reference} value={l.reference}>
                    {l.reference} · {l.borrower.name} · {loanStatus(l.status).label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </Section>

        <Section title="Asset">
          <FormField id="reg-type" label="Type of asset" required hint="The fields below change with the type." error={e.type}>
            {(p) => (
              <select {...p} className={cn(selectClass, !d.type && "text-muted-foreground")} value={d.type} onChange={(ev) => setD((x) => ({ ...x, type: ev.target.value as AssetType | "" }))}>
                <option value="">Choose…</option>
                {(Object.keys(ASSET_TYPES) as AssetType[]).map((t) => (
                  <option key={t} value={t}>
                    {ASSET_TYPES[t]}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="reg-description" label="Description" required hint="Enough to identify it, for example colour, size or condition." error={e.description}>
            {(p) => <Input {...p} autoComplete="off" value={d.description} onChange={set("description")} />}
          </FormField>
          {d.type === "vehicle" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="reg-number" label="Registration number" required error={e.regNumber}>
                {(p) => <Input {...p} autoComplete="off" value={d.regNumber} onChange={set("regNumber")} />}
              </FormField>
              <FormField id="reg-make" label="Make and model" required error={e.makeModel}>
                {(p) => <Input {...p} autoComplete="off" value={d.makeModel} onChange={set("makeModel")} />}
              </FormField>
            </div>
          )}
          {d.type === "property" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="reg-location" label="Location" required error={e.location}>
                {(p) => <Input {...p} autoComplete="off" value={d.location} onChange={set("location")} />}
              </FormField>
              <FormField id="reg-title" label="Title document reference" required error={e.titleRef}>
                {(p) => <Input {...p} autoComplete="off" value={d.titleRef} onChange={set("titleRef")} />}
              </FormField>
            </div>
          )}
          {(d.type === "equipment" || d.type === "household") && (
            <FormField id="reg-serial" label="Serial or identifying number" hint="If the item has one." error={e.serial}>
              {(p) => <Input {...p} autoComplete="off" value={d.serial} onChange={set("serial")} />}
            </FormField>
          )}
          <FormField
            id="reg-estimate"
            label={`Your estimate of its value (${currency === "GHS" ? "GH₵" : currency})`}
            required
            hint="A registration estimate, not a valuation. It's shown as an estimate until a valuation is recorded."
            error={e.estimate}
          >
            {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={d.estimate} onChange={set("estimate")} />}
          </FormField>
          <FormField id="reg-photos" label="Photos or documents" hint={`${UPLOAD.label}, up to ${UPLOAD.maxMb} MB each. Not uploaded in this prototype.`}>
            {(p) => <Input {...p} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="h-auto py-1.5 file:mr-3 file:rounded-full file:bg-muted file:px-3 file:py-1" />}
          </FormField>
        </Section>

        <Section title="Ownership">
          <RadioChoice
            name="reg-owner"
            legend="Who owns the asset"
            value={d.owner}
            onChange={(v) => setD((x) => ({ ...x, owner: v as RegistrationDraft["owner"] }))}
            error={e.owner}
            options={[
              { value: "borrower", label: "The borrower" },
              { value: "third_party", label: "Someone else", description: "For example a relative who pledges their own asset for this loan." },
            ]}
          />
          {d.owner === "third_party" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="reg-owner-name" label="Owner's full name" required error={e.ownerName}>
                  {(p) => <Input {...p} autoComplete="off" value={d.ownerName} onChange={set("ownerName")} />}
                </FormField>
                <FormField id="reg-owner-phone" label="Owner's phone" required hint="10 digits, starting with 0." error={e.ownerPhone}>
                  {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="off" value={d.ownerPhone} onChange={set("ownerPhone")} />}
                </FormField>
                <FormField id="reg-owner-rel" label="Relationship to the borrower" required error={e.ownerRelationship}>
                  {(p) => <Input {...p} autoComplete="off" value={d.ownerRelationship} onChange={set("ownerRelationship")} />}
                </FormField>
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                The owner&rsquo;s signed consent is tracked with the loan&rsquo;s other signatures, on its Agreement tab. The wording comes from
                your agreement template, not from this form.
              </p>
            </>
          )}
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => (dirty ? setConfirmLeave(true) : router.push("/collateral"))}>
            Cancel
          </Button>
          <Button type="submit" className="rounded-full" disabled={busy}>
            {busy && <Loader2 aria-hidden className="animate-spin" />}
            {busy ? "Checking…" : "Register asset"}
          </Button>
        </div>
      </form>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard this asset&rsquo;s details?</DialogTitle>
            <DialogDescription>Nothing has been saved. What you&rsquo;ve entered will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => router.push("/collateral")}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  )
}

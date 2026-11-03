"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { PageBody } from "@/components/patterns/page-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { submitClient, validateClientDraft, type ClientDraft, type FieldErrors } from "@/lib/api/lending"
import { cn } from "@/lib/utils"

const EMPTY: ClientDraft = {
  firstName: "",
  lastName: "",
  phone: "",
  altPhone: "",
  email: "",
  idType: "",
  idNumber: "",
  businessName: "",
  businessType: "",
  monthlyIncome: "",
}

const ID_TYPES = ["Ghana Card", "Passport", "Voter ID"]
const UPLOAD_TYPES = ["image/jpeg", "image/png", "application/pdf"]
const UPLOAD_MAX_MB = 5

const LABELS: Record<keyof ClientDraft, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Primary phone",
  altPhone: "Alternative phone",
  email: "Email",
  idType: "ID type",
  idNumber: "ID number",
  businessName: "Business name",
  businessType: "Business type",
  monthlyIncome: "Monthly income (GH₵)",
}

/** A labelled field: label, optional hint, and an error tied to the control by aria-describedby. */
function Field({
  name,
  required,
  hint,
  error,
  children,
}: {
  name: keyof ClientDraft | "idFile"
  required?: boolean
  hint?: string
  error?: string
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; "aria-required"?: boolean }) => React.ReactNode
}) {
  const base = useId()
  const id = `field-${name}`
  const hintId = hint ? `${base}-hint` : undefined
  const errorId = error ? `${base}-error` : undefined
  const label = name === "idFile" ? "ID document image" : LABELS[name]
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
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

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden>
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm aria-invalid:border-destructive"

/**
 * Add client. Clear fieldsets, labelled controls with associated errors, and explicit optional
 * sections (F25, F26). The browser does quick checks; the server is authoritative. There is no
 * save-draft (not supported); instead the form warns before entered details are lost.
 */
export function ClientForm() {
  const router = useRouter()
  const [draft, setDraft] = useState<ClientDraft>(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string>()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverMessage, setServerMessage] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  const dirty = !done && (file !== null || (Object.keys(EMPTY) as (keyof ClientDraft)[]).some((k) => draft[k] !== EMPTY[k]))

  // Warn before a reload or tab close drops entered details.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (k: keyof ClientDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }))

  function chooseFile(f: File | null) {
    setFileError(undefined)
    if (!f) return setFile(null)
    if (!UPLOAD_TYPES.includes(f.type)) return setFileError("Choose a JPG, PNG or PDF file.")
    if (f.size > UPLOAD_MAX_MB * 1024 * 1024) return setFileError(`This file is over ${UPLOAD_MAX_MB} MB. Choose a smaller one.`)
    setFile(f)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setServerMessage(undefined)
    const found = validateClientDraft(draft)
    setErrors(found)
    if (Object.keys(found).length > 0 || fileError) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setSubmitting(true)
    const result = await submitClient(draft)
    setSubmitting(false)
    if (!result.ok) {
      setErrors(result.errors)
      setServerMessage(result.message)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setDone(true)
  }

  function cancel() {
    if (dirty) setConfirmLeave(true)
    else router.push("/clients")
  }

  const errorList = Object.entries(errors) as [keyof ClientDraft, string][]

  if (done) {
    return (
      <PageBody className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Add client</h1>
        <div role="status" className="flex flex-col items-start gap-3 rounded-3xl border bg-card p-6">
          <CheckCircle2 aria-hidden className="size-6 text-success" />
          <p className="font-semibold">All checks passed</p>
          <p className="text-sm text-muted-foreground">
            In this prototype nothing is saved. In the real app the server creates the client and opens their profile.
          </p>
          <Button asChild className="rounded-full">
            <Link href="/clients">Back to Clients</Link>
          </Button>
        </div>
      </PageBody>
    )
  }

  return (
    <PageBody className="max-w-3xl">
      <div className="flex flex-col gap-2">
        <Link href="/clients" onClick={(e) => (dirty ? (e.preventDefault(), setConfirmLeave(true)) : undefined)} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Clients
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add client</h1>
        <p className="text-sm text-muted-foreground">Fields marked required are needed to register a client. Everything else can be added later.</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {(errorList.length > 0 || fileError) && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-2xl border border-destructive/30 bg-danger-subtle p-4 text-sm outline-none">
            <p className="font-semibold text-danger">{serverMessage ?? `Check ${errorList.length + (fileError ? 1 : 0) === 1 ? "this field" : "these fields"}`}</p>
            <ul className="mt-1 list-disc pl-5">
              {errorList.map(([k, msg]) => (
                <li key={k}>
                  <a href={`#field-${k}`} className="text-danger underline underline-offset-2">
                    {LABELS[k]}
                  </a>
                  : {msg}
                </li>
              ))}
              {fileError && (
                <li>
                  <a href="#field-idFile" className="text-danger underline underline-offset-2">
                    ID document image
                  </a>
                  : {fileError}
                </li>
              )}
            </ul>
          </div>
        )}

        <Section title="Personal details">
          <Field name="firstName" required error={errors.firstName}>
            {(p) => <Input {...p} autoComplete="off" value={draft.firstName} onChange={set("firstName")} />}
          </Field>
          <Field name="lastName" required error={errors.lastName}>
            {(p) => <Input {...p} autoComplete="off" value={draft.lastName} onChange={set("lastName")} />}
          </Field>
        </Section>

        <Section title="Contact" description="The primary phone receives repayment reminders. Only one number can be primary.">
          <Field name="phone" required hint="10 digits, starting with 0." error={errors.phone}>
            {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="off" value={draft.phone} onChange={set("phone")} />}
          </Field>
          <Field name="altPhone" hint="Used only if the primary number can't be reached." error={errors.altPhone}>
            {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="off" value={draft.altPhone} onChange={set("altPhone")} />}
          </Field>
          <Field name="email" error={errors.email}>
            {(p) => <Input {...p} type="email" autoComplete="off" value={draft.email} onChange={set("email")} />}
          </Field>
        </Section>

        <Section title="Identification" description="One ID is required. The server checks it isn't already registered to another client.">
          <Field name="idType" required error={errors.idType}>
            {(p) => (
              <select {...p} className={cn(selectClass, !draft.idType && "text-muted-foreground")} value={draft.idType} onChange={set("idType")}>
                <option value="">Choose…</option>
                {ID_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </Field>
          <Field name="idNumber" required hint="Exactly as printed on the ID." error={errors.idNumber}>
            {(p) => <Input {...p} autoComplete="off" value={draft.idNumber} onChange={set("idNumber")} />}
          </Field>
          <div className="sm:col-span-2">
            <Field name="idFile" hint={`JPG, PNG or PDF, up to ${UPLOAD_MAX_MB} MB. Not uploaded in this prototype.`} error={fileError}>
              {(p) => (
                <Input
                  {...p}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
                  className="h-auto py-1.5 file:mr-3 file:rounded-full file:bg-muted file:px-3 file:py-1"
                />
              )}
            </Field>
            {file && <p className="mt-1.5 text-xs text-muted-foreground">Selected: {file.name}</p>}
          </div>
        </Section>

        <Section title="Business" description="Optional. Helps with affordability checks later.">
          <Field name="businessName" error={errors.businessName}>
            {(p) => <Input {...p} autoComplete="off" value={draft.businessName} onChange={set("businessName")} />}
          </Field>
          <Field name="businessType" error={errors.businessType}>
            {(p) => (
              <select {...p} className={cn(selectClass, !draft.businessType && "text-muted-foreground")} value={draft.businessType} onChange={set("businessType")}>
                <option value="">Choose…</option>
                {["Retail", "Wholesale", "Food", "Services", "Agriculture", "Other"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </Field>
          <Field name="monthlyIncome" hint="As stated by the client. Not verified." error={errors.monthlyIncome}>
            {(p) => <Input {...p} inputMode="decimal" autoComplete="off" value={draft.monthlyIncome} onChange={set("monthlyIncome")} />}
          </Field>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" className="rounded-full" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" className="rounded-full" disabled={submitting}>
            {submitting && <Loader2 aria-hidden className="animate-spin" />}
            {submitting ? "Checking…" : "Register client"}
          </Button>
        </div>
      </form>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard this client&rsquo;s details?</DialogTitle>
            <DialogDescription>What you&rsquo;ve entered hasn&rsquo;t been saved and will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => router.push("/clients")}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  )
}

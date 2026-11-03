"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PLANS } from "@/lib/marketing-content"
import { cn } from "@/lib/utils"

const TOPICS = [
  { value: "demo", label: "Book a demo" },
  { value: "pricing", label: "Ask about pricing" },
  { value: "other", label: "Something else" },
]
const PRODUCTS = [{ value: "loandrift", label: "LoanDrift" }]
const BRANCHES = ["1", "2–5", "6–20", "More than 20"]

type Draft = { topic: string; plan: string; name: string; email: string; organisation: string; phone: string; branches: string; message: string }
type Errors = Partial<Record<keyof Draft, string>>

const fieldClass = "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm aria-invalid:border-destructive"

/**
 * Contact form that keeps what the visitor came for: product, intent (demo) and plan arrive in the
 * URL from the LoanDrift page and stay visible and editable. It never sends anything in the
 * prototype and connects no scheduler.
 */
export function ContactForm() {
  const params = useSearchParams()
  const product = PRODUCTS.some((p) => p.value === params.get("product")) ? params.get("product")! : ""
  const productLabel = PRODUCTS.find((p) => p.value === product)?.label
  const [draft, setDraft] = useState<Draft>({
    topic: TOPICS.some((t) => t.value === params.get("intent")) ? params.get("intent")! : "",
    plan: PLANS.some((p) => p.id === params.get("plan")) ? params.get("plan")! : "",
    name: "",
    email: "",
    organisation: "",
    phone: "",
    branches: "",
    message: "",
  })
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<"form" | "sending" | "done">("form")
  const summaryRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLHeadingElement>(null)

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const isDemo = draft.topic === "demo"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const found: Errors = {}
    if (!draft.topic) found.topic = "Choose what you'd like to talk about."
    if (!draft.name.trim()) found.name = "Enter your name."
    if (!draft.email.trim()) found.email = "Enter your work email so we can reply."
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) found.email = "Enter an email address like name@company.com."
    if (!draft.organisation.trim()) found.organisation = "Enter your organisation's name."
    setErrors(found)
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setState("sending")
    // Mocked: no message is sent and no meeting is booked in the prototype.
    await new Promise((r) => setTimeout(r, 400))
    setState("done")
    requestAnimationFrame(() => doneRef.current?.focus())
  }

  const err = (k: keyof Draft) =>
    errors[k] && (
      <p id={`${k}-error`} className="flex items-start gap-1 text-xs text-destructive">
        <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
        {errors[k]}
      </p>
    )
  const a11y = (k: keyof Draft, hint?: string) => ({
    id: k,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": [hint, errors[k] ? `${k}-error` : undefined].filter(Boolean).join(" ") || undefined,
  })
  const label = (k: keyof Draft, text: string, required: boolean) => (
    <label htmlFor={k} className="text-sm font-medium">
      {text} <span className="font-normal text-muted-foreground">({required ? "required" : "optional"})</span>
    </label>
  )

  const topicLabel = TOPICS.find((t) => t.value === draft.topic)?.label
  const planLabel = PLANS.find((p) => p.id === draft.plan)?.name

  if (state === "done") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-3xl border bg-card p-6 sm:p-8">
        <CheckCircle2 aria-hidden className="size-7 text-success" />
        <h2 ref={doneRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          Request checked, not sent
        </h2>
        <p className="text-muted-foreground">
          This is a prototype, so nothing was sent. In the real site, your request for <strong>{topicLabel?.toLowerCase()}</strong>
          {productLabel && <> of <strong>{productLabel}</strong></>}
          {planLabel && <> ({planLabel} plan)</>} would reach the TroveSuite team, and they would email {draft.email.trim()} to arrange a time.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/products/loandrift">Back to LoanDrift</Link>
        </Button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border bg-card p-6 sm:p-8">
      {(productLabel || isDemo) && (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-subtle px-4 py-3 text-sm text-brand-subtle-foreground">
          You&rsquo;re asking about
          {productLabel && <span className="rounded-full bg-card px-2.5 py-0.5 font-medium">{productLabel}</span>}
          {topicLabel && <span className="rounded-full bg-card px-2.5 py-0.5 font-medium">{topicLabel}</span>}
          {planLabel && <span className="rounded-full bg-card px-2.5 py-0.5 font-medium">{planLabel} plan</span>}
        </p>
      )}

      {Object.keys(errors).length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-2xl border border-destructive/30 bg-danger-subtle p-4 text-sm outline-none">
          <p className="font-semibold text-danger">Check these fields</p>
          <ul className="mt-1 list-disc pl-5">
            {(Object.entries(errors) as [keyof Draft, string][]).map(([k, m]) => (
              <li key={k}>
                <a href={`#${k}`} className="text-danger underline underline-offset-2">
                  {m}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          {label("topic", "What would you like?", true)}
          <select {...a11y("topic")} value={draft.topic} onChange={set("topic")} className={cn(fieldClass, !draft.topic && "text-muted-foreground")}>
            <option value="">Choose…</option>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {err("topic")}
        </div>
        <div className="flex flex-col gap-1.5">
          {label("plan", "Plan you're interested in", false)}
          <select {...a11y("plan")} value={draft.plan} onChange={set("plan")} className={cn(fieldClass, !draft.plan && "text-muted-foreground")}>
            <option value="">Not sure yet</option>
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          {label("name", "Your name", true)}
          <Input {...a11y("name")} autoComplete="name" value={draft.name} onChange={set("name")} />
          {err("name")}
        </div>
        <div className="flex flex-col gap-1.5">
          {label("email", "Work email", true)}
          <Input {...a11y("email")} type="email" autoComplete="email" value={draft.email} onChange={set("email")} />
          {err("email")}
        </div>
        <div className="flex flex-col gap-1.5">
          {label("organisation", "Organisation", true)}
          <Input {...a11y("organisation")} autoComplete="organization" value={draft.organisation} onChange={set("organisation")} />
          {err("organisation")}
        </div>
        <div className="flex flex-col gap-1.5">
          {label("phone", "Phone", false)}
          <Input {...a11y("phone")} type="tel" autoComplete="tel" value={draft.phone} onChange={set("phone")} />
        </div>
        <div className="flex flex-col gap-1.5">
          {label("branches", "Number of branches", false)}
          <select {...a11y("branches")} value={draft.branches} onChange={set("branches")} className={cn(fieldClass, !draft.branches && "text-muted-foreground")}>
            <option value="">Choose…</option>
            {BRANCHES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          {label("message", isDemo ? "What would you like to see in the demo?" : "Message", false)}
          <textarea
            {...a11y("message")}
            rows={4}
            value={draft.message}
            onChange={set("message")}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-muted/60 p-4 text-sm">
        <p className="font-medium">What happens next</p>
        <ol className="mt-1 list-decimal pl-5 text-muted-foreground">
          <li>The TroveSuite team reads your request.</li>
          <li>They email you to agree a time{isDemo ? " for the demo" : ""}.</li>
          <li>Nothing is booked until you confirm.</li>
        </ol>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="h-11 rounded-full px-6" disabled={state === "sending"}>
          {state === "sending" && <Loader2 aria-hidden className="animate-spin" />}
          {state === "sending" ? "Sending…" : isDemo ? "Request a demo" : "Send"}
        </Button>
      </div>
    </form>
  )
}

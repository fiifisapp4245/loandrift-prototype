"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Info, Loader2 } from "lucide-react"
import { FormField, selectClass } from "@/components/patterns/form-field"
import { PageBody } from "@/components/patterns/page-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EMPTY_GROUP, MEETING_DAYS, MEETING_FREQUENCIES, checkMemberChange, validateGroup, type GroupDraft, type GroupErrors } from "@/lib/api/groups"
import { DEMO_TODAY } from "@/lib/fixtures"
import { cn } from "@/lib/utils"

/**
 * Form a group (B2-08, F67). Captures the same fields the group overview shows, so nothing
 * entered here disappears from view later. Meeting details are optional: left blank, they show
 * as Not recorded. Mocked: checks only; members are added from the group once it exists.
 */
export function GroupForm() {
  const router = useRouter()
  const [d, setD] = useState<GroupDraft>(EMPTY_GROUP)
  const [e, setE] = useState<GroupErrors>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const dirty = !done && JSON.stringify(d) !== JSON.stringify(EMPTY_GROUP)
  const set = (k: keyof GroupDraft) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: ev.target.value }))

  useEffect(() => {
    if (!dirty) return
    const warn = (ev: BeforeUnloadEvent) => ev.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const found = validateGroup(d)
    setE(found)
    setBusy(true)
    const ok = await checkMemberChange(found)
    setBusy(false)
    if (ok) setDone(true)
    else requestAnimationFrame(() => summaryRef.current?.focus())
  }

  if (done) {
    return (
      <PageBody className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Form a group</h1>
        <div role="status" className="flex flex-col items-start gap-3 rounded-3xl border bg-card p-6">
          <CheckCircle2 aria-hidden className="size-6 text-success" />
          <p className="font-semibold">All checks passed. Nothing was saved.</p>
          <p className="text-sm text-muted-foreground">In the real app you&rsquo;d add members from the new group&rsquo;s page.</p>
          <Button asChild className="rounded-full">
            <Link href="/groups">Back to Groups</Link>
          </Button>
        </div>
      </PageBody>
    )
  }

  const errorCount = Object.keys(e).length
  return (
    <PageBody className="max-w-3xl">
      <div className="flex flex-col gap-2">
        <Link href="/groups" onClick={(ev) => (dirty ? (ev.preventDefault(), setConfirmLeave(true)) : undefined)} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Groups
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Form a group</h1>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          Members are added from the group&rsquo;s page once it&rsquo;s formed. Nothing is saved in this prototype.
        </p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {errorCount > 0 && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-2xl border border-destructive/30 bg-danger-subtle p-4 text-sm text-danger outline-none">
            Check {errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`}. Nothing was saved.
          </div>
        )}

        <fieldset className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
          <legend className="sr-only">Group</legend>
          <p aria-hidden className="text-base font-semibold">
            Group
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="grp-name" label="Group name" required error={e.name}>
              {(p) => <Input {...p} autoComplete="off" value={d.name} onChange={set("name")} />}
            </FormField>
            <FormField id="grp-code" label="Group code" required hint="3 to 12 letters, numbers or hyphens. Must be unique." error={e.code}>
              {(p) => <Input {...p} autoComplete="off" className="uppercase" value={d.code} onChange={set("code")} />}
            </FormField>
            <FormField id="grp-formed" label="Date formed" required error={e.formedOn}>
              {(p) => <Input {...p} type="date" max={DEMO_TODAY} value={d.formedOn} onChange={set("formedOn")} />}
            </FormField>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
          <legend className="sr-only">Meetings</legend>
          <div aria-hidden>
            <p className="text-base font-semibold">Meetings</p>
            <p className="text-sm text-muted-foreground">Shown on the group&rsquo;s overview. Anything left blank shows as Not recorded.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="grp-day" label="Meeting day" error={e.meetingDay}>
              {(p) => (
                <select {...p} className={cn(selectClass, !d.meetingDay && "text-muted-foreground")} value={d.meetingDay} onChange={set("meetingDay")}>
                  <option value="">Not recorded</option>
                  {MEETING_DAYS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="grp-frequency" label="How often it meets" error={e.meetingFrequency}>
              {(p) => (
                <select {...p} className={cn(selectClass, !d.meetingFrequency && "text-muted-foreground")} value={d.meetingFrequency} onChange={set("meetingFrequency")}>
                  <option value="">Not recorded</option>
                  {MEETING_FREQUENCIES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="grp-place" label="Meeting place" className="sm:col-span-2" error={e.meetingPlace}>
              {(p) => <Input {...p} autoComplete="off" value={d.meetingPlace} onChange={set("meetingPlace")} />}
            </FormField>
            <FormField id="grp-notes" label="Notes" hint="Anything a field officer should know. Don't include ID or account numbers." className="sm:col-span-2" error={e.notes}>
              {(p) => <textarea {...p} rows={3} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm" value={d.notes} onChange={set("notes")} />}
            </FormField>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => (dirty ? setConfirmLeave(true) : router.push("/groups"))}>
            Cancel
          </Button>
          <Button type="submit" className="rounded-full" disabled={busy}>
            {busy && <Loader2 aria-hidden className="animate-spin" />}
            {busy ? "Checking…" : "Form group"}
          </Button>
        </div>
      </form>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard this group&rsquo;s details?</DialogTitle>
            <DialogDescription>Nothing has been saved. What you&rsquo;ve entered will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => router.push("/groups")}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  )
}

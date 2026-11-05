"use client"

import Link from "next/link"
import { useId, useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Loader2, Search, UserPlus } from "lucide-react"
import { FormField, RadioChoice, selectClass } from "@/components/patterns/form-field"
import { PageBody } from "@/components/patterns/page-header"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  GROUP_ROLES,
  GROUP_STATUS,
  LIABILITY,
  checkMemberChange,
  durationText,
  getGroup,
  memberCandidates,
  removalNotes,
  validateAddMember,
  validateRoleChange,
  type Group,
  type GroupRole,
  type Member,
  type MemberErrors,
} from "@/lib/api/groups"
import { formatDate, formatMoney, plural } from "@/lib/format"
import { useUrlState } from "@/lib/use-url-state"
import { cn } from "@/lib/utils"

const ROLE_OPTIONS = (Object.keys(GROUP_ROLES) as GroupRole[]).map((value) => ({ value, label: GROUP_ROLES[value] }))
const NOT_RECORDED = <span className="text-muted-foreground">Not recorded</span>

type Outcome = { tone: "success" | "error"; text: string }

function Overview({ g }: { g: Group }) {
  const rows: [string, React.ReactNode][] = [
    ["Code", <span key="c" className="font-mono">{g.code}</span>],
    ["Status", GROUP_STATUS[g.status].label],
    ["Formed", formatDate(g.formedOn)],
    ["Meeting day", g.meetingDay ?? NOT_RECORDED],
    ["Meets", g.meetingFrequency ?? NOT_RECORDED],
    ["Meeting place", g.meetingPlace ?? NOT_RECORDED],
  ]
  return (
    <section aria-labelledby="overview" className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="overview" className="text-base font-semibold">
          Overview
        </h2>
        <Button size="sm" variant="outline" disabled aria-describedby="edit-why">
          Edit details
        </Button>
      </div>
      <p id="edit-why" className="mt-1 text-xs text-muted-foreground">
        Viewing only. Editing isn&rsquo;t available in this prototype.
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {rows.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-3 border-b py-2 text-sm">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-0.5 py-2 text-sm sm:col-span-2">
          <dt className="text-muted-foreground">Notes</dt>
          <dd>{g.notes ?? NOT_RECORDED}</dd>
        </div>
      </dl>
    </section>
  )
}

function OutcomeLine({ outcome, innerRef }: { outcome: Outcome; innerRef: React.RefObject<HTMLParagraphElement | null> }) {
  const Icon = outcome.tone === "success" ? CheckCircle2 : AlertTriangle
  return (
    <p
      ref={innerRef}
      tabIndex={-1}
      role={outcome.tone === "success" ? "status" : "alert"}
      className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-sm outline-none", outcome.tone === "success" ? "bg-success-subtle" : "bg-danger-subtle text-danger")}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", outcome.tone === "success" && "text-success")} />
      {outcome.text}
    </p>
  )
}

/** Change a member's role: choose, then an explicit check. The current role is never preselected. */
function RoleDialog({ g, m, fail, onClose }: { g: Group; m: Member; fail: boolean; onClose: (o: Outcome | null) => void }) {
  const [role, setRole] = useState("")
  const [e, setE] = useState<MemberErrors>({})
  const [busy, setBusy] = useState(false)
  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const found = validateRoleChange(m, role)
    setE(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await checkMemberChange(found, fail)
      onClose({ tone: "success", text: `Changing ${m.name} to ${GROUP_ROLES[role as GroupRole].toLowerCase()} in ${g.name} passes the checks. Nothing was changed in this prototype.` })
    } catch (err) {
      setBusy(false)
      onClose({ tone: "error", text: (err as Error).message })
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose(null)}>
      <DialogContent>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Change {m.name}&rsquo;s role</DialogTitle>
            <DialogDescription>
              Currently {m.roleLabel.toLowerCase()}. Nothing changes until you check the change, and nothing is saved in this prototype.
            </DialogDescription>
          </DialogHeader>
          <RadioChoice name="new-role" legend="New role" value={role} onChange={setRole} error={e.role} options={ROLE_OPTIONS} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 aria-hidden className="animate-spin" />}
              {busy ? "Checking…" : "Change role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Remove a member: the reviewer sees what's still owed before confirming. No rule is applied. */
function RemoveDialog({ g, m, fail, onClose }: { g: Group; m: Member; fail: boolean; onClose: (o: Outcome | null) => void }) {
  const [busy, setBusy] = useState(false)
  const notes = removalNotes(m)
  async function confirm() {
    setBusy(true)
    try {
      await checkMemberChange({}, fail)
      onClose({ tone: "success", text: `Removing ${m.name} from ${g.name} passes the checks. Nothing was changed in this prototype.` })
    } catch (err) {
      setBusy(false)
      onClose({ tone: "error", text: (err as Error).message })
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Remove {m.name} from {g.name}?
          </DialogTitle>
          <DialogDescription>Their client record and loans stay as they are. Nothing is saved in this prototype.</DialogDescription>
        </DialogHeader>
        {notes.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {notes.map((n) => (
              <li key={n} className="flex items-start gap-2 rounded-xl bg-warning-subtle px-3 py-2 text-sm">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {n}
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(null)}>
            Keep {m.name.split(" ")[0]}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy && <Loader2 aria-hidden className="animate-spin" />}
            {busy ? "Checking…" : "Remove member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Add a member: search, select one result, choose a role, then an explicit Add member (F64).
 * Searching or selecting never adds anyone.
 */
function AddMember({ g, fail, onDone }: { g: Group; fail: boolean; onDone: (o: Outcome | null) => void }) {
  const [q, setQ] = useState("")
  const [clientId, setClientId] = useState("")
  const [role, setRole] = useState("")
  const [e, setE] = useState<MemberErrors>({})
  const [busy, setBusy] = useState(false)
  const searchId = useId()
  const results = memberCandidates(g.id, q)
  const chosen = results.find((r) => r.client.id === clientId)?.client
  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const found = validateAddMember(g.id, { clientId, role })
    setE(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await checkMemberChange(found, fail)
      onDone({ tone: "success", text: `Adding ${chosen?.name} to ${g.name} as ${GROUP_ROLES[role as GroupRole].toLowerCase()} passes the checks. Nothing was changed in this prototype.` })
    } catch (err) {
      setBusy(false)
      onDone({ tone: "error", text: (err as Error).message })
    }
  }
  return (
    <form noValidate onSubmit={submit} aria-labelledby="add-member-title" className="flex flex-col gap-4 rounded-2xl border p-4">
      <div>
        <h3 id="add-member-title" className="text-sm font-semibold">
          Add a member
        </h3>
        <p className="text-xs text-muted-foreground">Select a client and a role, then Add member. Searching and selecting don&rsquo;t add anyone.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={searchId} className="text-sm font-medium">
          Find a registered client
        </label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={searchId}
            type="search"
            autoComplete="off"
            value={q}
            onChange={(ev) => (setQ(ev.target.value), setClientId(""))}
            placeholder="Name, client ID or phone"
            aria-describedby={`${searchId}-hint`}
            className="pl-8"
          />
        </div>
        <p id={`${searchId}-hint`} className="text-xs text-muted-foreground">
          Type at least 2 characters. Current members aren&rsquo;t listed.
        </p>
      </div>
      {q.trim().length >= 2 && (
        <fieldset aria-describedby={e.client ? "client-error" : undefined} className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-medium">
            {results.length ? `${plural(results.length, "client")} found` : "No clients found"} <span className="text-muted-foreground">(choose one)</span>
          </legend>
          {results.length === 0 && <p className="text-sm text-muted-foreground">Try another name, ID or phone. Register new clients from Clients.</p>}
          {results.map(({ client: c, blocked }) => (
            <label
              key={c.id}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
                blocked ? "cursor-not-allowed bg-muted/40" : "cursor-pointer",
                clientId === c.id && "border-primary bg-brand-subtle",
              )}
            >
              <input type="radio" name="add-client" value={c.id} disabled={!!blocked} checked={clientId === c.id} onChange={() => setClientId(c.id)} className="mt-0.5 accent-[var(--primary)]" />
              <span>
                <span className="font-medium">{c.name}</span> <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                <span className="block text-xs text-muted-foreground">{blocked ?? c.town ?? "Town not recorded"}</span>
              </span>
            </label>
          ))}
          {e.client && (
            <p id="client-error" className="flex items-start gap-1 text-xs text-destructive">
              <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
              {e.client}
            </p>
          )}
        </fieldset>
      )}
      {q.trim().length < 2 && e.client && (
        <p className="flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
          {e.client}
        </p>
      )}
      <FormField id="add-role" label="Role in the group" required error={e.role}>
        {(p) => (
          <select {...p} className={cn(selectClass, "sm:max-w-60", !role && "text-muted-foreground")} value={role} onChange={(ev) => setRole(ev.target.value)}>
            <option value="">Choose…</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm" aria-live="polite">
        {chosen && role ? (
          <>
            Ready to add <span className="font-medium">{chosen.name}</span> as {GROUP_ROLES[role as GroupRole].toLowerCase()}.
          </>
        ) : (
          <span className="text-muted-foreground">Choose a client and a role to review the change.</span>
        )}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => onDone(null)}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 aria-hidden className="animate-spin" />}
          {busy ? "Checking…" : "Add member"}
        </Button>
      </div>
    </form>
  )
}

function GroupLoans({ g }: { g: Group }) {
  return (
    <section aria-labelledby="group-loans" className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="group-loans" className="text-base font-semibold">
          Group loans
        </h2>
        <Button asChild size="sm" className="rounded-full">
          <Link href={`/groups/${g.id}/apply`}>Apply for a group loan</Link>
        </Button>
      </div>
      {g.loans.length === 0 ? (
        <StateMessage className="mt-3" state="empty" title="No group loans yet" description="Each member's loan in a group application is approved, disbursed and collected together." />
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {g.loans.map((l) => {
            const total = l.members.reduce((n, x) => n + x.principal.minor, 0)
            const currency = l.members[0]?.principal.currency ?? "GHS"
            return (
              <li key={l.ref} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{l.ref}</span>
                  <StatusBadge status={{ label: "Awaiting approval", tone: "review", description: "" }} />
                  <span className="text-xs text-muted-foreground">Captured {formatDate(l.capturedOn)}</span>
                </div>
                <dl className="mt-2 grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
                  {(
                    [
                      ["Product", l.product],
                      ["Liability", LIABILITY[l.liability].label],
                      ["Interest", `${l.rate}% per ${l.interestPeriod.toLowerCase()}, ${l.basis.toLowerCase()}`],
                      ["Repayments", `${l.installments} ${l.frequency.toLowerCase()} installments`],
                      ["Duration", durationText(String(l.installments), l.frequency) ?? "Not captured"],
                      ["First repayment", formatDate(l.firstRepaymentOn)],
                    ] as const
                  ).map(([t, v]) => (
                    <div key={t} className="flex justify-between gap-3 border-b py-1.5">
                      <dt className="text-muted-foreground">{t}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <table className="mt-3 w-full text-sm">
                  <caption className="sr-only">Members in {l.ref}</caption>
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
                    {l.members.map((x) => (
                      <tr key={x.clientId} className="border-t">
                        <td className="py-1.5">{g.members.find((m) => m.clientId === x.clientId)?.name ?? x.clientId}</td>
                        <td className="py-1.5 text-right tabular">{formatMoney(x.principal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <th scope="row" className="py-1.5 text-left">
                        Total principal, {plural(l.members.length, "member")}
                      </th>
                      <td className="py-1.5 text-right tabular">{formatMoney({ minor: total, currency })}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className="mt-2 text-xs text-muted-foreground">Interest, fees and schedules are calculated by the server when it&rsquo;s approved; none are shown here.</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** One group: overview, members with reviewable changes, and its group loans (B2-08). */
export function GroupDetailView({ id }: { id: string }) {
  const url = useUrlState()
  const fail = url.get("demo") === "member-error"
  const g = getGroup(id)
  const [dialog, setDialog] = useState<{ kind: "role" | "remove"; member: Member } | null>(null)
  const [adding, setAdding] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const outcomeRef = useRef<HTMLParagraphElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  // The dialogs unmount on close, so Radix can't hand focus back; remember the opener instead.
  const openerRef = useRef<HTMLElement | null>(null)
  const openDialog = (kind: "role" | "remove", member: Member) => (ev: React.MouseEvent<HTMLButtonElement>) => {
    openerRef.current = ev.currentTarget
    setOutcome(null)
    setDialog({ kind, member })
  }

  if (!g) {
    return (
      <PageBody>
        <h1 className="text-2xl font-semibold">Group {id}</h1>
        <StateMessage
          state="unavailable"
          title="This group isn't in the branch"
          description="Check the code, or find it from the groups list."
          action={
            <Button asChild size="sm">
              <Link href="/groups">All groups</Link>
            </Button>
          }
        />
      </PageBody>
    )
  }

  function finish(o: Outcome | null, fromAdd = false) {
    setDialog(null)
    if (fromAdd) setAdding(false)
    // After Radix's own unmount focus (a zero timeout), or it would move focus to the body.
    const later = (fn: () => void) => requestAnimationFrame(() => setTimeout(fn, 0))
    if (o) {
      setOutcome(o)
      later(() => outcomeRef.current?.focus())
    } else {
      later(() => (fromAdd ? addRef.current : openerRef.current)?.focus())
    }
  }

  return (
    <PageBody className="max-w-5xl">
      <div className="flex flex-col gap-2">
        <Link href="/groups" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Groups
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{g.name}</h1>
          <StatusBadge status={GROUP_STATUS[g.status]} />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{g.code}</span> · {plural(g.members.length, "member")}
          {g.meetingFrequency && <> · meets {g.meetingFrequency.toLowerCase()}</>}
        </p>
      </div>

      <Overview g={g} />

      <section aria-labelledby="members" className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="members" className="text-base font-semibold">
            Members
          </h2>
          {!adding && (
            <Button ref={addRef} size="sm" variant="outline" onClick={() => (setOutcome(null), setAdding(true))}>
              <UserPlus aria-hidden />
              Add member
            </Button>
          )}
        </div>
        {outcome && <OutcomeLine outcome={outcome} innerRef={outcomeRef} />}
        {adding && <AddMember g={g} fail={fail} onDone={(o) => finish(o, true)} />}
        <ul className="flex flex-col divide-y rounded-2xl border">
          {g.members.map((m) => (
            <li key={m.clientId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-48">
                <Link href={`/clients/${m.clientId}`} className="text-sm font-medium hover:underline">
                  {m.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {m.roleLabel} · joined {formatDate(m.joinedOn)}
                </p>
                {m.outstanding.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Owes on{" "}
                    {m.outstanding.map((l, i) => (
                      <span key={l.reference}>
                        {i > 0 && ", "}
                        <Link href={`/loans/${l.reference}`} className="font-mono underline-offset-2 hover:underline">
                          {l.reference}
                        </Link>{" "}
                        ({l.statusLabel.toLowerCase()})
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openDialog("role", m)} aria-label={`Change role for ${m.name}`}>
                  Change role
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={openDialog("remove", m)} aria-label={`Remove ${m.name}`}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Role changes and removals are reviewed before they apply. In the real app the server checks permission and records who made each change.</p>
      </section>

      <GroupLoans g={g} />

      {dialog?.kind === "role" && <RoleDialog g={g} m={dialog.member} fail={fail} onClose={finish} />}
      {dialog?.kind === "remove" && <RemoveDialog g={g} m={dialog.member} fail={fail} onClose={finish} />}
    </PageBody>
  )
}

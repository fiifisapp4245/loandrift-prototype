/**
 * Groups and group lending (B2-08, F64–F68). A mock service: membership changes, new groups and
 * group loan applications are checked, never saved.
 *
 * Rules enforced here are only the ones already established:
 * - a client can be in one active group at a time (observed in the live app);
 * - a group loan uses the same terms and checks as an individual application, and the same
 *   (absent) calculation service, so no group formula exists.
 * Whether a member with an outstanding loan can leave, and which liability is allowed, are policy
 * questions this prototype surfaces but doesn't answer.
 */
import {
  PRODUCTS,
  calculationState,
  clientBlockers,
  currencyFor,
  durationText,
  principalError,
  validateSharedTerms,
  EMPTY_APPLICATION,
  type AppErrors,
  type SharedTerms,
} from "@/lib/api/applications"
import { OUTSTANDING_STATUSES } from "@/lib/domain/loan-position"
import { DEMO_TODAY, demoLoans } from "@/lib/fixtures"
import { GROUP_ROLES, MEETING_DAYS, MEETING_FREQUENCIES, demoGroups, type DemoGroup, type GroupRole, type GroupStatus } from "@/lib/group-fixtures"
import { loanStatus, type StatusPresentation } from "@/lib/format"
import { demoClients, type DemoClient } from "@/lib/lending-fixtures"
import type { CurrencyCode, Money } from "@/lib/types"

export const GROUP_STATUS: Record<GroupStatus, StatusPresentation> = {
  active: { label: "Active", tone: "success", description: "The group is meeting." },
  inactive: { label: "Inactive", tone: "neutral", description: "Marked as no longer meeting. Kept for history." },
}

export const LIABILITY = {
  joint: {
    label: "Joint liability",
    description: "Members agree to be responsible for each other's repayments if one can't pay. The exact obligation is set out in your agreement template, not here.",
  },
  individual: {
    label: "Individual liability",
    description: "Each member is responsible only for their own loan. The group applies, is approved and repays together.",
  },
} as const

export type Liability = keyof typeof LIABILITY

const client = (id: string) => demoClients.find((c) => c.id === id) ?? null

export type Member = {
  clientId: string
  name: string
  phone: string | null
  role: GroupRole
  roleLabel: string
  joinedOn: string
  /** Loans still owed on: listed so a removal can be reviewed, not used to decide it. */
  outstanding: { reference: string; statusLabel: string }[]
}

export type Group = Omit<DemoGroup, "members"> & { members: Member[]; statusLabel: string }

function enrich(g: DemoGroup): Group {
  return {
    ...g,
    statusLabel: GROUP_STATUS[g.status].label,
    members: g.members.map((m) => {
      const c = client(m.clientId)
      return {
        clientId: m.clientId,
        name: c?.name ?? m.clientId,
        phone: c?.phone ?? null,
        role: m.role,
        roleLabel: GROUP_ROLES[m.role],
        joinedOn: m.joinedOn,
        outstanding: demoLoans
          .filter((l) => l.borrower.id === m.clientId && OUTSTANDING_STATUSES.has(l.status))
          .map((l) => ({ reference: l.reference, statusLabel: loanStatus(l.status).label })),
      }
    }),
  }
}

export function groups(): Group[] {
  return demoGroups.map(enrich)
}

export function getGroup(id: string): Group | null {
  const g = demoGroups.find((x) => x.id === id || x.code === id)
  return g ? enrich(g) : null
}

/** The active group a client is in, other than the one given. */
export function activeGroupOf(clientId: string, exceptGroupId?: string) {
  return demoGroups.find((g) => g.id !== exceptGroupId && g.status === "active" && g.members.some((m) => m.clientId === clientId)) ?? null
}

/**
 * Branch-wide figures. They don't follow the search (F68): the list below has its own "matching"
 * count, so a search with no results never reads as the branch having no groups.
 */
export function branchSummary() {
  const active = demoGroups.filter((g) => g.status === "active")
  return {
    activeGroups: active.length,
    activeMembers: active.reduce((n, g) => n + g.members.length, 0),
    awaitingApproval: demoGroups.reduce((n, g) => n + g.loans.filter((l) => l.status === "awaiting_approval").length, 0),
  }
}

export type GroupFilters = { q?: string; status?: string }

export function queryGroups(f: GroupFilters) {
  const q = (f.q ?? "").trim().toLowerCase()
  const all = groups()
  const rows = all.filter(
    (g) =>
      (!f.status || g.status === f.status) &&
      (!q || g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q) || g.members.some((m) => m.name.toLowerCase().includes(q))),
  )
  return { rows, total: rows.length, registerTotal: all.length, branch: branchSummary() }
}

export async function fetchGroups(f: GroupFilters, sim: "none" | "slow" | "error" = "none") {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 150))
  if (sim === "error") throw new Error("Groups couldn't be loaded. Nothing has changed; try again.")
  return queryGroups(f)
}

// ── Membership: select → review → explicit action; checked, never saved (F64) ──

export type Candidate = { client: DemoClient; blocked: string | null }

/** Clients matching a search who aren't already in this group. Searching never adds anyone. */
export function memberCandidates(groupId: string, q: string): Candidate[] {
  const term = q.trim().toLowerCase()
  if (term.length < 2) return []
  const g = demoGroups.find((x) => x.id === groupId)
  return demoClients
    .filter((c) => !g?.members.some((m) => m.clientId === c.id))
    .filter((c) => c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term) || (c.phone ?? "").replace(/\s/g, "").includes(term.replace(/\s/g, "")))
    .map((c) => {
      const other = activeGroupOf(c.id, groupId)
      return { client: c, blocked: other ? `Already in ${other.name} (${other.code}). A client can be in one active group at a time.` : null }
    })
}

export type MemberErrors = Partial<Record<"client" | "role", string>>

export function validateAddMember(groupId: string, d: { clientId: string; role: string }): MemberErrors {
  const e: MemberErrors = {}
  const g = demoGroups.find((x) => x.id === groupId)
  if (!d.clientId) e.client = "Search for a client and select them."
  else if (activeGroupOf(d.clientId, groupId)) e.client = "This client is already in another active group."
  else if (g?.members.some((m) => m.clientId === d.clientId)) e.client = "This client is already a member."
  if (!d.role) e.role = "Choose the member's role."
  return e
}

export function validateRoleChange(m: Member, role: string): MemberErrors {
  if (!role) return { role: "Choose the new role." }
  if (role === m.role) return { role: `${m.name}'s role is already ${GROUP_ROLES[m.role].toLowerCase()}. Choose a different role.` }
  return {}
}

/** What a reviewer should see before removing a member. Information only: no rule is applied. */
export function removalNotes(m: Member): string[] {
  const out: string[] = []
  if (m.outstanding.length) {
    out.push(
      `${m.name} still owes on ${m.outstanding.map((l) => l.reference).join(", ")}. Whether a member with an outstanding loan can leave is set by policy; this prototype doesn't decide it.`,
    )
  }
  if (m.role !== "member") out.push(`${m.name} is the group's ${GROUP_ROLES[m.role].toLowerCase()}. Someone else may need the role.`)
  return out
}

export async function checkMemberChange(errors: object, fail = false) {
  await new Promise((r) => setTimeout(r, 300))
  if (fail) throw new Error("The change couldn't be checked. Nothing was changed; try again.")
  return Object.keys(errors).length === 0
}

// ── Form a group (F67) ──────────────────────────────────────────────────

export type GroupDraft = { name: string; code: string; formedOn: string; meetingDay: string; meetingFrequency: string; meetingPlace: string; notes: string }
export const EMPTY_GROUP: GroupDraft = { name: "", code: "", formedOn: "", meetingDay: "", meetingFrequency: "", meetingPlace: "", notes: "" }
export type GroupErrors = Partial<Record<keyof GroupDraft, string>>

export function validateGroup(d: GroupDraft, today = DEMO_TODAY): GroupErrors {
  const e: GroupErrors = {}
  const code = d.code.trim().toUpperCase()
  if (!d.name.trim()) e.name = "Enter the group's name."
  if (!code) e.code = "Enter a short code, for example OSU-04."
  else if (!/^[A-Z0-9-]{3,12}$/.test(code)) e.code = "Use 3 to 12 letters, numbers or hyphens."
  else if (demoGroups.some((g) => g.code === code)) e.code = `${code} is already used by another group.`
  if (!d.formedOn) e.formedOn = "Enter the date the group was formed."
  else if (d.formedOn > today) e.formedOn = "The formed date can't be in the future."
  return e
}

export { GROUP_ROLES, MEETING_DAYS, MEETING_FREQUENCIES, type GroupRole, type GroupStatus }

// ── Group loan application (F65, F66) ───────────────────────────────────

export type GroupLoanDraft = SharedTerms & {
  liability: string
  /** Per member: included or not, and the amount as typed. */
  members: Record<string, { included: boolean; amount: string }>
}

export function emptyGroupLoan(g: Group): GroupLoanDraft {
  const { product, rate, interestPeriod, basis, frequency, installments, firstRepaymentOn } = EMPTY_APPLICATION
  return {
    product,
    rate,
    interestPeriod,
    basis,
    frequency,
    installments,
    firstRepaymentOn,
    liability: "",
    // Nobody is included until staff include them: no member is applied for by default.
    members: Object.fromEntries(g.members.map((m) => [m.clientId, { included: false, amount: "" }])),
  }
}

/** Worth knowing before applying, but not decided here. */
export function groupLoanNotes(g: Group): string[] {
  return g.status === "inactive" ? ["This group is marked inactive. Whether an inactive group can borrow is for the approver; this form doesn't decide it."] : []
}

/** Why a member can't be included. The same evidence an individual application needs, nothing more. */
export function memberBlockers(m: Member): string[] {
  const c = client(m.clientId)
  return c ? clientBlockers(c) : ["Client record not found."]
}

export type GroupLoanErrors = AppErrors & Partial<Record<"liability" | "members" | `member-${string}`, string>>

export function validateGroupLoan(d: GroupLoanDraft, g: Group, today = DEMO_TODAY): GroupLoanErrors {
  const e: GroupLoanErrors = { ...validateSharedTerms(d, today) }
  const included = g.members.filter((m) => d.members[m.clientId]?.included)
  if (!included.length) e.members = "Include at least one member, with an amount."
  for (const m of included) {
    const blockers = memberBlockers(m)
    const err = blockers.length ? `${m.name} can't be included: ${blockers[0]}` : principalError(d.members[m.clientId].amount)
    if (err) e[`member-${m.clientId}`] = blockers.length ? err : `${m.name}: ${err}`
  }
  if (!d.liability) e.liability = "Choose who is responsible for repayment."
  return e
}

export type IncludedMember = { member: Member; valid: boolean; principal: Money | null }

/**
 * Included members. The principal is only a Money once the amount is valid and a product has set
 * the currency: no currency is assumed before then.
 */
export function includedMembers(d: GroupLoanDraft, g: Group): IncludedMember[] {
  const currency: CurrencyCode | null = currencyFor(d.product)
  return g.members
    .filter((m) => d.members[m.clientId]?.included)
    .map((m) => {
      const raw = d.members[m.clientId].amount
      const valid = !principalError(raw)
      return { member: m, valid, principal: valid && currency ? { minor: Math.round(Number(raw.trim().replace(/,/g, "")) * 100), currency } : null }
    })
}

/** Members ready to apply for: included, with a valid amount, and no blockers. Drives the button count. */
export function readyCount(d: GroupLoanDraft, g: Group) {
  return includedMembers(d, g).filter((x) => x.valid && !memberBlockers(x.member).length).length
}

/** Total principal of the valid amounts. One product, so one currency; never mixed. Null until known. */
export function totalPrincipal(d: GroupLoanDraft, g: Group): Money | null {
  const valid = includedMembers(d, g).filter((x) => x.principal)
  if (!valid.length) return null
  return { minor: valid.reduce((n, x) => n + x.principal!.minor, 0), currency: valid[0].principal!.currency }
}

/** The same calculation state an individual application shows: there is no separate group formula. */
export function groupCalculation(d: GroupLoanDraft, today = DEMO_TODAY) {
  return calculationState({ ...EMPTY_APPLICATION, ...d, principal: "1" }, today)
}

export { durationText, PRODUCTS }

export type GroupLoanCheck = { ok: true; note: string } | { ok: false; message: string; errors: GroupLoanErrors }

/** Mocked. Never saves; the application would go to Approvals, decided by someone else. */
export async function checkGroupLoan(d: GroupLoanDraft, g: Group, today = DEMO_TODAY): Promise<GroupLoanCheck> {
  await new Promise((r) => setTimeout(r, 400))
  const errors = validateGroupLoan(d, g, today)
  if (Object.keys(errors).length) return { ok: false, message: "Some details need attention. Nothing was saved.", errors }
  return { ok: true, note: "In the real app each member's loan goes to Approvals together, where a different user decides." }
}

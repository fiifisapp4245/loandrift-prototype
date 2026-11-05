/**
 * FICTIONAL lending groups (B2-08). Every name, code, place and amount is invented. Members are
 * the demo clients in lib/lending-fixtures.ts.
 *
 * ASSUMPTION — check against the real app: the live audit saw a role selector per member but not
 * its options. The four roles below are placeholders until the live list is inspected.
 */
import { ghs } from "@/lib/fixtures"
import type { Money } from "@/lib/types"

export const GROUP_ROLES = {
  chair: "Chairperson",
  secretary: "Secretary",
  treasurer: "Treasurer",
  member: "Member",
} as const

export type GroupRole = keyof typeof GROUP_ROLES

export const MEETING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const
export const MEETING_FREQUENCIES = ["Weekly", "Every two weeks", "Monthly"] as const

export type GroupStatus = "active" | "inactive"

export type DemoGroupLoan = {
  ref: string
  capturedOn: string
  /** As captured. Nothing in this prototype approves or disburses it. */
  status: "awaiting_approval"
  product: string
  liability: "joint" | "individual"
  rate: number
  interestPeriod: "Week" | "Month"
  basis: "Flat" | "Reducing balance"
  frequency: "Weekly" | "Monthly"
  installments: number
  firstRepaymentOn: string
  members: { clientId: string; principal: Money }[]
}

export type DemoGroup = {
  id: string
  /** Short code staff use on paper and in search. */
  code: string
  name: string
  status: GroupStatus
  formedOn: string
  /** Null = not recorded when the group was formed. Shown as Not recorded, never guessed. */
  meetingDay: (typeof MEETING_DAYS)[number] | null
  meetingFrequency: (typeof MEETING_FREQUENCIES)[number] | null
  meetingPlace: string | null
  notes: string | null
  members: { clientId: string; role: GroupRole; joinedOn: string }[]
  loans: DemoGroupLoan[]
}

export const demoGroups: DemoGroup[] = [
  {
    id: "DEMO-GR-01",
    code: "OSU-01",
    name: "Osu Market Traders",
    status: "active",
    formedOn: "2026-09-12",
    meetingDay: "Tuesday",
    meetingFrequency: "Weekly",
    meetingPlace: "Demo market hall, Osu (fictional)",
    notes: "Meets after the morning market closes.",
    members: [
      { clientId: "DEMO-CL-01", role: "chair", joinedOn: "2026-09-12" },
      { clientId: "DEMO-CL-03", role: "treasurer", joinedOn: "2026-09-12" },
      { clientId: "DEMO-CL-08", role: "secretary", joinedOn: "2026-10-06" },
      { clientId: "DEMO-CL-10", role: "member", joinedOn: "2026-10-27" },
    ],
    loans: [
      {
        ref: "DEMO-GL-01",
        capturedOn: "2026-10-30",
        status: "awaiting_approval",
        product: "Weekly trader loan",
        liability: "joint",
        rate: 5,
        interestPeriod: "Week",
        basis: "Flat",
        frequency: "Weekly",
        installments: 8,
        firstRepaymentOn: "2026-11-10",
        members: [
          { clientId: "DEMO-CL-03", principal: ghs(600) },
          { clientId: "DEMO-CL-08", principal: ghs(800) },
          { clientId: "DEMO-CL-10", principal: ghs(500) },
        ],
      },
    ],
  },
  {
    // Meeting place and notes weren't captured: the overview must say so, not invent them. No group loans yet.
    id: "DEMO-GR-02",
    code: "LAB-02",
    name: "Labadi Food Sellers",
    status: "active",
    formedOn: "2026-10-15",
    meetingDay: "Friday",
    meetingFrequency: "Every two weeks",
    meetingPlace: null,
    notes: null,
    members: [
      { clientId: "DEMO-CL-09", role: "chair", joinedOn: "2026-10-15" },
      { clientId: "DEMO-CL-02", role: "member", joinedOn: "2026-10-15" },
      // No primary phone on file: can be a member, but can't be included in a loan until it's added.
      { clientId: "DEMO-CL-05", role: "member", joinedOn: "2026-10-22" },
    ],
    loans: [],
  },
  {
    id: "DEMO-GR-03",
    code: "RID-03",
    name: "Ridge Caterers",
    status: "inactive",
    formedOn: "2025-08-02",
    meetingDay: null,
    meetingFrequency: "Monthly",
    meetingPlace: null,
    notes: "Stopped meeting in September 2026.",
    members: [
      { clientId: "DEMO-CL-07", role: "chair", joinedOn: "2025-08-02" },
      { clientId: "DEMO-CL-04", role: "member", joinedOn: "2025-08-02" },
    ],
    loans: [],
  },
]

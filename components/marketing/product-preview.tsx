"use client"

import { CollectionRing } from "@/components/dashboard/collection-ring"
import { KpiCard } from "@/components/patterns/kpi-card"
import { ScopedCount } from "@/components/patterns/scoped-count"
import { computeActivity, computeSnapshot } from "@/lib/api/dashboard"

/**
 * Product imagery built from the real redesigned interface (the same components and fictional
 * fixtures as the app), not a competitor screenshot. It's a picture: inert, with a text alternative.
 */
export function ProductPreview() {
  const s = computeSnapshot()
  const a = computeActivity({ from: "2026-10-01", to: "2026-10-31" })
  return (
    <figure className="relative">
      <figcaption className="sr-only">
        The LoanDrift dashboard with fictional demo data: principal outstanding, approvals waiting, accounts due today, and a collection rate ring.
      </figcaption>
      <div
        aria-hidden
        inert
        className="pointer-events-none overflow-hidden rounded-3xl border border-white/30 bg-canvas shadow-[0_30px_80px_-30px_rgba(30,11,61,0.65)] select-none"
      >
        <div className="flex items-center gap-1.5 border-b bg-background px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-[#e8e6ef]" />
          <span className="size-2.5 rounded-full bg-[#e8e6ef]" />
          <span className="size-2.5 rounded-full bg-[#e8e6ef]" />
          <span className="ml-3 text-xs text-muted-foreground">LoanDrift · Dashboard · demo data</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <KpiCard
            variant="hero"
            className="col-span-2 p-5 shadow-none"
            label="Principal outstanding"
            value={s.principalOutstanding}
            definition=""
            secondary={{ label: "With interest", value: s.balanceInclInterest }}
          />
          <ScopedCount className="rounded-2xl border-0 bg-card" label="Approvals" count={s.attention.approvalsBranch} scope="branch" />
          <ScopedCount className="rounded-2xl border-0 bg-card" label="Due today" count={s.attention.dueTodayAccounts} scope="branch" />
          <CollectionRing activity={a} loading={false} className="col-span-2 hidden sm:flex" />
        </div>
      </div>
    </figure>
  )
}

import type { StatusPresentation } from "@/lib/format"
import type { DemoApprovalRequest } from "@/lib/workspace-fixtures"

/** One mapping for a request's state, shared by the table and the review panel. */
export function approvalStatus(a: DemoApprovalRequest): StatusPresentation {
  if (a.state === "waiting") return { label: "Waiting", tone: "info", description: "Needs a decision." }
  if (a.state === "in_progress") return { label: "Sent back", tone: "warning", description: "Returned to the requester." }
  return a.outcome === "rejected"
    ? { label: "Rejected", tone: "danger", description: "Final decision: rejected." }
    : { label: "Approved", tone: "success", description: "Final decision: approved." }
}

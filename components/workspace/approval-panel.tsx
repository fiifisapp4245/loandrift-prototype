"use client"

import { CheckCircle2, CircleAlert, CircleDashed, Lock } from "lucide-react"
import { Amount } from "@/components/patterns/amount"
import { EntityRef } from "@/components/patterns/entity-ref"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { decisionBlocker } from "@/lib/api/workspace"
import { DEMO_AS_OF } from "@/lib/fixtures"
import { formatAge, formatDateTime } from "@/lib/format"
import { userName, type DemoApprovalRequest } from "@/lib/workspace-fixtures"
import { approvalStatus } from "@/components/workspace/approval-status"

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

const OUTCOME_LABEL = { approved: "Approved", rejected: "Rejected", returned: "Sent back" } as const

/**
 * Read-only review of one request. Decisions aren't wired in the prototype; the footer says who
 * can decide and why the current user can or can't, without inventing a transition.
 */
export function ApprovalPanel({
  request,
  requestedId,
  userId,
  onClose,
}: {
  request: DemoApprovalRequest | undefined
  /** The id in the URL, even if it isn't in this view. */
  requestedId: string
  userId: string
  onClose: () => void
}) {
  const blocker = request ? decisionBlocker(request, userId) : null
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-md"
        // The panel opens from a URL, not a DialogTrigger, so return focus to the row's Review link by hand.
        onCloseAutoFocus={(e) => {
          const origin = document.querySelector<HTMLElement>(`[data-review-id="${requestedId}"]`)
          if (origin) {
            e.preventDefault()
            origin.focus()
          }
        }}
      >
        {!request ? (
          <>
            <SheetHeader>
              <SheetTitle>Request {requestedId}</SheetTitle>
              <SheetDescription className="sr-only">Request not available</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <StateMessage
                state="unavailable"
                title="This request isn't in this view"
                description="It may be outside your scope or older than 30 days. Try the branch view or the approval history."
              />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="border-b">
              <p className="font-mono text-xs text-muted-foreground">{request.id}</p>
              <SheetTitle className="text-lg">{request.kind}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <StatusBadge status={approvalStatus(request)} />
                <span>
                  Level {request.level.current} of {request.level.total}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <dl className="divide-y">
                <Row term="Borrower">{request.borrower}</Row>
                <Row term="Loan">
                  <EntityRef reference={request.loanRef} href={`/loans/${request.loanRef}`} />
                </Row>
                <Row term="Amount">
                  <Amount value={request.amount} className="font-medium" />
                </Row>
                <Row term="Requested by">{userName(request.requesterId)}</Row>
                <Row term="Submitted">
                  {formatDateTime(request.submittedAt)}
                  {request.state !== "completed" && (
                    <span className="text-muted-foreground"> · waiting {formatAge(request.submittedAt, DEMO_AS_OF)}</span>
                  )}
                </Row>
                {request.state !== "completed" && <Row term="Next action">{userName(request.assigneeId)}</Row>}
              </dl>

              <h3 className="mt-5 mb-2 text-sm font-semibold">Evidence</h3>
              {request.evidence.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evidence recorded.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {request.evidence.map((e) => (
                    <li key={e.label} className="flex items-center gap-2">
                      {e.provided ? (
                        <CheckCircle2 aria-hidden className="size-4 text-success" />
                      ) : (
                        <CircleDashed aria-hidden className="size-4 text-warning" />
                      )}
                      <span>{e.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{e.provided ? "Provided" : "Missing"}</span>
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mt-5 mb-2 text-sm font-semibold">Eligibility blockers</h3>
              {request.blockers.length === 0 ? (
                <p className="text-sm text-muted-foreground">None recorded.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {request.blockers.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-danger">
                      <CircleAlert aria-hidden className="size-4" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mt-5 mb-2 text-sm font-semibold">History</h3>
              <ol className="flex flex-col gap-2 text-sm">
                <li>
                  <span className="font-medium">Submitted</span> by {userName(request.requesterId)}
                  <span className="block text-xs text-muted-foreground">{formatDateTime(request.submittedAt)}</span>
                </li>
                {request.decisions.map((d) => (
                  <li key={`${d.level}-${d.at}`}>
                    <span className="font-medium">{OUTCOME_LABEL[d.outcome]}</span> at level {d.level} by {userName(d.by)}
                    <span className="block text-xs text-muted-foreground">{formatDateTime(d.at)}</span>
                    {d.note && <span className="mt-0.5 block text-muted-foreground">“{d.note}”</span>}
                  </li>
                ))}
              </ol>
            </div>

            <SheetFooter className="border-t">
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {blocker ?? "Decisions aren't connected in this prototype."}
              </p>
              <div className="flex gap-2">
                <Button disabled className="flex-1">
                  Approve
                </Button>
                <Button disabled variant="outline" className="flex-1">
                  Reject
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { EntityRef } from "@/components/patterns/entity-ref"
import { StateMessage } from "@/components/patterns/state-message"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getAssessment, scoreText } from "@/lib/api/credit"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** One assessment, read-only, with the loan's other assessments. Opened from ?assessment=. */
export function AssessmentDrawer({ id, hrefFor, onClose }: { id: string; hrefFor: (id: string) => string; onClose: () => void }) {
  const found = getAssessment(id)
  const x = found?.assessment
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-md"
        onCloseAutoFocus={(e) => {
          const origin = document.querySelector<HTMLElement>(`[data-assessment-id="${id}"]`)
          if (origin) {
            e.preventDefault()
            origin.focus()
          }
        }}
      >
        {!x || !found ? (
          <>
            <SheetHeader>
              <SheetTitle>Assessment {id}</SheetTitle>
              <SheetDescription className="sr-only">Not found</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <StateMessage state="unavailable" title="This assessment isn't on record" description="Search Credit Score by loan reference or borrower." />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="border-b">
              <p className="font-mono text-xs text-muted-foreground">{x.loanRef}</p>
              <SheetTitle className="text-lg">{scoreText(x)}</SheetTitle>
              <SheetDescription>
                {x.model.label}, version {x.model.version} · {x.latest ? "Latest for this loan" : "Historical"}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {x.value === null && (
                <div className="mb-3 rounded-2xl bg-warning-subtle p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle aria-hidden className="size-4 text-warning" />
                    Incomplete: no score was produced
                  </p>
                  <p className="mt-1">The model couldn&rsquo;t assess:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {x.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-muted-foreground">This isn&rsquo;t a score of zero, and it isn&rsquo;t counted as one anywhere.</p>
                </div>
              )}
              <dl className="divide-y">
                <Row term="Loan">
                  <EntityRef reference={x.loanRef} href={`/loans/${x.loanRef}`} context={x.borrower} />
                </Row>
                <Row term="Borrower">
                  <Link href={`/clients/${x.borrowerId}`} className="text-primary underline underline-offset-2">
                    {x.borrower}
                  </Link>
                </Row>
                <Row term="Score">{scoreText(x)}</Row>
                <Row term="Model">
                  {x.model.label}, version {x.model.version}
                  {x.model.legacy && <span className="block text-xs text-muted-foreground">Legacy: not comparable with current-model scores.</span>}
                </Row>
                <Row term="Assessed">{formatDateTime(x.assessedAt)}</Row>
                <Row term="Trigger">{x.trigger}</Row>
                <Row term="Run by">{x.assessedBy}</Row>
              </dl>

              <h3 className="mt-5 mb-2 text-sm font-semibold">All assessments for {x.loanRef}</h3>
              <ol className="flex flex-col gap-1.5">
                {found.history.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={hrefFor(h.id)}
                      scroll={false}
                      aria-current={h.id === x.id ? "true" : undefined}
                      className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl border px-3 py-2 text-sm hover:bg-muted/60", h.id === x.id && "border-primary bg-brand-subtle")}
                    >
                      <span className="font-medium">{scoreText(h)}</span>
                      <span className="text-xs text-muted-foreground">
                        {h.model.label} · {formatDateTime(h.assessedAt)} · {h.trigger}
                        {h.latest && " · Latest"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex flex-col gap-1.5 rounded-2xl border p-3">
                <Button variant="outline" size="sm" disabled className="w-fit">
                  Adjust score
                </Button>
                <p className="text-xs text-muted-foreground">
                  {x.value === null
                    ? "An incomplete assessment can't be adjusted."
                    : "Not available in this prototype. An adjustment needs a recorded reason and the right permission, and it never replaces this record."}
                </p>
              </div>

              <details className="mt-5 rounded-xl border px-3 py-2 text-sm">
                <summary className="cursor-pointer font-medium">Technical details</summary>
                <dl className="mt-2 divide-y">
                  <Row term="Assessment ID">
                    <span className="font-mono text-xs">{x.id}</span>
                  </Row>
                  <Row term="Model ID">
                    <span className="font-mono text-xs">{x.modelId}</span>
                  </Row>
                  <Row term="Assessed (UTC)">
                    <span className="font-mono text-xs">{x.assessedAt}</span>
                  </Row>
                </dl>
              </details>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

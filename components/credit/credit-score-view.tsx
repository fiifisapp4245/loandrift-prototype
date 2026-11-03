"use client"

import Link from "next/link"
import { AssessmentDrawer } from "@/components/credit/assessment-drawer"
import { EntityRef } from "@/components/patterns/entity-ref"
import { FilterSelect, optionLabel } from "@/components/patterns/filter-select"
import { FilterToolbar, type ActiveFilter } from "@/components/patterns/filter-toolbar"
import { InfoTip } from "@/components/patterns/info-tip"
import { PageBody, PageHeader } from "@/components/patterns/page-header"
import { Pager } from "@/components/patterns/pager"
import { StateMessage } from "@/components/patterns/state-message"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { fetchAssessments, type Assessment } from "@/lib/api/credit"
import { SCORE_MODELS, TRIGGERS } from "@/lib/credit-fixtures"
import { formatCount, formatDateTime } from "@/lib/format"
import { useQuery } from "@/lib/use-query"
import { useUrlState } from "@/lib/use-url-state"

const MODEL_OPTIONS = SCORE_MODELS.map((m) => ({ value: m.id, label: `${m.label} (${m.scaleMin}–${m.scaleMax})` }))
const STATE_OPTIONS = [
  { value: "complete", label: "Complete" },
  { value: "incomplete", label: "Incomplete" },
]
const TRIGGER_OPTIONS = TRIGGERS.map((t) => ({ value: t, label: t }))

function Score({ x }: { x: Assessment }) {
  if (x.value === null) return <StatusBadge status={{ label: "Incomplete", tone: "warning", description: "" }} />
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold tabular">{formatCount(x.value)}</span>
      <span className="text-muted-foreground">
        {" "}
        on {x.model.scaleMin}–{formatCount(x.model.scaleMax)}
      </span>
    </span>
  )
}

/**
 * Credit Score (R3, F69, F70). Assessment history by loan, never a lending decision. Latest is one
 * row per loan; All shows every assessment, with Latest and Historical marked. Models and scales
 * are always named, and nothing averages across them.
 */
export function CreditScoreView() {
  const url = useUrlState()
  const q = url.get("q")
  const view = url.get("view") === "all" ? "all" : "latest"
  const model = url.get("model")
  const state = url.get("state")
  const trigger = url.get("trigger")
  const page = Math.max(1, Number(url.get("page")) || 1)
  const openId = url.get("assessment")
  const demo = url.get("demo")
  const sim = demo === "slow" || demo === "error" ? demo : "none"

  const filters = { q, view, model, state, trigger, page }
  const list = useQuery(`credit:${JSON.stringify(filters)}:${sim}`, () => fetchAssessments(filters, sim))
  const data = list.data

  const active: ActiveFilter[] = [
    model && { id: "model", label: "Model", value: optionLabel(MODEL_OPTIONS, model) },
    state && { id: "state", label: "State", value: optionLabel(STATE_OPTIONS, state) },
    trigger && { id: "trigger", label: "Trigger", value: trigger },
  ].filter(Boolean) as ActiveFilter[]
  const setFilter = (patch: Record<string, string | null>) => url.set({ ...patch, page: null })
  const clearAll = () => setFilter({ q: null, model: null, state: null, trigger: null })
  const filtered = active.length > 0 || q.trim().length > 0
  const noun = view === "all" ? (data?.total === 1 ? "assessment" : "assessments") : data?.total === 1 ? "loan" : "loans"

  return (
    <PageBody>
      <PageHeader eyebrow="Lending" title="Credit Score" />

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <h2 className="text-base font-semibold">Assessments</h2>
            <InfoTip label="credit assessments">
              Each assessment is a record of what a model produced at that moment. Scores from different models use different scales, so
              they&rsquo;re never compared or averaged. An incomplete assessment has no score, not a score of zero.
            </InfoTip>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(v) => v && setFilter({ view: v === "all" ? "all" : null })}
            aria-label="Which assessments to show"
          >
            <ToggleGroupItem value="latest" className="px-3">
              Latest per loan
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="px-3">
              All assessments
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <FilterToolbar
          searchLabel="Search assessments"
          searchPlaceholder="Loan reference or borrower"
          search={q}
          onSearchChange={(v) => setFilter({ q: v })}
          active={active}
          onRemove={(id) => setFilter({ [id]: null })}
          onClearAll={clearAll}
          resultCount={data ? data.total : null}
          totalCount={data?.viewTotal}
          noun={noun}
          filters={
            <>
              <FilterSelect label="Model" value={model} onChange={(v) => setFilter({ model: v })} options={MODEL_OPTIONS} className="w-56" />
              <FilterSelect label="State" value={state} onChange={(v) => setFilter({ state: v })} options={STATE_OPTIONS} className="w-40" />
              <FilterSelect label="Trigger" value={trigger} onChange={(v) => setFilter({ trigger: v })} options={TRIGGER_OPTIONS} className="w-48" />
            </>
          }
        />

        {data && data.total > 0 && (
          <p className="text-xs text-muted-foreground">
            {view === "all" ? "Every assessment, newest first. " : "The most recent assessment for each loan. "}
            By model: {data.byModel.map((m) => `${m.model.label} ${m.count}`).join(", ")}. Counts only; scores on different scales aren&rsquo;t combined.
          </p>
        )}

        {list.error ? (
          <StateMessage state="error" title="Couldn't load assessments" description={list.error.message} onRetry={list.refetch} />
        ) : !data ? (
          <div className="flex flex-col gap-2" aria-busy>
            <span className="sr-only">Loading assessments</span>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : data.total === 0 ? (
          filtered ? (
            <StateMessage
              state="filtered-empty"
              title={state === "incomplete" ? "No incomplete assessments match" : "No assessments match these filters"}
              description={view === "latest" ? "Only each loan's latest assessment is searched. Try All assessments to include history." : "The search covers every assessment, not just one page."}
              action={
                <Button size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <StateMessage state="empty" title="No assessments yet" />
          )
        ) : (
          <>
            <div className="relative rounded-2xl border">
              <Table>
                <TableCaption className="sr-only">
                  {view === "all" ? "All assessments" : "Latest assessment per loan"}, newest first, page {data.page} of {data.pageCount}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Loan</TableHead>
                    <TableHead scope="col">Score</TableHead>
                    <TableHead scope="col">Model</TableHead>
                    <TableHead scope="col">Assessed</TableHead>
                    <TableHead scope="col">Trigger</TableHead>
                    {view === "all" && <TableHead scope="col">Record</TableHead>}
                    <TableHead scope="col" className="sticky right-0 bg-card shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                      <span className="sr-only">Details</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell>
                        <EntityRef reference={x.loanRef} href={`/loans/${x.loanRef}`} context={x.borrower} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <Score x={x} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="block whitespace-nowrap">{x.model.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          Version {x.model.version}
                          {x.model.legacy && " · legacy"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDateTime(x.assessedAt)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{x.trigger}</TableCell>
                      {view === "all" && (
                        <TableCell>
                          <StatusBadge status={x.latest ? { label: "Latest", tone: "info", description: "" } : { label: "Historical", tone: "neutral", description: "" }} />
                        </TableCell>
                      )}
                      <TableCell className="sticky right-0 bg-card text-right shadow-[-12px_0_12px_-12px_rgba(20,17,31,0.25)]">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={url.href({ assessment: x.id })} scroll={false} data-assessment-id={x.id} aria-label={`View assessment for ${x.loanRef}, ${formatDateTime(x.assessedAt)}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pager page={data.page} pageCount={data.pageCount} href={(p) => url.href({ page: p === 1 ? null : String(p) })} prevLabel="Newer" nextLabel="Older" />
          </>
        )}
      </div>

      {openId && <AssessmentDrawer id={openId} hrefFor={(id) => url.href({ assessment: id })} onClose={() => url.set({ assessment: null })} />}
    </PageBody>
  )
}

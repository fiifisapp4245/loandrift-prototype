/**
 * Credit assessment history (R3, F69, F70). Read-only: browsing never calculates, re-runs or
 * overrides a score. Scores from different models are never averaged or put on one scale, and an
 * incomplete assessment has no number at all.
 */
import { demoLoans } from "@/lib/fixtures"
import { SCORE_MODELS, demoAssessments, type DemoAssessment, type ScoreModel } from "@/lib/credit-fixtures"

export type Assessment = DemoAssessment & { model: ScoreModel; borrower: string; borrowerId: string; latest: boolean }

const latestIds = new Set(
  [...new Set(demoAssessments.map((x) => x.loanRef))].map(
    (ref) => demoAssessments.filter((x) => x.loanRef === ref).sort((p, q) => q.assessedAt.localeCompare(p.assessedAt))[0].id,
  ),
)

export const assessments: Assessment[] = demoAssessments
  .map((x) => {
    const loan = demoLoans.find((l) => l.reference === x.loanRef)
    return {
      ...x,
      model: SCORE_MODELS.find((m) => m.id === x.modelId)!,
      borrower: loan?.borrower.name ?? "Unknown borrower",
      borrowerId: loan?.borrower.id ?? "",
      latest: latestIds.has(x.id),
    }
  })
  .sort((p, q) => q.assessedAt.localeCompare(p.assessedAt) || q.id.localeCompare(p.id))

export const CREDIT_PAGE_SIZE = 10

export type CreditFilters = {
  q?: string
  /** "latest" (default): one row per loan. "all": every assessment. */
  view?: string
  model?: string
  state?: string
  trigger?: string
  page?: number
}

export function queryAssessments(f: CreditFilters) {
  const needle = f.q?.trim().toLowerCase() ?? ""
  const base = f.view === "all" ? assessments : assessments.filter((x) => x.latest)
  const matching = base.filter(
    (x) =>
      (!needle || x.loanRef.toLowerCase().includes(needle) || x.borrower.toLowerCase().includes(needle) || x.id.toLowerCase() === needle) &&
      (!f.model || x.modelId === f.model) &&
      (!f.state || (f.state === "incomplete" ? x.value === null : x.value !== null)) &&
      (!f.trigger || x.trigger === f.trigger),
  )
  const pageCount = Math.max(1, Math.ceil(matching.length / CREDIT_PAGE_SIZE))
  const page = Math.min(Math.max(1, f.page ?? 1), pageCount)
  return {
    rows: matching.slice((page - 1) * CREDIT_PAGE_SIZE, page * CREDIT_PAGE_SIZE),
    total: matching.length,
    /** The unfiltered size of the chosen view, for "N of M". */
    viewTotal: base.length,
    page,
    pageCount,
    /** Counts per model, never a combined average. */
    byModel: SCORE_MODELS.map((m) => ({ model: m, count: matching.filter((x) => x.modelId === m.id).length })).filter((x) => x.count > 0),
  }
}

export async function fetchAssessments(f: CreditFilters, sim: "none" | "slow" | "error" = "none") {
  await new Promise((r) => setTimeout(r, sim === "slow" ? 2500 : 150))
  if (sim === "error") throw new Error("The credit service didn't respond. Nothing has changed; try again.")
  return queryAssessments(f)
}

export function getAssessment(id: string) {
  const x = assessments.find((a) => a.id === id)
  if (!x) return null
  return { assessment: x, history: assessments.filter((a) => a.loanRef === x.loanRef) }
}

/** "712 on a 0–900 scale". Never a bare number, never a percentage. */
export function scoreText(x: Pick<Assessment, "value" | "model">) {
  if (x.value === null) return "Incomplete, no score"
  return `${x.value} on a ${x.model.scaleMin}–${x.model.scaleMax} scale`
}

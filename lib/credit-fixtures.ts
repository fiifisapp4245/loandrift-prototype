/**
 * FICTIONAL credit assessments (R3, F69, F70). Shaped by what the live audit observed: several
 * historical assessments per loan, more than one model and scale (including a 300–850 model on an
 * incomplete assessment), and an incomplete record with named missing categories. No real scoring
 * logic lives here or anywhere in the prototype. Each loan's latest record matches the score its
 * loan record shows (lib/fixtures.ts); a test enforces that.
 */
export type ScoreModel = { id: string; label: string; version: string; scaleMin: number; scaleMax: number; legacy: boolean }

export const SCORE_MODELS: ScoreModel[] = [
  { id: "ld-2026", label: "Current model", version: "2026.1", scaleMin: 0, scaleMax: 900, legacy: false },
  { id: "ld-legacy", label: "Legacy model", version: "1.4", scaleMin: 0, scaleMax: 100, legacy: true },
  { id: "ld-fin", label: "Financial model", version: "0.9", scaleMin: 300, scaleMax: 850, legacy: false },
]

export const TRIGGERS = ["Loan application", "Manual re-run", "Scheduled review"] as const
export type Trigger = (typeof TRIGGERS)[number]

export type DemoAssessment = {
  /** System ID, kept for support. Never the main identifier on screen. */
  id: string
  loanRef: string
  modelId: string
  /** Exact instant, UTC. Ghana is GMT, so this is also branch time. */
  assessedAt: string
  trigger: Trigger
  /** Null = incomplete: no score was produced. Never read as zero. */
  value: number | null
  /** Categories the model couldn't assess. Only incomplete records have any. */
  missing: string[]
  assessedBy: string
}

const a = (id: string, loanRef: string, modelId: string, assessedAt: string, trigger: Trigger, value: number | null, missing: string[] = []): DemoAssessment => ({
  id: `sc_${id}`,
  loanRef,
  modelId,
  assessedAt,
  trigger,
  value,
  missing,
  assessedBy: trigger === "Scheduled review" ? "System" : "Yaw Officer",
})

export const demoAssessments: DemoAssessment[] = [
  a("01hz8k2m4q", "DEMO-LN-001", "ld-2026", "2026-10-12T10:05:00Z", "Loan application", 698),
  // Two re-runs twelve minutes apart: similar, but separate assessments.
  a("01hz9p7r2c", "DEMO-LN-001", "ld-2026", "2026-10-18T09:02:00Z", "Manual re-run", 705),
  a("01hz9p9v6d", "DEMO-LN-001", "ld-2026", "2026-10-18T09:14:00Z", "Manual re-run", 712),
  a("01hq4c1n8e", "DEMO-LN-002", "ld-legacy", "2026-04-08T11:20:00Z", "Loan application", 54),
  // One loan, two models: the legacy score isn't comparable with the current one.
  a("01hx2d5t3f", "DEMO-LN-005", "ld-legacy", "2026-06-25T13:40:00Z", "Loan application", 61),
  a("01hz1f8w9g", "DEMO-LN-005", "ld-2026", "2026-09-30T06:00:00Z", "Scheduled review", 640),
  a("01hz2g3y4h", "DEMO-LN-008", "ld-2026", "2026-10-01T15:25:00Z", "Loan application", 688),
  a("01hz4h6k1j", "DEMO-LN-009", "ld-2026", "2026-10-08T10:50:00Z", "Loan application", 701),
  a("01hz6j2m5k", "DEMO-LN-010", "ld-2026", "2026-10-14T12:10:00Z", "Loan application", 512),
  a("01hzc3n7p0", "DEMO-LN-011", "ld-2026", "2026-10-21T09:30:00Z", "Loan application", 676),
  a("01hzf5q2r1", "DEMO-LN-011", "ld-2026", "2026-10-27T11:45:00Z", "Manual re-run", 690),
  a("01hzg8s4t2", "DEMO-LN-004", "ld-fin", "2026-10-29T14:40:00Z", "Loan application", null, ["Business cash flow", "Guarantor details"]),
]

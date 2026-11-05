/**
 * Which prompt builds each unbuilt destination, from the prompt packs and the 3 November
 * consolidated handoff (docs/NEXT-PROMPTS.md). Used by the placeholder screen so every unbuilt
 * route says honestly when it arrives, and whether it's waiting on evidence first (F75).
 */
export type Planned = { increment: string; blocked?: string }

const plannedIn: [prefix: string, Planned][] = [
  ["/savings", { increment: "R4 (Savings and Investments)", blocked: "Only the live listing has been seen; its fields and rules need inspecting first." }],
  ["/investments", { increment: "R4 (Savings and Investments)", blocked: "The live module hasn't been inspected yet." }],
  ["/expenses", { increment: "R5 (Expenses and Accounting)", blocked: "The live module hasn't been inspected yet." }],
  ["/accounting", { increment: "R5 (Expenses and Accounting)", blocked: "The live module hasn't been inspected yet." }],
  ["/reports", { increment: "R6 (Reports and Bulk Upload)", blocked: "The live module hasn't been inspected yet." }],
  ["/bulk-upload", { increment: "R6 (Reports and Bulk Upload)", blocked: "The live module hasn't been inspected yet." }],
]

export function plannedIncrement(pathname: string): Planned | null {
  return plannedIn.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null
}

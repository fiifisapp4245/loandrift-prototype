import { cn } from "@/lib/utils"

/** Placeholder LoanDrift mark in TroveSuite blue. Replace with the real logo asset when available. */
export function LoanDriftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn("size-7", className)}>
      <rect width="28" height="28" rx="7" fill="var(--brand)" />
      <path d="M8 7.5v13h12" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 15.5l3-3 2.5 2.5 3-3.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

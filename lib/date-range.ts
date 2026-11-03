/**
 * Period selection for "activity in selected period" views. Ranges are inclusive calendar dates
 * (yyyy-MM-dd) in branch time. They live in the URL (?from=…&to=…) so a link, a reload and the
 * Back button all show the same period.
 */
import { addDays, endOfMonth, format, isValid, parseISO, startOfMonth, subMonths } from "date-fns"
import { formatDate, formatDateRange } from "@/lib/format"

export type DateRange = { from: string; to: string }

export type PresetId = "today" | "last-7" | "last-30" | "this-month" | "last-month"

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "last-7", label: "Last 7 days" },
  { id: "last-30", label: "Last 30 days" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
]

export const DEFAULT_PRESET: PresetId = "last-30"

const iso = (d: Date) => format(d, "yyyy-MM-dd")

export function presetRange(id: PresetId, today: string): DateRange {
  const t = parseISO(today)
  switch (id) {
    case "today":
      return { from: today, to: today }
    case "last-7":
      return { from: iso(addDays(t, -6)), to: today }
    case "last-30":
      return { from: iso(addDays(t, -29)), to: today }
    case "this-month":
      return { from: iso(startOfMonth(t)), to: today }
    case "last-month": {
      const m = subMonths(t, 1)
      return { from: iso(startOfMonth(m)), to: iso(endOfMonth(m)) }
    }
  }
}

/** The preset a range corresponds to, if any — so "1–31 Oct" chosen by hand still reads "Last month". */
export function matchingPreset(range: DateRange, today: string): PresetId | null {
  return PRESETS.find((p) => {
    const r = presetRange(p.id, today)
    return r.from === range.from && r.to === range.to
  })?.id ?? null
}

export function rangeLabel(range: DateRange, today: string): string {
  const preset = matchingPreset(range, today)
  const dates = range.from === range.to ? formatDate(range.from) : formatDateRange(range.from, range.to)
  return preset ? `${PRESETS.find((p) => p.id === preset)!.label} · ${dates}` : dates
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isDate(value: string) {
  return DATE_RE.test(value) && isValid(parseISO(value))
}

export type RangeErrors = { from?: string; to?: string }

/** Field-level validation. Empty object = valid. */
export function validateRange(draft: { from: string; to: string }, today: string): RangeErrors {
  const errors: RangeErrors = {}
  if (!draft.from) errors.from = "Enter a start date."
  else if (!isDate(draft.from)) errors.from = "Enter a real date, for example 2026-10-01."
  if (!draft.to) errors.to = "Enter an end date."
  else if (!isDate(draft.to)) errors.to = "Enter a real date, for example 2026-10-31."
  if (!errors.from && !errors.to) {
    if (draft.to < draft.from) errors.to = "The end date must be on or after the start date."
    else if (draft.to > today) errors.to = `The end date can't be after today (${formatDate(today)}).`
  }
  return errors
}

export type ParsedRange = { range: DateRange; fromUrl: boolean; invalidUrl: boolean }

/**
 * Reads ?from and ?to. Missing → the default preset. Present but invalid → the default preset
 * and a flag, so the page can say the link's range was ignored rather than silently showing
 * other dates.
 */
export function parseRangeParams(params: { from?: string | string[]; to?: string | string[] }, today: string): ParsedRange {
  const from = typeof params.from === "string" ? params.from : undefined
  const to = typeof params.to === "string" ? params.to : undefined
  const fallback = presetRange(DEFAULT_PRESET, today)
  if (from === undefined && to === undefined) return { range: fallback, fromUrl: false, invalidUrl: false }
  const errors = validateRange({ from: from ?? "", to: to ?? "" }, today)
  if (errors.from || errors.to) return { range: fallback, fromUrl: false, invalidUrl: true }
  return { range: { from: from!, to: to! }, fromUrl: true, invalidUrl: false }
}

export function daysInRange(range: DateRange): number {
  return Math.round((parseISO(range.to).getTime() - parseISO(range.from).getTime()) / 86_400_000) + 1
}

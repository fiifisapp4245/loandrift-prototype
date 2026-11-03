"use client"

import { useId, useRef, useState } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PRESETS, matchingPreset, presetRange, rangeLabel, validateRange, type DateRange, type RangeErrors } from "@/lib/date-range"
import { cn } from "@/lib/utils"

/**
 * Period control. The popover edits a *draft*; nothing changes until Apply, which commits both
 * dates together. Cancel, Escape and clicking away discard the draft, so the applied range is
 * never half-changed (the audit's custom-range failure, F55-style mismatch).
 */
export function DateRangePicker({
  value,
  today,
  onApply,
  onClear,
  label = "Period",
}: {
  /** Null = no period applied ("Any time"); only allowed when onClear is given. */
  value: DateRange | null
  today: string
  onApply: (range: DateRange) => void
  /** Offers "Any time" in the popover, removing the period filter. */
  onClear?: () => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  // With no period applied, the draft starts from the last 30 days as a suggestion.
  const initial = () => value ?? presetRange("last-30", today)
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<RangeErrors>({})
  const fromRef = useRef<HTMLInputElement>(null)
  const toRef = useRef<HTMLInputElement>(null)
  const ids = { from: useId(), to: useId(), fromErr: useId(), toErr: useId(), heading: useId() }

  // Every opening starts from the applied range, never from an abandoned draft.
  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(initial())
      setErrors({})
    }
    setOpen(next)
  }

  // The inputs' own values are the source of truth at Apply. A value set without a React change
  // event (browser automation, autofill, some assistive tech) never reaches the draft, and
  // committing the draft alone silently kept the old range (F73).
  function apply() {
    const range = { from: fromRef.current?.value ?? draft.from, to: toRef.current?.value ?? draft.to }
    setDraft(range)
    const found = validateRange(range, today)
    setErrors(found)
    if (found.from) return fromRef.current?.focus()
    if (found.to) return toRef.current?.focus()
    onApply(range)
    setOpen(false)
  }

  const draftPreset = matchingPreset(draft, today)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 max-w-full justify-start gap-2 rounded-full font-normal">
          <CalendarDays aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">{label}:</span>{" "}
          <span className="truncate font-medium">{value ? rangeLabel(value, today) : "Any time"}</span>
          <ChevronDown aria-hidden className="ml-auto text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0" aria-labelledby={ids.heading}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            apply()
          }}
        >
          <div className="border-b px-4 py-3">
            <h2 id={ids.heading} className="text-sm font-semibold">
              Choose a period
            </h2>
          </div>

          <fieldset className="border-b px-4 py-3">
            <legend className="sr-only">Quick ranges</legend>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={draftPreset === p.id}
                  className={cn(draftPreset === p.id && "border-primary bg-brand-subtle text-brand-subtle-foreground")}
                  onClick={() => {
                    setDraft(presetRange(p.id, today))
                    setErrors({})
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 px-4 py-3">
            <legend className="sr-only">Custom range</legend>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={ids.from} className="text-xs font-medium">
                From
              </label>
              <Input
                ref={fromRef}
                id={ids.from}
                type="date"
                value={draft.from}
                max={today}
                aria-invalid={!!errors.from}
                aria-describedby={errors.from ? ids.fromErr : undefined}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              />
              {errors.from && (
                <p id={ids.fromErr} className="text-xs text-destructive">
                  {errors.from}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={ids.to} className="text-xs font-medium">
                To
              </label>
              <Input
                ref={toRef}
                id={ids.to}
                type="date"
                value={draft.to}
                max={today}
                aria-invalid={!!errors.to}
                aria-describedby={errors.to ? ids.toErr : undefined}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              />
              {errors.to && (
                <p id={ids.toErr} className="text-xs text-destructive">
                  {errors.to}
                </p>
              )}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 border-t px-4 py-3">
            {onClear && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mr-auto px-0"
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
              >
                Any time
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

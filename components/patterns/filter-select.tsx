"use client"

import { useId } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const ANY = "any"

/** A labelled filter dropdown for FilterToolbar. "any" means no filter. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  anyLabel = "Any",
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  anyLabel?: string
  className?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? "" : v)}>
        <SelectTrigger aria-labelledby={id} className={cn("w-40", className)}>
          {/* Explicit text: Radix only learns an item's label once the menu has rendered, which left the
              trigger blank on first paint. */}
          <SelectValue>{value ? optionLabel(options, value) : anyLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Label for a selected option, for the applied-filter chips. */
export function optionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value
}

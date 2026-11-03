"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Supporting detail (definitions, scope, basis) that would otherwise crowd the page.
 * Opens on hover and keyboard focus like any tooltip, and also on tap or click, because touch
 * screens never hover. Only for explanation: anything needed to act stays on the page.
 */
export function InfoTip({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`About ${label}`}
          // Radix closes a tooltip on pointerdown; a tap or click should leave it open instead.
          // It closes on Escape, blur, pointer leave, or a tap elsewhere.
          onClick={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
          className={cn(
            "relative z-10 -my-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          <Info aria-hidden className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 leading-relaxed">
        <span>{children}</span>
      </TooltipContent>
    </Tooltip>
  )
}

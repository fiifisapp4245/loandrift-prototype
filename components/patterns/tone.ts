import { AlertTriangle, CheckCircle2, Circle, CircleDot, Clock, Eye, XCircle, type LucideIcon } from "lucide-react"
import type { Tone } from "@/lib/format"

/** Text on its subtle fill (all ≥ 4.8:1) plus an icon, so status never depends on colour alone. */
export const toneClass: Record<Tone, string> = {
  neutral: "bg-neutral-subtle text-foreground border-border",
  info: "bg-info-subtle text-info border-info/20",
  review: "bg-review-subtle text-review border-review/20",
  success: "bg-success-subtle text-success border-success/20",
  warning: "bg-warning-subtle text-warning border-warning/25",
  danger: "bg-danger-subtle text-danger border-danger/20",
}

export const toneIcon: Record<Tone, LucideIcon> = {
  neutral: Circle,
  info: CircleDot,
  review: Eye,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
}

export const pendingIcon = Clock

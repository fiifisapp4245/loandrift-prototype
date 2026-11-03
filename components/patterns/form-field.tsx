import { useId } from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export const selectClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm aria-invalid:border-destructive"

export type FieldControlProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; "aria-required"?: boolean }

/**
 * A labelled control: visible label with (required) or (optional), help and an error, both tied to
 * the control by aria-describedby (F25, F63). The child receives the props to spread on its control.
 */
export function FormField({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: React.ReactNode
  error?: string
  className?: string
  children: (props: FieldControlProps) => React.ReactNode
}) {
  const base = useId()
  const hintId = hint ? `${base}-hint` : undefined
  const errorId = error ? `${base}-error` : undefined
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-muted-foreground"> (required)</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      {children({
        id,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

/** A choice made with radio buttons, as a fieldset with a legend, so no option is preselected. */
export function RadioChoice({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  hint,
}: {
  name: string
  legend: string
  options: { value: string; label: string; description?: string }[]
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
}) {
  const base = useId()
  return (
    <fieldset aria-describedby={[hint && `${base}-h`, error && `${base}-e`].filter(Boolean).join(" ") || undefined} className="flex flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium">
        {legend} <span className="text-muted-foreground">(required)</span>
      </legend>
      {hint && (
        <p id={`${base}-h`} className="-mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {options.map((o) => (
        <label key={o.value} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm", value === o.value && "border-primary bg-brand-subtle")}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-0.5 accent-[var(--primary)]" />
          <span>
            <span className="font-medium">{o.label}</span>
            {o.description && <span className="block text-xs text-muted-foreground">{o.description}</span>}
          </span>
        </label>
      ))}
      {error && (
        <p id={`${base}-e`} className="flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

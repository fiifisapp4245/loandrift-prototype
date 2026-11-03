import { cn } from "@/lib/utils"

/**
 * The page's only H1, its purpose in one line, its time basis, and its actions.
 * Same structure on every screen.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  basis,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  /** Section the page belongs to, e.g. "Lending" */
  eyebrow?: string
  /** "As of 2 Nov 2026, 09:00 GMT" — when the page shows a snapshot */
  basis?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-xl leading-7 font-semibold tracking-tight md:text-2xl md:leading-8">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
        {basis && <p className="mt-1 text-xs text-muted-foreground">{basis}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Page body width and gutters: 16px on phones, 24px from tablet up. */
export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-5 md:px-6 md:py-6", className)}>{children}</div>
}

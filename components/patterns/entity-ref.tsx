import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * The one way to show a record reference. The reference is the link (mono, never truncated in
 * its accessible name); optional context such as the borrower sits underneath as plain text,
 * so two loans for one borrower stay distinguishable (F22, F45).
 */
export function EntityRef({
  reference,
  href,
  context,
  className,
}: {
  reference: string
  href: string
  context?: string
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 flex-col", className)}>
      <Link
        href={href}
        title={reference}
        className="w-fit max-w-full truncate font-mono text-[13px] font-medium text-primary underline-offset-4 hover:underline"
      >
        {reference}
      </Link>
      {context && <span className="truncate text-xs text-muted-foreground">{context}</span>}
    </span>
  )
}

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Previous / "Page n of m" / Next, as real links so Back and new tabs work. */
export function Pager({
  page,
  pageCount,
  href,
  prevLabel = "Previous",
  nextLabel = "Next",
}: {
  page: number
  pageCount: number
  /** Link to a page; page 1 should drop the parameter. */
  href: (page: number) => string
  prevLabel?: string
  nextLabel?: string
}) {
  if (pageCount <= 1) return null
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 border-t pt-4">
      {page > 1 ? (
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href={href(page - 1)} scroll={false}>
            <ChevronLeft aria-hidden />
            {prevLabel}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="rounded-full" disabled>
          <ChevronLeft aria-hidden />
          {prevLabel}
        </Button>
      )}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href={href(page + 1)} scroll={false}>
            {nextLabel}
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="rounded-full" disabled>
          {nextLabel}
          <ChevronRight aria-hidden />
        </Button>
      )}
    </nav>
  )
}

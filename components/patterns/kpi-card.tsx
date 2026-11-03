import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Figure } from "@/components/patterns/figure"
import { InfoTip } from "@/components/patterns/info-tip"
import { Skeleton } from "@/components/ui/skeleton"
import { UNAVAILABLE_LABEL, formatMoney, formatMoneyValue, type MoneySum, type Ratio } from "@/lib/format"
import { isUnavailable, type MoneyValue } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Money, a guarded sum, a rate, or pre-formatted text (counts). */
export type KpiValue = MoneyValue | MoneySum | Ratio | { text: string } | null

function resolve(value: KpiValue): { text: string; note?: string; muted?: boolean } {
  if (value == null) return { text: UNAVAILABLE_LABEL, note: "No value was supplied.", muted: true }
  if ("kind" in value) {
    if (value.kind === "total") return { text: formatMoney(value.money) }
    if (value.kind === "mixed")
      return {
        text: "Several currencies",
        note: `Includes ${value.currencies.join(" and ")}. Shown separately because there is no conversion policy.`,
        muted: true,
      }
    return { text: UNAVAILABLE_LABEL, note: value.reasons.join(" "), muted: true }
  }
  if (isUnavailable(value)) return { text: UNAVAILABLE_LABEL, note: value.reason, muted: true }
  if ("text" in value) return { text: value.text }
  if ("label" in value) return { text: value.label }
  return { text: formatMoneyValue(value) }
}

type Variant = "card" | "plain" | "hero"

const styles: Record<
  Variant,
  { root: string; label: string; value: string; decimals?: string; muted: string; tip: string; link: string; skeleton: string }
> = {
  card: {
    root: "rounded-2xl border bg-card p-5",
    label: "text-sm font-medium text-muted-foreground",
    value: "text-3xl",
    muted: "text-muted-foreground",
    tip: "",
    link: "text-primary",
    skeleton: "",
  },
  plain: {
    root: "",
    label: "text-sm font-medium text-muted-foreground",
    // Sized by the enclosing card (a @container), not the window, so narrow columns never overflow.
    value: "text-2xl @2xl:text-3xl @3xl:text-4xl",
    muted: "text-muted-foreground",
    tip: "",
    link: "text-primary",
    skeleton: "",
  },
  // White card on the purple hero. The figure is purple #6D28D9 (7.1:1 on white); its decimals are
  // brand #7C3AED (5.7:1), so they pass 4.5:1 at any size.
  hero: {
    root: "rounded-3xl bg-card p-6 shadow-[0_24px_60px_-24px_rgba(30,11,61,0.55)]",
    label: "text-sm font-medium text-muted-foreground",
    value: "text-4xl text-[#6d28d9] sm:text-5xl",
    decimals: "text-[#7c3aed] opacity-100",
    muted: "text-muted-foreground",
    tip: "",
    link: "text-primary",
    skeleton: "",
  },
}

/**
 * A financial headline figure. The card shows only the label, the value and at most one related
 * figure; what it includes (definition) and its basis sit behind an info tip, so the page stays
 * scannable. Unavailable values keep their reason visible. While loading it shows a skeleton,
 * never a premature zero (F68).
 */
export function KpiCard({
  label,
  value,
  definition,
  basis,
  secondary,
  href,
  hrefLabel,
  loading,
  variant = "card",
  className,
}: {
  label: string
  value: KpiValue
  /** What the figure includes, in plain words: "Principal only; excludes interest and fees." */
  definition: string
  /** "As of 2 Nov 2026, 09:00 GMT". Omit when the section heading already states it. */
  basis?: string
  /** A related figure with its own label, e.g. the interest-inclusive balance. */
  secondary?: { label: string; value: MoneyValue | string }
  href?: string
  hrefLabel?: string
  loading?: boolean
  /** card: white rounded card. plain: no chrome, inside a larger card. hero: the headline card on the purple hero. */
  variant?: Variant
  className?: string
}) {
  const main = resolve(value)
  const st = styles[variant]
  return (
    <section aria-busy={loading || undefined} className={cn("flex min-w-0 flex-col gap-2", st.root, className)}>
      <div className="flex items-center gap-1">
        <h3 className={st.label}>{label}</h3>
        <InfoTip label={label} className={st.tip}>
          {definition}
          {basis && <span className="mt-1 block opacity-80">{basis}</span>}
        </InfoTip>
      </div>
      {loading ? (
        <>
          <Skeleton className={cn("h-9 w-36", st.skeleton)} />
          <span className="sr-only">Loading {label}</span>
        </>
      ) : (
        <p className={cn("leading-tight font-semibold", st.value, main.muted && st.muted)}>
          <Figure text={main.text} decimalsClassName={st.decimals} />
        </p>
      )}
      {!loading && main.note && <p className={cn("text-xs", st.muted)}>{main.note}</p>}
      {!loading && secondary && (
        <p className="text-sm">
          <span className={st.muted}>{secondary.label} </span>
          <span className="tabular font-medium">
            {typeof secondary.value === "string" ? secondary.value : formatMoneyValue(secondary.value)}
          </span>
        </p>
      )}
      {href && (
        <Link
          href={href}
          className={cn("mt-auto inline-flex w-fit items-center gap-1 pt-1 text-sm font-medium underline-offset-4 hover:underline", st.link)}
        >
          {hrefLabel ?? "View records"}
          <span className="sr-only"> for {label}</span>
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      )}
    </section>
  )
}

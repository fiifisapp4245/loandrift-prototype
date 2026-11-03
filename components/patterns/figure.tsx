import { cn } from "@/lib/utils"

/**
 * A headline number with its decimals dimmed: "GH₵8,583" strong, ".33" quieter. At 70% opacity
 * the decimals stay above 4.5:1 on white and on the muted card fill, so they pass at any size
 * (axe flagged 4.0:1 on 20px figures, which don't count as large text). The whole
 * value stays one run of text, so it copies and reads aloud as "GH₵8,583.33".
 */
export function Figure({ text, className, decimalsClassName }: { text: string; className?: string; decimalsClassName?: string }) {
  const m = /^(.*\d)(\.\d+.*)$/.exec(text)
  return (
    <span className={cn("tabular tracking-tight", className)}>
      {m ? (
        <>
          {m[1]}
          <span className={cn("opacity-70", decimalsClassName)}>{m[2]}</span>
        </>
      ) : (
        text
      )}
    </span>
  )
}

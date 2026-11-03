import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CollectionRing } from "@/components/dashboard/collection-ring"
import { LatestActivity } from "@/components/dashboard/latest-activity"
import { Figure } from "@/components/patterns/figure"
import { TooltipProvider } from "@/components/ui/tooltip"
import { computeActivity } from "@/lib/api/dashboard"

const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>)
const OCT = { from: "2026-10-01", to: "2026-10-31" }

describe("Figure", () => {
  it("dims the decimals but keeps one readable value", () => {
    const { container } = render(<Figure text="GH₵8,583.33" />)
    expect(container.textContent).toBe("GH₵8,583.33")
    expect(container.querySelector(".opacity-70")?.textContent).toBe(".33")
  })

  it("leaves values without decimals alone", () => {
    const { container } = render(<Figure text="Unavailable" />)
    expect(container.querySelector(".opacity-70")).toBeNull()
  })
})

describe("CollectionRing", () => {
  it("draws the rate and shows unpaid amounts", () => {
    wrap(<CollectionRing activity={computeActivity(OCT)} loading={false} />)
    expect(screen.getByText("37%", { exact: false }).closest("p")?.textContent).toBe("37%collected")
    // Paid, unpaid and due are all named, so the ring is never the only way to read it.
    const row = (term: string) => screen.getByText(term, { selector: "dt" }).parentElement!.textContent
    expect(row("Paid")).toContain("GH₵1,000.00")
    expect(row("Unpaid")).toContain("GH₵1,700.00")
    expect(row("Due, 4 installments")).toContain("GH₵2,700.00")
  })

  it("shows an empty track and Unavailable when nothing fell due, never 0%", () => {
    const { container } = wrap(<CollectionRing activity={computeActivity({ from: "2026-03-01", to: "2026-03-31" })} loading={false} />)
    expect(screen.getByText("Unavailable")).toBeTruthy()
    expect(screen.queryByText("0%")).toBeNull()
    expect(container.querySelectorAll(`svg[viewBox="0 0 128 128"] circle`)).toHaveLength(1)
  })
})

describe("LatestActivity", () => {
  it("lists the newest events first and names direction in words", () => {
    wrap(<LatestActivity activity={computeActivity(OCT)} loading={false} />)
    const items = within(screen.getByRole("region", { name: "Latest in this period" })).getAllByRole("listitem")
    expect(items).toHaveLength(5)
    expect(items[0]!.textContent).toContain("27 Oct 2026")
    expect(items[0]!.textContent).toContain("Received")
    expect(items.map((i) => i.textContent).join()).toContain("Fee charged")
    expect(items.map((i) => i.textContent).join()).not.toMatch(/[+−-]GH₵/)
  })

  it("keeps each event in its own currency", () => {
    wrap(<LatestActivity activity={computeActivity({ from: "2026-10-01", to: "2026-10-01" })} loading={false} />)
    expect(screen.getByText("USD 300.00")).toBeTruthy()
  })
})

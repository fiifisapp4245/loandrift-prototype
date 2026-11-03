import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { LoanTableDemo } from "@/components/foundations/loan-table-demo"
import { KpiCard } from "@/components/patterns/kpi-card"
import { StateMessage } from "@/components/patterns/state-message"
import { TooltipProvider } from "@/components/ui/tooltip"
import { demoLoans } from "@/lib/fixtures"
import { sumMoney } from "@/lib/format"
import { unavailable } from "@/lib/types"

const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>)

describe("KpiCard", () => {
  it("shows a skeleton while loading, never a premature zero (F68)", () => {
    wrap(<KpiCard label="Arrears" value={null} loading definition="d" basis="b" />)
    expect(screen.getByText("Loading Arrears")).toBeTruthy()
    expect(screen.queryByText(/GH₵0/)).toBeNull()
    expect(screen.queryByText("Unavailable")).toBeNull()
  })

  it("explains an unavailable value", () => {
    wrap(<KpiCard label="Collection rate" value={unavailable("Nothing fell due")} definition="d" basis="b" />)
    expect(screen.getByText("Unavailable")).toBeTruthy()
    expect(screen.getByText("Nothing fell due")).toBeTruthy()
  })

  it("does not add unlike currencies", () => {
    const value = sumMoney([{ minor: 100, currency: "GHS" }, { minor: 100, currency: "USD" }])
    wrap(<KpiCard label="Outstanding" value={value} definition="d" basis="b" />)
    expect(screen.getByText("Several currencies")).toBeTruthy()
    expect(screen.getByText(/Includes GHS and USD/)).toBeTruthy()
  })
})

describe("StateMessage", () => {
  it("announces errors as alerts and other states politely", () => {
    const { rerender } = wrap(<StateMessage state="error" title="Couldn't load" />)
    expect(screen.getByRole("alert").textContent).toContain("Couldn't load")
    rerender(<TooltipProvider><StateMessage state="filtered-empty" title="No matches" /></TooltipProvider>)
    expect((screen.getByRole("status")).textContent).toContain("No matches")
  })
})

describe("List pattern", () => {
  it("shows a filtered-empty state that echoes the search and recovers without creating anything (F41)", async () => {
    wrap(<LoanTableDemo />)
    await userEvent.type(screen.getByLabelText("Search loans"), "zzz-no-match")
    expect(screen.getByText("No loans match “zzz-no-match”")).toBeTruthy()
    expect(screen.getByText(/The branch still has loans/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: /add|create/i })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(screen.getAllByRole("row")).toHaveLength(demoLoans.length + 1)
  })

  it("gives every row a View loan action named for its record", () => {
    wrap(<LoanTableDemo />)
    for (const l of demoLoans) {
      expect(screen.getByRole("link", { name: `View loan ${l.reference}` })).toBeTruthy()
    }
  })

  it("keeps two loans for one borrower distinguishable by reference", () => {
    wrap(<LoanTableDemo />)
    expect(screen.getByRole("link", { name: "DEMO-LN-002" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "DEMO-LN-003" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "DEMO-LN-012" })).toBeTruthy()
    expect(screen.getAllByText("Kojo Example")).toHaveLength(3)
  })

  it("shows a legacy status as unrecognised and a missing balance as unavailable", () => {
    wrap(<LoanTableDemo />)
    expect(screen.getByText("Unrecognised status (Migrated closed)")).toBeTruthy()
    expect(screen.queryByText(/pending/i)).toBeNull()
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0)
  })
})

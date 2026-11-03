import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { TransactionsView } from "@/components/transactions/transactions-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { mockPathname, mockRouter, mockSearch } from "@/test/setup-dom"

function show(query = "") {
  mockPathname.current = "/transactions"
  mockSearch.current = new URLSearchParams(query)
  return render(
    <TooltipProvider>
      <TransactionsView />
    </TooltipProvider>,
  )
}
const rows = async () => (await screen.findAllByRole("row")).slice(1)

describe("Transactions", () => {
  it("shows date, type, loan, amount, reference, status and a View action on every row", async () => {
    show()
    const r = await rows()
    expect(r).toHaveLength(10)
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Date", "Type", "Loan", "Amount", "Reference", "Status", "Details"])
    for (const row of r) expect(within(row).getByRole("link", { name: /^View DEMO-/ })).toBeTruthy()
    expect(screen.getByText("Page 1 of 3")).toBeTruthy()
  })

  it("labels money movement in words and totals cash apart from adjustments", async () => {
    show("from=2026-10-01&to=2026-10-31")
    await rows()
    const totals = screen.getByRole("region", { name: "Totals for matching transactions" })
    expect(totals.textContent).toContain("Cash inGH₵1,000.00")
    expect(totals.textContent).toContain("Cash outGH₵5,500.00")
    expect(totals.textContent).toContain("Charged (not cash)GH₵110.00")
    expect(screen.getByText(/USD transactions are listed but not added/)).toBeTruthy()
    expect(screen.getAllByText("Adjustment").length).toBeGreaterThan(0)
  })

  it("shows when a payment was recorded on a later day", async () => {
    show("q=DEMO-RC-0039")
    const row = (await rows())[0]!
    expect(row.textContent).toContain("24 Oct 2026")
    expect(row.textContent).toContain("Recorded 25 Oct 2026, 08:20 GMT")
  })

  it("says a Penalty waived filter matched nothing in a period, and resets", async () => {
    show("type=penalty_waived&from=2026-10-01&to=2026-10-31")
    expect(await screen.findByText("No penalty waived transactions match")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/transactions", { scroll: false })
  })

  it("opens a transaction with both times, its meaning and linked records", async () => {
    show("tx=" + "TXN-2002")
    const panel = await screen.findByRole("dialog")
    expect(within(panel).getByText("A penalty removed from what the borrower owes. No cash moved.")).toBeTruthy()
    expect(within(panel).getByText("Method").parentElement!.textContent).toContain("Not applicable")
    expect(within(panel).getByText("Payer reference").parentElement!.textContent).toContain("None given")
    expect(within(panel).getByRole("link", { name: /Loan record/ }).getAttribute("href")).toBe("/loans/DEMO-LN-002")
  })

  it("lists, rather than merges, a similar payment on the same day", async () => {
    show("q=DEMO-RC-0017")
    const row = (await rows())[0]!
    const id = within(row).getByRole("link", { name: "View DEMO-RC-0017" }).getAttribute("data-tx-id")
    mockSearch.current = new URLSearchParams(`q=DEMO-RC-0017&tx=${id}`)
    render(
      <TooltipProvider>
        <TransactionsView />
      </TooltipProvider>,
    )
    const panel = await screen.findByRole("dialog")
    expect(within(panel).getByText(/Listed, not merged/)).toBeTruthy()
    expect(within(panel).getByText("DEMO-RC-0018")).toBeTruthy()
    expect(within(panel).getByRole("link", { name: /Receipt DEMO-RC-0017/ }).getAttribute("href")).toBe("/loans/DEMO-LN-002/repayment")
  })

  it("shows a failed request as an error", async () => {
    show("demo=error")
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Couldn't load transactions"))
  })
})
